# Polako

News in easy Bosnian. A static PWA that shows A2 retellings (easy, but written for adults) of the latest stories from the feeds in
`feeds.json`, with photos, a tap-to-translate dictionary (tap a word), sentence translation (press and hold a
sentence), read-aloud, saved words and offline reading.

There is no LLM API. A Claude scheduled task runs a few times a day, follows `UPDATE.md`,
takes Klix's front-page top stories (in Klix's order) plus a few from weather, magazine and health, rewrites the
new ones into `site/data/news.json` + `site/data/dict.json`, saves the display order as `front`, and pushes to this repo.
The app loads `news.json` and `dict.json` straight from this repo on GitHub (raw.githubusercontent.com), so
new articles appear within minutes. Netlify only redeploys when the app or its functions change: `netlify.toml` skips
builds for pushes that only touch news data, docs, rules or scripts, because each production deploy costs Netlify credits. The repo must be public
for this; if GitHub is unreachable the app falls back to the `site/data/` copy from the last deploy.

Push notifications (bell in the header): the app registers the device at `/api/push`
(`netlify/functions/push.mts`). Every 10 minutes,
`netlify/functions/notify-new-articles.mts` compares news.json on GitHub with the articles it has already seen and,
if there are new ones, notifies every registered device. VAPID keys, subscriptions and the seen list live in
Netlify Blobs (stores `push-config`, `push-subscriptions`, `push-state`); the keys are created there on first use.

## Layout
- `site/` – the deployed app (Netlify publish directory, no build command)
  - `index.html`, `sw.js` – built from `src/` with `node scripts/build.mjs`
  - `data/news.json` – articles: title, sentences as [bosnian, english] pairs, key words
  - `data/dict.json` – word form → `"lemma|gloss"` (or just `"gloss"`)
- `src/app.html`, `src/sw.js` – app source
- `scripts/check.mjs` – validates the data and lists words missing from the dictionary
- `netlify/functions/`, `netlify/lib/` – push notification functions (`package.json` lists their dependencies)
- `feeds.json` – feeds, level (A1/A2/B1/B2), articles per run, how many to keep
- `UPDATE.md` – the exact steps each refresh run follows

## Netlify setup (once)
1. Netlify → Add new project → Import from Git → pick this repo.
2. Build command: leave empty. Publish directory: `site`.
3. Deploy. Pushes that only change `site/data/` are skipped on purpose (see above).

## Change things
- Other feeds or a different level: edit `feeds.json` (or ask Claude to).
- App code: edit `src/`, then `node scripts/build.mjs` and commit `site/`.
