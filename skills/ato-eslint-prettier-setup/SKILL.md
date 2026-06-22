---
name: ato-eslint-prettier-setup
description: ESLint と Prettier をプロジェクトに合わせて自動セットアップする。package.json・lockfile・設定ファイルを検査して Next.js / Astro / Vite+React / 汎用 のどれか、Tailwind や TypeScript を使っているかを判別し、ESLint 9 flat config・Prettier 設定・npm スクリプトを生成する。ユーザーが ESLint や Prettier の導入・設定、Lint やコード整形（フォーマッタ）のセットアップを求めたときに使う。
license: MIT
metadata:
  author: yanai
  version: "1.0"
---

# ESLint + Prettier Setup

プロジェクトを検出し、フレームワーク・Tailwind・TypeScript の有無に応じて
**ESLint 9 flat config** と **Prettier** を自動で構成するスキル。

## 方針（これだけは守る）

- **結果・進捗の報告はすべて日本語で行う（絶対事項）。** 実行したコマンド、生成・変更した
  ファイル、検証結果の要約は、必ず日本語でユーザーに伝える。
- **ESLint 9 の flat config（`eslint.config.mjs`）で書く。** `.eslintrc.*` の旧形式は作らない。
- **役割分担:** Prettier が整形、ESLint がコード品質。両者の整形ルール競合は
  **`eslint-config-prettier`** で無効化する（flat config の**最後**に置く）。
- **`eslint-plugin-prettier` は使わない。** Prettier を Lint ルールとして走らせる方式は遅く、
  エディタ統合とも二重になるため避ける。整形は `prettier` を直接実行する。
- 設定ファイルは常に **ESM の `eslint.config.mjs`** を生成する（`type` 設定に依存しないため）。

## Instructions

1. **検出する。** `scripts/detect.mjs` を実行し、出力 JSON を読む（対象を引数で渡せる）。
   ```bash
   node scripts/detect.mjs            # カレント
   node scripts/detect.mjs ./app      # ディレクトリ指定
   ```
   `framework` / `tailwind` / `typescript` / `packageManager` / `moduleType` /
   `existingEslint` / `existingPrettier` / `hasLegacyEslintrc` を確認する。
   `hasPackageJson` が false なら、先に `npm init -y` 等が必要な旨を伝える。
2. **既存設定を確認する。** `existingEslint` / `existingPrettier` が空でなければ、
   **上書き前に必ずユーザーへ確認**する。`hasLegacyEslintrc` が true なら
   「`.eslintrc.*` を flat config へ移行し、旧ファイルは削除する」方針を伝える（両方残さない）。
3. **パッケージを導入する。** 「フレームワーク別パッケージ」表のものを、検出した
   `packageManager` の devDependencies に追加する（「PM 別インストール」参照）。
   Tailwind・Astro・TypeScript の追加分は「追記ルール」に従う。
4. **ESLint 設定を作る。** `framework` に対応する `assets/eslint/<framework>.mjs`
   （`next` / `astro` / `react` / `generic`）をプロジェクト直下に **`eslint.config.mjs`** として置く。
   `vite-react` と `react` はどちらも `react.mjs`。`vue` / `svelte` は「Edge cases」を参照。
   TypeScript 非使用ならテンプレ冒頭コメントの指示どおり TS 関連行を外す。
5. **Prettier 設定を作る。** `assets/prettier/prettierrc.base.json` を **`.prettierrc.json`** として、
   `assets/prettier/prettierignore` を **`.prettierignore`** として置く。
   Tailwind / Astro があれば `plugins` を追記する（「追記ルール」、**順序に注意**）。
6. **スクリプトを追加する。** `package.json` の `scripts` に追記する:
   ```json
   "lint": "eslint .",
   "lint:fix": "eslint . --fix",
   "format": "prettier --write .",
   "format:check": "prettier --check ."
   ```
   `format`（`prettier --write .`）は、次の手順で入れる VSCode の保存時整形と
   **同じ `.prettierrc.json` を使うため結果が一致する**（コマンド整形＝保存時整形）。
7. **VSCode 連携を作る（保存時に自動整形）。** `assets/vscode/settings.json` を
   プロジェクトの **`.vscode/settings.json`** として、`assets/vscode/extensions.json` を
   **`.vscode/extensions.json`** として置く。既存の `.vscode/settings.json` があれば
   上書きせずキーをマージする。
   - `editor.formatOnSave: true` + 既定フォーマッタを Prettier にして、保存時に整形する。
   - `prettier.requireConfig: true` で、プロジェクトに Prettier 設定があるときだけ整形する
     （CLI の `prettier --write` と必ず同じ設定・同じ結果になることを保証する）。
   - **Astro の場合**は `settings.json` に `"[astro]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }`
     を追記し、`extensions.json` の推奨に `"astro-build.astro-vscode"` を加える。
8. **検証する。** `<pm> run lint` と `<pm> run format:check` を実行し、設定エラーや
   未解決の依存がないか確認する。問題があれば設定を調整してから完了とする。
   報告（実行内容・生成物・検証結果）は日本語でまとめる。

## フレームワーク別パッケージ

すべて devDependencies。Prettier 本体（`prettier`）は全構成で共通で入れる。

