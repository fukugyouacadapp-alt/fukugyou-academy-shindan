'use client'

import { useState } from 'react'
import { ResultView } from '@/components/result/ResultView'
import { activeQuestions, optionLabel, sliderLabel, type Answers } from '@/data/questions'
import { highlightLabels, jobFamilyIndex, validateAnswers } from '@/lib/answers'
import { diagnose } from '@/lib/diagnose'
import { decodeResultCode, encodeResultCode } from '@/lib/result-code'
import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 講師用のページ（/staff）の中身。診断番号を入れると、その人の回答と、伏せた仕事も含めた結果をすべて見せる（2026-10-31。要件定義8章の2の案B）。
 * 結果は番号からブラウザの中で作り直す（同じ回答なら同じ結果）。番号も結果も、どこにも保存しない。
 * ページにはパスワードをかけている（src/proxy.ts）。
 * 番号はアドレス（URL）に載せない（アクセス計測やブラウザの履歴に残さないため）
 */

type Shown = { code: string; answers: Answers; result: DiagnosisResult }

export function StaffView() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState<Shown | null>(null)

  function look(e: React.FormEvent) {
    e.preventDefault()
    const decoded = decodeResultCode(input)
    const checked = decoded.ok ? validateAnswers(decoded.answers) : null
    if (!decoded.ok || !checked?.ok) {
      setError(decoded.ok ? '番号から回答を読み取れませんでした。番号をもう一度確かめてください' : decoded.error)
      setShown(null)
      return
    }
    setError(null)
    setShown({ code: encodeResultCode(checked.value), answers: checked.value, result: diagnose(checked.value) })
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-8">
        <h1 className="section-title">診断番号から結果を見る</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sub">
          面談を予約した方から受け取った診断番号を入れると、その方の回答と、伏せた仕事も含めた結果をすべて表示します。番号も結果も、どこにも保存しません。
        </p>
        <form onSubmit={look} className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="staff-code" className="sr-only">診断番号</label>
          <input
            id="staff-code"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="例：G100-6CP8-PAW"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-h-12 flex-1 rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-4 text-lg font-bold uppercase tracking-[0.1em]"
          />
          <button type="submit" className="btn-primary">結果を見る</button>
        </form>
        {error && (
          <p role="alert" className="notice notice--danger mt-3">
            {error}
          </p>
        )}
        {shown && <AnswerList answers={shown.answers} />}
      </div>
      {shown && (
        <ResultView
          key={shown.code}
          result={shown.result}
          highlights={highlightLabels(shown.answers)}
          family={jobFamilyIndex(shown.answers)}
          forStaff
          banner={<p className="notice">診断番号 {shown.code} の結果です（本人の画面では、おすすめの仕事は伏せて表示しています）。</p>}
        />
      )}
    </>
  )
}

/** その人の回答（設問の順に、選んだ言葉を並べる） */
function AnswerList({ answers }: { answers: Answers }) {
  const rows = activeQuestions(answers).map(q => ({
    key: q.id,
    title: q.kind === 'choice' ? `${q.no}　${q.title}` : `${q.no}　働き方の好み`,
    value:
      q.kind === 'choice'
        ? (answers[q.id] as string[]).map(id => optionLabel(id) ?? id).join('、')
        : sliderLabel(q, answers[q.id] as number),
  }))
  return (
    <details className="card mt-6 px-5 py-4" open>
      <summary className="cursor-pointer font-bold">この方の回答（{rows.length}問）</summary>
      <dl className="mt-3 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(r => (
          <div key={r.key}>
            <dt className="text-xs text-sub">{r.title}</dt>
            <dd className="font-bold">{r.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
