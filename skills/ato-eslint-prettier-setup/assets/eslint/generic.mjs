// 汎用（プレーンな TS / JS・Node など）用 ESLint 9 flat config。
// 競合する整形ルールは eslint-config-prettier で無効化する（必ず最後に置く）。
// TypeScript を使わない場合: typescript-eslint の import と
// ...tseslint.configs.recommended を削除し、export を通常の配列にする。
// ブラウザ向けなら globals.node を globals.browser に変える。
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'build', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  eslintConfigPrettier,
);
