'use client'

import { track } from '@vercel/analytics'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { firstUnansweredScreen, STRENGTH_SCREEN } from '@/components/quiz/Quiz'
import { READING_LOGO } from '@/components/readingLogo'
import type { Answers } from '@/data/questions'
import { buildSample } from '@/data/sample-result'
import { highlightLabels, jobFamilyIndex, pickedLabels, validateAnswers } from '@/lib/answers'
import { diagnose } from '@/lib/diagnose'
import type { DiagnosisResult } from '@/lib/schemas'
import { store, useHydrated } from '@/lib/storage'
import { ResultView } from './ResultView'

/** 結果と一緒に画面へ渡すもの（選んだ回答の文言・仕事のタイプの番号） */
type Extras = { highlights: string[]; family: number | null }

type State =
  | ({ kind: 'sample'; result: DiagnosisResult } & Extras)
  | { kind: 'empty' }
  | { kind: 'incomplete'; screen: number }
  | { kind: 'error' }
  | ({ kind: 'reading'; answers: Answers; result: DiagnosisResult } & Extras)
  | ({ kind: 'done'; result: DiagnosisResult } & Extras)

/** 「読み解いています」を見せる長さ。結果はすぐできるが、答え終えてから結果へ切り替わる間をつくる */
const READING_MS = 2400

export function ResultPage() {
  const hydrated = useHydrated()
  if (!hydrated) return <div className="flex-1" />
  return <ResultInner />
}

function ResultInner() {
  const router = useRouter()
  const [init] = useState<State>(() => {
    if (new URLSearchParams(window.location.search).has('sample')) {
      try {
        return { kind: 'sample', ...buildSample() }
      } catch (e) {
        console.error('[result:sample]', e instanceof Error ? e.message : e)
        return { kind: 'error' }
      }
    }
    const answers = store.answers()
    const saved = store.result()
    if (saved) return { kind: 'done', result: saved, highlights: answers ? highlightLabels(answers) : [], family: answers ? jobFamilyIndex(answers) : null }
    if (!answers || Object.keys(answers).length === 0) return { kind: 'empty' }
    // 途中までしか答えていない（結果のURLを直接開いた など）ときは、続きへ案内する
    const unanswered = firstUnansweredScreen(answers)
    if (unanswered !== null) return { kind: 'incomplete', screen: unanswered }
    const checked = validateAnswers(answers)
    if (!checked.ok) return { kind: 'incomplete', screen: 0 }
    try {
      return {
        kind: 'reading',
        answers: checked.value,
        result: diagnose(checked.value),
        highlights: highlightLabels(checked.value),
        family: jobFamilyIndex(checked.value),
      }
    } catch (e) {
      console.error('[result]', e instanceof Error ? e.message : e)
      return { kind: 'error' }
    }
  })
  const [state, setState] = useState<State>(init)
  // 開発中は React が画面の準備を2回走らせるので、「診断を終えた」を2回数えないように
  const tracked = useRef(false)

  useEffect(() => {
    if (init.kind !== 'reading') return
    // 先に保存しておく（読み解き中に画面を離れても、戻ってきたときは待たせずに結果を出す）
    store.setResult(init.result)
    if (!tracked.current) {
      tracked.current = true
      track('diagnosis_complete', { confidence: init.result.confidence })
    }
    const id = window.setTimeout(() => {
      setState({ kind: 'done', result: init.result, highlights: init.highlights, family: init.family })
      window.scrollTo({ top: 0 })
    }, READING_MS)
    return () => window.clearTimeout(id)
  }, [init])

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

  if (state.kind === 'error') {
    return (
      <Centered>
        <h1 className="text-2xl">結果をつくれませんでした</h1>
        <p className="mt-3 text-sub">回答は消えていません。回答を見直すか、はじめから診断し直してください。</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <button type="button" className="btn-primary" onClick={() => reviewAnswers()}>回答を見直す</button>
          <button type="button" className="btn-text" onClick={restart}>はじめから診断する</button>
        </div>
      </Centered>
    )
  }

  if (state.kind === 'reading') return <Reading answers={state.answers} />

  if (state.kind === 'sample') {
    return (
      <ResultView
        result={state.result}
        highlights={state.highlights}
        family={state.family}
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
      family={state.family}
      banner={
        result.confidence === 'low' ? (
          <div className="notice notice--wait">
            <p>選んだ回答が少なめだったので、結果が大まかになっているかもしれません。「人からよく頼まれること」や「仕事の外の経験」をもう少し選ぶと、より詳しく診断できます。</p>
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

const PHASES = ['回答を整理しています', '強みをハッシュタグにしています', '強みが活きる市場を探しています', 'ニッチな複業を3つに絞っています']
const TICK_MS = READING_MS / PHASES.length

/**
 * 読み解き中の画面。選んだ回答の言葉を流して、「自分の回答を読んでいる」ことが伝わるようにする。
 * 待っている目印は、くるくる回る輪ではなく、ゆれて弾むロゴ（2026-10-26 に変えた。待つ間も楽しめるように）
 */
function Reading({ answers }: { answers: Answers }) {
  const [words] = useState(() => pickedLabels(answers))
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  const phase = Math.min(PHASES.length - 1, tick)
  const word = words.length > 0 ? words[tick % words.length] : ''
  return (
    <Centered>
      <div role="status" aria-live="polite" className="flex flex-col items-center">
        {/* 動きを減らす設定の人には、止まったロゴだけを見せる（globals.css の prefers-reduced-motion） */}
        <div aria-hidden className="flex flex-col items-center">
          <Image
            {...READING_LOGO}
            alt=""
            loading="eager"
            className="origin-[50%_90%] animate-[logosway_1.2s_ease-in-out_infinite]"
          />
          <span className="mt-3 h-2.5 w-24 animate-[logoshadow_1.2s_ease-in-out_infinite] rounded-[50%] bg-line" />
        </div>
        <h1 className="mt-6 text-xl">強みを読み解いています</h1>
        <p className="mt-2 text-sm text-sub">{PHASES[phase]}…</p>
      </div>
      <p aria-hidden className="mt-10 min-h-[3.5rem] text-lg font-bold text-brand-ink">
        {word && <span key={`${word}-${tick}`} className="inline-block animate-[fadeword_0.6s_ease-in-out]">「{word}」</span>}
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
