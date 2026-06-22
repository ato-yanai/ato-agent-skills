---
name: ato-microcms-webhook
description: microCMS の Webhook を受けてキャッシュをオンデマンド再検証する実装を導入する。X-MICROCMS-Signature（HMAC-SHA256・hex）を生ボディで検証し、ペイロードの api / id から再検証タグ（一覧用 `{api}` と詳細用 `{api}:{id}`）を組み立てて Next.js の revalidateTag を叩く。署名検証は Web Crypto 実装で Node 18+ / Edge / ブラウザ対応。ato-microcms-fetch のキャッシュタグ規約と対で動く（fetch 側が貼ったタグを webhook 側が剥がす）。ユーザーが microCMS の更新反映・ISR / オンデマンド再検証・Webhook 受信・revalidate の実装を求めたときに使う。【依存】ato-microcms-fetch のタグ規約に合わせる（fetch 未導入でも単体で使えるが、タグ命名を揃えること）。
license: MIT
metadata:
  author: yanai
  version: "1.0"
---

# microCMS Webhook

microCMS の Webhook を受け、**コンテンツ更新を Next.js のオンデマンド再検証**（`revalidateTag`）へ
つなぐスキル。**SDK 不使用・標準 API のみ**。署名検証は Web Crypto なので Node 18+ / Edge /
ブラウザで動く。

> ## ⚠️ 関連スキル（タグ規約を揃える）
>
> 本スキルは [**ato-microcms-fetch**](../ato-microcms-fetch/SKILL.md) が貼るキャッシュタグを
> **剥がす**側。両者で**タグ命名を一致**させること（下の「タグ規約」）。fetch 未導入でも単体で
> 使えるが、その場合も同じ規約でタグを付ける。

## 方針（これだけは守る）

- **結果・進捗の報告はすべて日本語で行う（絶対事項）。** 配置したルート、設定した env、検証結果を日本語で伝える。
- **署名は必ず「生ボディ」で検証する。** `req.json()` を先に呼ばない（再シリアライズでバイト列が
  変わり検証に失敗し得る）。`await req.text()` で生文字列を取り、それで HMAC を計算する。
- **シークレットはサーバ専用。** `MICROCMS_WEBHOOK_SECRET` に公開プレフィックス（`NEXT_PUBLIC_` /
  `PUBLIC_`）を付けない。値はログ・レスポンスに出さない。
- **検証はサーバ（Route Handler / API ルート）で行う。** ブラウザに秘密を渡さない。

## 構成（配置するファイル）

| ファイル | 役割 |
| --- | --- |
| `assets/lib/microcms-webhook.ts` | フレームワーク非依存のコア。`verifyWebhookSignature`（Web Crypto・定数時間比較）／`revalidateTargetsFor`（ペイロード → タグ配列）／ペイロード型。 |
| `assets/app/api/microcms-webhook/route.ts` | Next.js App Router の受信ルート例。生ボディ検証 → `revalidateTag` ループ。 |
| `assets/env.example` | `MICROCMS_WEBHOOK_SECRET` の雛形。 |

## Instructions

1. **コアを配置する。** `assets/lib/microcms-webhook.ts` をプロジェクトの `lib/`（既定 `src/lib/`、
   `src/` が無ければ root `lib/`）へコピーする。`api-client.ts` 等とは独立で、依存 import は無い。
2. **受信ルートを配置する。**
   - **Next.js (App Router):** `assets/app/api/microcms-webhook/route.ts` を `app/api/microcms-webhook/route.ts`
     （`src/` 構成なら `src/app/...`）へ置く。import パス（`@/lib/microcms-webhook`）をプロジェクトに合わせる。
   - **Astro / 他:** 下の「他フレームワーク」を参照。コア（`verifyWebhookSignature` /
     `revalidateTargetsFor`）はそのまま流用できる。
3. **環境変数を設定する。** `assets/env.example` を参考に `MICROCMS_WEBHOOK_SECRET` を `.env.local`
   （または `.env`）へ。`.gitignore` が `.env*.local` を除外しているか確認する。
4. **microCMS 側を設定する。** 管理画面 → 対象 API → API設定 → Webhook で、
   - 通知先 URL に `https://<本番ドメイン>/api/microcms-webhook` を設定。
   - 「シークレット」に `MICROCMS_WEBHOOK_SECRET` と**同じ値**を設定。
   - 発火させたいイベント（公開/更新/削除など）を選ぶ。
