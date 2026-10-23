'use client'

import { track } from '@vercel/analytics'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  activeQuestions, detailQuestion, FOLLOWUP_NONE, Q, SLIDERS, STEPS,
  type Answers, type FollowUp, type Question, type StepNo,
} from '@/data/questions'
import { store, useHydrated } from '@/lib/storage'
import { ChoiceGroup } from './ChoiceGroup'
import { SliderScale } from './SliderScale'

/**
 * 診断の画面（STEP1〜5。8画面＋AIの深掘り）。1画面に1〜3問。
 * 回答は変えるたびに sessionStorage へ保存するので、閉じても続きから再開できる。
 */

type Screen = { step: StepNo; questions: (a: Answers) => Question[] }

const some = (...qs: (Question | null)[]) => qs.filter((q): q is Question => q !== null)

/** 画面の並び（8画面＋AIの深掘り）。1-2「具体的には？」は 1 を選ぶと同じ画面に出る */
export const SCREENS: Screen[] = [
  { step: 1, questions: a => some(Q.q1, detailQuestion(a)) },
  { step: 1, questions: () => [Q.q2] },
  { step: 2, questions: () => [Q.q3] },
  { step: 2, questions: () => [Q.q4] },
  { step: 3, questions: () => [Q.q5] },
  { step: 3, questions: () => [Q.q6] },
  { step: 4, questions: () => [Q.q7_1, Q.q7_2] },
  { step: 4, questions: () => SLIDERS },
]

/** 画面番号がこの値のときは STEP5（AIの深掘り） */
const FOLLOWUP_SCREEN = SCREENS.length
/** 結果画面の「強みの質問に戻って選び直す」で使う */
export const STRENGTH_SCREEN = SCREENS.findIndex(s => s.step === 2)
const SECONDS_PER_SCREEN = 15
/** 深掘りの質問をこれ以上待たない（通信が止まっても画面から出られるように） */
const FOLLOWUP_TIMEOUT_MS = 30_000

function isAnswered(q: Question, a: Answers): boolean {
  const v = a[q.id]
  return q.kind === 'slider' ? typeof v === 'number' : Array.isArray(v) && v.length > 0
}

/** 前の答えを変えて聞かなくなった設問・選べなくなった選択肢の答えを消す（1 を変えたときの 1-2） */
function prune(a: Answers): Answers {
  const out: Answers = {}
  for (const q of activeQuestions(a)) {
    const v = a[q.id]
    if (q.kind === 'slider') {
      if (typeof v === 'number') out[q.id] = v
      continue
    }
    if (!Array.isArray(v)) continue
    const allowed = new Set(q.options.map(o => o.id))
    const kept = v.filter(id => allowed.has(id))
    if (kept.length > 0) out[q.id] = kept
  }
  return out
}

/** 同じ答えか（選んである札を押し直しただけなら、深掘りと結果を消さないため） */
function sameValue(a: string[] | number | undefined, b: string[] | number): boolean {
  if (typeof b === 'number') return a === b
  return Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
}

function sameAnswers(a: Answers, b: Answers): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(k => sameValue(b[k], a[k]))
}

const hasQuestions = (i: number, a: Answers) => SCREENS[i].questions(a).length > 0

/** まだ答えていない設問がある最初の画面。全部答えていれば null（結果画面で、途中の回答を見分けるのに使う） */
export function firstUnansweredScreen(a: Answers): number | null {
  const i = SCREENS.findIndex(s => s.questions(a).some(q => !isAnswered(q, a)))
  return i === -1 ? null : i
}

/** 保存されていた画面番号が、いまの答えでは空の画面を指していたら、手前の画面へ戻す */
function normalizeScreen(i: number, a: Answers): number {
  if (!Number.isInteger(i) || i < 0) return 0
  if (i >= FOLLOWUP_SCREEN) return FOLLOWUP_SCREEN
  while (i > 0 && !hasQuestions(i, a)) i--
  return i
}

export function Quiz() {
  const hydrated = useHydrated()
  if (!hydrated) return <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center text-sm text-sub">読み込んでいます…</div>
  return <QuizInner />
}

