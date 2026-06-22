---
name: ato-microcms-types
description: microCMS の API スキーマ JSON から TypeScript の型定義ファイルを生成する。管理画面でエクスポートしたスキーマ（apiFields / customFields）を読み、各フィールド種別（text / textArea / richEditor / select / media / mediaList / date / boolean / number / relation / repeater / custom など）を TS 型へ変換する。生成した型は ato-microcms-fetch の endpoints.ts に登録して使える。ユーザーが microCMS のコンテンツ型定義の作成・型生成・スキーマからの型起こしを求めたときに使う。
license: MIT
metadata:
  author: yanai
  version: "1.0"
---

# microCMS Types

microCMS の **API スキーマ JSON** から、コンテンツの **TypeScript 型定義**を生成するスキル。
生成した型は [ato-microcms-fetch](../ato-microcms-fetch/SKILL.md) の `endpoints.ts` に登録して
型安全な取得に使う。

## 方針（これだけは守る）

- **結果・進捗の報告はすべて日本語で行う（絶対事項）。** 生成したファイル・警告（relation 等）を日本語で伝える。
- **入力はスキーマ JSON。** 管理画面の「API設定 → スキーマ → エクスポート」で出力した JSON を使う
  （サンプルレスポンスからの推論はしない。select のユニオンや media の形を正確に出すため）。
- **生成するのは「フィールドだけ」の型。** `id` / `createdAt` / `updatedAt` 等の共通フィールドは
  ato-microcms-fetch の `MicroCMSListContent` が付与するので**型に含めない**。
- **`MicroCMSImage` は共通型。** `media` 系で使う画像型は ato-microcms-fetch のライブラリ
  （`@/lib/microcms/microcms`）に置き、生成型は**そこから import して共有する**（各ファイルに重複定義しない）。

## 構成

| ファイル | 役割 |
| --- | --- |
| `scripts/schema-to-types.mjs` | スキーマ JSON を読み、TS 型を生成する依存ゼロのスクリプト。 |

## Instructions

1. **スキーマ JSON を用意する。** 管理画面の「API設定 → スキーマ → エクスポート」で対象 API の
   JSON を保存してもらう（または既にあるものを受け取る）。
   - **エンドポイント名はエクスポートファイル名から取る。** スキーマ JSON の中身にエンドポイント名は
     入っていない。ファイル名 `api-{endpoint}-<日時>.json` の `{endpoint}` 部分が API のエンドポイント名
     （= `endpoints.ts` に登録するキー）。例: `api-post-20260622150906.json` → `post`、型名は `Post`。
2. **生成する。** `scripts/schema-to-types.mjs` を実行する。`--name` で型名（通常はエンドポイント名の
   PascalCase）を指定する。
   ```bash
   node scripts/schema-to-types.mjs ./api-post-20260622150906.json --name Post --out src/types/microcms/post.ts
   ```
   `--out` 省略時は標準出力。`--out` の親ディレクトリ（`types/microcms/` 等）が無くてもスクリプトが
   自動で作る。`media` を使う型は共通の `MicroCMSImage` をライブラリから import する
   （`--lib`、既定 `@/lib/microcms/microcms`）。import パスがプロジェクトと違う場合だけ `--lib` で指定する。
3. **警告に対応する。** `relation` / `relationList` は参照先 API の型に依存し depth で形が変わるため、
   `unknown` で出力し警告する。**参照先の型に手で置き換える**（下の「relation の置換」を参照）。
   `[warn]` を読んでユーザーに伝える。
4. **配置する。** 生成物は `src/types/microcms/<endpoint>.ts`（等）に置く。ドメイン型はライブラリと
   分離する（[ato-microcms-fetch](../ato-microcms-fetch/SKILL.md) の方針と合わせる）。
   - **`src/` が無いプロジェクト**（root に `app/` を直置きする構成など）では、root の `types/microcms/`
     に置く（取得ラッパーも root の `lib/` 側に合わせる）。`src/` の有無を最初に確認する。
5. **endpoints.ts に登録する／スタブを置換する。** ato-microcms-fetch を使う場合、生成した型を import して
   `MicroCMSListEndpoints` / `MicroCMSObjectEndpoints` に追加する。
   ```ts
   import type { Blog } from '@/types/microcms/blog';
   export interface MicroCMSListEndpoints {
     blogs: Blog;
   }
   ```
   - **先にスタブ（`STUB` / `TODO(ato-microcms-types)` 印）で仮登録されていないか確認し、あれば
     本物の型に置換する**（取得側で先にエンドポイントだけ登録するときの暫定型。
     [ato-microcms-fetch](../ato-microcms-fetch/SKILL.md) の「型が未生成のままエンドポイントを登録する」参照）。
   - **relation の参照先型のスタブも同様に置換する。** 例: `Post.category` 用に `PostCategory` が
     スタブで置かれていたら、今回生成した本物に差し替える。
   - 登録で interface が空でなくなったら、`endpoints.ts` のその行の `eslint-disable`（空 registry 用）は
     不要になるので外す。