| framework | ESLint 関連パッケージ |
| --- | --- |
| `next` | `eslint` `eslint-config-next` `@eslint/eslintrc` `eslint-config-prettier` |
| `astro` | `eslint` `@eslint/js` `typescript-eslint` `eslint-plugin-astro` `eslint-config-prettier` |
| `vite-react` / `react` | `eslint` `@eslint/js` `globals` `typescript-eslint` `eslint-plugin-react-hooks` `eslint-plugin-react-refresh` `eslint-config-prettier` |
| `generic` | `eslint` `@eslint/js` `globals` `typescript-eslint` `eslint-config-prettier` |

- **`next`** は TypeScript 対応を `eslint-config-next`（`next/typescript`）が内包するため、
  別途 `typescript-eslint` は不要。
- **`astro`** の `astro-eslint-parser` は `eslint-plugin-astro` が依存として導入する。

## PM 別インストール

| packageManager | devDependencies 追加コマンド |
| --- | --- |
| `npm` | `npm install -D <pkgs>` |
| `pnpm` | `pnpm add -D <pkgs>` |
| `yarn` | `yarn add -D <pkgs>` |
| `bun` | `bun add -d <pkgs>` |

## 追記ルール（Tailwind / Astro / TypeScript）

- **Tailwind:** Prettier に `prettier-plugin-tailwindcss` を追加。
  `.prettierrc.json` の `plugins` 配列の **必ず最後**に置く（最後でないとクラス整列が効かない）。
  ESLint 側のプラグインは入れない（Tailwind v4 への追従が不十分なため）。
- **Astro:** ESLint はテンプレ（`astro.mjs`）が対応済み。Prettier に `prettier-plugin-astro` を追加し、
  `.prettierrc.json` に overrides を加える:
  ```json
  {
    "plugins": ["prettier-plugin-astro"],
    "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
  }
  ```
  Astro + Tailwind 併用時は `"plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"]`
  （Tailwind を最後に）。
- **TypeScript 非使用:** 各 ESLint テンプレ冒頭コメントの指示に従い、`typescript-eslint` の import と
  `...tseslint.configs.recommended` を外す。導入パッケージからも `typescript-eslint` を除く。
  TypeScript は使うが未インストールなら `typescript` も devDependencies に追加する。

## Examples

**入力（detect.mjs の出力）:** Next + Tailwind + TypeScript
```json
{ "framework": "next", "tailwind": true, "typescript": true,
  "packageManager": "pnpm", "existingEslint": [], "existingPrettier": [] }
```
**出力（実行する操作）:**
```bash
pnpm add -D eslint eslint-config-next @eslint/eslintrc eslint-config-prettier \
  prettier prettier-plugin-tailwindcss
```
- `eslint.config.mjs` ← `assets/eslint/next.mjs`
- `.prettierrc.json` ← base に `"plugins": ["prettier-plugin-tailwindcss"]` を追記
- `.prettierignore` ← `assets/prettier/prettierignore`
- `.vscode/settings.json` / `.vscode/extensions.json` ← `assets/vscode/`
- `package.json` に lint / format スクリプトを追記
- `pnpm run lint` / `pnpm run format:check` で検証（結果は日本語で報告）

## Edge cases

- **既存の `.eslintrc.*`（旧形式）がある** → flat config へ移行し、旧ファイルは削除。両形式を併存させない。
- **`vue` / `svelte` を検出** → 本スキルのテンプレは未提供。`generic` を土台に、それぞれ
  `eslint-plugin-vue` / `eslint-plugin-svelte` と対応する Prettier プラグイン
  （`prettier-plugin-svelte` 等）を加える方針をユーザーに伝えてから進める。
- **monorepo** → リポジトリのルートではなく、対象パッケージのディレクトリで `detect.mjs` を実行する。
  共有設定にしたい場合はルートに置いて各パッケージから extends する構成を提案する。
- **Node バージョン** → ESLint 9 は Node 18.18+ / 20+ が必要。古い環境では先に更新を促す。
- **Tailwind v4** → `tailwind.config.js` が無く CSS で `@import "tailwindcss"` する構成がある。
  検出は devDependencies の `tailwindcss` で判定済みなので、設定ファイルが無くても Tailwind 扱いでよい。
- **`prettier-plugin-tailwindcss` が複数プラグインの途中にある** → クラス整列が無効化される。常に配列の最後に置く。
- **保存時整形と `npm run format` の結果がずれる** → 両者は同じ `.prettierrc.json` を使う限り一致する。
  ずれる場合は、VSCode が別のフォーマッタを使っている（言語別 `defaultFormatter` を確認）か、
  プロジェクト外（グローバル）の Prettier 設定を拾っている。`prettier.requireConfig: true` と
  言語別 `defaultFormatter` の指定で防ぐ。
- **保存時に ESLint の自動修正もしたい** → 既定では保存時整形は Prettier のみ（コマンドと一致させるため）。
  併用するなら `.vscode/settings.json` に
  `"editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }` を加え、
  同じ結果を得るコマンドは `eslint --fix . && prettier --write .` とする（両方を必ずセットで変更する）。
- **`esbenp.prettier-vscode` / `dbaeumer.vscode-eslint` 拡張が未導入** → 保存時整形・Lint 表示が効かない。
  `.vscode/extensions.json` の推奨で導入を促す（VSCode が通知する）。
