// Next.js 用 ESLint 9 flat config。
// eslint-config-next（next/core-web-vitals + next/typescript）を FlatCompat 経由で読み込み、
// 競合する整形ルールは eslint-config-prettier で無効化する（必ず最後に置く）。
// TypeScript を使わない場合は "next/typescript" を削除する。
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  eslintConfigPrettier,
];