5. **fetch 側のタグを揃える。** [ato-microcms-fetch](../ato-microcms-fetch/SKILL.md) の取得時に、
   下の「タグ規約」どおり `fetchOptions.next.tags` を付ける。これが無いと剥がす対象が無く再検証されない。
6. **検証する。** ローカルでは正しい署名を作って `curl` で叩く（下の「ローカル検証」）。本番では
   コンテンツを更新して該当ページが更新されることを確認する。報告は日本語でまとめる。

## タグ規約（fetch ⇄ webhook の契約）

`revalidateTargetsFor` はペイロードの `api`（エンドポイント名）/ `id`（コンテンツ ID）から
次のタグを作る。**取得側も同じ規約で `tags` を付ける**こと。

| 用途 | fetch で付けるタグ | webhook が剥がすタグ |
| --- | --- | --- |
| 一覧（`getList` / `getAllContents`） | `[api]`（例 `['blogs']`） | `revalidateTag('blogs')` |
| 詳細（`getListDetail`） | `[api, `${api}:${id}`]`（例 `['blogs', 'blogs:abc123']`） | `revalidateTag('blogs')` と `revalidateTag('blogs:abc123')` |
| オブジェクト形式（`getObject`） | `[api]` | `revalidateTag(api)`（`id` 無し） |

```ts
// 取得側（ato-microcms-fetch）
await getList('blogs', { limit: 10 }, { fetchOptions: { next: { tags: ['blogs'] } } });
await getListDetail('blogs', id, undefined, {
  fetchOptions: { next: { tags: ['blogs', `blogs:${id}`] } },
});
```

更新イベントが来ると `blogs` と `blogs:<id>` の両方が剥がれ、一覧・詳細の両方が次アクセスで再生成される。

## 他フレームワーク

- **Astro（SSG）:** ビルド済み HTML なので「再検証」ではなく**再ビルド（デプロイ）**が必要。受信ルート
  （`src/pages/api/microcms-webhook.ts` 等）で `verifyWebhookSignature` を通したあと、ホスティングの
  **ビルドフック URL**（Vercel / Netlify / Cloudflare Pages 等）を `fetch(BUILD_HOOK_URL, { method: 'POST' })`
  で叩く。`revalidateTargetsFor` は使わない。
- **Astro（SSR）/ 他の Node サーバ:** コアはそのまま。`revalidateTag` 相当の仕組みが無い場合は、
  自前のキャッシュ層を `api` / `id` をキーに無効化する。

## ローカル検証

正しい署名を作って自分で叩く（`SECRET` は `.env.local` の値）:

```bash
BODY='{"service":"your-service","api":"blogs","id":"abc123","type":"edit"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
curl -i -X POST http://localhost:3000/api/microcms-webhook \
  -H "Content-Type: application/json" \
  -H "X-MICROCMS-Signature: $SIG" \
  --data "$BODY"
# → 200 {"revalidated":true,...}。署名を 1 文字変えると 401 になることも確認する。
```

## Edge cases

- **署名検証が常に失敗する** → ほぼ「生ボディで検証していない」。フレームワークがボディを JSON
  パース/再整形する前の生文字列（`await req.text()`）で HMAC を計算しているか確認する。
- **`MICROCMS_WEBHOOK_SECRET` 未設定** → ルートが 500 を返す。`.env.local` と microCMS 側の
  シークレットが**完全一致**しているか確認する（前後の空白に注意）。
- **再検証されない** → fetch 側に `tags` が付いていないのが大半。上の「タグ規約」どおり付ける。
  `revalidatePath` で経路指定したい場合はルートを差し替える。
- **オブジェクト形式 API** → ペイロードに `id` が無いことがある。`revalidateTargetsFor` は `api`
  タグのみ返すので、取得側も `getObject` には `[api]` を付ける。
- **重複配信・再送** → `revalidateTag` は冪等なので無害。明示の重複排除は不要。
- **Edge ランタイム** → 署名検証は Web Crypto なので動く。ただし `revalidateTag` は Next.js の
  サーバ機能。`runtime` は既定の `nodejs` のままで問題ない。
- **秘密の漏洩** → シークレットを `NEXT_PUBLIC_` 等で公開していないか、ログ/レスポンスに出していないか
  確認する。検証はサーバ側だけで行う。
