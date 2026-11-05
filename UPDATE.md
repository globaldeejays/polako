# Refresh run: instructions for Claude

Each scheduled run follows these steps exactly. Claude itself does the rewriting, so no LLM API key is involved.
Work in the cloned repo. Settings live in `feeds.json`.

## 1. Pick the stories: Klix's front page first
The app shows what Klix shows on its front page, in the same order, so the reader sees the day's real top news.

1. Read `feeds.json` and `site/data/news.json`.
2. WebFetch `frontPage` (https://www.klix.ba/). Ask for the article links of the top area in exact page order,
   lead story first (title, URL, kicker, time ago), then the section blocks that follow (Vijesti, Biznis, Sport,
   Magazin, Lifestyle, Scitech, Auto) with their first few links.
   Freshness check: between 07:00 and 23:00 Sarajevo time the top area always has stories from the last few hours.
   If its newest story is older than 6 hours, the copy is cached: fetch it again with the other host form
   (`www.klix.ba` ↔ `klix.ba`) and use the fresher one.
3. **Top stories** (`topStories`, 6): walk the top area in page order and take the first 6 that are real news.
   Skip live tickers ("Uživo", "Tok utakmice"), video-only items, sponsored or PR pieces (a company "podržao/podržala",
   offers, "Promo", "Sponzorisano"), and graphic crime or war-crime trial details; take the next one instead.
   Keep Klix's order: its lead story is first.
4. **Extra stories** (`extraStories`, 3–4): then one story per section, in the order of `extraSections`, skipping a
   section when nothing fits, until you have 4 (at least 3):
   - **Vrijeme**: a weather forecast or weather news article (kicker "Vremenska prognoza", or a title about kiša,
     snijeg, temperature, nevrijeme) published in the last 36 hours. Look in the top area, the Vijesti block and
     https://www.klix.ba/vijesti/bih. The weather service page (`/vrijeme`) is not an article: never use it.
   - **Magazin**: the first suitable story of the Magazin block (prefer kultura, film, muzika over celebrity gossip).
   - **Zdravlje**: the newest story from https://www.klix.ba/lifestyle/zdravlje published in the last 3 days.
   - **Lifestyle / Scitech / Auto**: the story from those blocks that an adult learner would most like to read.
   Never pick the same story twice or a story that is already one of the top stories.
5. For each picked story whose `id` (the trailing number in the URL) is already in news.json, keep the existing
   article as it is. Write only the new ones (step 2), at most `perRun` per run.
6. Set `"front"` in news.json to the picked ids in this order: the top stories in Klix's order, then the extras.
   The app lists exactly these first (Klix's lead story at the very top), then older articles, newest first.

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

Section: a weather forecast or weather news story → Vrijeme, whatever its URL. Otherwise from the URL path:
`vijesti/bih`, `vijesti/crna-hronika` → BiH; `vijesti/svijet|regija|dijaspora` → Svijet; `sport/*` → Sport;
`biznis/*` → Biznis; `scitech/*` → Tehnologija; `lifestyle/zdravlje` → Zdravlje;
`magazin/*`, other `lifestyle/*`, `auto/*` → Magazin.
For other feeds use the feed category mapped to the same sections.

Article shape (append to `articles` in `site/data/news.json`; `front` is the list from step 1.6):
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
Set `"updated"` to the current time in Europe/Sarajevo with its offset, and `"front"` to the ordered id list:
`{ "updated": "…", "front": ["261105336", "261105363", …], "articles": [ … ] }`.

## 3. Dictionary
Run `node scripts/check.mjs --prune <keep>`. It keeps the newest `keep` articles (plus every article in `front`),
checks that every `front` id exists, and lists every word form
with no entry in `site/data/dict.json`. Add an entry for each one, then run it again until it reports `missing (0)`
and no `ERRORS` (it also flags articles with a missing or wrong image).

Entry format, one per line:
- key: the word form in lowercase (names and places keep their capital: `"Toronta"`).
- value: `"gloss"` when the form is the base form, else `"lemma|gloss (short usage hint)"`,
  for example `"snijega": "snijeg|snow (malo snijega = a little snow)"`.
- The gloss must fit how the word is used in the sentence. Never remove existing entries.

## 4. Publish
Only if something changed (new articles, or a different `front` order): commit `site/data/news.json` and
`site/data/dict.json` with the message `Vijesti: N novih članaka, naslovnica osvježena (YYYY-MM-DD HH:MM)` and push to
the default branch. The app reads the news straight from GitHub, so it shows up within minutes (Netlify does not
redeploy for data-only pushes, which keeps its free credits for app updates).
If neither changed, change nothing and report "no changes".
Push notifications are sent by a Netlify function that checks GitHub every 10 minutes (`netlify/functions/`); a run
does nothing for them and must not touch `netlify/`, `package.json`, `site/` outside `site/data/`, or `src/`.
End the run with one line: how many articles were added and their titles, and the new top story.