6. **整形する。** スクリプトの出力は素の TS。引用符・カンマ・改行の規約はプロジェクトの
   フォーマッタに合わせる。**Prettier 等があれば生成物にかける**（例 `npx prettier --write types/microcms/<endpoint>.ts`）。
7. **型チェックする。** `tsc --noEmit`（あれば `lint` も）で生成物が通ることを確認し、結果を日本語で報告する。

## フィールド種別 → TS マッピング

| kind | TS 型 | 備考 |
| --- | --- | --- |
| `text` / `textArea` / `richEditor` / `richEditorV2` | `string` | リッチエディタは HTML 文字列 |
| `number` | `number` | |
| `boolean` | `boolean` | |
| `date` | `string` | ISO 8601 文字列 |
| `select` | `(リテラルユニオン)[]` | **単一選択でも配列で返る**。`selectItems` の value からユニオン生成 |
| `media` | `MicroCMSImage` | 共通型をライブラリから import（各ファイルに重複定義しない） |
| `mediaList` | `MicroCMSImage[]` | 同上 |
| `file` | `{ url: string }` | |
| `iframe` | `Record<string, unknown>` | 拡張フィールド |
| `relation` | `unknown`（要手修正） | 参照先 API の型へ置換。depth で形が変わる |
| `relationList` | `unknown[]`（要手修正） | 同上の配列 |
| `custom` | カスタムフィールド型 | `customFields` から生成（`fieldId` リテラル付き） |
| `repeater` | `(カスタム型 union)[]` | 参照先カスタムフィールドのユニオン配列 |

- 非 `required` フィールドは `?:`（任意）で出力する。

## relation の置換（手作業の要点）

`relation` / `relationList` は `unknown` で出力されるので手で置き換える。ポイントは
**取得ラッパーは入れ子の relation には共通フィールドを自動付与しない**こと。トップレベルの
コンテンツには `MicroCMSListContent` が `id` / `createdAt` 等を付けるが、`depth` で展開された
参照先には付かない。そのため**参照先の本体型を自分で `MicroCMSListContent<Ref>` でラップする**。

```ts
import type { MicroCMSListContent } from '@/lib/microcms/microcms';
import type { Category } from '@/types/microcms/category';

export type Post = {
  title: string;
  // depth>=1 で展開され、参照先にも id/createdAt 等が付くので MicroCMSListContent でラップ
  category: MicroCMSListContent<Category>;        // relation
  // relationList は配列
  // tags: MicroCMSListContent<Tag>[];             // relationList
  // depth=0（参照を展開しない）なら ID だけ
  // category: { id: string };
};
```

- 参照先の型（例 `Category`）は、その API のスキーマからこのスキルで別途生成する。
- **参照先のスタブを空 `{}` で置かない。** `@typescript-eslint/no-empty-object-type` で lint が落ちる。
  最低 1 フィールド（例 `{ name: string }`）か、暫定なら `Record<string, unknown>` を入れる。

## Examples

**入力（スキーマ JSON 抜粋）:**
```json
{ "apiFields": [
  { "fieldId": "title", "kind": "text", "required": true },
  { "fieldId": "status", "kind": "select", "selectItems": [{"value":"draft"},{"value":"published"}] },
  { "fieldId": "eyecatch", "kind": "media" }
] }
```
**出力:**
```ts
// MicroCMSImage はライブラリの共通型を import して共有する（各ファイルに重複定義しない）。
import type { MicroCMSImage } from '@/lib/microcms/microcms';

export type Blog = {
  title: string;
  status?: ("draft" | "published")[];
  eyecatch?: MicroCMSImage;
};
```

## Edge cases

- **relation / relationList** → 参照先 API の型は別スキーマなので自動解決できない。`unknown` で出し、
  参照先の型へ手で置換する。取得時 `depth` が 0 なら `{ id: string }`、1 以上なら参照先の本体になる。
  **入れ子の参照先には共通フィールドが自動付与されないので `MicroCMSListContent<Ref>` でラップする**
  （上の「relation の置換」参照）。
- **custom（単一カスタムフィールド）** → `customFieldCreatedAt`（単数）で 1 つの customField を参照する。
  repeater の `customFieldCreatedAtList`（複数）と別物だが、スクリプトは両対応済み。参照先を JSON から
  特定できた場合は単一型に解決し（union にしない）、できない場合のみ全 customField の union + 警告。
- **select は常に配列** → 単一選択でも `string[]` 相当で返る microCMS 仕様に合わせている。
- **repeater / custom** → `customFields` から型を生成し union 化する。参照先を JSON から特定できない場合は
  全 customField の union にして警告する（必要なら手で絞る）。
- **共通フィールドが重複する** → 生成物に `id` / `createdAt` 等は含めない。付与は取得ラッパーの責務。
  もし手で付ける場合は二重定義に注意。
- **未知の kind** → `unknown` にして警告する。microCMS の新フィールド種別が増えた場合はマッピングを追記する。
- **スキーマ JSON でない / apiFields が無い** → スクリプトがエラーで止まる。エクスポート JSON か確認する。