function QuizInner() {
  const router = useRouter()
  const [init] = useState(() => {
    const saved = store.answers() ?? {}
    // 設問を直す前の回答が残っていたら、今の設問に無い答えは捨てる
    const a = prune(saved)
    const pruned = !sameAnswers(a, saved)
    // 答えが変わったなら、前に作った深掘りは使えない（null は「まだ取りに行っていない」）
    const f = pruned ? null : store.followUps()
    let s = normalizeScreen(store.screen() ?? 0, a)
    // 深掘りの質問を待っている途中で閉じた（または深掘りなしで結果へ進んだ）場合は、最後の設問からやり直してもらう
    if (s === FOLLOWUP_SCREEN && !f?.length) s = FOLLOWUP_SCREEN - 1
    return { a, f, s, pruned, resumed: Object.keys(a).length > 0 && s > 0 }
  })
  const [answers, setAnswers] = useState<Answers>(init.a)
  // 画面の描き直しを待たずに続けて押されても答えが消えないよう、最新の答えはここから読む
  const latest = useRef<Answers>(init.a)
  const [screen, setScreen] = useState(init.s)
  // null は「まだ取りに行っていない」、[] は「取りに行ったが質問が無かった」（通るたびに取り直さないため区別する）
  const [followUps, setFollowUps] = useState<FollowUp[] | null>(init.f)
  const [loadingFollowUps, setLoadingFollowUps] = useState(false)
  const [resumed, setResumed] = useState(init.resumed)
  // 深掘りの問い合わせの番号。戻る・スキップのたびに進めて、古い問い合わせの返事を捨てる
  const followUpRequest = useRef(0)
  // いま返事を待っている問い合わせの番号（0 は待っていない）。「次へ」の連打で二重に送らないため
  const pendingFollowUp = useRef(0)
  // いま待っている深掘りの問い合わせを止める手段（「戻る」・画面を離れたとき・時間切れで使う）
  const followUpAbort = useRef<AbortController | null>(null)
  // 画面が変わったときにフォーカスを移す先（設問の見出し。無い画面では STEP の見出し）
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const screenHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => {
    // 画面を離れたら深掘りの問い合わせも止める（あとから届いた返事で結果画面へ飛ばないように）
    followUpRequest.current += 1
    followUpAbort.current?.abort()
  }, [])

  // 掃除で答えが変わったときは保存し直し、前の深掘りと結果を消す
  useEffect(() => {
    if (!init.pruned) return
    store.setAnswers(init.a)
    store.setFollowUps(null)
    store.setResult(null)
  }, [init])

  function move(i: number) {
    setScreen(i)
    store.setScreen(i)
    window.scrollTo({ top: 0 })
  }

  function update(id: string, value: string[] | number) {
    // 選んである答えを押し直しただけなら何もしない（深掘りと結果を消すと、AIの呼び直しで料金と回数制限を使ってしまう）
    if (sameValue(latest.current[id], value)) return latest.current
    if (Object.keys(latest.current).length === 0) track('diagnosis_start')
    const next = prune({ ...latest.current, [id]: value })
    latest.current = next
    setAnswers(next)
    store.setAnswers(next)
    // 答えが変わったら、前に作った深掘りと結果は使えない
    setFollowUps(null)
    store.setFollowUps(null)
    store.setResult(null)
    return next
  }

  function goNext(a: Answers = latest.current) {
    let i = screen + 1
    while (i < FOLLOWUP_SCREEN && !hasQuestions(i, a)) i++
    if (i >= FOLLOWUP_SCREEN) startFollowUps(a)
    else move(i)
  }

  /** 待っている深掘りの問い合わせを止める。番号も進めるので、止める前に届いた返事も使わない */
  function cancelFollowUps() {
    followUpRequest.current += 1
    followUpAbort.current?.abort()
    followUpAbort.current = null
  }

  function goBack() {
    cancelFollowUps()
    setLoadingFollowUps(false)
    let i = screen - 1
    while (i > 0 && !hasQuestions(i, latest.current)) i--
    if (i < 0) router.push('/')
    else move(i)
  }

  function finish(f: FollowUp[]) {
    cancelFollowUps()
    // 前回と同じ答えで結果画面へ戻るだけなら、作った結果をそのまま使う（AIを呼び直さない）
    if (JSON.stringify(store.followUps() ?? []) !== JSON.stringify(f)) store.setResult(null)
    store.setFollowUps(f)
    router.push('/result')
  }

  function startFollowUps(a: Answers) {
    // 取りに行ったうえで質問が無かったなら、取り直さずにそのまま結果へ
    if (followUps !== null && followUps.length === 0) return finish([])
    move(FOLLOWUP_SCREEN)
    if (followUps !== null) return
    if (pendingFollowUp.current !== 0 && pendingFollowUp.current === followUpRequest.current) return
    const ticket = ++followUpRequest.current
    pendingFollowUp.current = ticket
    const controller = new AbortController()
    followUpAbort.current = controller
    const timeout = window.setTimeout(() => controller.abort(), FOLLOWUP_TIMEOUT_MS)
    setLoadingFollowUps(true)
    fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: a }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then((data: { questions?: { question: string; options: string[]; sig?: string }[] }) => {
        if (ticket !== followUpRequest.current) return
        const qs = Array.isArray(data.questions) ? data.questions : []
        // 深掘りはおまけ。作れなかったときは、そのまま結果へ進む
        if (qs.length === 0) return finish([])
        // sig はサーバーが付けた署名。診断のときにそのまま送り返すので落とさない
        const f = qs.map(q => ({ question: q.question, options: q.options, answer: null, sig: q.sig }))
        setFollowUps(f)
        store.setFollowUps(f)
        setLoadingFollowUps(false)
      })
      .catch(() => {
        if (ticket === followUpRequest.current) finish([])
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (followUpAbort.current === controller) followUpAbort.current = null
        if (pendingFollowUp.current === ticket) pendingFollowUp.current = 0
      })
  }

  function restart() {
    store.clearAll()
    latest.current = {}
    setAnswers({})
    setFollowUps(null)
    setResumed(false)
    move(0)
  }

  const inFollowUp = screen === FOLLOWUP_SCREEN
  const step: StepNo | 5 = inFollowUp ? 5 : SCREENS[screen].step
  const questions = inFollowUp ? [] : SCREENS[screen].questions(answers)
  const canNext = questions.every(q => isAnswered(q, answers))
  const followUpReady = !loadingFollowUps && followUps !== null && followUps.length > 0

  // 画面が変わったら（深掘りの質問が届いたときも）、新しい画面の見出しへフォーカスを移す
  // （キーボード・読み上げソフトで、どこを読んでいるか迷子にならないように）。最初の表示では動かさない
  const view = inFollowUp ? (followUpReady ? 'followup' : 'followup-wait') : `screen-${screen}`
  const shownView = useRef(view)
  useEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    const target = screenHeading.current ?? stepHeading.current
    target?.focus({ preventScroll: true })
  }, [view])

  // 進み具合：いまの答えで出る画面の数 ＋ 深掘り1画面
  const visible = SCREENS.map((_, i) => i).filter(i => hasQuestions(i, answers))
  const total = visible.length + 1
  const position = inFollowUp ? total : visible.indexOf(screen) + 1
  const minutesLeft = Math.max(1, Math.ceil(((total - position) * SECONDS_PER_SCREEN) / 60))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-36">
      <div className="sticky top-0 z-[var(--z-sticky)] -mx-4 bg-[var(--color-paper)] px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <h1 ref={stepHeading} tabIndex={-1} className="font-bold tracking-wider text-brand-ink">
            STEP {step} / 5<span className="ml-2 text-foreground">{STEPS[step].title}</span>
          </h1>
          <p className="text-sub tabular-nums">
            {position} / {total}
            <span className="ml-2">{inFollowUp ? 'あと少し' : `あと約${minutesLeft}分`}</span>
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-well"
          role="progressbar"
          aria-label="診断の進み具合"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={position}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${(position / total) * 100}%` }} />
        </div>
      </div>

      {resumed && !inFollowUp && (
        <div className="notice mt-2 flex flex-wrap items-center justify-between gap-2">
          <span>前回の続きから再開しています。</span>
          <button type="button" className="btn-text" onClick={restart}>はじめからやり直す</button>
        </div>
      )}

      <p className="mt-5 text-sm text-sub">{STEPS[step].lead}</p>

      {inFollowUp ? (
        <FollowUpStep
          loading={loadingFollowUps}
          followUps={followUps ?? []}
          headingRef={screenHeading}
          onAnswer={(i, answer) => {
            if (followUps?.[i]?.answer === answer) return // 押し直しただけなら、前の結果を消さない
            const f = (followUps ?? []).map((x, j) => (j === i ? { ...x, answer } : x))
            setFollowUps(f)
            store.setFollowUps(f)
            store.setResult(null) // 深掘りの答えが変わったら、前の結果は使えない
          }}
          onBack={goBack}
          onSkip={() => {
            track('followup_skip')
            finish((followUps ?? []).map(f => ({ ...f, answer: null })))
          }}
          onDone={() => finish(followUps ?? [])}
        />
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-9">
            {questions[0]?.kind === 'slider' ? (
              <section className="flex flex-col gap-3">
                <h2 ref={screenHeading} tabIndex={-1} className="text-lg">どちらに近いですか？</h2>
                {questions.map(q =>
                  q.kind === 'slider' ? (
                    <SliderScale key={q.id} q={q} value={answers[q.id] as number | undefined} onChange={v => update(q.id, v)} />
                  ) : null,
                )}
              </section>
            ) : (
              questions.map((q, qi) =>
                q.kind === 'choice' ? (
                  <section key={q.id} className="flex flex-col gap-3">
                    <h2
                      id={`${q.id}-label`}
                      ref={qi === 0 ? screenHeading : undefined}
                      tabIndex={qi === 0 ? -1 : undefined}
                      className="text-lg"
                    >
                      {q.title}
                    </h2>
                    <p className="-mt-2 text-xs text-sub">{choiceHint(q.max, (answers[q.id] as string[] | undefined)?.length ?? 0)}</p>
                    {q.note && <p className="notice -mt-1 !py-2.5 text-xs">{q.note}</p>}
                    <ChoiceGroup
                      labelId={`${q.id}-label`}
                      options={q.options}
                      max={q.max}
                      noneId={q.noneId}
                      value={(answers[q.id] as string[] | undefined) ?? []}
                      // 選んでも自動では進まない。選び直してから「次へ」で進む
                      onChange={v => update(q.id, v)}
                    />
                  </section>
                ) : null,
              )
            )}
          </div>

          <BottomBar hint={canNext ? undefined : 'すべての質問に答えると「次へ」が押せます'}>
            <button type="button" className="btn-secondary" onClick={goBack}>戻る</button>
            <button type="button" className="btn-primary flex-1 sm:flex-none sm:min-w-48" disabled={!canNext} onClick={() => goNext()}>
              次へ
            </button>
          </BottomBar>
        </>
      )}
    </div>
  )
}

function choiceHint(max: number | null, count: number): string {
  if (max === 1) return '1つ選んでください'
  if (max === null) return 'いくつでも選べます'
  return `${max}つまで選べます（${count}/${max}）`
}

function BottomBar({ hint, children }: { hint?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-[var(--color-paper)]">
      <div className="mx-auto max-w-2xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {hint && <p className="mb-2 text-center text-xs text-sub">{hint}</p>}
        <div className="flex items-center justify-between gap-3">{children}</div>
      </div>
    </div>
  )
}

function FollowUpStep(props: {
  loading: boolean
  followUps: FollowUp[]
  /** 1問目の見出し。画面が切り替わったときにフォーカスを移す先 */
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnswer: (i: number, answer: string) => void
  onBack: () => void
  onSkip: () => void
  onDone: () => void
}) {
  const { loading, followUps } = props
  if (loading || followUps.length === 0) {
    return (
      <>
        <div className="mt-10 flex flex-col items-center gap-4 text-center" role="status">
          <span aria-hidden className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent-paper)] border-t-[var(--color-accent)]" />
          <p className="font-bold">あなたの回答を読んでいます…</p>
          <p className="text-sm text-sub">長くても20秒ほどで、追加の質問が届きます。</p>
        </div>
        <BottomBar>
          <button type="button" className="btn-secondary" onClick={props.onBack}>戻る</button>
          <button type="button" className="btn-text" onClick={props.onSkip}>待たずに結果を見る</button>
        </BottomBar>
      </>
    )
  }

  const allAnswered = followUps.every(f => f.answer !== null)
  return (
    <>
      <div className="mt-4 flex flex-col gap-9">
        {followUps.map((f, i) => {
          const labels = [...f.options, FOLLOWUP_NONE]
          const options = labels.map((label, j) => ({ id: `fu${i}.${j}`, label }))
          const selected = options.filter(o => o.label === f.answer).map(o => o.id)
          return (
            <section key={i} className="flex flex-col gap-3">
              <h2
                id={`fu${i}-label`}
                ref={i === 0 ? props.headingRef : undefined}
                tabIndex={i === 0 ? -1 : undefined}
                className="text-lg"
              >
                {f.question}
              </h2>
              <p className="-mt-2 text-xs text-sub">1つ選んでください</p>
              <ChoiceGroup
                labelId={`fu${i}-label`}
                options={options}
                max={1}
                noneId={`fu${i}.${labels.length - 1}`}
                value={selected}
                onChange={v => props.onAnswer(i, options.find(o => o.id === v[0])?.label ?? FOLLOWUP_NONE)}
              />
            </section>
          )
        })}
      </div>
      <BottomBar hint={allAnswered ? undefined : 'すべて選ぶと「結果を見る」が押せます'}>
        <button type="button" className="btn-secondary" onClick={props.onBack}>戻る</button>
        <button type="button" className="btn-text" onClick={props.onSkip}>スキップ</button>
        <button type="button" className="btn-primary flex-1 sm:flex-none sm:min-w-48" disabled={!allAnswered} onClick={props.onDone}>
          結果を見る
        </button>
      </BottomBar>
    </>
  )
}
