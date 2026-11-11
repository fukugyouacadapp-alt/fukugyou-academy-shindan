'use client'

import { useState } from 'react'
import { FAMILIES } from '@/data/catalog'
import type { Job } from '@/data/catalog/types'
import { JOB_FAMILIES, Q } from '@/data/questions'

/**
 * 講師用の「おすすめに出る仕事の一覧」（/staff/jobs。2026-11-11）。
 * 診断の結果に出る可能性のある仕事を、部品（src/data/catalog）からそのまますべて並べる。部品を足す・外すと、ここも自動で変わる。
 * 仕事のタイプで切り替えたり、言葉で絞り込んだりできる。パスワードは /staff と同じ（src/proxy.ts）
 */

type Layer = 'kenzai' | 'senzai' | 'extension'

type Entry = {
  job: Job
  family: number
  layer: Layer
  /** どんな回答の人に出るか */
  source: string
  /** 顕在型：深掘りのどの答えに合うか。潜在型：とくに合う仕事の内容 */
  fits: string[]
}

const LAYERS: { id: Layer; title: string; note: string }[] = [
  { id: 'kenzai', title: '本業の経験から出る仕事（顕在型）', note: '1-2「具体的には？」で選んだ仕事の内容ごとに出ます。' },
  { id: 'senzai', title: '仕事の外の経験から出る仕事（潜在型）', note: '6「仕事の外で、人に話せるくらいの経験は？」で選んだものごとに出ます。' },
  { id: 'extension', title: '本業の延長で出る仕事（潜在型）', note: '6 で「特にない」を選んだ人や、選んだ経験に合う仕事がないときに出ます。' },
]

const shortLabel = (label: string) => label.replace(/（.*）$/, '')

function buildEntries(): Entry[] {
  const q6Labels = Object.fromEntries(Q.q6.options.map(o => [o.id, o.label]))
  return FAMILIES.flatMap((family, fi) => {
    const deepOptions = JOB_FAMILIES[fi].details
    const kenzai = family.details.flatMap((detail, di) =>
      detail.jobs.map<Entry>(job => ({
        job,
        family: fi,
        layer: 'kenzai',
        source: `本業：${detail.label}`,
        fits: (job.deep ?? []).map(n => deepOptions[di]?.deep.options[n - 1]).filter((s): s is string => Boolean(s)),
      })),
    )
    const senzai = Object.entries(family.hidden).flatMap(([q6, jobs]) =>
      jobs.map<Entry>(job => ({
        job,
        family: fi,
        layer: 'senzai',
        source: `仕事の外の経験：${q6Labels[q6] ?? q6}`,
        fits: (job.details ?? []).map(n => family.details[n - 1]?.label).filter((s): s is string => Boolean(s)),
      })),
    )
    const extension = family.extension.map<Entry>(job => ({
      job,
      family: fi,
      layer: 'extension',
      source: '仕事の外の経験が「特にない」人など',
      fits: (job.details ?? []).map(n => family.details[n - 1]?.label).filter((s): s is string => Boolean(s)),
    }))
    return [...kenzai, ...senzai, ...extension]
  })
}

function matches(entry: Entry, words: string[]): boolean {
  if (words.length === 0) return true
  const { job } = entry
  const text = [job.title, ...job.tags, job.what, job.who, job.because, job.niche, job.step, job.caution ?? '', job.contract, job.market, entry.source, ...entry.fits]
    .join(' ')
    .toLowerCase()
  return words.every(w => text.includes(w))
}

/** 部品は変わらないので、読み込んだときに1回だけ並べる */
const ENTRIES = buildEntries()

