'use client'

import { track } from '@vercel/analytics'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  activeQuestions, deepQuestion, detailQuestion, Q, SLIDERS, STEPS,
  type Answers, type Question, type StepNo,
} from '@/data/questions'
import { RadarChart } from '@/components/RadarChart'
import { preloadReadingLogo } from '@/components/readingLogo'
import { axesShownAfter, radarScores, strongestAxis } from '@/lib/radar'
import { store, useHydrated } from '@/lib/storage'
import { ChoiceGroup } from './ChoiceGroup'
import { SliderScale } from './SliderScale'

/**
 * 診断の画面（STEP1〜5。9画面）。1画面に1〜3問。
 * 回答は変えるたびに sessionStorage へ保存するので、閉じても続きから再開できる。
 * STEP2・3・4 を答え終えたら、途中経過（描きかけの六角形と「まだ続きます。あと◯問」）を1画面はさむ
 * （要件定義 R11。途中で終わったと思わせず、続きを見たい気持ちで最後まで答えてもらうため。2026-10-31）。
 */

type Screen = { step: StepNo; questions: (a: Answers) => Question[] }

const some = (...qs: (Question | null)[]) => qs.filter((q): q is Question => q !== null)

/** 画面の並び（9画面）。1-2「具体的には？」は 1 を選ぶと同じ画面に出る。STEP5 の深掘りは 1-2 の答えで変わる */
export const SCREENS: Screen[] = [
  { step: 1, questions: a => some(Q.q1, detailQuestion(a)) },
  { step: 1, questions: () => [Q.q2] },
  { step: 2, questions: () => [Q.q3] },
  { step: 2, questions: () => [Q.q4] },
  { step: 3, questions: () => [Q.q5] },
  { step: 3, questions: () => [Q.q6] },
  { step: 4, questions: () => [Q.q7_1, Q.q7_2] },
  { step: 4, questions: () => SLIDERS },
  { step: 5, questions: a => some(deepQuestion(a)) },
]

/** 答え終えたあとに途中経過をはさむ STEP */
const CHECKPOINT_STEPS: StepNo[] = [2, 3, 4]

/** 結果画面の「強みの質問に戻って選び直す」で使う */
export const STRENGTH_SCREEN = SCREENS.findIndex(s => s.step === 2)
const SECONDS_PER_SCREEN = 15

function isAnswered(q: Question, a: Answers): boolean {
  const v = a[q.id]
  return q.kind === 'slider' ? typeof v === 'number' : Array.isArray(v) && v.length > 0
}

/** 前の答えを変えて聞かなくなった設問・選べなくなった選択肢の答えを消す（1 を変えたときの 1-2、1-2 を変えたときの STEP5） */
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

/** 同じ答えか（選んである札を押し直しただけなら、作った結果を消さないため） */
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

/**
 * ブラウザの履歴に置く印。画面を進めるたびに履歴を1つ足し、スマホやブラウザの「戻る」で1つ前の画面に戻れるようにする
 * （アドレスは /shindan のまま変えない。アクセス計測でページを見た回数が増えないように）。
 * pushed は「1つ前の画面から進んできた履歴」の印。これがあるときだけ、画面の「戻る」もブラウザの「戻る」と同じ動きにする
 */
const HISTORY_KEY = 'shindan'
/** checkpoint は、その画面を答え終えたあとの途中経過を出している履歴の印（どの STEP の後か） */
type HistoryMark = { screen: number; pushed: boolean; checkpoint?: StepNo }

function historyMark(state: unknown): HistoryMark | null {
  if (typeof state !== 'object' || state === null) return null
  const v = (state as Record<string, unknown>)[HISTORY_KEY]
  if (typeof v !== 'object' || v === null) return null
  const { screen, pushed, checkpoint } = v as Record<string, unknown>
  if (typeof screen !== 'number') return null
  return { screen, pushed: pushed === true, checkpoint: CHECKPOINT_STEPS.find(s => s === checkpoint) }
}

/** いまの履歴に印を付け直す（履歴は増やさない）。Next.js が使う中身は Next.js 側で引き継がれる */
function markHistory(screen: number) {
  const pushed = historyMark(window.history.state)?.pushed ?? false
  window.history.replaceState({ [HISTORY_KEY]: { screen, pushed } satisfies HistoryMark }, '')
}

