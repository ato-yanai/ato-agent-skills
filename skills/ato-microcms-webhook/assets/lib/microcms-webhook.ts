// microCMS Webhook の検証とタグ算出（フレームワーク非依存）。
//
// microCMS は対象 API のコンテンツが公開/更新/削除されると、設定した URL へ POST する。
// ボディの HMAC-SHA256（hex）が X-MICROCMS-Signature ヘッダに入る。鍵は管理画面
// （API設定 → Webhook → シークレット）で設定した値（= MICROCMS_WEBHOOK_SECRET）。
//
// 署名検証は必ず「生ボディ」に対して行う（JSON.parse 後の再シリアライズはバイト列が変わり得る）。
// Web Crypto（globalThis.crypto.subtle）で実装するため Node 18+ / Edge / ブラウザで動く。

/** Webhook の発火種別。microCMS の既定フォーマット。未知値も許容する。 */
export type MicroCMSWebhookType = 'new' | 'edit' | 'delete' | (string & {});

/**
 * microCMS の既定 Webhook ペイロード（コンテンツ系）。
 * `api` がエンドポイント名、`id` がコンテンツ ID（オブジェクト形式 API では無いことがある）。
 */
export type MicroCMSWebhookPayload = {
  service: string;
  api: string;
  id?: string;
  type?: MicroCMSWebhookType;
  contents?: {
    old?: Record<string, unknown> | null;
    new?: Record<string, unknown> | null;
  };
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  return toHex(sig);
}

/** 長さを先に比較してから、文字単位で XOR を畳み込む定数時間比較（タイミング攻撃対策）。 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * X-MICROCMS-Signature を検証する。署名が無い/不一致なら false。
 * @param rawBody リクエストの生ボディ（文字列）。JSON 化前の値を渡す。
 * @param signature X-MICROCMS-Signature ヘッダの値。
 * @param secret 管理画面で設定した Webhook シークレット（MICROCMS_WEBHOOK_SECRET）。
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha256Hex(rawBody, secret);
  return timingSafeEqualHex(expected, signature);
}

/**
 * ペイロードから再検証すべきタグを組み立てる（ato-microcms-fetch のタグ規約と対）。
 * - リスト系クエリは `[api]` でタグ付けしておく → ここで `api` を剥がすと一覧が更新される。
 * - 詳細クエリは `[api, `${api}:${id}`]` → `${api}:${id}` でその 1 件だけ更新される。
 */
export function revalidateTargetsFor(payload: MicroCMSWebhookPayload): { tags: string[] } {
  const tags: string[] = [];
  if (payload.api) {
    tags.push(payload.api);
    if (payload.id) tags.push(`${payload.api}:${payload.id}`);
  }
  return { tags };
}
