import { pickMarketAxes, type Answers, type FollowUp } from '@/data/questions'
import { answersToText, validateAnswers, validateFollowUps } from '@/lib/answers'
import { keepSigned } from '@/lib/followup-sig'
import { BUSY_MESSAGE, callGeminiJson } from '@/lib/gemini'
import { SYSTEM_DIAGNOSE, userMessage } from '@/lib/prompts'
import { consume, refund } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request'
import { GEMINI_RESULT_SCHEMA, policyIssues, qualityIssues, resultSchema, type DiagnosisResult } from '@/lib/schemas'

/**
 * 診断：強みの分析とニッチ複業5つ（docs/02-ai-prompts.md プロンプトB）。
 *
 * 結果の形が崩れていた・書いてはいけない言葉が混じっていた・決まり（内訳・引用）が守られていなかったときは、
 * 1回だけ作り直す。回答も結果もサーバーには保存しない。
 */
export const maxDuration = 60

/** 2回目を始めるのに最低限必要な残り時間。足りなければ1回目の結果で妥協する */
const SECOND_TRY_MIN_MS = 25_000
const TOTAL_BUDGET_MS = 55_000

export async function POST(req: Request) {
  const startedAt = Date.now()
  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const answers = validateAnswers(body.value.answers)
  if (!answers.ok) return Response.json({ error: answers.error }, { status: 400 })
  const followUps = validateFollowUps(body.value.followUps)
  if (!followUps.ok) return Response.json({ error: followUps.error }, { status: 400 })

  const limit = consume('diagnose', req)
  if (!limit.ok) return Response.json({ error: limit.message }, { status: 429 })

  let signed: FollowUp[]
  try {
    // 深掘りは /api/followup が署名したものだけ使う（書き換えられたものは、無かったことにする）
    signed = await keepSigned(followUps.value)
  } catch (e) {
    console.error('[diagnose]', e instanceof Error ? e.message : e)
    refund('diagnose', req)
    return Response.json({ error: BUSY_MESSAGE }, { status: 503 })
  }

  const answersText = answersToText(answers.value, signed)
  const user = userMessage(answersText, 'STEP1〜5')
  let fallback: { result: DiagnosisResult; issues: number } | null = null
  /** AIが1回でも返事をしたか（返事が無いまま終わったら、回数制限の1回を戻す） */
  let answered = false

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt)
    if (attempt > 0 && remaining < SECOND_TRY_MIN_MS) break
    try {
      const json = await callGeminiJson({
        system: SYSTEM_DIAGNOSE,
        user,
        schema: GEMINI_RESULT_SCHEMA,
        temperature: 0.7,
        attemptTimeoutMs: 45_000,
        budgetMs: remaining,
      })
      answered = true
      const parsed = resultSchema.safeParse(json)
      if (!parsed.success) {
        console.error('[diagnose] 形が崩れた結果:', parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join(' / '))
        continue
      }
      // 後始末（# を付ける・重なったタグを消す）で、数や長さが決まりから外れることがあるので、もう一度確かめる。
      // 外れたまま返すと、ブラウザが保存した結果を「形が古い」と捨て、結果画面に戻るたびにAIを呼び直してしまう
      const normalized = resultSchema.safeParse(normalize(parsed.data, answers.value))
      if (!normalized.success) {
        console.error('[diagnose] 後始末で形が崩れた結果:', normalized.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join(' / '))
        continue
      }
      const result = normalized.data
      const policy = policyIssues(result, answersText)
      const issues = [...policy, ...qualityIssues(result, answersText)]
      if (issues.length === 0) return Response.json({ result })
      console.error('[diagnose] 作り直す理由:', issues.join(', '))
      // 控えに残すのは「決まりが少し外れただけ」のもので、外れ方が少ないほう。
      // 書いてはいけない言葉（金額・誇大表現・資格が必要な仕事）が混じったものは、どんな場合も見せない
      if (policy.length === 0 && (!fallback || issues.length < fallback.issues)) fallback = { result, issues: issues.length }
    } catch (e) {
      const message = e instanceof Error ? e.message : BUSY_MESSAGE
      console.error('[diagnose]', message)
      if (attempt === 1 || message.includes('GEMINI_API_KEY')) break
    }
  }

  // 2回とも引っかかった場合、「決まりが少し外れただけ」の控えがあれば返す（待たせた末の空振りを避ける）。
  // 書いてはいけない言葉が混じったものしか無ければ、結果は見せずに「もう一度お試しください」とする
  if (fallback) return Response.json({ result: fallback.result })
  if (!answered) refund('diagnose', req)
  return Response.json({ error: BUSY_MESSAGE }, { status: 503 })
}

/**
 * 見た目を崩さないための後始末。
 * - 並び順をそろえ、タグの先頭に # が無ければ付ける（同じタグが重なったら1つにする）
 * - 「得意な市場」の2軸は回答から決まるので、AIが書き換えていても回答どおりに戻す
 */
function normalize(r: DiagnosisResult, answers: Answers): DiagnosisResult {
  // # を足しても長さの上限（30字）に収まるよう、本文は29字までにする
  const tags = (list: string[]) => [...new Set(list.map(t => `#${t.trim().replace(/^[#＃]\s*/, '').slice(0, 29)}`))]
  return {
    ...r,
    strength_tags: tags(r.strength_tags),
    skill_map: { hongyo: tags(r.skill_map.hongyo), kenzai: tags(r.skill_map.kenzai), senzai: tags(r.skill_map.senzai) },
    market: { ...r.market, axes: pickMarketAxes(answers) },
    recommendations: [...r.recommendations]
      .sort((a, b) => a.rank - b.rank)
      .map((rec, i) => ({ ...rec, rank: i + 1, combo: tags(rec.combo) })),
  }
}
