import { Quoted } from '@/components/Quoted'
import type { Recommendation } from '@/lib/schemas'

/**
 * おすすめのニッチ複業1件。1位は全部広げて見せ、2・3位は「くわしく見る」で畳む
 * （3件ぜんぶ広げるとスマホで長くなりすぎるため）。「あなたに向いている理由」と「今週の一歩」は常に見せる。
 */
export function RecommendationCard({ rec, featured = false }: { rec: Recommendation; featured?: boolean }) {
  const layerKey = rec.layer === '潜在型' ? 'senzai' : 'kenzai'
  const details = (
    <dl className="grid gap-4">
      <Item label="困っている人・会社">{rec.who_needs}</Item>
      <Item label="ねらい目の理由">{rec.niche_point}</Item>
    </dl>
  )

  return (
    <article className={`card overflow-hidden ${featured ? 'border-2 border-brand' : ''}`}>
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-display font-bold text-brand-ink ${featured ? 'text-base' : 'text-sm'}`}>No.{rec.rank}</span>
          <span className={`badge badge--${layerKey}`}>{rec.layer}</span>
        </div>
        <h3 className={`mt-2 leading-snug ${featured ? 'text-2xl' : 'text-xl'}`}>{rec.job_title}</h3>
        <p className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="掛け合わせた強み">
          {rec.combo.map((t, i) => (
            <span key={`${t}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-sub" aria-hidden>×</span>}
              <span className={`tag tag--${layerKey}`}>{t}</span>
            </span>
          ))}
        </p>
        <p className="mt-4 leading-relaxed">{rec.what}</p>

        <dl className="mt-5 grid gap-4">
          <Item label="あなたに向いている理由">
            <Quoted text={rec.why_you} />
          </Item>
        </dl>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="強み活用度" value={rec.fit} />
          <Stat label="市場ニーズ" value={rec.market_need} />
          <Stat label="契約の形" value={rec.contract_style} />
        </dl>

        <div className="mt-5">
          {featured ? (
            details
          ) : (
            <details className="group">
              <summary className="btn-text inline-block list-none [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">くわしく見る（困っている人・ねらい目の理由）</span>
                <span className="hidden group-open:inline">閉じる</span>
              </summary>
              <div className="mt-4">{details}</div>
            </details>
          )}
        </div>

        <div className="mt-5 rounded-[var(--radius-sm)] bg-brand-paper p-4">
          <p className="text-xs font-bold text-brand-ink">今週の一歩</p>
          <p className="mt-1 leading-relaxed">{rec.first_step}</p>
        </div>
      </div>
    </article>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-sub">{label}</dt>
      <dd className="mt-1 leading-relaxed">{children}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-well px-1 py-2.5">
      <dt className="text-[0.72rem] text-sub">{label}</dt>
      {/* ◎○△ だけのときは記号が細く見えるので大きくする */}
      <dd className={`mt-0.5 font-bold leading-snug ${value.length === 1 ? 'text-xl text-brand-ink' : 'text-sm'}`}>{value}</dd>
    </div>
  )
}
