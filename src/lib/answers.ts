import {
  activeQuestions, detailQuestion, FOLLOWUP_NONE, optionLabel, pickMarketAxes, Q, SLIDER_VALUES, SLIDERS, STEPS,
  type Answers, type ChoiceQuestion, type FollowUp, type Question,
} from '@/data/questions'

/**
 * ブラウザから届いた回答の検証と、AIに渡す文章への変換。
 *
 * 回答は選択肢のIDで受け取り、ここで文言に戻す。選択肢にないID・上限を超える数の選択ははじく。
 * こうしておけば、利用者が勝手な文章をAIに送り込む余地がない（docs/01-site-build-prompt.md 6章）。
 */

/** STEP5 でAIが作った質問・選択肢の文字数の上限。指示文では 40字／25字 と頼んでいるが、少しはみ出しても通す */
export const FOLLOWUP_QUESTION_MAX = 60
export const FOLLOWUP_OPTION_MAX = 40
export const FOLLOWUP_COUNT_MAX = 2

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function checkChoice(q: ChoiceQuestion, value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return `${q.no} が未回答です`
  if (!value.every(v => typeof v === 'string')) return `${q.no} の回答の形が正しくありません`
  if (new Set(value).size !== value.length) return `${q.no} に同じ選択肢が重なっています`
  if (q.max !== null && value.length > q.max) return `${q.no} は${q.max}つまでです`
  const allowed = new Set(q.options.map(o => o.id))
  if (!value.every(v => allowed.has(v))) return `${q.no} に選択肢にない回答があります`
  if (q.noneId && value.includes(q.noneId) && value.length > 1) return `${q.no} の「${optionLabel(q.noneId)}」は単独で選んでください`
  return null
}

function checkQuestion(q: Question, value: unknown): string | null {
  if (q.kind === 'choice') return checkChoice(q, value)
  if (typeof value !== 'number' || !(SLIDER_VALUES as readonly number[]).includes(value)) return `${q.no} が未回答です`
  return null
}

/** いま聞くべき設問すべてに、正しい形で答えているか。通れば、聞いた設問の分だけを取り出して返す */
export function validateAnswers(raw: unknown): Result<Answers> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: '回答の形が正しくありません' }
  const input = raw as Answers
  const clean: Answers = {}
  for (const q of activeQuestions(input)) {
    const error = checkQuestion(q, input[q.id])
    if (error) return { ok: false, error }
    clean[q.id] = input[q.id]
  }
  // 仕事のタイプが不正だと 1-2 自体が組み立てられず、上のループで素通りしてしまうので念のため確かめる
  if (!detailQuestion(clean)) return { ok: false, error: '1 が未回答です' }
  return { ok: true, value: clean }
}

/**
 * AIが作った深掘りの文言を整える。改行・タブなどの制御文字を取り除き、
 * < > は全角にする（指示文の <answers> の囲みを、文言の中で閉じたり開いたりできないように）
 */
export const cleanFollowUpText = (s: string) =>
  s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/</g, '＜').replace(/>/g, '＞').trim()

const SIG_MAX = 100

/**
 * STEP5（深掘り）の質問と答え。AIが作った文言をブラウザが送り返してくるので、文字数と答えの範囲を確かめる。
 * 書き換えられていないか（署名）は、サーバーだけで確かめる（src/lib/followup-sig.ts）
 */
export function validateFollowUps(raw: unknown): Result<FollowUp[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw) || raw.length > FOLLOWUP_COUNT_MAX) return { ok: false, error: '深掘りの回答の形が正しくありません' }
  const out: FollowUp[] = []
  for (const item of raw) {
    const f = item as Partial<FollowUp>
    if (typeof f?.question !== 'string' || !Array.isArray(f.options) || f.options.length !== 4) {
      return { ok: false, error: '深掘りの回答の形が正しくありません' }
    }
    const question = cleanFollowUpText(f.question)
    const options = f.options.map(o => (typeof o === 'string' ? cleanFollowUpText(o) : ''))
    if (!question || question.length > FOLLOWUP_QUESTION_MAX || options.some(o => !o || o.length > FOLLOWUP_OPTION_MAX)) {
      return { ok: false, error: '深掘りの質問が長すぎます' }
    }
    // 質問・選択肢と同じく整えてから比べる（AIの文言に改行などが混じっていても、答えが一致するように）
    const answer = typeof f.answer === 'string' ? cleanFollowUpText(f.answer) : null
    if (answer !== null && answer !== FOLLOWUP_NONE && !options.includes(answer)) {
      return { ok: false, error: '深掘りの回答が選択肢にありません' }
    }
    const sig = typeof f.sig === 'string' && f.sig.length <= SIG_MAX ? f.sig : undefined
    out.push({ question, options, answer, sig })
  }
  return { ok: true, value: out }
}

