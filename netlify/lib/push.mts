// Shared Web Push helpers for the Polako functions.
// - VAPID keys are generated once on Netlify and kept in a private Blobs store,
//   so the private key never lives in the repo or in environment variables.
// - Subscriptions are stored one per blob, keyed by a hash of the push endpoint.
import { getStore } from "@netlify/blobs"
import webpush from "web-push"
import { createHash } from "node:crypto"

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export type Article = { id: string; title: [string, string]; published: string }
export type Payload = { title: string; body: string; url: string; tag: string }

const SUBJECT = "https://polako-vijesti.netlify.app"
const MAX_SUBSCRIPTIONS = 2000

const config = () => getStore({ name: "push-config", consistency: "strong" })
export const subscriptions = () => getStore({ name: "push-subscriptions", consistency: "strong" })
export const pushState = () => getStore({ name: "push-state", consistency: "strong" })

type Vapid = { publicKey: string; privateKey: string }

export async function getVapid(): Promise<Vapid> {
  const store = config()
  const existing = (await store.get("vapid", { type: "json" })) as Vapid | null
  if (existing?.publicKey && existing?.privateKey) return existing
  // First use: create a key pair. onlyIfNew makes concurrent first calls agree on one pair.
  await store.setJSON("vapid", webpush.generateVAPIDKeys(), { onlyIfNew: true })
  const saved = (await store.get("vapid", { type: "json" })) as Vapid | null
  if (!saved?.publicKey || !saved?.privateKey) throw new Error("VAPID keys unavailable")
  return saved
}

// Push services used by Chrome/Android, Safari/iOS, Firefox and Edge.
const PUSH_HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/,
  /(^|\.)android\.googleapis\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
]
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/

export function cleanSubscription(input: unknown): Subscription | null {
  const s = input as Partial<Subscription> | null
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 2048) return null
  let url: URL
  try { url = new URL(s.endpoint) } catch { return null }
  if (url.protocol !== "https:" || !PUSH_HOSTS.some((re) => re.test(url.hostname))) return null
  const p256dh = s.keys?.p256dh, auth = s.keys?.auth
  if (typeof p256dh !== "string" || typeof auth !== "string") return null
  if (!B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length < 80 || p256dh.length > 100 || auth.length < 16 || auth.length > 32) return null
  return { endpoint: s.endpoint, keys: { p256dh, auth } }
}

export const keyFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex")

export async function countSubscriptions(): Promise<number> {
  const { blobs } = await subscriptions().list()
  return blobs.length
}
export { MAX_SUBSCRIPTIONS }

// Bosnian plural: 1 nova vijest, 2–4 nove vijesti, 5+ novih vijesti (11–14 → novih).
export function newsCount(n: number): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} nova vijest`
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return `${n} nove vijesti`
  return `${n} novih vijesti`
}

export function newsPayload(fresh: Article[]): Payload {
  const sorted = [...fresh].sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
  const shown = sorted.slice(0, 3).map((a) => a.title[0])
  const more = sorted.length - shown.length
  return {
    title: `Polako · ${newsCount(sorted.length)}`,
    body: shown.join("\n") + (more > 0 ? `\n+ još ${more}` : ""),
    url: sorted.length === 1 ? `/#a-${sorted[0].id}` : "/",
    tag: "polako-news",
  }
}

export const welcomePayload = (): Payload => ({
  title: "Polako · obavijesti su uključene",
  body: "Javit ćemo ti kad stignu nove vijesti. · We'll let you know when new stories arrive.",
  url: "/",
  tag: "polako-welcome",
})

export async function sendOne(sub: Subscription, payload: Payload, vapid?: Vapid) {
  const keys = vapid ?? (await getVapid())
  return webpush.sendNotification(sub, JSON.stringify(payload), {
    vapidDetails: { subject: SUBJECT, publicKey: keys.publicKey, privateKey: keys.privateKey },
    TTL: 12 * 60 * 60,
    urgency: "normal",
    topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32),
  })
}

// Sends to every stored subscription; removes ones the push service says are gone.
export async function sendToAll(payload: Payload) {
  const store = subscriptions()
  const vapid = await getVapid()
  const { blobs } = await store.list()
  let sent = 0, removed = 0, failed = 0
  const queue = [...blobs]
  const worker = async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      const sub = (await store.get(b.key, { type: "json" })) as Subscription | null
      if (!sub) continue
      try {
        await sendOne(sub, payload, vapid)
        sent++
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) { await store.delete(b.key); removed++ }
        else { failed++; console.log("push failed", err?.statusCode, String(err?.body || err?.message || err).slice(0, 200)) }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, blobs.length) }, worker))
  return { total: blobs.length, sent, removed, failed }
}
