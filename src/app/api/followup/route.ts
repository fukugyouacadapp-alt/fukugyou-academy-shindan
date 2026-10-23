import { FOLLOWUP_NONE } from '@/data/questions'
import { answersToText, cleanFollowUpText as clean, validateAnswers } from '@/lib/answers'
import { signFollowUp } from '@/lib/followup-sig'
import { callGeminiJson } from '@/lib/gemini'
import { SYSTEM_FOLLOWUP, userMessage } from '@/lib/prompts'
import { consume } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request'
import { followUpSchema, GEMINI_FOLLOWUP_SCHEMA } from '@/lib/schemas'

/**
 * STEP5：深掘りの4択を1〜2問つくる（docs/02-ai-prompts.md プロンプトA）。
 *
 * ここは「おまけ」の段なので、AIが失敗しても診断は止めない。
 * 失敗したときは questions を空で返し、画面はそのまま結果へ進む。
 */
export const maxDuration = 30

export async function POST(req: Request) {
  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const checked = validateAnswers(body.value.answers)
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

  const limit = consume('followup', req)
  if (!limit.ok) return Response.json({ questions: [], skipped: 'rate-limit' })

  try {
    const json = await callGeminiJson({
      system: SYSTEM_FOLLOWUP,
      user: userMessage(answersToText(checked.value, [], { includeFollowUps: false }), 'STEP1〜4'),
      schema: GEMINI_FOLLOWUP_SCHEMA,
      temperature: 0.5,
      attemptTimeoutMs: 12_000,
      budgetMs: 25_000,
    })
    const parsed = followUpSchema.safeParse(json)
    if (!parsed.success) return Response.json({ questions: [], skipped: 'invalid' })
    // 画面に要るのは質問と選択肢だけ（intent は改善用のメモなので返さない）。
    // 選択肢が重なっている・「どれも当てはまらない」と同じ文言がある質問は、選んだ表示が崩れるので出さない。
    // 整えたら空になった質問・選択肢があるものも出さない（診断のときの確認ではじかれ、何度やっても診断できなくなるため）。
    // 診断のときに書き換えられていないか確かめられるよう、整えたあとの文言に署名を付ける
    const questions = await Promise.all(
      parsed.data.questions
        .map(q => ({ question: clean(q.question), options: q.options.map(clean) }))
        .filter(q => q.question && q.options.every(Boolean) && new Set(q.options).size === 4 && !q.options.includes(FOLLOWUP_NONE))
        .map(async q => ({ ...q, sig: await signFollowUp(q.question, q.options) })),
    )
    return Response.json({ questions })
  } catch (e) {
    console.error('[followup]', e instanceof Error ? e.message : e)
    return Response.json({ questions: [], skipped: 'error' })
  }
}
