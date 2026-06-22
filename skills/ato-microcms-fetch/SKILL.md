---
name: ato-microcms-fetch
description: microCMS のコンテンツを SDK 不使用・標準 fetch だけで取得する TypeScript ライブラリを導入する。汎用 fetch ラッパー（タイムアウト・リトライ・型付きエラー）と microCMS 層（リスト取得 getList・詳細取得 getListDetail・全件取得 getAllContents・オブジェクト形式 getObject）に分離し、エンドポイント名→型のマップで登録した API だけを型安全に受け付ける（未登録名は型エラー）。API キーは環境変数に集約する。ユーザーが microCMS からのデータ取得・API 連携・記事一覧/詳細の fetch 実装を求めたときに使う。【依存】汎用クライアント ato-fetch-client が必須。使う前にその導入を必ず確認する。
license: MIT
metadata:
  author: yanai
  version: "1.0"
---

# microCMS Fetch

microCMS のコンテンツ API を、**SDK を使わず標準 `fetch` だけ**で叩く TypeScript ライブラリを
プロジェクトへ導入するスキル。汎用の通信処理は別スキルに分離し、本スキルは microCMS 固有の
URL 組立・型付けに専念する。

> ## ⚠️ 依存スキル（必須）
>
> 本スキルは [**ato-fetch-client**](../ato-fetch-client/SKILL.md) が提供する `api-client.ts` に依存する
> （`microcms.ts` が `./api-client` を import する）。
>
> **使う前に、必ず ato-fetch-client の導入を確認すること。**
> - 配置先（既定 `src/lib/microcms/`）に `api-client.ts` があるか確認する。
> - 無ければ、**先に ato-fetch-client を適用**して同じディレクトリに置いてから本スキルを進める。
> - これを飛ばすと `Cannot find module './api-client'`（TS2307）になる。

## 方針（これだけは守る）

- **結果・進捗の報告はすべて日本語で行う（絶対事項）。** 配置したファイル、設定した env、
  検証結果は必ず日本語で伝える。
- **SDK（microcms-js-sdk）は使わない。** 標準 `fetch` のみ（Node 18+ / Edge / ブラウザ可）。
- **API キーは環境変数に集約し、サーバ専用にする。** `NEXT_PUBLIC_` / `PUBLIC_` などの公開
  プレフィックスは付けない（クライアントバンドルに漏れる）。ブラウザから直接叩かない。
- **fetch 層と microCMS 層を分ける。** 汎用処理（タイムアウト・リトライ・エラー）は
  ato-fetch-client の `api-client.ts` に任せ、`microcms.ts` は URL 組立と型付けに専念する。

## 構成（配置するファイル）

`assets/lib/` の 3 ファイルを、`api-client.ts`（ato-fetch-client 由来）と**同じディレクトリ**
（例 `src/lib/microcms/`）へコピーする。

| ファイル | 役割 |
| --- | --- |
| `microcms.ts` | microCMS 層。`getList` / `getListDetail` / `getAllContents` / `getObject` と型定義（`MicroCMSListContent` / `MicroCMSImage` 等の共通型を提供）。`./api-client` を import。 |
| `endpoints.ts` | **エンドポイント名 → コンテンツ型のマップ**。ここに登録した名前だけが各関数で受け付けられ、戻り値の型も自動で決まる。 |
| `env.ts` | 必須環境変数（`MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY`）の検証。 |
| `api-client.ts` | （[ato-fetch-client](../ato-fetch-client/SKILL.md) が配置）汎用 fetch ラッパー。 |

## Instructions

1. **依存スキルの有無を最初に確認する。** 配置先（既定 `src/lib/microcms/`）に `api-client.ts` が
   あるか確認する。**無ければ先に [ato-fetch-client](../ato-fetch-client/SKILL.md) を適用**して
   同じディレクトリへ置く。これが揃うまで以降の手順に進まない。
2. **ライブラリを配置する。** `assets/lib/{microcms,endpoints,env}.ts` を、`api-client.ts` と同じ
   ディレクトリに置く（`microcms.ts` は `./api-client` を import する）。JS プロジェクトなら
   ユーザーに TS 化 or `.js` への読み替えを確認する。既存の同名ファイルは上書き前に確認する。
   - **配置先は `src/` の有無で決める。** `src/` があれば `src/lib/microcms/`、**無ければ root の
     `lib/microcms/`**（root に `app/` を直置きする Next.js 構成など）。型の置き場所も同様に
     `src/types/microcms/` か root `types/microcms/` に合わせる。
   - **資材そのもの（このスキルの `assets/` や、リポジトリにスキルを同梱している場合）を
     プロジェクトの tsconfig が拾わないようにする。** 下の Edge cases「TS2307」を参照。
