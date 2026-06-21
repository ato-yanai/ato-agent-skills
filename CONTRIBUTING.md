# スキルの書き方ガイド

このリポジトリにスキルを追加・編集するときの規約です。
フォーマットは [Agent Skills オープン標準](https://agentskills.io/specification) に準拠します。

## 0. 禁止事項（絶対に守る）

- **`references/` に分割しない。説明・詳細・早見表はすべて `SKILL.md` 本文に書く。**
  別ファイルへの分割は段階読み込みの手間を増やすだけなので、このリポジトリでは行わない。
- **`Co-Authored-By:` などの共同編集者トレーラー・ツール署名をコミットに付けない。**
  単独の作者として書く（詳細は [git-commit-message](skills/git-commit-message/SKILL.md)）。

## 1. ディレクトリ構成

1スキル = `skills/<name>/` 1ディレクトリ。**原則 `SKILL.md` 1ファイルで完結させる。**

```
skills/<name>/
├── SKILL.md          # 必須: メタデータ + 指示本文（説明はすべてここに書く）
├── scripts/          # 任意: 実行可能なコード
└── assets/           # 任意: テンプレート・データ・画像など
```

新規作成はひな形をコピーして始める:

```bash
# macOS / Linux / Git Bash
cp -r templates/skill-template skills/<name>
```
```powershell
# Windows PowerShell
Copy-Item -Recurse templates/skill-template skills/<name>
```

## 2. SKILL.md の frontmatter

```yaml
---
name: my-skill-name          # 必須
description: ...             # 必須
license: MIT                 # 任意
metadata:                    # 任意
  author: your-name
  version: "1.0"
compatibility: ...           # 任意（特別な環境要件があるときだけ）
allowed-tools: Read Bash     # 任意・実験的
---
```

### 必須フィールドの規則

| フィールド | 規則 |
| --- | --- |
| `name` | 1–64 文字 / 小文字英数とハイフンのみ / 先頭・末尾にハイフン不可 / 連続ハイフン `--` 不可 / **ディレクトリ名と一致** / `anthropic`・`claude` を含めない |
| `description` | 1–1024 文字 / 非空 / **「何をする」と「いつ使う」の両方**を含める / 起動判断のキーワードを入れる |

`description` の良い例:

> Extracts text and tables from PDF files, fills forms, merges PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or extraction.

悪い例:

> Helps with PDFs.

## 3. 本文（段階的読み込みを意識する）

エージェントは 3 段階でしか読み込みません。これに沿って書くとトークン効率が良くなります。

1. **メタデータ（常時）**: `name` / `description` のみ。〜100 トークン。
2. **本文（起動時）**: `SKILL.md` 全体。**500 行・5k トークン以内**が目安。
3. **リソース（必要時）**: `scripts/` `assets/` のファイル。本文から相対パスで参照する。

推奨セクション:

- `## Instructions` — 手順を箇条書きで
- `## Examples` — 入力と出力の具体例
- `## Edge cases` — つまずきやすい点

説明・早見表・詳細は**すべて `SKILL.md` 本文に書く**。`references/` への分割は禁止（§0）。
実行コードやテンプレートのみ `scripts/` / `assets/` に置き、本文から相対パスで参照する:

```markdown
抽出は scripts/extract.py を実行する。
```

参照は `SKILL.md` から1階層まで。深いネストは避ける。

## 4. スクリプトを置く場合

- 自己完結させるか、依存を明記する
- 親切なエラーメッセージを出す
- エッジケースを処理する

## 5. チェックリスト（PR 前）

- [ ] `name` がディレクトリ名と一致している
- [ ] `description` に「何をする／いつ使う」が入っている
- [ ] `npx skills add git@github.com:your-org/agent-skills.git --list` で意図どおり一覧に出る
- [ ] `AGENTS.md` の収録スキル表に 1 行追記した
- [ ] 信頼できない外部取得や不審な処理を含めていない
