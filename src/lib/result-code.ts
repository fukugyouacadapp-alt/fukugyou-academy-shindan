import {
  DEEP_BY_DETAIL, DETAIL_BY_FAMILY, deepQuestion, detailQuestion, Q, SLIDERS, SLIDER_VALUES,
  type Answers, type Question,
} from '@/data/questions'

/**
 * 診断番号。回答を、11文字の短い番号（例：A3F7-K9QX-2MB）に置き換える（2026-10-31。要件定義8章の2の「案B」）。
 * 同じ回答からは必ず同じ結果になるので、番号さえあれば、講師用のページ（/staff）で結果をそっくり作り直せる。
 * 番号はサーバーにも保存しない。本人が面談の予約のときに伝えたときだけ、講師が見る。名前などは入らない（回答だけ）。
 *
 * 中身：1文字目＝設問の形の版（設問の選択肢の数・選べる数から自動で決まる）、2〜10文字目＝回答、11文字目＝打ち間違いの確かめ。
 * 文字は、読み間違えやすい I・L・O・U を使わない32種類（Crockford Base32）。打つときの I・L は 1、O は 0 とみなす。
 * 複数選べる設問は、選んだ順も残す（1つ目に選んだものが、キャッチフレーズや要約に使われるため）。
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const DATA_LENGTH = 9

/** 番号に入れる設問の順。1-2 と 9 は前の答えで決まるので、答えを入れながら順に引く */
const STEPS: ((a: Answers) => Question | null)[] = [
  () => Q.q1, detailQuestion, () => Q.q2, () => Q.q3, () => Q.q4, () => Q.q5, () => Q.q6, () => Q.q7_1, () => Q.q7_2,
  ...SLIDERS.map(s => () => s), deepQuestion,
]

/** 設問ごとの「桁」。1つだけ選ぶ設問は1桁、複数選べる設問は選べる数だけ桁（空きは「選んでいない」） */
function slotsOf(q: Question): number[] {
  if (q.kind === 'slider') return [SLIDER_VALUES.length]
  if (q.max === 1) return [q.options.length]
  const slots = q.max ?? q.options.length
  return [q.options.length, ...Array<number>(slots - 1).fill(q.options.length + 1)]
}

/** 設問の形（選択肢の数・選べる数）から決まる版の1文字。設問を直すと変わるので、古い番号を取り違えずにはじける */
const VERSION = (() => {
  const all: Question[] = [...Object.values(Q), ...SLIDERS, ...Object.values(DETAIL_BY_FAMILY), ...Object.values(DEEP_BY_DETAIL)]
  const shape = all.map(q => `${q.id}:${slotsOf(q).join('.')}`).join('|')
  let h = 0
  for (const ch of shape) h = (h * 31 + ch.charCodeAt(0)) % 1_000_003
  return ALPHABET[h % 32]
})()

const checkChar = (body: string) => ALPHABET[[...body].reduce((s, ch, i) => s + ALPHABET.indexOf(ch) * (i + 1), 0) % 32]

/** 検証済みの回答（validateAnswers を通したもの）を番号にする。読みやすいよう4文字ずつ「-」で区切る */
export function encodeResultCode(answers: Answers): string {
  let value = 0
  let unit = 1
  for (const step of STEPS) {
    const q = step(answers)
    if (!q) throw new Error('診断番号：答えていない設問があります')
    const v = answers[q.id]
    const slots = slotsOf(q)
    let digits: number[]
    if (q.kind === 'slider') {
      digits = [SLIDER_VALUES.indexOf(v as (typeof SLIDER_VALUES)[number])]
    } else {
      const picked = (v as string[]).map(id => q.options.findIndex(o => o.id === id))
      digits = slots.map((_, i) => picked[i] ?? q.options.length)
    }
    digits.forEach((d, i) => {
      if (d < 0 || d >= slots[i]) throw new Error(`診断番号：${q.no} の答えが選択肢にありません`)
      value += d * unit
      unit *= slots[i]
    })
  }
  let data = ''
  for (let i = 0; i < DATA_LENGTH; i++) {
    data = ALPHABET[value % 32] + data
    value = Math.floor(value / 32)
  }
  const body = VERSION + data
  const code = body + checkChar(body)
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`
}

export type DecodeResult = { ok: true; answers: Answers } | { ok: false; error: string }

/** 番号を回答に戻す。打ち間違い・古い番号ははじく（戻した回答は、さらに validateAnswers で確かめる） */
export function decodeResultCode(input: string): DecodeResult {
  const code = input
    .normalize('NFKC') // 全角で打たれた英数字・記号を半角に
    .toUpperCase()
    .replace(/[\s\-ー－]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
  if (code.length !== DATA_LENGTH + 2 || [...code].some(ch => !ALPHABET.includes(ch))) {
    return { ok: false, error: '番号の形が違います（英数字11文字です）' }
  }
  const body = code.slice(0, -1)
  if (checkChar(body) !== code.at(-1)) return { ok: false, error: '番号のどこかが打ち間違っているようです' }
  if (body[0] !== VERSION) return { ok: false, error: '設問を直す前の、古い番号です。お手数ですが、本人にもう一度診断してもらってください' }
  let value = 0
  for (const ch of body.slice(1)) value = value * 32 + ALPHABET.indexOf(ch)

  const answers: Answers = {}
  for (const step of STEPS) {
    const q = step(answers)
    if (!q) return { ok: false, error: '番号から回答を読み取れませんでした' }
    const digits = slotsOf(q).map(size => {
      const d = value % size
      value = Math.floor(value / size)
      return d
    })
    if (q.kind === 'slider') {
      answers[q.id] = SLIDER_VALUES[digits[0]]
    } else {
      const ids = digits.filter(d => d < q.options.length).map(d => q.options[d].id)
      if (ids.length === 0) return { ok: false, error: '番号から回答を読み取れませんでした' }
      answers[q.id] = ids
    }
  }
  if (value !== 0) return { ok: false, error: '番号から回答を読み取れませんでした' }
  return { ok: true, answers }
}
