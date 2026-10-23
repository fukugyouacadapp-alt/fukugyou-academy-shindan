import 'server-only'

/** 受け取る本文の上限（バイト）。回答はIDの並びだけなので、ふつうは数KBに収まる */
const MAX_BODY_BYTES = 20_000

type Body = { answers?: unknown; followUps?: unknown }

const tooLarge = () => Response.json({ error: '回答の量が多すぎます' }, { status: 413 })

/** 本文を上限まで読む。上限を超えたらその場で読むのをやめて null（全部読んでから測ると、巨大な本文でメモリを使わされる） */
async function readLimited(req: Request, limit: number): Promise<string | null> {
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(all)
}

/**
 * ブラウザから届いた本文を JSON として読む。
 * 他のサイトから呼ばれた・大きすぎる・JSON でない・オブジェクトでない（null や配列）ときは、そのまま返せる 4xx の応答を返す。
 */
export async function readJsonBody(req: Request): Promise<{ ok: true; value: Body } | { ok: false; response: Response }> {
  // 他のサイトのページに仕込まれて、そのページを見た人のブラウザから呼ばされるのを断る
  // （人ごとの回数制限をすり抜けて、AIの料金を使われるのを防ぐ）。
  // いまのブラウザは Sec-Fetch-Site を付けてくる。付けない古いブラウザや curl などは通す（そちらは回数制限と WAF で抑える）
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') {
    return { ok: false, response: Response.json({ error: 'このページからは利用できません' }, { status: 403 }) }
  }

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return { ok: false, response: tooLarge() }

  const raw = await readLimited(req, MAX_BODY_BYTES)
  if (raw === null) return { ok: false, response: tooLarge() }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, response: Response.json({ error: '回答の形が正しくありません' }, { status: 400 }) }
  }
  return { ok: true, value: parsed as Body }
}
