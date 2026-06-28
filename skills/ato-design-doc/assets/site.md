<!--
サイト全体設計テンプレート（親）。サイトマップ・画面一覧(PAGE)・遷移・URL設計を確定させる。
画面の中身（要素・状態・SEO）はページ設計書(page-<slug>.md・1画面1ファイル)に書く。ここは「どの画面があり、どう繋がるか」。
採番: 接頭辞 PAGE（=画面。実体ファイルは page-<slug>.md）。ドメインで番号帯を分ける。
-->

# サイト全体設計 — <案件名>

## 変更履歴

> 客先に提出した版だけを記録する（提出のたびに版を整数+1）。日々の編集は Git のコミットへ。一式の版状況は機能一覧の「文書管理」表を参照。

| 版 | 提出日 | 提出先・目的 | 主な変更点 | Gitタグ |
| --- | --- | --- | --- | --- |
| 第1版 | <YYYY-MM-DD> | <提出先・目的> | 初版 | site-01 |

## サイトマップ

```
/                         TOP                       (PAGE-001)
├─ /news                  ニュース一覧              (PAGE-003)
│  └─ /news/[id]          ニュース詳細              (PAGE-004)
├─ /blog                  ブログ一覧                (PAGE-012)
│  └─ /blog/[id]          ブログ詳細                (PAGE-013)
├─ /contact               お問い合わせ              (PAGE-020)
│  └─ /contact/complete   送信完了                  (PAGE-021)
└─ (共通) 404 / 500                                 (PAGE-900 / PAGE-901)
```

## 画面一覧

> ページが増えるとここが増える（機能一覧は増えない）。1画面=1行。
> 各画面の詳細はページ設計書（`page-<slug>.md`・1ページ1ファイル）にある。下表の「詳細ファイル」で PAGE-ID とファイルを対応づける。

| PAGE | 画面名 | URL | 種別 | 関連機能(FUNC) | データ(CMS) | 詳細ファイル | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PAGE-001 | TOP | `/` | 静的+一部動的 | FUNC-010 | CMS-002 | `page-top.md` | 新着ニュース3件 |
| PAGE-003 | ニュース一覧 | `/news` | 動的(一覧) | FUNC-010〜014 | CMS-002 | `page-news.md` | 絞り込み/ソート/ページャ |
| PAGE-004 | ニュース詳細 | `/news/[id]` | 動的(詳細) | FUNC-020 | CMS-002 | `page-news-detail.md` | |
| PAGE-012 | ブログ一覧 | `/blog` | 動的(一覧) | FUNC-110 | CMS-008 | `page-blog.md` | 絞り込み(カテゴリ/タグ/日付) |
| PAGE-020 | お問い合わせ | `/contact` | フォーム | FUNC-200 | — | `page-contact.md` | COMMON-010 フォーム送信 |
| PAGE-900 | 404 | （任意URL） | エラー | FUNC-900 | — | `page-404.md` | COMMON-008 |

## URL設計

| 画面 | URL パターン | クエリ/動的部 | 備考 |
| --- | --- | --- | --- |
| ニュース一覧 | `/news` | `?category=&sort=&page=N` | クエリ規約は COMMON-005 / COMMON-006 |
| ニュース詳細 | `/news/[id]` | `[id]`=コンテンツID | |
| ブログ一覧 | `/blog` | `?category=&tag=&from=&to=&page=N` | |

### 動的ルーティングパターン

| パターン | Next.js 記法 | 用途 |
| --- | --- | --- |
| 静的 | `/news` | 一覧・固定ページ |
| 動的（単一セグメント） | `/news/[id]` | コンテンツ詳細（ID や slug で一意識別） |
| キャッチオール | `/category/[...slug]` | 多階層カテゴリ等（要件があれば使う） |

### パスパラメータ vs クエリパラメータの使い分け

| 種別 | 記法 | 使う場面 | 省略時の挙動 |
| --- | --- | --- | --- |
| パスパラメータ | `/news/[id]` | リソースを一意に識別する（URLが変わればコンテンツも変わる） | — （必須） |
| クエリパラメータ | `?category=&page=` | 同一リソースの絞り込み・ソート・ページ状態（同一コンテンツを異なる視点で見る） | デフォルト値で表示 |

## リダイレクト設計

| 種別 | from | to | ステータス |
| --- | --- | --- | --- |
| trailing slash 統一 | `/news/` | `/news` | 308（永続） |
| 旧URL移行（例） | `/old-path` | `/new-path` | 308（永続） |

- **trailing slash の方針**: なし（`/news` が正規。`/news/` は 308 リダイレクト）。
- Next.js の `next.config.js` の `redirects` で設定する。
- HTTP → HTTPS はホスティング（Vercel 等）側で処理する。
- www あり/なし統一: `<方針を記載>`（Vercel の場合はドメイン設定で統一）。