const join = (ids: string[]) => ids.map(id => optionLabel(id) ?? '').filter(Boolean).join('／')

function choiceLine(q: ChoiceQuestion | null, answers: Answers, fallbackLabel: string): string {
  if (!q) return `${fallbackLabel}: （未回答）`
  const v = answers[q.id]
  return `${q.aiLabel}: ${Array.isArray(v) && v.length > 0 ? join(v) : '（未回答）'}`
}

const sign = (n: number) => (n > 0 ? `+${n}` : String(n))

/** 検証済みの回答を、AIに渡す文章にする（docs/02-ai-prompts.md「0. 回答の渡し方」の形） */
export function answersToText(answers: Answers, followUps: FollowUp[] = [], opts: { includeFollowUps?: boolean } = {}): string {
  const line = (q: ChoiceQuestion) => choiceLine(q, answers, q.aiLabel)
  const lines: string[] = []

  lines.push(`【STEP1 ${STEPS[1].title}】`)
  lines.push(line(Q.q1), choiceLine(detailQuestion(answers), answers, '仕事の内容'), line(Q.q2))

  lines.push('', `【STEP2 ${STEPS[2].title}】`)
  lines.push(line(Q.q3), line(Q.q4))

  lines.push('', `【STEP3 ${STEPS[3].title}】`)
  lines.push(line(Q.q5), line(Q.q6))

  lines.push('', `【STEP4 ${STEPS[4].title}】`)
  lines.push(line(Q.q7_1), line(Q.q7_2))
  lines.push('働き方の好み（-2〜+2。マイナスは左寄り、プラスは右寄り）:')
  for (const s of SLIDERS) {
    const v = answers[s.id]
    lines.push(`  ${s.aiLabel}: ${typeof v === 'number' ? sign(v) : '（未回答）'}`)
  }

  const [x, y] = pickMarketAxes(answers)
  lines.push('', '【得意な市場の2軸（働き方の好みから自動で選んだもの。market.axes はこの2つを、この順・この値で使う）】')
  lines.push(`横: ${x.left} ↔ ${x.right}: ${sign(x.position)}`, `縦: ${y.left} ↔ ${y.right}: ${sign(y.position)}`)

  if (opts.includeFollowUps !== false) {
    lines.push('', '【STEP5 深掘り】')
    const answered = followUps.filter(f => f.answer !== null)
    if (answered.length === 0) lines.push('（スキップ）')
    for (const f of answered) lines.push(`Q: ${f.question}`, `A: ${f.answer}`)
  }

  return lines.join('\n')
}

/** 結果画面の「あなたが選んだ回答から」に並べる言葉（仕事の内容・いちばんの自信・頼まれること） */
export function highlightLabels(answers: Answers, max = 5): string[] {
  const detail = detailQuestion(answers)
  const ids = [detail?.id, Q.q2.id, Q.q3.id].flatMap(id => {
    const v = id ? answers[id] : undefined
    return Array.isArray(v) ? v : []
  })
  const labels = ids.map(id => optionLabel(id)).filter((l): l is string => !!l && !/特にない/.test(l))
  return [...new Set(labels)].slice(0, max)
}

/** 分析中の画面に流す言葉（選んだ回答の文言）。回答の中身はサーバーに送らない画面側の演出用 */
export function pickedLabels(answers: Answers): string[] {
  const ids = Object.values(answers).flatMap(v => (Array.isArray(v) ? v : []))
  return [...new Set(ids.map(id => optionLabel(id)).filter((l): l is string => !!l && !/特にない/.test(l)))]
}
