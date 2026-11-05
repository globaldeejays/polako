// Runs every 10 minutes. Reads news.json from GitHub (where every refresh run pushes it) and, if it
// holds articles not seen before, sends one push notification to every subscribed device.
// News no longer needs a Netlify deploy, so this cannot hang off a deploy event.
import type { Config } from "@netlify/functions"
import { newsPayload, pushState, sendToAll, type Article } from "../lib/push.mts"

const NEWS_URL = "https://raw.githubusercontent.com/globaldeejays/polako/main/site/data/news.json"
const KEEP_SEEN = 400

export default async () => {
  const res = await fetch(`${NEWS_URL}?t=${Date.now()}`, { headers: { "cache-control": "no-cache" } })
  if (!res.ok) { console.log("news.json not readable", res.status); return }
  const news = (await res.json()) as { articles?: Article[]; front?: string[] }
  const articles = news.articles ?? []
  if (!articles.length) return
  const ids = articles.map((a) => a.id)

  const state = pushState()
  const last = (info: object) => state.setJSON("last", { at: new Date().toISOString(), ...info })
  const seen = (await state.get("seen", { type: "json" })) as string[] | null
  if (!seen) {
    // First run: remember what is already there, notify nothing.
    await state.setJSON("seen", ids)
    await last({ result: "initialised", articles: ids.length })
    return
  }

  const seenSet = new Set(seen)
  const fresh = articles.filter((a) => !seenSet.has(a.id))
  if (!fresh.length) return   // nothing new: no writes, so most runs cost almost nothing

  // Save first, so a crash while sending can never notify the same articles twice.
  await state.setJSON("seen", [...new Set([...ids, ...seen])].slice(0, KEEP_SEEN))
  const result = await sendToAll(newsPayload(fresh, news.front ?? []))
  await last({ result: "notified", newArticles: fresh.length, ...result })
  console.log(`notified about ${fresh.length} new articles`, JSON.stringify(result))
}

export const config: Config = {
  schedule: "*/10 * * * *", // every 10 minutes (UTC; the interval is the same in every time zone)
}
