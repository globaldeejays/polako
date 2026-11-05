# Refresh run: instructions for Claude

Each scheduled run follows these steps exactly. Claude itself does the rewriting, so no LLM API key is involved.
Work in the cloned repo. Settings live in `feeds.json`.

## 1. Collect new items
1. Read `feeds.json` and `site/data/news.json`.
2. For every feed, use WebFetch on its URL and extract each item's title, link, category, pubDate and description.
   Stale feed check: if the newest pubDate is more than 6 hours old between 07:00 and 23:00 Sarajevo time, the copy
   is cached. Fetch it again with the other host form (`klix.ba` ↔ `www.klix.ba`) and use the fresher one.
3. Drop items that are already in news.json (same `id` = the trailing number in the URL, or the link if there is none),
   items older than `maxAgeHours`, sponsored items (`skipSections`, "Promo", "Sponzorirano"), video-only items and live tickers.
4. Pick up to `perRun` items, newest first, with a mix of sections. Prefer stories a learner can follow
   (BiH life, weather, prices, sport, tech, culture). Skip graphic crime and war-crime trial details.

## 2. Write each article at the target level
For every picked item, WebFetch the article page for the facts (fall back to the feed description).
Then write a fresh retelling in Bosnian (ijekavica, Bosnian word choices: hiljada, sedmica, historija, sport not šport).

The readers are adults learning Bosnian. A2 means clear and easy, not childish: write like a news service in
easy language for adults, never like a children's book. The text should read as real news that happens to be easy.

Rules for **A2** (the default):
- Title: 5–10 words, informative, like a real headline in plain words.
- Body: 9–13 sentences in 3 paragraphs, about 120–170 words.
  1st paragraph: what happened, who, where, when. 2nd: the important details and numbers.
  3rd: background, what people said (reported speech: "rekao je da…"), or what happens next.
- Sentences: mostly 8–16 words, at most 20. Mix shorter and longer ones.
- Join related facts with everyday connectors: i, a, ali, jer, zato, kada, ako, dok, nakon što, prije nego što, iako.
  One simple relative clause (koji/koja/koje) per sentence is fine. Do not stack clauses.
- Tenses: present, perfekt, futur I, and the conditional (bi) for "would/could". Common news phrases with "se"
  (očekuje se, prodaje se) are fine. No aorist, no imperfect.
- Vocabulary: the common words of news are fine (vlada, izbori, cijena, kompanija, utakmica, istraživanje,
  stanovnici, policija). Explain at most 1–2 really rare or technical terms, briefly, inside the sentence or in
  the next one.
- Avoid baby talk: no chains of tiny sentences ("X je … X je … X je …"), no stating the obvious ("Sport je
  zanimljiv."), no repeating the same subject in every sentence; use pronouns and names naturally.
  Bad: "Zemljotres je bio u Sarajevu. Zemljotres je probudio ljude. Ljudi su se uplašili."
  Good: "Zemljotres je u ponedjeljak u 01:17 probudio mnoge stanovnike Sarajeva, a neki su prvo čuli jak zvuk."
- Only facts that are in the source. No opinions of your own. Numbers as digits.
- Write it in your own words. Never copy sentences from the source, and never translate the whole article:
  it is a retelling that links to the original.
- Every Bosnian sentence gets a natural, faithful English translation.
- `vocab`: 6–8 key words of the story in their base form, with English.

Other levels, if `level` in feeds.json changes (same adult tone at every level):
- **A1**: 6–8 sentences in 2 paragraphs, 6–12 words each, mostly present tense, very common words.
- **B1**: 12–16 sentences in 3–4 paragraphs, up to 25 words, all common tenses, natural linking words.
- **B2**: 14–20 sentences in 4 paragraphs, natural news style but still clear; keep translations.

Image (every article needs one):
- Klix.ba: always `https://static.klix.ba/media/images/vijesti/b_<id>.jpg` (the article's own photo, 800 px wide).
  Do not use the RSS `media:content` link (`img32_<id>.jpg`): that file does not exist on Klix and shows no photo.
- Other feeds: the article page's `og:image`, else the item's `media:content` / `enclosure` url, else the first
  `<img>` in the description.

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
  "image": "https://static.klix.ba/media/images/vijesti/b_261102023.jpg",
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
with no entry in `site/data/dict.json`. Add an entry for each one, then run it again until it reports `missing (0)`
and no `ERRORS` (it also flags articles with a missing or wrong image).

Entry format, one per line:
- key: the word form in lowercase (names and places keep their capital: `"Toronta"`).
- value: `"gloss"` when the form is the base form, else `"lemma|gloss (short usage hint)"`,
  for example `"snijega": "snijeg|snow (malo snijega = a little snow)"`.
- The gloss must fit how the word is used in the sentence. Never remove existing entries.

## 4. Publish
Only if at least one article was added: commit `site/data/news.json` and `site/data/dict.json` with the message
`Vijesti: N novih članaka (YYYY-MM-DD HH:MM)` and push to the default branch. The app reads the news straight from
GitHub, so it shows up within minutes (Netlify does not redeploy for data-only pushes).
If nothing was new, change nothing and report "no new items".
Push notifications are sent by a Netlify function that checks GitHub every 10 minutes (`netlify/functions/`); a run does nothing for them and
must not touch `netlify/`, `package.json` or `src/`.
End the run with one line: how many articles were added and their titles.
