---
name: ato-fetch-client
description: 標準 fetch だけで作る、堅牢な汎用 REST API クライアント（TypeScript）を導入する。タイムアウト・リトライ（指数バックオフ＋ジッタ、Retry-After/X-RateLimit-Reset 尊重）・型付き HttpError・クエリ組立・fetch オプション透過（Next.js の next:{revalidate,tags} など）を 1 つの apiFetch 関数に集約する。特定 API 非依存。ユーザーが fetch ラッパーや API クライアントを作りたいとき、外部 REST API を呼ぶとき、タイムアウト/リトライ/エラー処理を入れたいときに使う。
license: MIT
metadata:
  author: yanai
  version: "1.0"
---

# Fetch Client

標準 `fetch` だけで、API 通信の定番の考慮事項（タイムアウト・リトライ・エラー処理）を
1 つの `apiFetch<T>()` に閉じ込めた**汎用 REST API クライアント**を導入するスキル。
特定の API/SDK に依存しないので、microCMS でも自社 API でも使い回せる。

## 方針（これだけは守る）

- **結果・進捗の報告はすべて日本語で行う（絶対事項）。** 配置したファイル・設定・検証結果は日本語で伝える。
- **標準 `fetch` のみ。** 追加依存を入れない（Node 18+ / Edge / ブラウザで動く）。
- **汎用に保つ。** 特定 API の URL・認証・型をこのファイルに混ぜない。それらは利用側
  （例: microCMS なら [ato-microcms-fetch](../ato-microcms-fetch/SKILL.md)）が `apiFetch` を包んで実装する。
- **秘密情報をログに出さない。** APIキー等はエラーメッセージにも含めない（URL とステータスのみ）。

## 構成（配置するファイル）

| ファイル | 役割 |
| --- | --- |
| `assets/lib/api-client.ts` | `apiFetch<T>()` 本体と `HttpError`・型定義。プロジェクトの `src/lib/`（等）へコピーする。 |

## Instructions

1. **コピー先を決める。** TypeScript 構成・`src/` レイアウト・パスエイリアスを確認し、`src/lib/api-client.ts`
   （または共有 lib）へ置く。特定 API 用ラッパーと同じ階層に置くと相対 import が楽。
2. **配置する。** `assets/lib/api-client.ts` をコピーする。既存同名があれば上書き前に確認する。
3. **ラッパーを書く（任意）。** 個別 API はベース URL・認証ヘッダを付けて `apiFetch` を呼ぶ薄い関数に
   まとめる（下の「使い方」）。
4. **既定値を調整する。** タイムアウト・リトライ回数は用途に合わせて呼び出し側で渡す。
5. **検証する。** 代表的な呼び出しか `tsc --noEmit` で型が通ることを確認し、結果を日本語で報告する。

## 使い方

```ts
import { apiFetch, HttpError } from '@/lib/api-client';

type User = { id: string; name: string };

// GET + クエリ（URLSearchParams で安全にエンコード）
const users = await apiFetch<User[]>('https://api.example.com/users', {
  query: { page: 1, active: true },
  timeoutMs: 8000,
  retries: 2,
});

// 認証ヘッダ付き / POST
await apiFetch('https://api.example.com/users', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: { name: 'Alice' }, // 自動で JSON 化＋Content-Type 付与
});

// Next.js のキャッシュ/再検証を透過
await apiFetch<User[]>('https://api.example.com/users', {
  fetchOptions: { next: { revalidate: 60, tags: ['users'] } },
});

// エラーは型付き
try {
  await apiFetch('https://api.example.com/none');
} catch (e) {
  if (e instanceof HttpError) console.error(e.status, e.url, e.body);
}

// 特定 API は薄くラップして使う
function githubFetch<T>(path: string, opts = {}) {
  return apiFetch<T>(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
    ...opts,
  });
}
```

## オプション

`apiFetch<T>(url, options)` の主なオプション:

| キー | 既定 | 説明 |
| --- | --- | --- |
| `method` | `GET` | HTTP メソッド |
| `headers` | `{}` | リクエストヘッダ |
| `query` | – | クエリ。`URLSearchParams` でエンコード。`undefined`/`null` は除外 |
| `body` | – | 指定すると JSON 化し `Content-Type: application/json` を付与 |
| `timeoutMs` | `10000` | 試行ごとのタイムアウト（`AbortSignal.timeout`） |
| `retries` | `3` | リトライ回数（初回除く）。`0` で無効 |
| `retryBaseMs` | `500` | バックオフ基準待ち時間 |
| `fetchOptions` | `{}` | `fetch` へ透過（`cache` / `next` 等） |
| `signal` | – | 呼び出し側の中断シグナル（タイムアウトと統合） |

## API 通信で考慮すべきこと（api-client.ts が面倒を見る）

- **タイムアウト**: `fetch` は既定で無制限 → `AbortSignal.timeout` で試行ごとに打ち切る。
- **リトライ＋指数バックオフ＋ジッタ**: 429 / 408 / 5xx / ネットワーク断のみ再試行。
  `Retry-After`・`X-RateLimit-Reset` を尊重。4xx（429 除く）は再試行しない。
  **冪等でない POST 等を自動リトライする場合は重複実行に注意**（必要なら `retries: 0`）。
- **型付きエラー**: 非 2xx は `HttpError`（`status` / `statusText` / `url` / `body`）として投げる。
- **クエリ組立**: `URLSearchParams` で安全にエンコード（日本語も可）。
- **キャッシュ/再検証**: `fetchOptions` をそのまま `fetch` へ。Next.js の `next:{revalidate,tags}` や
  `cache:'no-store'` を利用側で渡せる。
- **ログ衛生**: 認証情報をログ・エラーに含めない（URL とステータスのみ）。

## 利用側が担うこと（このスキルには入れない）

- **認証情報の秘匿**: APIキー/トークンは環境変数に置き、サーバ専用にする
  （`NEXT_PUBLIC_`/`PUBLIC_` を付けない）。`apiFetch` にヘッダとして渡すのは利用側の責務。
- **ベース URL・エンドポイント・レスポンス型**: 個別 API 用の薄いラッパーで定義する。

## Edge cases

- **`AbortSignal.any` 非対応ランタイム** → 呼び出し側 `signal` とタイムアウトの統合ができない環境では
  タイムアウトを優先する（実装側でフォールバック済み）。
- **204 No Content / 空ボディ** → `undefined` を返す（`res.json()` で落ちない）。
- **JSON でないレスポンス** → エラー時はテキストとして `HttpError.body` に格納する。
- **POST/PUT を使う** → 非冪等なので、自動リトライの重複実行リスクを理解した上で `retries` を調整する。
- **古いランタイム** → `fetch` / `AbortSignal.timeout` は Node 18+ が必要。古ければ更新を促す。
