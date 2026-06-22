#!/usr/bin/env node
// microCMS の API スキーマ JSON から TypeScript 型を生成する。依存ゼロ・読み取り専用。
//
// 使い方:
//   node schema-to-types.mjs <schema.json> --name Blog            # 標準出力へ
//   node schema-to-types.mjs <schema.json> --name Blog --out blog.ts
//   node schema-to-types.mjs <schema.json> --name Blog --lib '@/lib/microcms/microcms'
//
// 生成されるのは「フィールドだけ」の型。id / createdAt 等の共通フィールドは
// ato-microcms-fetch の取得ラッパー（MicroCMSListContent）が付与するので含めない。
// media を使う型は、共通の MicroCMSImage をライブラリ（--lib、既定 '@/lib/microcms/microcms'）
// から import して共有する（各ファイルに重複定義しない）。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function fail(msg) {
  console.error(`[schema-to-types] ${msg}`);
  process.exit(1);
}

// --- 引数解析 ---
const args = process.argv.slice(2);
const positional = [];
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--name') opts.name = args[++i];
  else if (a === '--out') opts.out = args[++i];
  else if (a === '--lib') opts.lib = args[++i];
  else if (a.startsWith('--')) fail(`不明なオプション: ${a}`);
  else positional.push(a);
}
const schemaPath = positional[0];
if (!schemaPath) {
  fail('スキーマ JSON のパスを指定してください。例: node schema-to-types.mjs blog.json --name Blog');
}

let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
} catch (e) {
  fail(`スキーマ JSON を読み込めません: ${e.message}`);
}

const apiFields = Array.isArray(schema.apiFields) ? schema.apiFields : [];
const customFields = Array.isArray(schema.customFields) ? schema.customFields : [];
if (apiFields.length === 0) {
  fail('apiFields が空です。microCMS の API スキーマ JSON を渡しているか確認してください。');
}

// --- ヘルパ ---
// 文字列リテラルはシングルクオートで出す（多くのプロジェクトの Prettier/lint 規約に寄せる）。
// 仕上げのフォーマットはプロジェクトのフォーマッタに任せる（SKILL の手順参照）。
function q(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function pascal(s) {
  const out = String(s)
    .replace(/[-_ ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return out || 'Field';
}

const customByCreatedAt = new Map();
const customTypeName = new Map(); // fieldId -> 型名
for (const cf of customFields) {
  if (cf.createdAt) customByCreatedAt.set(cf.createdAt, cf);
  if (cf.fieldId) customTypeName.set(cf.fieldId, pascal(cf.fieldId));
}

const warnings = [];
let usesImage = false; // media / mediaList を 1 つでも使ったら共通 MicroCMSImage を import する

// repeater / custom が参照する customField 群を解決する。
// repeater は複数形（...List）、単一カスタムフィールドは単数形（customFieldCreatedAt）で
// 参照先を持つ。両方を見て、どちらも配列に正規化してから解決する。
function resolveCustomRefs(field) {
  const raw =
    field.customFieldCreatedAtList ??
    field.customFieldCreatedAtIdList ??
    field.customFieldCreatedAt ??
    field.customFieldCreatedAtId;
  const ids = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  if (ids.length) {
    const list = ids.map((id) => customByCreatedAt.get(id)).filter(Boolean);
    if (list.length) return list;
  }
  if (customFields.length) {
    warnings.push(
      `'${field.fieldId}' の参照先 customField を特定できず、全 customField の union にしました。必要なら手で絞ってください。`,
    );
    return customFields;
  }
  return [];
}

function unionOfCustoms(field) {
  const refs = resolveCustomRefs(field);
  const names = refs.map((c) => customTypeName.get(c.fieldId)).filter(Boolean);
  return names;
}

function fieldType(field, depth) {
  switch (field.kind) {
    case 'text':
    case 'textArea':
    case 'richEditor':
    case 'richEditorV2':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'string';
    case 'media':
      usesImage = true;
      return 'MicroCMSImage';
    case 'mediaList':
      usesImage = true;
      return 'MicroCMSImage[]';
    case 'file':
      return '{ url: string }';
    case 'select': {
      const items = Array.isArray(field.selectItems) ? field.selectItems : [];
      const union = items.map((it) => q(String(it.value ?? it.id))).join(' | ');
      // microCMS の select は単一選択でも配列で返る点に注意。
      return union ? `(${union})[]` : 'string[]';
    }
    case 'iframe':
      return 'Record<string, unknown>';
    case 'relation':
      warnings.push(`'${field.fieldId}' は relation。参照先 API の型に置き換えてください（depth により形が変わる）。`);
      return 'unknown /* relation: 参照先APIの型へ */';
    case 'relationList':
      warnings.push(`'${field.fieldId}' は relationList。参照先 API の型[] に置き換えてください。`);
      return 'unknown[] /* relationList: 参照先APIの型[]へ */';
    case 'custom': {
      if (depth > 4) return 'unknown';
      const names = unionOfCustoms(field);
      return names.length ? names.join(' | ') : 'unknown';
    }
    case 'repeater': {
      if (depth > 4) return 'unknown[]';
      const names = unionOfCustoms(field);
      if (!names.length) return 'unknown[]';
      // 単一なら括弧不要（Image[]）、複数のみ union を括弧でくくる（(A | B)[]）。
      return names.length === 1 ? `${names[0]}[]` : `(${names.join(' | ')})[]`;
    }
    default:
      warnings.push(`未知の kind '${field.kind}'（フィールド '${field.fieldId}'）→ unknown にしました。`);
      return 'unknown';
  }
}

function renderFields(fields, depth) {
  const lines = [];
  for (const f of fields) {
    if (!f || !f.fieldId) continue;
    const optional = f.required === true ? '' : '?';
    lines.push(`  ${f.fieldId}${optional}: ${fieldType(f, depth)};`);
  }
  return lines.join('\n');
}

// --- 出力組み立て ---
// 型本体を先に組み立てる（このとき usesImage が確定する）→ 最後にヘッダ／import を前置する。
const topName = pascal(opts.name || 'Content');
const typeBlocks = [];

for (const cf of customFields) {
  if (!cf.fieldId) continue;
  const body = renderFields(Array.isArray(cf.fields) ? cf.fields : [], 1);
  typeBlocks.push(
    `export type ${customTypeName.get(cf.fieldId)} = {\n` +
      `  fieldId: ${q(cf.fieldId)};\n` +
      `${body}\n};`,
  );
}

typeBlocks.push(`export type ${topName} = {\n${renderFields(apiFields, 1)}\n};`);

// media を使う型は共通の MicroCMSImage をライブラリから import して共有する（重複定義しない）。
const libPath = opts.lib || '@/lib/microcms/microcms';
const head = [
  '// AUTO-GENERATED from microCMS schema by ato-microcms-types.\n' +
    '// id / createdAt 等は取得ラッパー側が付与するためここには含めない。\n' +
    '// relation など unknown のままの箇所は参照先 API の型へ手で置き換える。',
];
if (usesImage) {
  head.push(`import type { MicroCMSImage } from '${libPath}';`);
}

const output = [...head, ...typeBlocks].join('\n\n') + '\n';

if (opts.out) {
  mkdirSync(dirname(opts.out), { recursive: true }); // types/microcms/ が無くても掘る
  writeFileSync(opts.out, output);
  console.error(`[schema-to-types] 生成しました: ${opts.out}`);
} else {
  process.stdout.write(output);
}

for (const w of [...new Set(warnings)]) console.error(`[warn] ${w}`);