export function JobCatalog() {
  const entries = ENTRIES
  const [family, setFamily] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = entries.filter(e => (family === null || e.family === family) && matches(e, words))
  const families = JOB_FAMILIES.map((f, i) => ({ index: i, label: shortLabel(f.label) })).filter(f => family === null || f.index === family)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
      <h1 className="section-title">おすすめに出る仕事の一覧</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sub">
        診断の結果に出る可能性のある仕事を、すべて並べています（全{entries.length}件）。仕事のタイプごとに、どんな回答の人に出るかで分けています。
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="仕事のタイプで切り替える">
        <FilterButton pressed={family === null} onClick={() => setFamily(null)}>すべて</FilterButton>
        {JOB_FAMILIES.map((f, i) => (
          <FilterButton key={f.label} pressed={family === i} onClick={() => setFamily(i)}>
            {shortLabel(f.label)}（{entries.filter(e => e.family === i).length}）
          </FilterButton>
        ))}
      </div>
      <label htmlFor="job-query" className="mt-4 block text-sm font-bold">言葉で絞り込む</label>
      <input
        id="job-query"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="例：採用　SNS　月額継続"
        autoComplete="off"
        className="mt-1 min-h-12 w-full max-w-2xl rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-4"
      />
      <p className="mt-3 text-sm text-sub" aria-live="polite">
        {visible.length}件を表示しています（全{entries.length}件）
      </p>

      {families.map(f => {
        const inFamily = visible.filter(e => e.family === f.index)
        if (inFamily.length === 0) return null
        return (
          <section key={f.index} className="mt-10">
            <h2 className="text-xl font-bold">
              {f.label}
              <span className="ml-2 text-sm font-normal text-sub">{inFamily.length}件</span>
            </h2>
            {LAYERS.map(layer => {
              const list = inFamily.filter(e => e.layer === layer.id)
              if (list.length === 0) return null
              return (
                <div key={layer.id} className="mt-5">
                  <h3 className="font-bold">
                    {layer.title}
                    <span className="ml-2 text-sm font-normal text-sub">{list.length}件</span>
                  </h3>
                  <p className="mt-1 text-xs text-sub">{layer.note}</p>
                  <ul className="mt-3 grid items-start gap-3 lg:grid-cols-2">
                    {list.map(e => (
                      <li key={e.job.id}>
                        <JobCard entry={e} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        )
      })}
      {visible.length === 0 && <p className="notice mt-6">合う仕事がありません。言葉を変えてみてください。</p>}
    </div>
  )
}

function FilterButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className="choice w-auto min-h-10 py-1.5 text-sm">
      {children}
    </button>
  )
}

function JobCard({ entry }: { entry: Entry }) {
  const { job, layer, source, fits } = entry
  const badges = [
    job.market,
    job.contract,
    job.stage === 'front' ? '前に出る' : '裏方',
    job.target === 'b' ? '会社が相手' : '個人が相手',
    job.regular ? '毎週の定例あり' : '',
    job.social ? '地域・社会の役に立つ' : '',
  ].filter(Boolean)
  return (
    <article className="card px-5 py-4">
      <h4 className="font-bold leading-snug">{job.title}</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {badges.map(b => (
          <span key={b} className={`badge ${layer === 'kenzai' ? 'badge--kenzai' : 'badge--senzai'}`}>{b}</span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {job.tags.map(t => (
          <span key={t} className={`tag ${layer === 'kenzai' ? 'tag--kenzai' : 'tag--senzai'}`}>{t}</span>
        ))}
      </div>
      <dl className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
        <Row term="どんな仕事か">{job.what}</Row>
        <Row term="困っている人・会社">{job.who}</Row>
        <Row term="出る人">
          {source}
          {fits.length > 0 && (
            <span className="text-sub">
              （{layer === 'kenzai' ? 'とくに深掘りで' : 'とくに本業が'}「{fits.join('」「')}」の人）
            </span>
          )}
        </Row>
      </dl>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-sub">くわしく（向いている理由・ライバルが少ない理由・最初の一歩）</summary>
        <dl className="mt-2 flex flex-col gap-2 leading-relaxed">
          <Row term="向いている理由（後半）">{job.because}</Row>
          <Row term="ライバルが少ない理由">{job.niche}</Row>
          <Row term="今週できる最初の一歩">{job.step}</Row>
          {job.caution && <Row term="注意点">{job.caution}</Row>}
          <Row term="案件を探す言葉">{job.keywords.join('、')}</Row>
        </dl>
      </details>
    </article>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-sub">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}
