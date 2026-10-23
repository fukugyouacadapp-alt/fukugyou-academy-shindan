import 'server-only'

/**
 * 回数制限。AI は使った分だけ課金されるので、1人が何度も押す・機械的に叩かれる、を止める。
 *
 * 【注意】サーバーのメモリ上で数えているだけなので、Vercel では同時に動く複数の実行環境の
 * それぞれで別々に数えられ、再起動で0に戻る（＝目安の歯止め）。
 * 本番では Vercel の Firewall（WAF）のレート制限ルールも必ず設定すること（CLAUDE.md 参照）。
 */

type Bucket = { hits: number[]; windowMs: number }
const buckets = new Map<string, Bucket>()

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** 記録しておく人数の上限。IPを偽って大量に送られても、サーバーのメモリを食いつぶされないように */
const MAX_BUCKETS = 10_000

/** 期限切れの記録（IPアドレスを含む）を消す間隔。プライバシーページの「時間がたつと消えます」はこれ */
const SWEEP_EVERY_MS = 10 * 60 * 1000
let lastSweep = Date.now()

/** 1人（IPアドレス）あたり1時間の上限 */
export const LIMITS = {
  diagnose: 5,
  followup: 10,
} as const

/** サイト全体の1日の上限（請求額の天井。実行環境ごとに数える） */
export const GLOBAL_DAILY_LIMIT = 2000

function sweep(now: number) {
  if (buckets.size <= MAX_BUCKETS && now - lastSweep < SWEEP_EVERY_MS) return
  lastSweep = now
  for (const [k, b] of buckets) if (b.hits.every(t => now - t >= b.windowMs)) buckets.delete(k)
  // それでも多すぎるときは、先に入ったものから1割ほど捨てる（全体の枠 global: は残す）
  for (const k of buckets.keys()) {
    if (buckets.size <= MAX_BUCKETS * 0.9) break
    if (!k.startsWith('global:')) buckets.delete(k)
  }
}

function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key) ?? { hits: [], windowMs }
  bucket.hits = bucket.hits.filter(t => now - t < windowMs)
  buckets.set(key, bucket)
  if (bucket.hits.length >= limit) return false
  bucket.hits.push(now)
  return true
}

/**
 * 利用者のIPアドレス。これらのヘッダーは利用者が自分で付けて偽ることもできるので、
 * 置き場所のサービスが必ず付け直すものだけを見る。
 * - Vercel：x-real-ip / x-forwarded-for を Vercel が付け直す
 * - Cloudflare：cf-connecting-ip を Cloudflare が付け直す（Vercel では偽れるので見ない）
 */
export function clientIp(req: Request): string {
  const h = req.headers
  const first = (v: string | null) => v?.split(',')[0]
  const raw = process.env.VERCEL
    ? h.get('x-real-ip') ?? first(h.get('x-forwarded-for'))
    : h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? first(h.get('x-forwarded-for'))
  // IPとしてありえない長さの文字列で記録を膨らませられないよう、IPv6 の最大長で切る
  return raw?.trim().slice(0, 45) || 'unknown'
}

export type LimitResult = { ok: true } | { ok: false; message: string }

export function consume(route: keyof typeof LIMITS, req: Request): LimitResult {
  // 先に1人ごとの枠を見る。逆にすると、1人が連打して断られるたびに全体の枠が減り、
  // 1人の連打で全員が使えなくなってしまう
  if (!take(`${route}:${clientIp(req)}`, LIMITS[route], HOUR)) {
    return { ok: false, message: '短い時間に何度も診断されています。1時間ほどおいてからお試しください。' }
  }
  if (!take(`global:${route}`, GLOBAL_DAILY_LIMIT, DAY)) {
    refundOne(`${route}:${clientIp(req)}`)
    return { ok: false, message: 'ただいま診断が集中しています。時間をおいてお試しください。' }
  }
  return { ok: true }
}

function refundOne(key: string) {
  buckets.get(key)?.hits.pop()
}

/**
 * AI側の不調（混雑・応答なし）で結果を1つも作れなかった回は、数えなかったことにする。
 * 利用者のせいではないのに、混雑が続くと回数だけ減って使えなくなるのを防ぐ
 */
export function refund(route: keyof typeof LIMITS, req: Request) {
  refundOne(`${route}:${clientIp(req)}`)
  refundOne(`global:${route}`)
}
