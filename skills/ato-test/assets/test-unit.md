<!--
単体テストコードテンプレート（汎用 Vitest 想定）。
仕様書（test-spec.md）の TC テーブルが正本。コードは付属成果物。
各テストに「TC-xxx: テスト名 | AC-xxx」コメントを必ず付ける。
-->

# 単体テストテンプレート

## ファイル配置

```
tests/
└── unit/
    ├── <対象モジュール>.test.ts   例: format.test.ts / filter.test.ts
    └── <対象コンポーネント>.test.ts
```

## 命名規約

- ファイル名: `<対象モジュール名>.test.ts`
- `describe` ブロック: 対象の関数名 / コンポーネント名
- `it` ブロック: `TC-xxx テスト名`（仕様書の「テスト名」と一致させる）

---

## テンプレートコード

### ユーティリティ関数のテスト（COMMON-011 データ加工規約）

```typescript
/**
 * データ加工ユーティリティの単体テスト
 * 対象: COMMON-011 / src/lib/format.ts
 * 仕様書: test-spec.md TC-N台（非機能）または TC-040台（データ加工）
 */
import { describe, it, expect } from 'vitest'
import { formatDate, truncateText, formatNullable } from '@/lib/format'

describe('formatDate', () => {
  // TC-041: 日付フォーマット | AC-041
  it('TC-041 ISO 8601 を YYYY年MM月DD日 形式に変換する', () => {
    expect(formatDate('2024-03-15T00:00:00.000Z')).toBe('2024年3月15日')
  })

  it('TC-041b 月日が1桁でもゼロ埋めされない', () => {
    expect(formatDate('2024-01-05T00:00:00.000Z')).toBe('2024年1月5日')
  })

  it('TC-041c タイムゾーンが JST になる', () => {
    // UTC 2024-03-14T15:00:00Z は JST では 2024-03-15T00:00:00+09:00
    expect(formatDate('2024-03-14T15:00:00.000Z')).toBe('2024年3月15日')
  })
})

describe('truncateText', () => {
  // TC-042: テキスト切り詰め | AC-042
  it('TC-042 上限文字数を超える場合は … で切り詰める', () => {
    expect(truncateText('あいうえおかきくけこ', 5)).toBe('あいうえお…')
  })

  it('TC-042b 上限以下の場合はそのまま返す', () => {
    expect(truncateText('あいう', 5)).toBe('あいう')
  })

  it('TC-042c ちょうど上限文字数のときは切り詰めない', () => {
    expect(truncateText('あいうえお', 5)).toBe('あいうえお')
  })
})

describe('formatNullable', () => {
  // TC-043: null/undefined のデフォルト値 | AC-043
  it('TC-043 null は – を返す', () => {
    expect(formatNullable(null)).toBe('–')
  })

  it('TC-043b undefined は – を返す', () => {
    expect(formatNullable(undefined)).toBe('–')
  })

  it('TC-043c 空文字は – を返す', () => {
    expect(formatNullable('')).toBe('–')
  })

  it('TC-043d 0 は – に変換しない（意味のある値）', () => {
    expect(formatNullable(0)).toBe('0')
  })

  it('TC-043e 文字列はそのまま返す', () => {
    expect(formatNullable('テスト')).toBe('テスト')
  })
})
```

---

### フィルタ・クエリ組み立てのテスト（COMMON-005 一覧フィルタ機構）

```typescript
/**
 * フィルタクエリ組み立ての単体テスト
 * 対象: COMMON-005 / src/lib/filter.ts
 * 仕様書: test-spec.md TC-021台
 */
import { describe, it, expect } from 'vitest'
import { buildFilters } from '@/lib/filter'

describe('buildFilters', () => {
  // TC-021: カテゴリ絞り込み | AC-021
  it('TC-021 category が渡るとカテゴリフィルタを返す', () => {
    const result = buildFilters({ category: 'news' })
    expect(result).toBe('category[equals]news')
  })

  // TC-022: 不正な category 値 | AC-022
  it('TC-022 不正な category 値は空のフィルタを返す', () => {
    expect(buildFilters({ category: '' })).toBe('')
    expect(buildFilters({ category: undefined })).toBe('')
  })

  it('TC-022b ハイフン区切りの不正値も無視される', () => {
    expect(buildFilters({ category: '-' })).toBe('')
  })
})
```

---

### XSSサニタイズのテスト（COMMON-009 リッチテキストレンダリング）

```typescript
/**
 * リッチテキストサニタイズの単体テスト
 * 対象: COMMON-009 / src/lib/sanitize.ts
 * 仕様書: test-spec.md TC-031台
 */
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
  // TC-031: script タグ除去 | AC-031
  it('TC-031 script タグが除去される', () => {
    const input = '<p>テスト</p><script>alert(1)</script>'
    const output = sanitizeHtml(input)
    expect(output).not.toContain('<script>')
    expect(output).not.toContain('alert(1)')
    expect(output).toContain('<p>テスト</p>')
  })

  // TC-032: onclick 属性除去 | AC-032
  it('TC-032 on* 属性が除去される', () => {
    const input = '<a onclick="evil()" href="/path">リンク</a>'
    const output = sanitizeHtml(input)
    expect(output).not.toContain('onclick')
    expect(output).toContain('リンク')
  })

  // TC-033: target="_blank" に rel 付与 | AC-033
  it('TC-033 target="_blank" に rel="noopener noreferrer" が付与される', () => {
    const input = '<a href="https://example.com" target="_blank">外部リンク</a>'
    const output = sanitizeHtml(input)
    expect(output).toContain('rel="noopener noreferrer"')
  })
})
```

---

## 実装メモ

- `@/` エイリアスはプロジェクトの `tsconfig.json` / `vite.config.ts` に合わせて変更する。
- DOM を使うテスト（コンポーネント）は `@testing-library/vue` や `@testing-library/react` を追加する。
  フレームワーク非依存の関数テストは追加ライブラリ不要。
- タイムゾーン依存のテストは `TZ=Asia/Tokyo vitest` で実行するか、`vi.stubEnv('TZ', 'Asia/Tokyo')` を使う。
- `vi.mock` でモジュールを差し替える場合、モック対象を明示コメントに書く（なぜモックするかも）。
