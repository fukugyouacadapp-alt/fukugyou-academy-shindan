'use client'

import { useState } from 'react'
import { ResultView } from '@/components/result/ResultView'
import { activeQuestions, optionLabel, questionNo, questionSetOf, sliderLabel, type Answers } from '@/data/questions'
import { highlightLabels, jobFamilyIndex, validateAnswers } from '@/lib/answers'
import { diagnose } from '@/lib/diagnose'
import { decodeResultCode, encodeResultCode } from '@/lib/result-code'
import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 講師用のページ（/staff）の中身。診断番号を入れると、その人の回答と、伏せた仕事も含めた結果をすべて見せる（2026-10-31。要件定義8章の2の案B）。
 * 結果は番号からブラウザの中で作り直す（同じ回答なら同じ結果）。番号も結果も、どこにも保存しない。
 * ページにはパスワードをかけている（開くたびに入れる。src/proxy.ts と src/lib/staff-auth.ts）。
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
        <h1 className="section-title print:hidden">診断番号から結果を見る</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sub print:hidden">
          面談を予約した方から受け取った診断番号を入れると、その方の回答と、伏せた仕事も含めた結果をすべて表示します。番号も結果も、どこにも保存しません。
        </p>
        <form onSubmit={look} className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row print:hidden">
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
        {shown && <ShareTools key={shown.code} code={shown.code} result={shown.result} />}
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

/**
 * 結果の要点をコピーする・画面を印刷するボタン（2026-11-11）。
 * コピーした文章は、面談の記録や受講生アプリに貼ったり、面談のあとに本人へ送るまとめの下書きにしたりする。
 * 印刷は画面をそのまま印刷する（ブラウザの印刷画面で「PDFに保存」も選べる）。閉じている「くわしく」も開いてから印刷する
 */
function ShareTools({ code, result }: { code: string; result: DiagnosisResult }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const text = summaryText(code, result)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  function print() {
    document.querySelectorAll('main details').forEach(d => ((d as HTMLDetailsElement).open = true))
    window.print()
  }

  return (
    <div className="mt-6 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn-primary">要点をコピー</button>
        <button type="button" onClick={print} className="btn-secondary">印刷・PDFに保存</button>
        <p aria-live="polite" className="text-sm font-bold text-sub">
          {state === 'copied' && 'コピーしました。面談の記録などに貼り付けてください'}
        </p>
      </div>
      {state === 'failed' && (
        <div className="mt-3">
          <p role="alert" className="notice notice--danger">
            このブラウザではコピーできませんでした。下の文章を選んでコピーしてください。
          </p>
          <textarea
            readOnly
            value={text}
            aria-label="結果の要点"
            onFocus={e => e.currentTarget.select()}
            className="mt-2 h-64 w-full max-w-3xl rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] p-3 text-sm"
          />
        </div>
      )}
    </div>
  )
}

/** コピーする要点の文章。貼り付け先の書式を崩さないよう、記号は ■・数字・中黒だけにする */
function summaryText(code: string, r: DiagnosisResult): string {
  const lines = [
    `【複業診断の結果】診断番号：${code}`,
    '',
    '■ キャッチフレーズ',
    r.nickname,
    '',
    '■ 強み、ひとことで',
    r.summary,
    r.strength_tags.join('　'),
    '',
    '■ 合う複業の方向',
    `${r.direction.name}：${r.direction.text}`,
    '',
    '■ おすすめの仕事',
    ...r.recommendations.flatMap((job, i) => [
      `${i + 1}. ${job.job_title}（${job.contract_style}・${job.market_need}）`,
      `　最初の一歩：${job.first_step}`,
    ]),
  ]
  if (r.cautions.length > 0) lines.push('', '■ 注意点', ...r.cautions.map(c => `・${c}`))
  return lines.join('\n')
}

/** その人の回答（設問の順に、選んだ言葉を並べる）。番号は、その人が答えた形（6問・9問）での番号 */
function AnswerList({ answers }: { answers: Answers }) {
  const set = questionSetOf(answers)
  const rows = activeQuestions(answers, set).map(q => ({
    key: q.id,
    title: `${questionNo(q, set)}　${q.kind === 'choice' ? q.title : '働き方の好み'}`,
    value:
      q.kind === 'choice'
        ? (answers[q.id] as string[]).map(id => optionLabel(id) ?? id).join('、')
        : sliderLabel(q, answers[q.id] as number),
  }))
  return (
    <details className="card mt-6 px-5 py-4" open>
      <summary className="cursor-pointer font-bold">この方の回答（{set === 'short' ? '6問' : '9問'}の形で答えています）</summary>
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