## 画面遷移図

```
TOP(PAGE-001) ──「もっと見る」──▶ ニュース一覧(PAGE-003) ──記事クリック──▶ ニュース詳細(PAGE-004)
                                     │ 絞り込み/ソート/ページ送り（同一画面・URL変化）
                                     └─▶ /news?category=&sort=&page=N
お問い合わせ(PAGE-020) ──送信成功──▶ 送信完了(PAGE-021)
                       └──送信失敗──▶ PAGE-020（エラー表示・COMMON-010）
```

## 前提・制約

- ホスティング/ビルド: `<Vercel / 静的書き出し 等>`
- フレームワーク: `<Next.js App Router 等>`
- プレビュー/再ビルド: microCMS Webhook → revalidateTag（CMS・共通処理設計書を参照）

---

## SEO方針

| 項目 | 方針 |
| --- | --- |
| title フォーマット | `<ページタイトル> \| <サイト名>`（ページNo付与は COMMON-007） |
| description | 各ページの SEO/META 節で指定 |
| OGP | `og:title` / `og:description` / `og:image`（1200×630 推奨）を全ページで設定 |
| canonical | 各ページが自身の URL を出力（動的生成は COMMON-007） |
| noindex 適用条件 | サンクスページ・エラーページ・検索結果等は noindex。一覧2ページ目以降は index |
| 構造化データ（JSON-LD）| 最低限: `Organization`（TOP）/ `BreadcrumbList`（一覧・詳細）/ `Article`（詳細） |
| sitemap.xml | 自動生成（Next.js `sitemap.ts`）。動的ルートは CMS のコンテンツID から生成 |
| robots.txt | 本番: 全クロール許可。ステージング: `Disallow: /` |
| パンくずリスト | 全ページで表示（機構は COMMON-012） |
| 画像 alt 属性 | 必須。装飾画像は `alt=""`。CMS の alt フィールドが空なら title をフォールバック |
| 見出し階層 | `h1` は 1ページ1つ。`h2 → h3` と順に使う（スキップ禁止） |

---

## パフォーマンス目標

| 指標 | 目標値 |
| --- | --- |
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| first load JS | `<N> kB`（`next build` のバンドル解析で確認） |

- 画像: `next/image` で WebP 自動変換・遅延読み込み・`srcset` 自動生成。
- フォント: `next/font` で self-host、`font-display: swap`。
- キャッシュ: ISR + microCMS CDN（画像）+ Vercel Edge Cache（HTML）。
- サードパーティスクリプト: GTM 経由で一元管理。`strategy="lazyOnload"` または `afterInteractive`。

---

## アクセシビリティ方針

| 項目 | 方針 |
| --- | --- |
| 準拠規格 | WCAG 2.1 AA |
| キーボード操作 | 全インタラクティブ要素をキーボードで操作できる |
| スクリーンリーダー | `aria-label` / `role` を適切に付与。動的更新は `aria-live` で通知 |
| コントラスト比 | テキスト 4.5:1 以上、大テキスト 3:1 以上 |
| フォーカスインジケーター | `:focus-visible` で視覚的に明示（アウトライン非表示にしない） |
| フォームのラベル | `<label for>` を必ず付ける。エラー表示は `role="alert"`（COMMON-010） |
| 動きの抑制 | `prefers-reduced-motion` を尊重しアニメーションを無効化できるようにする |

---

## セキュリティ方針

| 項目 | 方針 |
| --- | --- |
| HTTPS | ホスティング側で強制。HTTP → HTTPS は 301 リダイレクト |
| CSP | `Content-Security-Policy` ヘッダーを設定（`next.config.js` の `headers()`） |
| セキュリティヘッダー | `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` を付与 |
| XSS | richEditorV2 の HTML は COMMON-009 でサニタイズ |
| CSRF | フォーム送信は SameSite Cookie または CSRF トークンで対策（COMMON-010） |
| APIキー | 環境変数で管理。`NEXT_PUBLIC_` を付けてクライアントに露出しない |
| 依存パッケージ | `npm audit` / Dependabot で定期的に脆弱性チェック |

---

## 計測・解析

| ツール | 用途 |
| --- | --- |
| `<GA4 等>` | ページビュー・イベントトラッキング |
| `<GTM 等>` | タグ一元管理 |
| `<Sentry 等>` | エラー監視 |
| `<Vercel Analytics 等>` | RUM・Core Web Vitals 監視 |

