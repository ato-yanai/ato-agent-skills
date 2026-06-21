# Agent Skills カタログ

このリポジトリは、複数の AI / エージェントで共有して使う **汎用スキル** のカタログです。
各スキルは [Agent Skills オープン標準](https://agentskills.io/specification) の `SKILL.md` 形式で
`skills/<name>/` に格納されています。

エージェント（あなた）がこのリポジトリを扱うときの約束:

- スキルを起動するか判断するときは、各 `skills/*/SKILL.md` の frontmatter（`name` / `description`）だけを見る。
- 起動すると決めたスキルの `SKILL.md` 本文を読み込む。説明はすべて本文にある（`references/` への分割は禁止）。
- スキルの**追加・編集は `skills/<name>/SKILL.md`（と同階層のファイル）に対してのみ**行う。
  各ツール向けの配布は `npx skills` が行うため、インストール先のコピーを直接編集しない。

## 収録スキル

<!-- このセクションは手動メンテです。新規スキル追加時に1行追記してください。 -->

| スキル | 説明 |
| --- | --- |
| [git-commit-message](skills/git-commit-message/SKILL.md) | Conventional Commits 準拠のコミットメッセージを書く／レビューする |

## 規約

`name` / `description` のルール、本文の書き方、新規作成手順は [CONTRIBUTING.md](CONTRIBUTING.md) が正。
