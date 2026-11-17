import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * 講師用のページのログイン（2026-11-11）。src/proxy.ts と、ログイン・ログアウトの受け口（src/app/api/staff-*）で使う。
 * パスワードは環境変数 STAFF_PASSWORD（Vercel の設定画面か `vercel env add`。画面のコードには埋め込まない）。
 *
 * 「開くたびに毎回パスワード」にするため、ブラウザに2つの札（クッキー）を渡す。
 * - 入場券（staff_once）：ログインの直後に1回だけ使える。ページを開く（再読み込みを含む）たびに1枚要り、使ったらその場で捨てる。
 *   だから再読み込みや、アドレスを直接入れて開いたときは、もう一度パスワードを聞かれる
 * - 通行証（staff_session）：講師用のページの中で、上のタブを切り替えるときに使う（ページ全体は読み直さない）。2時間で切れる
 * 札にはパスワードから作った署名を付けるので、作り変えると通らない。パスワードを変えると、出した札はすべて使えなくなる
 */

export const ONCE_COOKIE = 'staff_once'
export const SESSION_COOKIE = 'staff_session'
export const ONCE_SECONDS = 60
export const SESSION_SECONDS = 2 * 60 * 60
/** 札の共通の設定。画面の部品からは読めず（httpOnly）、よそのサイトからの移動では送られず（strict）、講師用のページにだけ送る */
export const COOKIE_BASE = { httpOnly: true, sameSite: 'strict', path: '/staff' } as const

type Kind = 'once' | 'session'

export function staffPassword(): string | undefined {
  return process.env.STAFF_PASSWORD || undefined
}

/** 札を作る。中身は「種類.期限.署名」 */
export function makeTicket(kind: Kind, password: string, now = Date.now()): string {
  const body = `${kind}.${now + (kind === 'once' ? ONCE_SECONDS : SESSION_SECONDS) * 1000}`
  return `${body}.${sign(body, password)}`
}

/** 札が本物で、期限内か */
export function checkTicket(kind: Kind, value: string | undefined, password: string, now = Date.now()): boolean {
  if (!value) return false
  const [k, expires, signature] = value.split('.')
  if (k !== kind || !expires || !signature) return false
  if (!sameText(signature, sign(`${k}.${expires}`, password))) return false
  return Number(expires) > now
}

/** ログイン後に戻る先。講師用のページだけにする（ほかのサイトへ飛ばされないように） */
export function safeNext(value: unknown): string {
  return typeof value === 'string' && /^\/staff(\/[a-z0-9-]+)*$/.test(value) && value !== '/staff/login' ? value : '/staff'
}

/** 送り元がこのサイトか（よそのページから勝手にログイン・ログアウトさせないように） */
export function sameOrigin(request: { headers: Headers; nextUrl: { origin: string } }): boolean {
  const origin = request.headers.get('origin')
  if (origin) return origin === request.nextUrl.origin
  // Origin が付いていないときは、ブラウザが付ける Sec-Fetch-Site でよそからの送信を見分ける
  const site = request.headers.get('sec-fetch-site')
  return !site || site === 'same-origin' || site === 'none'
}

/** 文字列が同じか。かかる時間から一致の具合を探られないよう、ハッシュにしてから同じ長さで比べる */
export function sameText(a: string, b: string): boolean {
  const hash = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(hash(a), hash(b))
}

function sign(body: string, password: string): string {
  const key = createHash('sha256').update(`staff-session:${password}`).digest()
  return createHmac('sha256', key).update(body).digest('base64url')
}
