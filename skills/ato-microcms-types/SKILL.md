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

## 構成

| ファイル | 役割 |
| --- | --- |
| `scripts/schema-to-types.mjs` | スキーマ JSON を読み、TS 型を生成する依存ゼロのスクリプト。 |

## Instructions

1. **スキーマ JSON を用意する。** 管理画面の「API設定 → スキーマ → エクスポート」で対象 API の
   JSON を保存してもらう（または既にあるものを受け取る）。
2. **生成する。** `scripts/schema-to-types.mjs` を実行する。`--name` で型名（通常はエンドポイント名の
   PascalCase）を指定する。
   ```bash
   node scripts/schema-to-types.mjs ./blog.schema.json --name Blog --out src/types/microcms/blog.ts
   ```
   `--out` 省略時は標準出力。
3. **警告に対応する。** `relation` / `relationList` は参照先 API の型に依存し depth で形が変わるため、
   `unknown` で出力し警告する。**参照先の型（例 `MicroCMSListContent<Author>` や `{ id: string }`）に
   手で置き換える。** `[warn]` を読んでユーザーに伝える。
4. **配置する。** 生成物は `src/types/microcms/<endpoint>.ts`（等）に置く。ドメイン型はライブラリと
   分離する（[ato-microcms-fetch](../ato-microcms-fetch/SKILL.md) の方針と合わせる）。
5. **endpoints.ts に登録する。** ato-microcms-fetch を使う場合、生成した型を import して
   `MicroCMSListEndpoints` / `MicroCMSObjectEndpoints` に追加する。
   ```ts
   import type { Blog } from '@/types/microcms/blog';
   export interface MicroCMSListEndpoints {
     blogs: Blog;
   }
   ```
6. **型チェックする。** `tsc --noEmit` で生成物が通ることを確認し、結果を日本語で報告する。

## フィールド種別 → TS マッピング

| kind | TS 型 | 備考 |
| --- | --- | --- |
| `text` / `textArea` / `richEditor` / `richEditorV2` | `string` | リッチエディタは HTML 文字列 |
| `number` | `number` | |
| `boolean` | `boolean` | |
| `date` | `string` | ISO 8601 文字列 |
| `select` | `(リテラルユニオン)[]` | **単一選択でも配列で返る**。`selectItems` の value からユニオン生成 |
| `media` | `MicroCMSImage` | `{ url; height; width }` を同時生成 |
| `mediaList` | `MicroCMSImage[]` | |
| `file` | `{ url: string }` | |
| `iframe` | `Record<string, unknown>` | 拡張フィールド |
| `relation` | `unknown`（要手修正） | 参照先 API の型へ置換。depth で形が変わる |
| `relationList` | `unknown[]`（要手修正） | 同上の配列 |
| `custom` | カスタムフィールド型 | `customFields` から生成（`fieldId` リテラル付き） |
| `repeater` | `(カスタム型 union)[]` | 参照先カスタムフィールドのユニオン配列 |

- 非 `required` フィールドは `?:`（任意）で出力する。

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
export type MicroCMSImage = { url: string; height: number; width: number };

export type Blog = {
  title: string;
  status?: ("draft" | "published")[];
  eyecatch?: MicroCMSImage;
};
```

## Edge cases

- **relation / relationList** → 参照先 API の型は別スキーマなので自動解決できない。`unknown` で出し、
  参照先の型へ手で置換する。取得時 `depth` が 0 なら `{ id: string }`、1 以上なら参照先の本体になる。
- **select は常に配列** → 単一選択でも `string[]` 相当で返る microCMS 仕様に合わせている。
- **repeater / custom** → `customFields` から型を生成し union 化する。参照先を JSON から特定できない場合は
  全 customField の union にして警告する（必要なら手で絞る）。
- **共通フィールドが重複する** → 生成物に `id` / `createdAt` 等は含めない。付与は取得ラッパーの責務。
  もし手で付ける場合は二重定義に注意。
- **未知の kind** → `unknown` にして警告する。microCMS の新フィールド種別が増えた場合はマッピングを追記する。
- **スキーマ JSON でない / apiFields が無い** → スクリプトがエラーで止まる。エクスポート JSON か確認する。
