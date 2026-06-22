#!/usr/bin/env node
// プロジェクトを検査し、ESLint + Prettier セットアップに必要な事実を JSON で出力する。
// 依存ゼロ・読み取り専用。使い方: node detect.mjs [対象ディレクトリ]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || process.cwd();
const read = (p) => {
  try {
    return readFileSync(join(root, p), 'utf8');
  } catch {
    return null;
  }
};
const has = (p) => existsSync(join(root, p));
// 同名で拡張子違いの設定ファイルを探す（next.config.mjs など）
const findConfig = (base) =>
  ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `${base}.${e}`).find(has) || null;

const pkgRaw = read('package.json');
let pkg = {};
try {
  pkg = pkgRaw ? JSON.parse(pkgRaw) : {};
} catch {
  pkg = {};
}
const deps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
  ...(pkg.peerDependencies || {}),
  ...(pkg.optionalDependencies || {}),
};
const dep = (name) => Object.prototype.hasOwnProperty.call(deps, name);

// フレームワーク判定（上から優先）
let framework = 'generic';
if (dep('next') || findConfig('next.config')) framework = 'next';
else if (dep('astro') || findConfig('astro.config')) framework = 'astro';
else if (dep('@sveltejs/kit') || dep('svelte')) framework = 'svelte';
else if (dep('nuxt') || dep('vue')) framework = 'vue';
else if (dep('vite') && (dep('react') || dep('react-dom'))) framework = 'vite-react';
else if (dep('react') || dep('react-dom')) framework = 'react';

// Tailwind 判定（v4 は tailwind.config が無いことがあるので devDeps を主とする）
const tailwind = dep('tailwindcss') || !!findConfig('tailwind.config');

// TypeScript 判定
const typescript = dep('typescript') || has('tsconfig.json');

// モジュール種別
const moduleType = pkg.type === 'module' ? 'esm' : 'cjs';

// パッケージマネージャ判定
let packageManager = 'npm';
if (has('pnpm-lock.yaml')) packageManager = 'pnpm';
else if (has('yarn.lock')) packageManager = 'yarn';
else if (has('bun.lockb') || has('bun.lock')) packageManager = 'bun';
else if (has('package-lock.json')) packageManager = 'npm';
else if (typeof pkg.packageManager === 'string') packageManager = pkg.packageManager.split('@')[0];

// 既存の設定ファイル
const eslintConfigCandidates = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
];
const prettierConfigCandidates = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.js',
  'prettier.config.mjs',
  'prettier.config.cjs',
];
const existingEslint = eslintConfigCandidates.filter(has);
const existingPrettier = prettierConfigCandidates.filter(has);
// .eslintrc 系（flat config でない旧形式）が混じっているか
const hasLegacyEslintrc = existingEslint.some((f) => f.startsWith('.eslintrc'));

const report = {
  root,
  hasPackageJson: !!pkgRaw,
  framework,
  tailwind,
  tailwindVersion: deps['tailwindcss'] || null,
  typescript,
  moduleType,
  packageManager,
  existingEslint,
  existingPrettier,
  hasLegacyEslintrc,
  prettierInPackageJson: !!pkg.prettier,
  eslintConfigInPackageJson: !!pkg.eslintConfig,
};

console.log(JSON.stringify(report, null, 2));
