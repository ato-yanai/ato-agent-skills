// Next.js App Router の Webhook 受信ルート（例）。
// 配置先: app/api/microcms-webhook/route.ts（src/ 構成なら src/app/...）。
// microCMS 管理画面の Webhook URL に https://<your-domain>/api/microcms-webhook を設定する。
//
// import パスはプロジェクトに合わせて調整する（このファイルでは microcms-webhook.ts を
// '@/lib/microcms-webhook' に置いた想定）。

import { revalidateTag } from 'next/cache';
import {
  revalidateTargetsFor,
  verifyWebhookSignature,
  type MicroCMSWebhookPayload,
} from '@/lib/microcms-webhook';

// 署名検証は生ボディに対して行うため、ボディはキャッシュ・整形させない。
export const dynamic = 'force-dynamic';
// Web Crypto を使うので edge でも動くが、明示しておくと安全。
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.MICROCMS_WEBHOOK_SECRET;
  if (!secret) {
    // サーバ設定ミス。秘密値はログにもレスポンスにも出さない。
    return new Response('[microcms-webhook] MICROCMS_WEBHOOK_SECRET が未設定です。', { status: 500 });
  }

  // 重要: 署名検証は JSON.parse より前に「生ボディ」で行う。
  const rawBody = await req.text();
  const signature = req.headers.get('x-microcms-signature');
  const ok = await verifyWebhookSignature(rawBody, signature, secret);
  if (!ok) {
    return new Response('[microcms-webhook] 署名が不正です。', { status: 401 });
  }

  let payload: MicroCMSWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MicroCMSWebhookPayload;
  } catch {
    return new Response('[microcms-webhook] ボディが JSON ではありません。', { status: 400 });
  }

  const { tags } = revalidateTargetsFor(payload);
  for (const tag of tags) revalidateTag(tag);

  // revalidateTag は冪等なので、重複配信・再送が来ても安全。
  return Response.json({ revalidated: true, api: payload.api, id: payload.id ?? null, tags });
}
