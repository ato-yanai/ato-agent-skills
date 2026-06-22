# ato-agent-skills

チームで共有する **汎用エージェントスキル** のカタログです。

スキルは [Agent Skills オープン標準](https://agentskills.io/specification)（`SKILL.md`）で記述します。
これは Anthropic が公開し、複数のツール／AI で読める共通フォーマットなので、
**1つのスキルを書けば色々な AI で使い回せる**のが狙いです。

配布には [`npx skills`](https://github.com/vercel-labs/skills)（Vercel Labs 製）を使います。
各メンバーは、**必要なスキルだけ**を 1 コマンドで自分の環境に取り込めます。

---

## このリポジトリの考え方

- **正（Single Source of Truth）は `skills/<name>/SKILL.md`。** ここだけを編集します。
- **配布は `npx skills`。** GitHub をレジストリ代わりに使い、このリポジトリを clone して
  `skills/` 配下のスキルを自動検出し、各 AI ツールが読む場所へインストール（symlink、または `--copy` で複製）します。
- **このリポジトリの `skills/<name>/SKILL.md` フラット構成は、`npx skills` がそのまま認識します。**
  特別なマニフェスト（`skills.json` 等）は不要です。

```
ato-agent-skills/
├── README.md            ← このファイル
├── AGENTS.md            ← リポジトリ全体の索引（汎用 AI 用エントリポイント）
├── CONTRIBUTING.md      ← スキルの書き方・規約
├── skills/              ← スキル本体（1ディレクトリ = 1スキル、npx skills が自動検出）
│   ├── ato-git-commit-message/
│   │   └── SKILL.md
│   └── ato-eslint-prettier-setup/
│       ├── SKILL.md
│       ├── scripts/     ← 検出スクリプト（detect.mjs）
│       └── assets/      ← eslint / prettier / vscode のテンプレ
└── templates/
    └── skill-template/  ← 新規スキルのひな形
```

> **前提:** このリポジトリは **public** です。GitHub に push 済みであれば、
> 誰でも `owner/repo` の短縮形で取り込めます（SSH 鍵の登録は不要）。

---

## 使う側：スキルをインストールする

public リポジトリなので、**`owner/repo` の短縮形**で指定できます。

利用できるスキルの一覧を見る:

```bash
npx skills add ato-yanai/ato-agent-skills --list
```

必要なスキルだけを取り込む:

```bash
# 1つだけ
npx skills add ato-yanai/ato-agent-skills -s ato-git-commit-message

# 複数指定 + インストール先エージェントを指定 + グローバル(~/.claude/skills 等)へ
npx skills add ato-yanai/ato-agent-skills -s ato-git-commit-message -a claude-code -g

# 全部を非対話で取り込む
npx skills add ato-yanai/ato-agent-skills --all
```

> `add` の全オプションは下の「[コマンド早見表](#コマンド早見表これだけ見れば足りる)」の `add` 節を参照。

> **どこに入る？** `-a` で指定したエージェントごとに読み取り場所へ入ります。
> - Claude Code: `~/.claude/skills/`（`-g`）または プロジェクトの `.claude/skills/`
> - エージェント未指定なら、`npx skills` が環境にインストール済みのエージェントを検出して尋ねます。

---

## 使う側：スキルを更新する

このリポジトリの `SKILL.md` を **GitHub に push** したあと、取り込み側は `update` で最新化します。

```bash
# 入れたスキルを全部最新化（スコープは対話で確認）
npx skills update

# 特定スキルだけ
npx skills update ato-git-commit-message

# 複数指定
npx skills update ato-git-commit-message another-skill

# 非対話（カレントがプロジェクトなら project、なければ global を自動判定）
npx skills update -y

# スコープを明示
npx skills update -g    # グローバル(~/.claude/skills 等)だけ
npx skills update -p    # プロジェクトの .claude/skills だけ
```

> **symlink と `--copy` で挙動が違う:**
> - **symlink（デフォルト）** … 実体は `npx skills` が管理する clone。`update` がそれを git 同期するので、push 済みの変更が反映される。
> - **`--copy`** … 実体がコピーされているため、`update` を実行しない限り古いまま。明示的な更新が必須。
>
> **更新フローの基本:** ① `skills/<name>/SKILL.md` を編集 → ② **GitHub に push** → ③ 使う側が `npx skills update <name>`。
> push を忘れると、使う側が `update` しても何も変わらない。

---

## コマンド早見表（これだけ見れば足りる）

`npx skills` の主要サブコマンド。`<source>` は `owner/repo` 短縮形（例 `ato-yanai/ato-agent-skills`）。

| コマンド | 用途 |
| --- | --- |
| `npx skills add <source>` | スキルを取り込む（インストール） |
| `npx skills update [skills...]` | インストール済みスキルを最新化 |
| `npx skills list` (`ls`) | インストール済みスキルを一覧表示 |
| `npx skills remove [skills...]` (`rm`) | インストール済みスキルを削除 |
| `npx skills use <source>` | スキルのプロンプト生成／エージェントを対話起動 |
| `npx skills find [query]` | スキルをキーワード／対話検索 |
| `npx skills init [name]` | 新規 `SKILL.md` のひな形を作成 |

### `add` — 取り込む

```bash
npx skills add <source> -s ato-git-commit-message          # 1つだけ
npx skills add <source> -s ato-git-commit-message -a claude-code -g  # エージェント指定＋グローバル
npx skills add <source> --all                          # 全部を非対話で
npx skills add <source> --list                         # 入れずに一覧だけ
```

| オプション | 意味 |
| --- | --- |
| `--list` / `-l` | インストールせず一覧表示 |
| `--skill <name>` / `-s` | 取り込むスキルを指定（複数可、`-s '*'` で全選択） |
| `--all` | 全スキルを全エージェントに非対話でインストール |
| `--agent <name>` / `-a` | インストール先エージェント（`claude-code`、`cursor`、`codex` など複数可） |
| `--global` / `-g` | ユーザー全体（`~/.claude/skills/` 等）へ |
| `--copy` | symlink でなくファイルを複製 |
| `--yes` / `-y` | 確認プロンプトをスキップ |

> **source の形式:** `owner/repo` 短縮形・フル GitHub URL・GitLab URL・任意の git URL・ローカルパスに対応。
> このリポジトリは public なので `owner/repo` 短縮形（`ato-yanai/ato-agent-skills`）でよい。

### `update` — 最新化

```bash
npx skills update [skills...]
```

| オプション | 意味 |
| --- | --- |
| `--global` / `-g` | グローバルのスキルだけ更新 |
| `--project` / `-p` | プロジェクトのスキルだけ更新 |
| `--yes` / `-y` | スコープ確認をスキップ（自動判定） |

### `list` (`ls`) — 一覧

```bash
npx skills list            # project / global 両方
npx skills list -g         # グローバルだけ
npx skills list -a claude-code   # 特定エージェントで絞り込み
```

| オプション | 意味 |
| --- | --- |
| `--global` / `-g` | グローバルのスキルだけ表示 |
| `--agent <name>` / `-a` | エージェントで絞り込み（複数可） |

### `remove` (`rm`) — 削除

```bash
npx skills remove ato-git-commit-message
npx skills remove -s ato-git-commit-message -a claude-code -g
npx skills remove --all                # 全エージェントから全削除（非対話）
```

| オプション | 意味 |
| --- | --- |
| `--skill <name>` / `-s` | 削除するスキルを指定（複数可） |
| `--agent <name>` / `-a` | 対象エージェントを指定（複数可） |
| `--global` / `-g` | グローバルから削除 |
| `--all` | 全スキルを全エージェントから非対話で削除 |
| `--yes` / `-y` | 確認プロンプトをスキップ |

> **⚠️ 削除の落とし穴 — `remove` だけでは消えきらない。**
> `npx skills remove` はエージェントディレクトリ（`.claude/skills/` 等）からファイル／symlink を消すが、
> **ロックファイル `skills-lock.json` のエントリが残る**。この状態で再インストール／同期すると、
> **消したはずのスキルが復活する**ことがある。完全に消すには:
>
> 1. `npx skills remove <name>` でエージェントディレクトリから削除
> 2. `.skills.json`（スキル定義。npm の `package.json` 相当）を手で開き、該当エントリを削除
> 3. `skills-lock.json`（ロック。`package-lock.json` 相当）を削除
> 4. `npx skills update` 等を実行し、クリーンなロックファイルを再生成
>
> （`npx skills` の管理機能は発展途上で、この手動対応が要る場面がある。
> 参考: [npx skills の使い方と落とし穴](https://qiita.com/toyama0919/items/397ea7ad2d03f5248463)）

### その他

```bash
npx skills find [query]    # スキルをキーワード／fzf 風の対話で検索
npx skills use <source> --skill <name>   # スキルのプロンプトを生成（--agent で対話起動）
npx skills init [name]     # 新規 SKILL.md のひな形を作成
```

---

## 作る側：新しいスキルを書く

`templates/skill-template/` をコピーして編集し、`AGENTS.md` の収録表に 1 行追記するだけです。
手順・frontmatter の規約・本文の書き方は **[CONTRIBUTING.md](CONTRIBUTING.md)** を参照してください
（ひな形そのものが最小例になっています）。

---

## セキュリティ

スキルは AI に新しい指示・コードを与えます。**信頼できる発信元のものだけ**を取り込み、
外部 URL を取得する処理や不審な挙動がないか、取り込み前に内容を確認してください。
