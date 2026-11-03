// Polako content checker.
// Usage: node scripts/check.mjs [--prune N]
// - validates data/news.json structure
// - lists every Bosnian word form that has no entry in data/dict.json
// - with --prune N keeps only the newest N articles. The dictionary is never
//   pruned: it keeps growing, so later refreshes need fewer new entries.
import { readFileSync, writeFileSync } from 'node:fs';

const NEWS = new URL('../site/data/news.json', import.meta.url);
const DICT = new URL('../site/data/dict.json', import.meta.url);
const news = JSON.parse(readFileSync(NEWS, 'utf8'));
let dict = {};
try { dict = JSON.parse(readFileSync(DICT, 'utf8')); } catch { console.log('dict.json missing, starting empty'); }

const WORD = /[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu;
const errors = [];
const ids = new Set();

news.articles.forEach((a, i) => {
  const where = `article ${i} (${a.id})`;
  for (const k of ['id', 'source', 'section', 'url', 'published', 'title', 'body']) if (!a[k]) errors.push(`${where}: missing ${k}`);
  if (ids.has(a.id)) errors.push(`${where}: duplicate id`);
  ids.add(a.id);
  if (!Array.isArray(a.title) || a.title.length !== 2) errors.push(`${where}: title must be [bs, en]`);
  (a.body || []).forEach((p, pi) => p.forEach((s, si) => {
    if (!Array.isArray(s) || s.length !== 2 || !s[0] || !s[1]) errors.push(`${where}: body[${pi}][${si}] must be [bs, en]`);
  }));
  if (Number.isNaN(Date.parse(a.published))) errors.push(`${where}: bad published date`);
});

if (process.argv.includes('--prune')) {
  const n = parseInt(process.argv[process.argv.indexOf('--prune') + 1], 10) || 40;
  news.articles.sort((x, y) => Date.parse(y.published) - Date.parse(x.published));
  news.articles = news.articles.slice(0, n);
  writeFileSync(NEWS, JSON.stringify(news, null, 1) + '\n');
}

// Collect sentences (titles count as sentences).
const sentences = [];
for (const a of news.articles) {
  sentences.push(a.title[0]);
  for (const p of a.body) for (const s of p) sentences.push(s[0]);
}

const has = (w) => dict[w.toLocaleLowerCase('bs')] !== undefined || dict[w] !== undefined;
const missing = new Set();
const names = new Set();
const used = new Set();
for (const s of sentences) {
  const words = s.match(WORD) || [];
  words.forEach((w, i) => {
    const lw = w.toLocaleLowerCase('bs');
    if (dict[lw] !== undefined) used.add(lw);
    if (dict[w] !== undefined) used.add(w);
    if (has(w)) return;
    const capital = w[0] !== lw[0];
    if (capital && i > 0) names.add(w);        // mid-sentence capital: treated as a name by the app
    else missing.add(capital ? w : lw);        // sentence-initial or lowercase: needs an entry
  });
}

console.log(`articles: ${news.articles.length}, dictionary entries: ${Object.keys(dict).length}`);
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); }
console.log(`missing (${missing.size}): ${[...missing].sort().join(', ')}`);
console.log(`names shown as "name" (${names.size}): ${[...names].sort().join(', ')}`);
process.exit(errors.length || missing.size ? 1 : 0);