/** 保存されていた画面番号が、いまの答えでは空の画面を指していたら、手前の画面へ戻す */
function normalizeScreen(i: number, a: Answers): number {
  if (!Number.isInteger(i) || i < 0) return 0
  if (i >= SCREENS.length) i = SCREENS.length - 1
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
    const s = normalizeScreen(store.screen() ?? 0, a)
    return { a, s, pruned, resumed: Object.keys(a).length > 0 && s > 0 }
  })
  const [answers, setAnswers] = useState<Answers>(init.a)
  // 画面の描き直しを待たずに続けて押されても答えが消えないよう、最新の答えはここから読む
  const latest = useRef<Answers>(init.a)
  const [screen, setScreen] = useState(init.s)
  const [resumed, setResumed] = useState(init.resumed)
  /** 途中経過を出しているときは、どの STEP を答え終えた後か。出していなければ null */
  const [checkpoint, setCheckpoint] = useState<StepNo | null>(null)
  // 画面が変わったときにフォーカスを移す先（設問の見出し。無い画面では STEP の見出し）
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const screenHeading = useRef<HTMLHeadingElement>(null)
  const checkpointHeading = useRef<HTMLHeadingElement>(null)

  // 掃除で答えが変わったときは保存し直し、前の結果を消す
  useEffect(() => {
    if (!init.pruned) return
    store.setAnswers(init.a)
    store.setResult(null)
  }, [init])

  // 開いた画面の番号を、いまの履歴に付けておく（ここへ「戻る」で帰ってきたときに、この画面を出すため）
  useEffect(() => {
    markHistory(init.s)
  }, [init])

  // 答え終えたあとの「読み解き中」の画面で揺らすロゴを、答えている間に読んでおく
  useEffect(() => {
    preloadReadingLogo()
  }, [])

  // ブラウザの「戻る」「進む」で履歴を移ったら、その履歴の画面を出す
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const mark = historyMark(e.state)
      if (!mark) return
      const a = latest.current
      // 「戻る」のあとで答えを変えてから「進む」を押しても、まだ答えていない画面を飛び越さないように
      const unanswered = firstUnansweredScreen(a)
      const i = normalizeScreen(unanswered === null ? mark.screen : Math.min(mark.screen, unanswered), a)
      if (i !== mark.screen) markHistory(i)
      // 途中経過の履歴へ戻ってきたら、途中経過を出し直す（答えを変えて画面がずれたときは出さない）
      setCheckpoint(i === mark.screen ? (mark.checkpoint ?? null) : null)
      setScreen(i)
      store.setScreen(i)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /** 画面を移す。push は履歴を1つ足す（「次へ」）、replace はいまの履歴を書き換える */
  function move(i: number, how: 'push' | 'replace') {
    setCheckpoint(null)
    setScreen(i)
    store.setScreen(i)
    if (how === 'push') window.history.pushState({ [HISTORY_KEY]: { screen: i, pushed: true } satisfies HistoryMark }, '')
    else markHistory(i)
    window.scrollTo({ top: 0 })
  }

  function update(id: string, value: string[] | number) {
    // 選んである答えを押し直しただけなら何もしない（結果を消すと、結果画面で「読み解いています」をもう一度待たせてしまう）
    if (sameValue(latest.current[id], value)) return
    if (Object.keys(latest.current).length === 0) track('diagnosis_start')
    const next = prune({ ...latest.current, [id]: value })
    latest.current = next
    setAnswers(next)
    store.setAnswers(next)
    // 答えが変わったら、前に作った結果は使えない
    store.setResult(null)
  }

  function nextScreen(from: number, a: Answers): number | null {
    for (let i = from + 1; i < SCREENS.length; i++) if (hasQuestions(i, a)) return i
    return null
  }

  function goNext() {
    const i = nextScreen(screen, latest.current)
    const step = SCREENS[screen].step
    if (i !== null && CHECKPOINT_STEPS.includes(step) && SCREENS[i].step !== step) {
      // STEP を答え終えたら、次の STEP の前に途中経過を出す。履歴を1つ足して、ブラウザの「戻る」で設問に戻れるようにする
      setCheckpoint(step)
      window.history.pushState({ [HISTORY_KEY]: { screen, pushed: true, checkpoint: step } satisfies HistoryMark }, '')
      window.scrollTo({ top: 0 })
      return
    }
    if (i === null) router.push('/result')
    else move(i, 'push')
  }

  function continueFromCheckpoint() {
    const i = nextScreen(screen, latest.current)
    if (i === null) router.push('/result')
    else move(i, 'push')
  }

  function goBack() {
    let i = screen - 1
    while (i > 0 && !hasQuestions(i, latest.current)) i--
    if (i < 0) router.push('/')
    // 1つ前の画面から進んできた履歴なら、ブラウザの「戻る」と同じにする（履歴と画面の並びがずれないように）。
    // 「前回の続きから」で開いたときなどは手前の履歴が無いので、いまの履歴を書き換えて戻る
    else if (historyMark(window.history.state)?.pushed) window.history.back()
    else move(i, 'replace')
  }

  function restart() {
    store.clearAll()
    latest.current = {}
    setAnswers({})
    setResumed(false)
    move(0, 'replace')
  }

  const step = SCREENS[screen].step
  const questions = SCREENS[screen].questions(answers)
  const canNext = questions.every(q => isAnswered(q, answers))
  const isLast = nextScreen(screen, answers) === null

  // 画面が変わったら、新しい画面の見出しへフォーカスを移す
  // （キーボード・読み上げソフトで、どこを読んでいるか迷子にならないように）。最初の表示では動かさない
  const shownScreen = useRef(screen)
  const shownCheckpoint = useRef(checkpoint)
  useEffect(() => {
    if (shownScreen.current === screen && shownCheckpoint.current === checkpoint) return
    shownScreen.current = screen
    shownCheckpoint.current = checkpoint
    const target = checkpoint !== null ? checkpointHeading.current : (screenHeading.current ?? stepHeading.current)
    target?.focus({ preventScroll: true })
  }, [screen, checkpoint])

  // 進み具合：いまの答えで出る画面の数
  const visible = SCREENS.map((_, i) => i).filter(i => hasQuestions(i, answers))
  const total = visible.length
  const position = visible.indexOf(screen) + 1
  const minutesLeft = Math.max(1, Math.ceil(((total - position) * SECONDS_PER_SCREEN) / 60))
  /** この画面より後に残っている質問の数（途中経過の「あと◯問」） */
  const questionsLeft = visible.filter(i => i > screen).reduce((n, i) => n + SCREENS[i].questions(answers).length, 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-36">
      <div className="sticky top-0 z-[var(--z-sticky)] -mx-4 bg-[var(--color-paper)] px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <h1 ref={stepHeading} tabIndex={-1} className="font-bold tracking-wider text-brand-ink">
            STEP {step} / 5<span className="ml-2 text-foreground">{STEPS[step].title}</span>
          </h1>
          <p className="text-sub tabular-nums">
            {position} / {total}
            <span className="ml-2">{isLast ? 'あと少し' : `あと約${minutesLeft}分`}</span>
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

      {checkpoint !== null ? (
        <Checkpoint
          step={checkpoint}
          answers={answers}
          questionsLeft={questionsLeft}
          minutesLeft={minutesLeft}
          headingRef={checkpointHeading}
          onContinue={continueFromCheckpoint}
        />
      ) : (
        <>
          {resumed && (
            <div className="notice mt-2 flex flex-wrap items-center justify-between gap-2">
              <span>前回の続きから再開しています。</span>
              <button type="button" className="btn-text" onClick={restart}>はじめからやり直す</button>
            </div>
          )}

          <p className="mt-5 text-sm text-sub">{STEPS[step].lead}</p>

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

          <BottomBar hint={canNext ? undefined : `すべての質問に答えると「${isLast ? '結果を見る' : '次へ'}」が押せます`}>
            <button type="button" className="btn-secondary" onClick={goBack}>戻る</button>
            <button type="button" className="btn-primary flex-1 sm:flex-none sm:min-w-48" disabled={!canNext} onClick={goNext}>
              {isLast ? '結果を見る' : '次へ'}
            </button>
          </BottomBar>
        </>
      )}
    </div>
  )
}

