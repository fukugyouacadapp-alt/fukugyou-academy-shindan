import 'server-only'

/**
 * Gemini（Google のAI）への問い合わせ。複業アカデミーAIコーチで実績のある作り（モデルの切り替え・時間の上限）を元にし、
 * 「指示文（system）と回答（user）を分けて渡す」「JSONで返させる」を足したもの。
 *
 * 使うモデルは上から順に試す。前のものが駄目（提供終了・混雑・割り当て切れ）なら次へ落ちる。
 * 型番を直接指定したモデルは提供終了することがあるので、別名 `gemini-flash-latest` を保険に入れている。
 */
export const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
]

const RETRIES_PER_MODEL = 2
const RETRY_WAIT_MS = 1_500

export const BUSY_MESSAGE = 'AIが混み合っています。少し待ってから、もう一度お試しください。'
export const EMPTY_REPLY_MESSAGE = 'AIが結果をつくれませんでした。もう一度お試しください。'

function isModelUnavailable(message: string, code?: number): boolean {
  return code === 404 || /no longer available|not found|not supported|does not exist/i.test(message)
}

/** 割り当て切れ。待っても同じモデルでは通らない */
function isQuotaExceeded(message: string, code?: number): boolean {
  return code === 429 && /quota|rate limit|per day|per minute/i.test(message)
}

/** キーが無効・権限がない。どのモデルでも同じなので、すぐ諦める */
function isKeyRejected(message: string, code?: number): boolean {
  // 403 は「そのモデルだけ使えない」でも返りうるので、キーの話のときだけ諦める（それ以外の 403 は次のモデルへ）
  return code === 401 || ((code === 400 || code === 403) && /api[ _]?key/i.test(message))
}

/** 混雑。少し待てば同じモデルで通る */
function isBusy(message: string, code?: number): boolean {
  if (isQuotaExceeded(message, code)) return false
  return code === 503 || code === 429 || /high demand|overloaded|resource exhausted/i.test(message)
}

/** 安全フィルタに引っかかったときなどは本文が無い。そのときは null */
function extractText(json: unknown): string | null {
  const j = json as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
  const text = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('')
  return text && text.trim() ? text : null
}

export type GeminiJsonRequest = {
  system: string
  user: string
  schema: object
  temperature: number
  /** 1回の問い合わせの打ち切り時間。診断は出力が長いので長めにとる */
  attemptTimeoutMs: number
  /** この呼び出し全体で使ってよい時間（サーバーの実行時間の上限に収めるため） */
  budgetMs: number
}

/** AIに1回問い合わせ、JSONとして読めた中身を返す（形の検証は呼び出し側で zod を使う） */
export async function callGeminiJson(req: GeminiJsonRequest): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    generationConfig: {
      temperature: req.temperature,
      responseMimeType: 'application/json',
      responseSchema: req.schema,
    },
  })

  const startedAt = Date.now()
  const remaining = () => req.budgetMs - (Date.now() - startedAt)
  let lastError = ''

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_WAIT_MS))
      // 残り時間が短いなら新しい試行は始めない（途中で打ち切られるより、早く諦めて伝える）
      if (remaining() < 5_000) throw new Error(BUSY_MESSAGE)

      let json: { error?: { message?: string; code?: number } } & Record<string, unknown>
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
          signal: AbortSignal.timeout(Math.min(req.attemptTimeoutMs, remaining())),
        })
        json = await res.json()
      } catch (e) {
        lastError = BUSY_MESSAGE
        // 時間切れなら、同じモデルで待ち直さず次のモデルへ（遅いモデルで残り時間を使い切らないように）。
        // 通信が切れただけなら、同じモデルでもう一度だけ試す
        if ((e as { name?: string } | null)?.name === 'TimeoutError') break
        continue
      }

      if (!json.error) {
        const text = extractText(json)
        if (!text) throw new Error(EMPTY_REPLY_MESSAGE)
        try {
          return JSON.parse(text)
        } catch {
          // JSON として読めない返答。呼び出し側の「1回だけやり直す」に任せる
          throw new Error(EMPTY_REPLY_MESSAGE)
        }
      }

      const msg = json.error.message || ''
      const code = json.error.code
      console.error(`[gemini] ${model}: ${code} ${msg.slice(0, 200)}`)
      // 呼び出し側は「GEMINI_API_KEY」を含むエラーで作り直しをやめる。利用者には「混み合っています」だけを見せる
      if (isKeyRejected(msg, code)) throw new Error('GEMINI_API_KEY が使えません（無効・権限なし）')
      lastError = isBusy(msg, code) || isQuotaExceeded(msg, code) || isModelUnavailable(msg, code) ? BUSY_MESSAGE : EMPTY_REPLY_MESSAGE
      // 混雑なら同じモデルで待って再試行。それ以外は待っても変わらないので次のモデルへ
      if (!isBusy(msg, code)) break
    }
  }
  throw new Error(lastError || BUSY_MESSAGE)
}
