// Runs after every successful production deploy. If the deploy brought articles that were not
// in news.json before, it sends one push notification to every subscribed device.
// Refresh runs only push to GitHub; Netlify deploys, and this takes care of notifying.
import type { DeploySucceededEvent } from "@netlify/functions"
import { newsPayload, pushState, sendToAll, type Article } from "../lib/push.mts"

const KEEP_SEEN = 400

export default {
  async deploySucceeded(event: DeploySucceededEvent) {
    if (event.deploy.context !== "production") return

    const base = event.deploy.permalinkUrl || event.deploy.sslUrl || event.site.url
    const res = await fetch(new URL("/data/news.json", base), { headers: { "cache-control": "no-cache" } })
    if (!res.ok) { console.log("news.json not readable", res.status); return }
    const news = (await res.json()) as { articles?: Article[] }
    const articles = news.articles ?? []
    const ids = articles.map((a) => a.id)

    const state = pushState()
    const last = (info: object) => state.setJSON("last", { at: new Date().toISOString(), deploy: event.deploy.id, ...info })
    const seen = (await state.get("seen", { type: "json" })) as string[] | null
    if (!seen) {
      // First deploy with notifications: remember what is already there, notify nothing.
      await state.setJSON("seen", ids)
      await last({ result: "initialised", articles: ids.length })
      console.log(`initialised with ${ids.length} articles`)
      return
    }

    const seenSet = new Set(seen)
    const fresh = articles.filter((a) => !seenSet.has(a.id))
    // Save first, so a crash while sending can never notify the same articles twice.
    await state.setJSON("seen", [...new Set([...ids, ...seen])].slice(0, KEEP_SEEN))
    if (!fresh.length) { await last({ result: "no new articles" }); console.log("no new articles"); return }

    const result = await sendToAll(newsPayload(fresh))
    await last({ result: "notified", newArticles: fresh.length, ...result })
    console.log(`notified about ${fresh.length} new articles`, JSON.stringify(result))
  },
}
