# Refresh run: instructions for Claude

Each scheduled run follows these steps exactly. Claude itself does the rewriting, so no LLM API key is involved.
Work in the cloned repo. Settings live in `feeds.json`.

## 1. Collect new items
1. Read `feeds.json` and `site/data/news.json`.
2. For every feed, use WebFetch on its URL and extract each item's title, link, category, pubDate, image
   (`media:content` url, else `enclosure`, else the first `<img>` in the description) and description.
3. Drop items that are already in news.json (same `id` = the trailing number in the URL, or the link if there is none),
   items older than `maxAgeHours`, sponsored items (`skipSections`, "Promo", "Sponzorirano"), video-only items and live tickers.
4. Pick up to `perRun` items, newest first, with a mix of sections. Prefer stories a learner can follow
   (BiH life, weather, prices, sport, tech, culture). Skip graphic crime and war-crime trial details.

## 2. Write each article at the target level
For every picked item, WebFetch the article page for the facts (fall back to the feed description).
Then write a fresh, short retelling in Bosnian (ijekavica, Bosnian word choices: hiljada, sedmica, historija, sport not šport).

Rules for **A2** (the default):
- Title: at most 8 words. Body: 4–8 sentences in 2 paragraphs, each sentence at most 12 words.
- Tenses: present, perfekt and futur I only. No aorist, imperfect, passive chains or stacked relative clauses.
- Everyday vocabulary. If a hard word is needed, explain it in a short extra sentence.
- Only facts that are in the source. No opinions. Numbers as digits.
- Write it in your own words. Never copy sentences from the source, and never translate the whole article:
  it is a short retelling that links to the original.
- Every Bosnian sentence gets a natural, faithful English translation.
- `vocab`: 5–6 key words of the story in their base form, with English.

Other levels, if `level` in feeds.json changes:
- **A1**: 3–5 sentences, at most 8 words each, present tense only, very common words.
- **B1**: 6–10 sentences, at most 18 words, all common tenses, some linking words (jer, zato što, iako).
- **B2**: 8–12 sentences, natural news style but still clear; keep translations.

Section from the URL path: `vijesti/bih` → BiH; `vijesti/svijet|regija|dijaspora` → Svijet; `sport/*` → Sport;
`biznis/*` → Biznis; `scitech/*` → Tehnologija; `magazin/*`, `lifestyle/*`, `auto/*` → Magazin.
For other feeds use the feed category mapped to the same six sections.

Article shape (append to `articles` in `site/data/news.json`):
```json
{
  "id": "261102023",
  "source": "Klix.ba",
  "section": "BiH",
  "url": "https://www.klix.ba/...",
  "image": "https://static.klix.ba/media/images/vijesti/...jpg",
  "published": "2026-11-02T08:17:00+01:00",
  "title": ["Bosnian title", "English title"],
  "body": [
    [["Bosnian sentence.", "English sentence."], ["…", "…"]],
    [["…", "…"]]
  ],
  "vocab": [["kiša", "rain"], ["snijeg", "snow"]]
}
```
Set `"updated"` to the current time in Europe/Sarajevo with its offset.

## 3. Dictionary
Run `node scripts/check.mjs --prune <keep>`. It keeps the newest `keep` articles and lists every word form
with no entry in `site/data/dict.json`. Add an entry for each one, then run it again until it reports `missing (0)`.

Entry format, one per line:
- key: the word form in lowercase (names and places keep their capital: `"Toronta"`).
- value: `"gloss"` when the form is the base form, else `"lemma|gloss (short usage hint)"`,
  for example `"snijega": "snijeg|snow (malo snijega = a little snow)"`.
- The gloss must fit how the word is used in the sentence. Never remove existing entries.

## 4. Publish
Only if at least one article was added: commit `site/data/news.json` and `site/data/dict.json` with the message
`Vijesti: N novih članaka (YYYY-MM-DD HH:MM)` and push to the default branch. Netlify deploys the push automatically.
If nothing was new, change nothing and report "no new items".
End the run with one line: how many articles were added and their titles.
