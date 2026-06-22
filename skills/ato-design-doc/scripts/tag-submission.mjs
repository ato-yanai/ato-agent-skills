#!/usr/bin/env node
// 設計書ごとの提出タグ <base>-<版2桁> を扱う依存ゼロのスクリプト。役割は2つ:
//   (1) --diff      : 直近の <base>-NN タグと作業ツリーの差分を出す（commit前。変更点の下書き用）
//   (2) タグ付け    : 既存 <base>-NN から次の版番号を採番し、HEAD（=提出コミット）にタグを打って push
//
// タグ付けの前にプリフライト検査を行う（--skip-checks で省略可）:
//   1. 対象設計書（--file）がコミット済みで変更が残っていない（無指定なら作業ツリー全体）。
//      ※対象ファイル単位で見るので、別文書を別コミットにする運用でも、他文書が dirty なら止めない。
//   2. --file 指定時、対象設計書に「第N版」と Gitタグ「<base>-NN」がある（=版が上がっている）
//   2b.--file 指定時、その版上げが HEAD のコミットに含まれる（対象ファイルを最後に変更したコミット=HEAD）
//   3. HEAD が提出コミットらしいか（design / 提出）— 警告のみ
//
// 使い方:
//   node scripts/tag-submission.mjs microcms --diff --file docs/design/microcms.md  # 変更点の下書き（commit前）
//   node scripts/tag-submission.mjs microcms --file docs/design/microcms.md  # commit後にタグ付与（注釈は既定文）
//   node scripts/tag-submission.mjs microcms --dry-run        # 次タグ名（=版）だけ
//   node scripts/tag-submission.mjs microcms --file ... --push  # タグ付与後にそのまま push（既定はpushしない）
//
// 既定では push しない。タグ付与後に push コマンドを案内するので、ユーザーが push する。
// タグ番号 = 版番号（提出のたびに +1）。例: 第2版 → microcms-02。

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function printHelp() {
  console.log(
    [
      '使い方: node scripts/tag-submission.mjs <base> [options]',
      '  <base>          タグ接頭辞 = 設計書ファイルのベース名（例 microcms, functions, page）',
      '  --file <path>   対象設計書のパス。差分対象＆版上げ検査に使う（強く推奨）',
      '  --diff          直近タグと作業ツリーの差分を表示（commit前・変更点下書き用）',
      '  --dry-run       次のタグ名を表示するだけ',
      '  --push          タグ付与後にそのまま push する（既定は push しない＝コマンドを案内）',
      '  --skip-checks   タグ付け前のプリフライト検査を省略する',
      '  -m "msg"        タグ注釈メッセージ（任意。既定は「<base>の第N版を提出」。社名等は入れない）',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const o = { base: '', file: '', diff: false, dryRun: false, push: false, checks: true, message: '' };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') o.file = argv[++i] ?? '';
    else if (a === '--diff') o.diff = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--push') o.push = true;
    else if (a === '--skip-checks') o.checks = false;
    else if (a === '-m' || a === '--message') o.message = argv[++i] ?? '';
    else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    else if (a.startsWith('-')) { console.error(`[error] 不明な引数: ${a}（--help 参照）`); process.exit(1); }
    else rest.push(a);
  }
  o.base = rest[0] ?? '';
  return o;
}

function listVersions(base) {
  let out = '';
  try {
    out = git(['tag', '--list', `${base}-*`]).trim();
  } catch {
    console.error('[error] git リポジトリではない、または git が見つかりません。');
    process.exit(1);
  }
  return out
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => Number.parseInt(t.slice(base.length + 1), 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

const tagName = (base, n) => `${base}-${String(n).padStart(2, '0')}`;

// タグ付け前のプリフライト検査。問題があれば中止する。
function preflight(base, n, file) {
  const tag = tagName(base, n);

  // 1. 対象設計書がコミット済み・変更なしか（--file 指定時はそのファイルだけを見る）。
  //    タグと提出物の中身を一致させるための検査。別文書が dirty でも対象が確定していれば止めない。
  const scope = file ? ['--', file] : [];
  const status = git(['status', '--porcelain', ...scope]).trim();
  if (status) {
    console.error(
      file
        ? `[error] ${file} に未コミットの変更があります。先にこの設計書をコミットしてからタグを打ってください。`
        : '[error] 未コミットの変更があります。先に提出コミットを作ってからタグを打ってください。',
    );
    console.error(status);
    console.error('  （検査を省略するなら --skip-checks）');
    process.exit(1);
  }

  // 2. 版が上がっているか（対象設計書に「第N版」と Gitタグ「<base>-NN」がある）
  if (file) {
    let content = '';
    try {
      content = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`[error] 対象設計書を読めません: ${file}（${e.code ?? e.message}）`);
      process.exit(1);
    }
    const problems = [];
    if (!content.includes(`第${n}版`)) problems.push(`「第${n}版」が見つからない（版を上げ忘れ？）`);
    if (!content.includes(tag)) problems.push(`変更履歴の Gitタグ「${tag}」が見つからない`);
    if (problems.length) {
      console.error(`[error] ${file} の版上げが未完了の可能性:`);
      for (const p of problems) console.error(`  - ${p}`);
      console.error(`  → 第${n}版へ更新し、変更履歴の Gitタグ列を ${tag} にしてからコミットし直す。`);
      process.exit(1);
    }

    // 2b. その版上げが HEAD のコミットに含まれているか（タグは HEAD に付くため）。
    //     対象ファイルを最後に変更したコミットが HEAD でなければ、版上げは過去の別コミットにある＝
    //     タグの中身（HEAD）と提出物がずれる。版上げコミットを HEAD にしてから打つ。
    const headSha = git(['rev-parse', 'HEAD']).trim();
    const lastTouch = git(['log', '-1', '--format=%H', '--', file]).trim();
    if (lastTouch !== headSha) {
      console.error(`[error] ${file} の版上げが HEAD のコミットに含まれていません。`);
      console.error('  タグは HEAD に付くため、対象設計書の版上げを HEAD（＝提出コミット）に含めてからタグを打ってください。');
      console.error(
        `  （HEAD=${headSha.slice(0, 7)} / ${file} を最後に変更したコミット=${lastTouch ? lastTouch.slice(0, 7) : 'なし'}）`,
      );
      process.exit(1);
    }
  } else {
    console.error('[warn] --file 未指定のため版上げ検査はスキップしました（指定を推奨）。');
  }

  // 3. HEAD が提出コミットらしいか（警告のみ）
  const subject = git(['log', '-1', '--format=%s']).trim();
  if (!/design|提出/.test(subject)) {
    console.error(`[warn] HEAD の件名が提出コミットらしくありません: "${subject}"`);
    console.error('  提出コミットは scope を design に固定する想定（例 chore(design): …提出）。');
  }
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.base) {
  console.error('[error] <base>（タグ接頭辞 = ファイル名）を指定してください。--help 参照');
  process.exit(1);
}

const versions = listVersions(opts.base);
const latest = versions.length ? Math.max(...versions) : 0;

// (1) 差分モード: 直近タグ vs 作業ツリー（commit前に変更点を要約するため）
if (opts.diff) {
  if (latest === 0) {
    console.log(`前タグなし（${opts.base} は初版）。変更履歴は「初版」と記載する。`);
    process.exit(0);
  }
  const prev = tagName(opts.base, latest);
  const args = ['diff', prev];
  if (opts.file) args.push('--', opts.file);
  else console.error(`[warn] --file 未指定。${prev} 以降の全変更を表示します（対象設計書の指定を推奨）。`);
  try {
    process.stdout.write(git(args));
  } catch (e) {
    console.error(`[error] 差分取得に失敗: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// (2) タグ付けモード: 次の版番号で HEAD にタグ
const n = latest + 1;
const tag = tagName(opts.base, n);

if (opts.dryRun) {
  console.log(`次の提出タグ: ${tag}（= 第${n}版）`);
  process.exit(0);
}

if (opts.checks) preflight(opts.base, n, opts.file);

const msg = opts.message || `${opts.base}の第${n}版を提出`;
try {
  git(['tag', '-a', tag, '-m', msg]);
} catch (e) {
  console.error(`[error] タグ作成に失敗: ${e.message}`);
  console.error('  既に同名タグがある場合は版番号を確認してください。');
  process.exit(1);
}

// タグ → コミットの対応を表示（関係を明示）
const head = git(['log', '-1', '--format=%h %s']).trim();
console.log(`[ok] タグを作成: ${tag} → コミット ${head}`);

if (!opts.push) {
  // 既定: push せず、ユーザーに push を促す
  console.log('[done] タグ付与まで完了（push は未実行）。');
  console.log('  最後に、次のコマンドで push してください:');
  console.log('    git push --follow-tags');
  console.log(`  （タグだけなら: git push origin ${tag}）`);
  process.exit(0);
}
try {
  git(['push', '--follow-tags']);
  console.log('[ok] push 完了: git push --follow-tags');
} catch (e) {
  console.error(`[warn] push に失敗: ${e.message}`);
  console.error(`  タグはローカルに作成済み。手動で: git push --follow-tags`);
  process.exit(1);
}
