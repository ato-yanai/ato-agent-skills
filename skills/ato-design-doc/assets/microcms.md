<!--
microCMS設計書テンプレート。コンテンツモデル＝データ側の正。
フィールド種別/型は ato-microcms-types、取得条件は ato-microcms-fetch、Webhookは ato-microcms-webhook に合わせる。
採番: 接頭辞 CMS（=コンテンツモデル。1 API = 1 CMS）。絞り込み/ソートに使うフィールドをここで確定する。
-->

# microCMS設計書 — <案件名>

## 変更履歴

> 客先に提出した版だけを記録する（提出のたびに版を整数+1）。日々の編集は Git のコミットへ。一式の版状況は機能一覧の「文書管理」表を参照。

| 版 | 提出日 | 提出先・目的 | 主な変更点 | Gitタグ |
| --- | --- | --- | --- | --- |
| 第1版 | <YYYY-MM-DD> | <提出先・目的> | 初版 | microcms-01 |

## API一覧

| CMS | エンドポイント | 種別 | 概要 | 関連機能(FUNC) |
| --- | --- | --- | --- | --- |
| CMS-002 | `news` | リスト | ニュース記事 | FUNC-010〜020 |
| CMS-008 | `blog` | リスト | ブログ記事 | FUNC-110 |
| CMS-050 | `site-settings` | オブジェクト | サイト共通設定 | — |

---

## CMS-002 `news`（リスト形式）

### フィールド定義

> kind / 型は ato-microcms-types のマッピングに合わせる。「絞り込み/ソート」列で一覧機能の軸を確定する。

| fieldId | 表示名 | kind | TS型 | 必須 | 絞り込み | ソート | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| title | タイトル | text | string | ✓ | – | – | |
| category | カテゴリ | relation | `MicroCMSListContent<NewsCategory>` | ✓ | ✓ | – | depth=1 で展開 |
| publishedAt | 公開日 | date | string | ✓ | – | ✓ | ISO 8601 |
| thumbnail | サムネイル | media | `MicroCMSImage` | – | – | – | |
| body | 本文 | richEditorV2 | string | ✓ | – | – | HTML文字列 |

- 共通フィールド（`id`/`createdAt`/`updatedAt`/`publishedAt`/`revisedAt`）は取得ラッパーが付与（型に含めない）。

### 取得条件

| 用途 | 画面(PAGE) | filters | orders | limit | offset | depth |
| --- | --- | --- | --- | --- | --- | --- |
| 一覧 | PAGE-003 | `category[equals]{id}`（絞り込み時） | `-publishedAt` / `publishedAt` | 12 | (page-1)*12 | 1 |
| TOP新着 | PAGE-001 | publishState=公開 | `-publishedAt` | 3 | 0 | 1 |
| 詳細 | PAGE-004 | — | — | — | — | 1 |

- クエリパラメータ → filters/orders への変換規約は共通処理設計書 COMMON-005 を参照。

### 権限・公開ワークフロー

| ロール | 権限 | 備考 |
| --- | --- | --- |
| 編集者 | 下書き作成・申請 | 公開不可 |
| 管理者 | 公開・予約公開・削除 | |

- 公開フロー: 下書き → レビュー → 公開（予約公開あり）。下書きはプレビューでのみ閲覧。
- ロールの全体定義・APIキー（種別/権限スコープ/用途）は サービス設定として `CMS-050 site-settings` の章にまとめる。
  **キー値・Webhookシークレットの実値は書かない**（`.env`/環境変数名など参照先のみ。NFR-05）。

### Webhook / 再検証

| トリガー | 対象 | 動作 |
| --- | --- | --- |
| `news` の公開/更新/削除 | `/news`・`/news/[id]`・TOP | revalidateTag（署名検証は ato-microcms-webhook） |

- 再検証タグの規約は ato-microcms-fetch のタグ規約に合わせる。

---

## CMS-008 `blog`（リスト形式）

> 絞り込み軸が news と異なる（カテゴリ・タグ・公開日）。仕組みは COMMON-005 を共有する。

| fieldId | 表示名 | kind | 必須 | 絞り込み | ソート | 説明 |
| --- | --- | --- | --- | --- | --- | --- |
| title | タイトル | text | ✓ | – | – | |
| category | カテゴリ | relation | ✓ | ✓ | – | |
| tags | タグ | relationList | – | ✓ | – | 複数 |
| publishedAt | 公開日 | date | ✓ | ✓(範囲) | ✓ | from/to で範囲絞り込み |

（取得条件・権限・Webhook は CMS-002 に倣って記述）
