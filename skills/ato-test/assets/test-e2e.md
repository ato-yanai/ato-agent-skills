<!--
E2Eテストコードテンプレート（汎用 Playwright 想定）。
仕様書（test-spec.md）の TC テーブルが正本。コードは付属成果物。
各テストに「TC-xxx: テスト名 | AC-xxx」コメントを必ず付ける。
-->

# E2Eテストテンプレート

## ファイル配置

```
tests/
└── e2e/
    ├── <ドメイン>.spec.ts   例: news.spec.ts / contact.spec.ts
    └── helpers/
        └── fixtures.ts      共通ヘルパー（ページオブジェクト等）
```

## 命名規約

- ファイル名: `<ドメイン>.spec.ts`（ドメインは FUNC の番号帯に対応）
- `describe` ブロック: 画面名 または 機能名
- `test` ブロック: `TC-xxx テスト名`（仕様書の「テスト名」と一致させる）

---

## テンプレートコード

```typescript
/**
 * <ドメイン名>のE2Eテスト
 * 対象: FUNC-xxx / PAGE-xxx
 * 仕様書: test-spec.md TC-xxx台
 */
import { test, expect } from '@playwright/test'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 正常系
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test.describe('<画面名> 正常系', () => {
  // TC-010: ニュース一覧 正常表示 | AC-010
  test('TC-010 一覧が表示される', async ({ page }) => {
    // Arrange
    await page.goto('/news')

    // Assert
    await expect(page.getByRole('list', { name: 'ニュース一覧' })).toBeVisible()
    await expect(page.locator('[data-testid="news-item"]')).toHaveCount(12)
  })

  // TC-011: カテゴリ絞り込み 正常 | AC-021
  test('TC-011 カテゴリで絞り込まれる', async ({ page }) => {
    // Arrange
    const categoryId = 'news'
    await page.goto(`/news?category=${categoryId}`)

    // Assert
    const items = page.locator('[data-testid="news-item"]')
    const count = await items.count()
    expect(count).toBeGreaterThanOrEqual(0)
    // 各記事が該当カテゴリを持つ
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i).locator('[data-testid="category"]')).toHaveText(categoryId)
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 異常系・境界値
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test.describe('<画面名> 異常系・境界値', () => {
  // TC-012: カテゴリ絞り込み 0件 | AC-021
  test('TC-012 0件のとき解除導線が表示される', async ({ page }) => {
    // Arrange
    await page.goto('/news?category=nonexistent-category-id')

    // Assert
    await expect(page.getByText('0件')).toBeVisible()
    await expect(page.getByRole('link', { name: /絞り込みを解除/ })).toBeVisible()
  })

  // TC-013: 不正カテゴリ値 | AC-022
  test('TC-013 不正な category 値は無視されて全件表示', async ({ page }) => {
    // Arrange
    await page.goto('/news?category=invalid')

    // Assert
    await expect(page.locator('[data-testid="news-item"]')).toHaveCount(12)
  })

  // TC-016: ページ範囲外 404 | AC-026
  test('TC-016 範囲外の page は 404 を返す', async ({ page }) => {
    // Arrange
    const response = await page.goto('/news?page=999')

    // Assert
    expect(response?.status()).toBe(404)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ページネーション
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test.describe('<画面名> ページネーション', () => {
  // TC-014: 2ページ目 | AC-024
  test('TC-014 ?page=2 で13〜24件目が表示される', async ({ page }) => {
    await page.goto('/news?page=2')
    await expect(page.locator('[data-testid="news-item"]')).toHaveCount(12)
    // 先頭アイテムが13件目であることを確認（テストデータの実装に依存）
  })

  // TC-015: 最終ページで「次へ」が非活性 | AC-025
  test('TC-015 最終ページで次へボタンが非活性', async ({ page }) => {
    // 最終ページのURLはテストデータにより異なるため、ページ数を取得してから遷移
    await page.goto('/news')
    const lastPageLink = page.locator('[data-testid="pagination-last"]')
    if (await lastPageLink.isVisible()) {
      await lastPageLink.click()
    }
    await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled()
  })
})
```

---

## フォームテンプレート（COMMON-010 フォーム送信）

```typescript
/**
 * フォーム送信のE2Eテスト
 * 対象: FUNC-200 / PAGE-020
 * 仕様書: test-spec.md TC-200台
 */
import { test, expect } from '@playwright/test'

test.describe('お問い合わせフォーム', () => {
  // TC-200: 正常送信 | AC-200
  test('TC-200 正常送信で完了ページへ遷移する', async ({ page }) => {
    await page.goto('/contact')

    // Arrange: フォームに入力
    await page.getByLabel('お名前').fill('テスト 太郎')
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('お問い合わせ内容').fill('テスト内容')

    // Act
    await page.getByRole('button', { name: '送信する' }).click()

    // Assert
    await expect(page).toHaveURL('/contact/complete')
    await expect(page.getByRole('heading', { name: '送信が完了しました' })).toBeVisible()
  })

  // TC-201: 必須項目未入力 | AC-201
  test('TC-201 必須未入力でエラーが表示される', async ({ page }) => {
    await page.goto('/contact')

    // Act: 何も入力せず送信
    await page.getByRole('button', { name: '送信する' }).click()

    // Assert: URLが変わらず、エラーが出ている
    await expect(page).toHaveURL('/contact')
    await expect(page.getByRole('alert')).toBeVisible()
  })
})
```

---

## 実装メモ

- `data-testid` 属性はテスト専用セレクタとして本番コードに付与する（SEO影響なし）。
- ブラウザ依存の挙動（Safari の日付ピッカー等）は `test.skip(browserName === 'webkit', ...)` で分岐する。
- テストデータは CMS の固定データ（テスト用コンテンツ）を前提とし、実行ごとに結果が変わらないようにする。
- フレームワーク固有の設定（`playwright.config.ts` の baseURL 等）はプロジェクトごとに変更する。