3. **エンドポイントを登録する（型安全の要）。** `endpoints.ts` の `MicroCMSListEndpoints` /
   `MicroCMSObjectEndpoints` に、プロジェクトの各 API を「エンドポイント名 → コンテンツ型」で
   追加する。**ここに登録した名前以外は各関数で型エラーになる。**
   - **型の用意は次の順で判断する（型未生成のままの登録）。**
     1. **既にある型を使う。** ユーザーが型を持っていないか確認する。あればファイルを教えてもらい
        import する（例 `import type { NewsType } from '@/types/news'`）。
     2. **その場で生成する。** 無ければスキーマ JSON（管理画面の「API設定 → スキーマ → エクスポート」）を
        出してもらい、[ato-microcms-types](../ato-microcms-types/SKILL.md) で型を起こしてから登録する。
        これが基本ルート。
     3. **スタブで仮登録する。** スキーマが今すぐ出せない等で型を作れないときだけ、ビルドを止めない
        ための暫定型を置く（下の「型が未生成のままエンドポイントを登録する」）。**後で必ず本物に置換する。**
   - **エンドポイント名はスキーマのエクスポートファイル名から取る。** スキーマ JSON の中身には
     エンドポイント名が無い。ファイル名 `api-{endpoint}-<日時>.json` の `{endpoint}` がそれ
     （例: `api-post-20260622150906.json` → `post`）。これが `endpoints.ts` の登録キーになる。
   - **1 API ごとの型は `src/types/microcms/`（等）に分け、`endpoints.ts` は import とマップだけにする。**
     ドメイン型はプロジェクト固有の知識なので、汎用の `lib/` 3 ファイルとは置き場所を分ける
     （型が増えても索引が肥大化せず、将来の型自動生成とも干渉しない）。ごく小さい型のみインライン可。
   - **`media` の画像型は `microcms.ts` の共通 `MicroCMSImage` を使う。** 各ドメイン型に重複定義せず
     `import type { MicroCMSImage } from '@/lib/microcms/microcms'` で共有する（ato-microcms-types の生成物もこれに合わせる）。
4. **環境変数を設定する。** `assets/env.example` を参考に、プロジェクトの `.env.example` へ 2 変数を
   追記し、`.env.local`（または `.env`）に実値を設定する。`.gitignore` が `.env.local` /
   `.env*.local` を除外しているか確認し、していなければ追記する（**実キーをコミットしない**）。
5. **取得パターンを使う。** 用途に応じて 4 関数を呼ぶ（下の「使い方」）。登録済みエンドポイント名を
   渡すだけで戻り値が型付くので、明示的な型引数は不要。`getAllContents` はレート制限に配慮して
   直列で `limit=100` ループする。
6. **キャッシュ方針を決める。** Next.js / Astro それぞれの方法（下の「キャッシュ」）で
   `fetchOptions` を渡す。既定はラッパーの素の挙動（ランタイム依存）。
7. **検証する。** 代表的な取得（リスト1回・詳細1回）を実行するか、型チェック（`tsc --noEmit`）で
   配置物がプロジェクトの設定で通ることを確認する。報告は日本語でまとめる。

## 使い方

まず `endpoints.ts` に API を登録する（これが型の正）:

```ts
// endpoints.ts
import type { NewsType } from '@/types/news';

export interface MicroCMSListEndpoints {
  news: NewsType;                          // 例: { title: string }
  blogs: { title: string; body: string };
}
export interface MicroCMSObjectEndpoints {
  config: { siteTitle: string };
}
```

あとは登録名を渡すだけで型が決まる（**`<NewsType>` のような型引数は書かない**。未登録名はコンパイルエラー）:

```ts
import { getList, getListDetail, getAllContents, getObject } from '@/lib/microcms/microcms';

// リスト取得（戻り値は MicroCMSListResponse<NewsType & {id, createdAt...}>）
const list = await getList('news', { limit: 10, orders: '-publishedAt', fields: ['id', 'title'] });
list.contents[0].title; // string ✓   list.totalCount / offset / limit

// 詳細取得
const post = await getListDetail('blogs', 'CONTENT_ID', { depth: 2 });
post.body; // string ✓

// 下書きプレビュー
const draft = await getListDetail('blogs', 'CONTENT_ID', { draftKey: 'xxxx' });

// 全件取得（totalCount まで自動ループ。最大件数も指定可）
const all = await getAllContents('news', { filters: 'category[equals]news' });

// オブジェクト形式
const config = await getObject('config');
config.siteTitle; // string ✓

// 未登録のエンドポイントは型エラー
// await getList('unknown'); // ✗ コンパイルエラー
```

## 型が未生成のままエンドポイントを登録する（スタブ）

型をまだ起こせないが取得側を先に書きたいときの暫定手段。**基本は先に型生成（上の手順3-2）**で、
これはあくまでつなぎ。

```ts
// endpoints.ts
export interface MicroCMSListEndpoints {
  // TODO(ato-microcms-types): スキーマから型生成して置換する。 STUB
  post: Record<string, unknown>;
}
```

- **スタブ型は `Record<string, unknown>` を使う。** `{}` / `any` は使わない（`{}` は
  `@typescript-eslint/no-empty-object-type` で落ち、`any` は型安全を失う）。
- **必ず `STUB` と `TODO(ato-microcms-types)` の印を付ける。** 後で [ato-microcms-types](../ato-microcms-types/SKILL.md)
  が型を生成したとき、この印を目印にスタブを本物の import へ置換する（往復の取り決め）。
