// Builds site/index.html and site/sw.js from src/. Run after changing app code:
//   node scripts/build.mjs
// Content refreshes only touch site/data/*.json and do not need a build.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('src/app.html', root), 'utf8');
const cut = app.indexOf('</style>') + '</style>'.length;
const headPart = app.slice(0, cut), bodyPart = app.slice(cut);

const html = `<!doctype html>
<html lang="bs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Vijesti na lakom bosanskom (A2) s rječnikom.">
<meta name="theme-color" content="#F3F5F9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D1120" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${headPart}
</head>
<body>${bodyPart}
</body>
</html>
`;
writeFileSync(new URL('site/index.html', root), html);
const version = createHash('sha1').update(html).digest('hex').slice(0, 10);
writeFileSync(new URL('site/sw.js', root), readFileSync(new URL('src/sw.js', root), 'utf8').replace('__VERSION__', version));
console.log('built site/index.html and site/sw.js, version', version);
