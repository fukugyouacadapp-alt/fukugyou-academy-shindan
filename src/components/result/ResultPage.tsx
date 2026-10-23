'use client'

import { track } from '@vercel/analytics'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { firstUnansweredScreen, STRENGTH_SCREEN } from '@/components/quiz/Quiz'
import type { Answers, FollowUp } from '@/data/questions'
import { SAMPLE_HIGHLIGHTS, SAMPLE_RESULT } from '@/data/sample-result'
import { highlightLabels, pickedLabels } from '@/lib/answers'
import type { DiagnosisResult } from '@/lib/schemas'
import { store, useHydrated } from '@/lib/storage'
import { ResultView } from './ResultView'

type State =
  | { kind: 'sample' }
  | { kind: 'empty' }
  | { kind: 'incomplete'; screen: number }
  | { kind: 'loading'; answers: Answers; followUps: FollowUp[] }
  | { kind: 'error'; message: string; answers: Answers; followUps: FollowUp[] }
  | { kind: 'done'; result: DiagnosisResult; highlights: string[] }

type Outcome = { ok: true; result: DiagnosisResult } | { ok: false; message: string }

/**
 * 同じ回答での問い合わせは1本にまとめる。開発中は React が画面の準備を2回走らせるので、
 * まとめないと AI を2回呼んで料金も回数制限も2倍に減ってしまう。
 */
const inflight = new Map<string, Promise<Outcome>>()

function requestDiagnosis(answers: Answers, followUps: FollowUp[]): Promise<Outcome> {
  const body = JSON.stringify({ answers, followUps })
  const existing = inflight.get(body)
  if (existing) return existing
  const p = fetch('/api/diagnose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .then(async res => {
      const data = (await res.json().catch(() => ({}))) as { result?: DiagnosisResult; error?: string }
      if (res.ok && data.result) return { ok: true as const, result: data.result }
      return { ok: false as const, message: data.error || 'うまく診断できませんでした。もう一度お試しください。' }
    })
    .catch(() => ({ ok: false as const, message: '通信がうまくいきませんでした。電波の良いところで、もう一度お試しください。' }))
    .finally(() => inflight.delete(body))
  inflight.set(body, p)
  return p
}

/** 送ったときの回答・深掘りが、いま保存されているものと同じか（違えば、届いた結果は古い回答のものなので保存しない） */
function sameAsSaved(answers: Answers, followUps: FollowUp[]): boolean {
  const saved = { answers: store.answers() ?? {}, followUps: store.followUps() ?? [] }
  return JSON.stringify(saved) === JSON.stringify({ answers, followUps })
}

export function ResultPage() {
  const hydrated = useHydrated()
  if (!hydrated) return <div className="flex-1" />
  return <ResultInner />
}