- **relation の参照先も同じ。** `Post.category` が `PostCategory` を参照するなら、`PostCategory` が
  未生成のうちはその型ファイルを `export type PostCategory = Record<string, unknown>; // STUB` で仮置きし、
  生成時に差し替える（空 `{}` で置かない）。
- 置換が済んだらスタブの行・印・（空でなくなった interface の）`eslint-disable` を消す。

## クエリ

`MicroCMSQueries` で指定する: `limit`(最大100) / `offset` / `orders`(例 `-publishedAt`) /
`q`(全文検索) / `fields`(配列可) / `ids`(配列可) / `filters`(例 `category[equals]xxxx`) /
`depth`(1–3) / `draftKey` / `richEditorFormat`。配列は自動でカンマ区切りに、`undefined` は除外される。

## キャッシュ（fetchOptions の透過）

第3引数 `options.fetchOptions` が `fetch` にそのまま渡る。

```ts
// Next.js (App Router): ISR / タグ再検証
await getList('blogs', { limit: 10 }, {
  fetchOptions: { next: { revalidate: 60, tags: ['blogs'] } },
});
// 毎回最新にしたいとき
await getListDetail('blogs', id, undefined, { fetchOptions: { cache: 'no-store' } });
```

- **Astro:** SSG（ビルド時取得）は `await` するだけ。SSR で都度取得したいときは
  `fetchOptions: { cache: 'no-store' }` を渡す。

## 通信で考慮済みの点

タイムアウト・リトライ（指数バックオフ＋ジッタ、`Retry-After`/`X-RateLimit-Reset` 尊重）・
型付き `HttpError`・クエリ組立・ログ衛生は、すべて [ato-fetch-client](../ato-fetch-client/SKILL.md) の
`api-client.ts` が担う。microCMS の GET は冪等なので自動リトライも安全。詳細はそちらを参照。
各取得関数は `timeoutMs` / `retries` / `fetchOptions` 等をそのまま受け取り `apiFetch` に渡す。

## Edge cases

- **新しいエンドポイントを使いたい / 型エラーになる** → `endpoints.ts` のマップに登録すれば解決する。
  登録名以外は受け付けない設計なので、`getList('xxx')` がエラーなら未登録のサイン。
- **空の registry が lint で落ちる（`@typescript-eslint/no-empty-object-type`）** → `endpoints.ts` の
  `MicroCMSListEndpoints` / `MicroCMSObjectEndpoints` は未登録のうち**空インターフェイス**になり
  TS-ESLint 構成で落ちる。型の正しさ上は空が正解（`keyof` が `never` になり全名を弾く）なので、
  `Record<string, never>` 等に置き換えてはいけない（`keyof` が `string` になり全名を受け入れてしまう）。
  **空のままにする side には直前に `// eslint-disable-next-line @typescript-eslint/no-empty-object-type` を
  付ける。** エンドポイントを 1 つ登録して空でなくなったら、その行は不要（ESLint 9 は未使用 disable も
  warn する）なので外す。テンプレートは両 interface に disable 付きで配布している。
- **オブジェクト形式 vs リスト形式** → API スキーマで決まり、`endpoints.ts` でも別のマップに登録する。
  オブジェクト形式は `MicroCMSObjectEndpoints` + `getObject`、リスト形式は `MicroCMSListEndpoints` +
  `getList` / `getListDetail`。登録先と関数が食い違うと型エラーになる。
- **全件取得が重い / 件数が多い** → `getAllContents` は直列ループ。`fields` で必要列に絞り、
  `maxContents` で上限を設ける。レート制限（429）はラッパーが自動でバックオフ再試行する。
- **下書きプレビュー** → `draftKey` を渡す。プレビュー経路は必ずサーバ側で実行し、キーを露出しない。
- **API キーが漏れる** → `NEXT_PUBLIC_` / `PUBLIC_` を付けていないか、クライアントコンポーネントから
  呼んでいないかを確認。取得はサーバ（Server Component / route handler / build 時）で行う。
- **環境変数未設定** → `env.ts` が起動時に分かりやすい日本語エラーを投げる。`.env.local` を確認する。
- **古いランタイム** → `fetch` / `AbortSignal.timeout` は Node 18+ が必要。古ければ更新を促す。
- **スキル資材が tsc / next build を壊す（TS2307）** → スキルのソース（`assets/lib/microcms.ts`）は
  隣に無い `./api-client` を import するため、これがプロジェクトの型チェック対象に入ると
  `Cannot find module './api-client'`（TS2307）で**ビルド全体が落ちる**。`tsconfig.json` の `include`
  が `**/*.ts` などで広いと、配布前の `assets/` を拾ってしまう。
  - **対処:** プロジェクトに導入するのは `assets/lib/` の中身を**配置先へコピーした実体だけ**にし、
    スキルのソースツリー（`assets/`）は `tsconfig.json` の `exclude` に追加する。
    例: `"exclude": ["node_modules", "**/assets/**"]`。
  - コピー後の実体は `api-client.ts` と同じディレクトリに揃うので TS2307 は起きない（原因は
    あくまで「依存先が隣に無いスキルソースを拾ったこと」）。
