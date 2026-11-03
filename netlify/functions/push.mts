// /api/push
//   GET    → { publicKey }            VAPID public key for PushManager.subscribe()
//   POST   ← PushSubscription JSON    store it (first time: also send a welcome notification)
//   DELETE ← { endpoint }             forget it
import type { Config, Context } from "@netlify/functions"
import {
  cleanSubscription, countSubscriptions, getVapid, keyFor, MAX_SUBSCRIPTIONS, sendOne, subscriptions, welcomePayload,
} from "../lib/push.mts"

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } })

async function readBody(req: Request): Promise<unknown> {
  const text = await req.text()
  if (text.length > 4096) throw new Error("too large")
  return JSON.parse(text)
}

export default async (req: Request, context: Context) => {
  if (req.method === "GET") {
    const { publicKey } = await getVapid()
    return json({ publicKey })
  }

  // Only the app itself may change subscriptions.
  const origin = req.headers.get("origin")
  if (origin && origin !== new URL(req.url).origin) return json({ error: "origin" }, 403)

  let body: unknown
  try { body = await readBody(req) } catch { return json({ error: "bad request" }, 400) }

  if (req.method === "POST") {
    const sub = cleanSubscription(body)
    if (!sub) return json({ error: "invalid subscription" }, 400)
    const store = subscriptions()
    const key = keyFor(sub.endpoint)
    const isNew = (await store.get(key)) === null
    if (isNew && (await countSubscriptions()) >= MAX_SUBSCRIPTIONS) return json({ error: "full" }, 503)
    await store.setJSON(key, { ...sub, saved: new Date().toISOString() })
    if (isNew) {
      try { await sendOne(sub, welcomePayload()) } catch (err: any) { console.log("welcome push failed", err?.statusCode) }
    }
    return json({ ok: true, created: isNew }, isNew ? 201 : 200)
  }

  if (req.method === "DELETE") {
    const endpoint = (body as { endpoint?: unknown })?.endpoint
    if (typeof endpoint !== "string" || endpoint.length > 2048) return json({ error: "bad request" }, 400)
    await subscriptions().delete(keyFor(endpoint))
    return json({ ok: true })
  }

  return json({ error: "method" }, 405)
}

export const config: Config = {
  path: "/api/push",
  method: ["GET", "POST", "DELETE"],
}