/**
 * 途中経過（チェックポイント）。描きかけの六角形と、いちばん高い力の一言だけを見せる。
 * 結果の文面と申し込みのボタンは置かない。ボタンは「続きを答える」の1つだけで、結果画面の申し込みボタン（オレンジの塗り）とは見た目を変える。
 * ここで離れる人を減らすため、ボタンは墨の塗りで大きく目立たせ、すぐ上に「あと約◯分で結果がわかる」と残りの手間を添える（2026-10-31）
 */
function Checkpoint({
  step, answers, questionsLeft, minutesLeft, headingRef, onContinue,
}: {
  step: StepNo
  answers: Answers
  questionsLeft: number
  minutesLeft: number
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onContinue: () => void
}) {
  const scores = radarScores(answers)
  const shown = axesShownAfter(step)
  const top = strongestAxis(scores, shown)
  return (
    <>
      <section className="card mt-6 flex flex-col items-center px-5 py-7 text-center">
        <p className="eyebrow justify-center">途中経過</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-xl">
          診断はまだ続きます。あと{questionsLeft}問
        </h2>
        <RadarChart axes={scores} shown={shown} top={top.id} className="mt-4 w-full max-w-[300px]" />
        <p className="mt-1 text-sm font-bold tabular-nums">完成度 {shown.length}/6</p>
        <div aria-hidden className="mt-2 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-well">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(shown.length / 6) * 100}%` }} />
        </div>
        <p className="mt-6 leading-relaxed">
          いまのところ、いちばん高いのは「{top.label}」。{top.line}
        </p>
        <p className="mt-2 text-xs text-sub">
          {shown.length === 5 ? '最後の1つの力は、結果画面でそろいます。' : `残りの${6 - shown.length}つの力は、この先の質問で見えてきます。`}
        </p>
      </section>
      <BottomBar hint={`選ぶだけ、あと約${minutesLeft}分で結果がわかります`}>
        <button type="button" className="btn-primary btn-continue w-full" onClick={onContinue}>続きを答える</button>
      </BottomBar>
    </>
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
