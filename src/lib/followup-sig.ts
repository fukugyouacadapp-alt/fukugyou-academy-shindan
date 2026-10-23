import 'server-only'
import type { FollowUp } from '@/data/questions'

/**
 * 深掘り（STEP5）の質問の署名。
 * 深掘りの質問と選択肢はAIが作ってブラウザに渡し、診断のときにブラウザから送り返してもらう。
 * そのままだと送り返すときに好きな文章へ書き換えてAIに渡せてしまうので、
 * /api/followup で署名を付け、/api/diagnose で「書き換えられていないか」を確かめる。
 *
 * 鍵は GEMINI_API_KEY から作る（設定を増やさないため）。キーを替えると古い署名は通らなくなるが、
 * その人の深掘りが省かれるだけで診断はできる。
 */

const encoder = new TextEncoder()
let cachedKey: Promise<CryptoKey> | null = null

function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.GEMINI_API_KEY
  if (!secret) return Promise.reject(new Error('GEMINI_API_KEY が設定されていません'))
  cachedKey ??= crypto.subtle.importKey(
    'raw', encoder.encode(`followup-sig:v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  )
  return cachedKey
}

const payload = (question: string, options: string[]) => encoder.encode(JSON.stringify([question, options]))

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(s)) return null
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, c => c.charCodeAt(0))
  } catch {
    return null
  }
}

/** 画面に渡す質問と選択肢（整えたあとの文言）に署名する */
export async function signFollowUp(question: string, options: string[]): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), payload(question, options))
  return toBase64Url(new Uint8Array(sig))
}

/** 署名が合っている深掘りだけを残す。署名が無い・合わないものは、無かったことにする */
export async function keepSigned(list: FollowUp[]): Promise<FollowUp[]> {
  const key = await hmacKey()
  const checked = await Promise.all(
    list.map(async f => {
      const sig = f.sig ? fromBase64Url(f.sig) : null
      if (!sig) return null
      return (await crypto.subtle.verify('HMAC', key, sig, payload(f.question, f.options))) ? f : null
    }),
  )
  return checked.filter((f): f is FollowUp => f !== null)
}
