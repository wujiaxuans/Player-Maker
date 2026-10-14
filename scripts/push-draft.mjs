#!/usr/bin/env node
// Usage: node scripts/push-draft.mjs <note.md> [--repo owner/name] [--branch main] [--dry-run]
// Adds a video note to drafts/ on GitHub via the logged-in `gh` CLI. Only ever writes under drafts/.
// Filename is always ASCII: BV….md or YT-….md (derived from the note / basename).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseFrontMatter, stringifyFrontMatter } from '../src/markdown.js';
import { draftFileName, DRAFT_NAME_RE } from '../functions/_lib/github.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith('--') && !['--repo', '--branch'].includes(args[i - 1]));
if (!file) { console.error('usage: push-draft.mjs <note.md> [--repo owner/name] [--branch main] [--dry-run]'); process.exit(2); }
const repo = opt('--repo', 'wujiaxuans/Player-Maker'), branch = opt('--branch', 'main');

export function toDraft(text) {
  const { data, body } = parseFrontMatter(text);
  const field = re => body.match(re)?.[1]?.trim();
  const title = data.title || field(/^#\s+(.+)$/m) || '';
  const source = data.source || field(/^-\s*(?:链接|来源链接|URL)\s*[：:]\s*(\S+)/m) || '';
  const author = data.author || field(/^-\s*UP\s*主\s*[：:]\s*(.+)$/m) || '';
  return { meta: { title, video_title: title, source, author }, content: stringifyFrontMatter({ ...data, title, video_title: data.video_title || title, source, author }, body) };
}

const raw = readFileSync(file, 'utf8');
const { meta, content } = toDraft(raw);
if (!meta.source || !meta.author) console.warn(`warning: ${file} 缺少链接或UP主，发布时会被拒绝`);
const name = draftFileName(content, basename(file));
if (!DRAFT_NAME_RE.test(name)) { console.error(`unsafe draft name: ${name}`); process.exit(2); }
const path = `drafts/${name}`;
if (args.includes('--dry-run')) { console.log(path); console.log(content); process.exit(0); }

const enc = path.split('/').map(encodeURIComponent).join('/');
let sha;
try { sha = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/contents/${enc}?ref=${branch}`], { stdio: ['ignore', 'pipe', 'ignore'] })).sha; } catch { /* new file */ }
const payload = JSON.stringify({ message: `draft: add ${name}`, content: Buffer.from(content).toString('base64'), branch, ...(sha ? { sha } : {}) });
execFileSync('gh', ['api', '-X', 'PUT', `repos/${repo}/contents/${enc}`, '--input', '-'], { input: payload, stdio: ['pipe', 'ignore', 'inherit'] });
console.log(`pushed ${path} to ${repo}@${branch}`);