function ResultInner() {
  const router = useRouter()
  const [init] = useState<State>(() => {
    if (new URLSearchParams(window.location.search).has('sample')) return { kind: 'sample' }
    const answers = store.answers()
    const saved = store.result()
    if (saved) return { kind: 'done', result: saved, highlights: answers ? highlightLabels(answers) : [] }
    if (!answers || Object.keys(answers).length === 0) return { kind: 'empty' }
    // 途中までしか答えていない（結果のURLを直接開いた など）ときは、AIを呼ばずに続きへ案内する
    const unanswered = firstUnansweredScreen(answers)
    if (unanswered !== null) return { kind: 'incomplete', screen: unanswered }
    return { kind: 'loading', answers, followUps: store.followUps() ?? [] }
  })
  const [state, setState] = useState<State>(init)
  // 画面を離れたあとに届いた返事で、別の画面の状態を書き換えないため
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // 受け取り済みの返事。開発中は React が画面の準備を2回走らせ、同じ返事が2回届くので、2回目は捨てる
  const settled = useRef<Outcome | null>(null)

  function settle(outcome: Outcome, answers: Answers, followUps: FollowUp[]) {
    if (settled.current === outcome) return
    settled.current = outcome
    // 画面を離れたあとに届いても、送ったときの回答のままなら結果は保存しておく（戻ってきたときにAIを呼び直さない）
    if (outcome.ok && sameAsSaved(answers, followUps)) store.setResult(outcome.result)
    // 画面の書き換えは、この画面が出ているときだけ
    if (!mounted.current) return
    if (outcome.ok) {
      track('diagnosis_complete', { confidence: outcome.result.confidence })
      setState({ kind: 'done', result: outcome.result, highlights: highlightLabels(answers) })
      window.scrollTo({ top: 0 })
    } else {
      setState({ kind: 'error', message: outcome.message, answers, followUps })
    }
  }

  useEffect(() => {
    if (init.kind !== 'loading') return
    // 画面を離れても問い合わせは止めない（届いた結果を保存するため）。画面の書き換えは settle が mounted を見て止める
    requestDiagnosis(init.answers, init.followUps).then(outcome => settle(outcome, init.answers, init.followUps))
  }, [init])

  function retry(answers: Answers, followUps: FollowUp[]) {
    setState({ kind: 'loading', answers, followUps })
    requestDiagnosis(answers, followUps).then(outcome => settle(outcome, answers, followUps))
  }

  function restart() {
    store.clearAll()
    router.push('/shindan')
  }

  function reviewAnswers(screen = 0) {
    store.setScreen(screen)
    router.push('/shindan')
  }

  if (state.kind === 'empty') {
    return (
      <Centered>
        <h1 className="text-2xl">まだ診断していません</h1>
        <p className="mt-3 text-sub">選ぶだけ約3分で、あなたの強みとニッチな複業がわかります。</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link href="/shindan" className="btn-primary">診断をはじめる</Link>
          <Link href="/result?sample=1" className="btn-text">結果の見本を見る</Link>
        </div>
      </Centered>
    )
  }

  if (state.kind === 'incomplete') {
    return (
      <Centered>
        <h1 className="text-2xl">回答が途中です</h1>
        <p className="mt-3 text-sub">まだ答えていない質問があります。続きから答えると、結果が見られます。</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <button type="button" className="btn-primary" onClick={() => reviewAnswers(state.screen)}>続きから答える</button>
        </div>
      </Centered>
    )
  }

  if (state.kind === 'loading') return <Analyzing answers={state.answers} />

  if (state.kind === 'error') {
    return (
      <Centered>
        <h1 className="text-2xl">結果をつくれませんでした</h1>
        <p className="notice notice--danger mt-5 text-left">{state.message}</p>
        <p className="mt-3 text-sm text-sub">回答は消えていません。もう一度試せます。</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <button type="button" className="btn-primary" onClick={() => retry(state.answers, state.followUps)}>もう一度試す</button>
          <button type="button" className="btn-text" onClick={() => reviewAnswers()}>回答を見直す</button>
        </div>
      </Centered>
    )
  }

  if (state.kind === 'sample') {
    return (
      <ResultView
        result={SAMPLE_RESULT}
        highlights={SAMPLE_HIGHLIGHTS}
        banner={
          <div className="notice notice--wait flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>これは結果の見本です（人事・採用の仕事をしている方の回答例）。</span>
            <Link href="/shindan" className="btn-primary">自分も診断する</Link>
          </div>
        }
        footerActions={<Link href="/shindan" className="btn-primary">自分も診断する</Link>}
      />
    )
  }

  const result = state.result
  return (
    <ResultView
      result={result}
      highlights={state.highlights}
      banner={
        result.confidence === 'low' ? (
          <div className="notice notice--wait">
            <p>選んだ回答が少なめだったので、結果の精度が低いかもしれません。「人からよく頼まれること」や「仕事の外の経験」をもう少し選ぶと、より詳しく診断できます。</p>
            <button type="button" className="btn-secondary mt-3" onClick={() => reviewAnswers(STRENGTH_SCREEN)}>
              強みの質問に戻って選び直す
            </button>
          </div>
        ) : undefined
      }
      footerActions={
        <>
          <button type="button" className="btn-secondary" onClick={() => reviewAnswers()}>回答を見直す</button>
          <button type="button" className="btn-secondary" onClick={restart}>もう一度診断する</button>
        </>
      }
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-20 text-center">{children}</div>
}

const PHASES = ['回答を整理しています', '強みを3つの要素に分けています', '強みが活きる市場を探しています', 'ニッチな複業を5つに絞っています']
const TICK_MS = 1400
/** これより長く待たせたら、「まだかかっています」と伝える */
const SLOW_AFTER_TICKS = Math.ceil(30_000 / TICK_MS)

/** 分析中の画面。選んだ回答の言葉を流して、「自分の回答を読んでいる」ことが伝わるようにする */
function Analyzing({ answers }: { answers: Answers }) {
  const [words] = useState(() => pickedLabels(answers))
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  const phase = Math.min(PHASES.length - 1, Math.floor(tick / 5))
  const word = words.length > 0 ? words[tick % words.length] : ''
  const slow = tick >= SLOW_AFTER_TICKS
  return (
    <Centered>
      <div role="status" aria-live="polite" className="flex flex-col items-center">
        <span aria-hidden className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-accent-paper)] border-t-[var(--color-accent)]" />
        <h1 className="mt-8 text-xl">強みを読み解いています</h1>
        <p className="mt-2 text-sm text-sub">
          {slow ? 'まだ時間がかかっています。混み合っているようです。もう少しだけお待ちください。' : `${PHASES[phase]}…（20秒ほどかかります）`}
        </p>
      </div>
      <p aria-hidden className="mt-10 min-h-[3.5rem] text-lg font-bold text-brand-ink">
        {word && <span key={word} className="inline-block animate-[fadeword_1.4s_ease-in-out]">「{word}」</span>}
      </p>
      <ol className="mx-auto mt-6 flex flex-col gap-2 text-left text-sm">
        {PHASES.map((p, i) => (
          <li key={p} className={i <= phase ? 'text-fg' : 'text-sub opacity-60'}>
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${i < phase ? 'bg-brand' : i === phase ? 'bg-brand-rule' : 'bg-line'}`} />
            {p}
          </li>
        ))}
      </ol>
    </Centered>
  )
}
