import {
  activeQuestions, deepQuestion, detailQuestion, optionLabel, Q, SLIDER_VALUES,
  type Answers, type ChoiceQuestion, type Question,
} from '@/data/questions'

/**
 * 保存されていた回答の検証と、結果画面に並べる言葉の取り出し。
 *
 * 回答は選択肢のIDで持ち、文言は設問データから引く。選択肢にないID・上限を超える数の選択ははじく
 * （ブラウザの保存場所を書き換えられても、結果の組み立てが崩れないように）。
 */

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

/**
 * 聞くべき設問すべてに、正しい形で答えているか。通れば、聞いた設問の分だけを取り出して返す。
 * 6問の形か9問の形かは、回答そのものから決める（questionSetOf。問い方を切り替えたあとも、前の形の回答を確かめられるように）
 */
export function validateAnswers(raw: unknown): Result<Answers> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: '回答の形が正しくありません' }
  const input = raw as Answers
  const clean: Answers = {}
  for (const q of activeQuestions(input)) {
    const error = checkQuestion(q, input[q.id])
    if (error) return { ok: false, error }
    clean[q.id] = input[q.id]
  }
  // 仕事のタイプ・内容が不正だと 1-2・STEP5 自体が組み立てられず、上のループで素通りしてしまうので念のため確かめる
  if (!detailQuestion(clean)) return { ok: false, error: '1 が未回答です' }
  if (!deepQuestion(clean)) return { ok: false, error: '1-2 が未回答です' }
  return { ok: true, value: clean }
}

/** 結果画面の「あなたが選んだ回答から」に並べる言葉（仕事の内容・深掘り・いちばんの自信・頼まれること） */
export function highlightLabels(answers: Answers, max = 5): string[] {
  const ids = [detailQuestion(answers), deepQuestion(answers), Q.q2, Q.q3].flatMap(q => {
    const v = q ? answers[q.id] : undefined
    return Array.isArray(v) ? v.filter(id => id !== q?.noneId) : []
  })
  const labels = ids.map(id => optionLabel(id)).filter((l): l is string => !!l)
  return [...new Set(labels)].slice(0, max)
}

/** 1「いまの仕事に近いのは？」で選んだ仕事のタイプの番号（JOB_FAMILIES と同じ並び）。結果画面のイラストを選ぶのに使う */
export function jobFamilyIndex(answers: Answers): number | null {
  const v = answers[Q.q1.id]
  if (!Array.isArray(v)) return null
  const i = Q.q1.options.findIndex(o => o.id === v[0])
  return i === -1 ? null : i
}

/** 分析中の画面に流す言葉（選んだ回答の文言）。「特にない」系は流さない */
export function pickedLabels(answers: Answers): string[] {
  const noneIds = new Set(activeQuestions(answers).flatMap(q => (q.kind === 'choice' && q.noneId ? [q.noneId] : [])))
  const ids = Object.values(answers).flatMap(v => (Array.isArray(v) ? v : [])).filter(id => !noneIds.has(id))
  return [...new Set(ids.map(id => optionLabel(id)).filter((l): l is string => !!l))]
}