- イベントトラッキング設計（クリック・フォーム送信等）は別途トラッキング設計書で定義。
- Cookie 同意バナー: `<要否を記載>`。必要な場合は GTM に consent モードを設定。
- コンバージョン定義: `<フォーム送信完了 / 特定ページ到達 等>`。

---

## インフラ・デプロイ

### 環境構成

| 環境 | URL | 用途 |
| --- | --- | --- |
| 本番 | `https://<domain>` | 公開環境 |
| ステージング | `https://stg.<domain>` | 確認・QA |
| プレビュー | Vercel ブランチプレビュー URL | PR ごとに自動生成 |

- ドメイン: `<domain>`（www あり/なし統一: `<方針>`）
- SSL: 自動更新（Let's Encrypt / Vercel）
- 環境変数: Vercel プロジェクト設定で管理（`.env.local` はローカルのみ）

### ビルド・デプロイ

| トリガー | 動作 |
| --- | --- |
| `main` へのマージ | 本番デプロイ（自動） |
| PR 作成・更新 | プレビューデプロイ（自動） |
| microCMS コンテンツ公開/更新 | Webhook → revalidateTag（ISR 即時再検証） |

- ブランチ戦略: `main`（本番）/ `develop`（開発）/ `feature/*`（機能開発）
- ロールバック: ホスティングダッシュボードから直前デプロイに即時切り替え。

### 監視・運用

| 項目 | ツール | 閾値/方針 |
| --- | --- | --- |
| 死活監視 | `<UptimeRobot 等>` | ダウン検知即通知 |
| エラー監視 | `<Sentry 等>` | エラー率 `<N>%` で通知 |
| パフォーマンス | `<Vercel Analytics 等>` | LCP > 2.5s で通知 |
| バックアップ | microCMS サービス側＋定期エクスポート | — |
| SLA | `<稼働率目標>`（例: 99.9%） | — |

---

## 法務・コンプライアンス

| ページ/要件 | URL | 備考 |
| --- | --- | --- |
| プライバシーポリシー | `/privacy` | Cookie・個人情報の取り扱いを記載 |
| 利用規約 | `/terms` | 要件に応じて |
| 特定商取引法表記 | `/tokusho` | EC の場合必須 |
| 著作権表記 | フッター | `© <年> <社名>` |

- Cookie 同意: `<要否>`（EU ユーザー対象の場合は GDPR 対応が必要）
- 個人情報保護法: フォームで取得する個人情報の利用目的を明示（COMMON-010）

---

## ブラウザ・デバイス対応

| 種別 | 対応範囲 |
| --- | --- |
| デスクトップ | Chrome / Firefox / Safari / Edge（各最新2バージョン） |
| iOS | Safari（最新2バージョン） |
| Android | Chrome（最新2バージョン） |
| ビューポート | 375px〜（SP）/ 768px〜（タブレット）/ 1280px〜（PC） |
| ブレイクポイント | `sm: 640px` / `md: 768px` / `lg: 1024px` / `xl: 1280px`（Tailwind 既定） |

- IE11 非対応。レガシーブラウザへの polyfill は原則不提供。

---

## 多言語・国際化

> 多言語対応が不要な場合はこの節を削除する。

| 項目 | 方針 |
| --- | --- |
| 対応言語 | `<ja / en / ...>` |
| URL 構造 | `/en/...`（サブパス）または `en.example.com`（サブドメイン） |
| hreflang | 各ページに `<link rel="alternate" hreflang="...">` を出力 |
| 翻訳管理 | `<microCMS 内で言語別フィールド / Crowdin 等の外部ツール>` |
| 言語切り替え UI | ヘッダーにセレクタを設置。選択を Cookie で保持 |
| 通貨・日付 | `Intl.NumberFormat` / `Intl.DateTimeFormat` でロケール別変換（COMMON-011） |
| RTL 対応 | `<要/不要>` |

---

## デザインシステム方針

| 項目 | 方針 |
| --- | --- |
| コンポーネントライブラリ | `<Shadcn/ui / Radix UI / 独自 等>` |
| スタイリング | `<Tailwind CSS / CSS Modules 等>` |
| カラートークン | `tailwind.config.ts` の `theme.extend.colors` で管理 |
| タイポグラフィ | フォント・サイズ・行間を `theme.extend` で定義 |
| アイコン | `<Lucide / Heroicons / 独自 SVG 等>` |
| メタタグ共通テンプレート | `app/layout.tsx` の `generateMetadata` で基本値を定義。各ページで上書き |
| ファビコン | `app/favicon.ico`（32×32）+ `apple-touch-icon.png`（180×180） |
| メンテナンスページ | `<要/不要>`。Vercel Maintenance Mode またはミドルウェアで制御 |
| システムメールテンプレート | `<React Email 等で管理>` |
