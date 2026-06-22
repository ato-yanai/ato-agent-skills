# Agent Skills カタログ

このリポジトリは、複数の AI / エージェントで共有して使う **汎用スキル** のカタログです。
各スキルは [Agent Skills オープン標準](https://agentskills.io/specification) の `SKILL.md` 形式で
`skills/<name>/` に格納されています。

エージェント（あなた）がこのリポジトリを扱うときの約束:

- スキルを起動するか判断するときは、各 `skills/*/SKILL.md` の frontmatter（`name` / `description`）だけを見る。
- 起動すると決めたスキルの `SKILL.md` 本文を読み込む。説明は原則すべて本文にある（`references/` への分割は禁止）。
  例外として、大型・モード制スキルは各モードの手順を `modes/<mode>.md` に置くことがある。その場合は
  `SKILL.md` の指示（起動時のモード選択）に従い、選んだモードのファイルを読む。
- スキルの**追加・編集は `skills/<name>/SKILL.md`（と同階層のファイル）に対してのみ**行う。
  各ツール向けの配布は `npx skills` が行うため、インストール先のコピーを直接編集しない。

## 収録スキル

<!-- このセクションは手動メンテです。新規スキル追加時に1行追記してください。 -->

| スキル | 説明 |
| --- | --- |
| [ato-git-commit-message](skills/ato-git-commit-message/SKILL.md) | Conventional Commits 準拠のコミットメッセージを書く／レビューする |
| [ato-eslint-prettier-setup](skills/ato-eslint-prettier-setup/SKILL.md) | プロジェクトを検出して ESLint + Prettier（Next.js / Astro / Tailwind 等）を自動セットアップする |
| [ato-fetch-client](skills/ato-fetch-client/SKILL.md) | 標準 fetch だけで作る汎用 REST API クライアント（タイムアウト・リトライ・型付きエラー）を導入する |
| [ato-microcms-fetch](skills/ato-microcms-fetch/SKILL.md) | microCMS のコンテンツを SDK 不使用・fetch だけで取得する TypeScript ライブラリ（リスト／詳細／全件）を導入する。ato-fetch-client を土台にする |
| [ato-microcms-types](skills/ato-microcms-types/SKILL.md) | microCMS の API スキーマ JSON から TypeScript 型定義を生成する。ato-microcms-fetch の endpoints.ts に登録して使う |
| [ato-microcms-webhook](skills/ato-microcms-webhook/SKILL.md) | microCMS Webhook を受け、署名検証（HMAC-SHA256）して Next.js のオンデマンド再検証（revalidateTag）を叩く。ato-microcms-fetch のタグ規約と対で動く |
| [ato-design-doc](skills/ato-design-doc/SKILL.md) | 客先提出の設計書（機能一覧・サイト全体・microCMS・ページ・共通処理）を統一フォーマットで作成／レビューする。FN→SC/CM/CP→AC の採番でトレーサビリティを取り、状態網羅・非機能・版管理の抜けを防ぐ |

## 規約

`name` / `description` のルール、本文の書き方、新規作成手順は [CONTRIBUTING.md](CONTRIBUTING.md) が正。
