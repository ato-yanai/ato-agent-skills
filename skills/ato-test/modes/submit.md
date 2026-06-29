# 提出モード（版上げ・タグ付け）

「客先にテスト成果物を提出する」ときだけ実行する。**文書ごとに版とタグを進める**。
前提は SKILL.md の「方針」「版管理」。

タグ付けスクリプトは **ato-design-doc の `scripts/tag-submission.mjs` を共用する**
（スキルが異なるが、スクリプトは汎用の Markdown バージョン管理ツールであり、設計書・テスト文書を問わない）。

## 版とタグの対応

| 成果物 | 版の単位 | タグ規約 | 例 |
| --- | --- | --- | --- |
| テスト仕様書 | `test-spec.md` | `test-spec-NN` | `test-spec-01`（第1版） |
| E2Eテスト | `tests/e2e/` 以下まとめて | `test-e2e-NN` | `test-e2e-01` |
| 単体テスト | `tests/unit/` 以下まとめて | `test-unit-NN` | `test-unit-01` |

- **テスト仕様書が主文書**。E2E・単体の版は仕様書版に合わせて同時に進める。
- コードの版上げは仕様書に「コードの変更概要」として変更履歴に記載する。
- 変わっていないものは据え置く。

## コミットとタグの不変条件

ato-design-doc の `modes/submit.md` と同じ規則：

- タグを打つ時点で対象成果物はコミット済み・変更なし。
- タグ番号 = 版番号（第2版 ⇔ `test-spec-02`）。
- push はしない（ユーザーに促す）。

## 手順

1. **対象成果物を決める。** 提出する成果物（仕様書・E2E・単体）とファイルパスを確定する。

2. **次の版番号を確認する。**
   ```bash
   node skills/ato-design-doc/scripts/tag-submission.mjs test-spec --dry-run
   ```

3. **（任意）変更点を把握する。**
   ```bash
   node skills/ato-design-doc/scripts/tag-submission.mjs test-spec --diff --file <test-spec.mdのパス>
   ```

4. **版とタグ情報を更新する（仕様書）。**
   - `test-spec.md` の版を +1（第N版）。
   - 変更履歴に1行追記（版・提出日・提出先・主な変更点・Gitタグ）。
   - E2E・単体コードも変更がある場合は変更履歴の「主な変更点」に概要を記載する。

5. **コミットする。**
   - **`ato-git-commit-message` が使えるなら、それに従いメッセージを作る。**
     提出コミットの印として **scope を `test` に固定**する（例 `chore(test): テスト仕様書を第N版として提出`）。
   - 無ければユーザーにコミットメッセージを入力してもらう（`test` scope を勧める）。

6. **タグを付与する（コミット後）。** 提出する成果物ごとに実行。
   ```bash
   node skills/ato-design-doc/scripts/tag-submission.mjs test-spec --file <test-spec.mdのパス>
   ```
   E2E・単体コードも提出する場合は、同一コミットに追加でタグを打つ：
   ```bash
   git tag -a test-e2e-NN -m "E2Eテストの第N版を提出"
   git tag -a test-unit-NN -m "単体テストの第N版を提出"
   ```

7. **push を促して完了。**
   ```bash
   git push --follow-tags
   ```
   上げた版・打ったタグ・提出物を日本語でまとめて報告し、「最後に上記で push してください」と促す。
