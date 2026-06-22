// Astro 用 ESLint 9 flat config。
// eslint-plugin-astro が astro-eslint-parser を内包する。
// 競合する整形ルールは eslint-config-prettier で無効化する（必ず最後に置く）。
// TypeScript を使わない場合は typescript-eslint の import と
// ...tseslint.configs.recommended を削除し、export を通常の配列にする。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', '.astro'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  eslintConfigPrettier,
);
