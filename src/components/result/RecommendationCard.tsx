import { Quoted } from '@/components/Quoted'
import type { Recommendation } from '@/lib/schemas'
import { IconRow } from './Blocks'
import { Icon, type IconName } from './Icon'

/**
 * おすすめのニッチ複業1件。上ふちに「おすすめ No.1」の吹き出しを載せ、中身はアイコン付きの行で読ませる。
 * 1位は全部広げて見せ、2・3位は「くわしく見る」で畳む（3件ぜんぶ広げるとスマホで長くなりすぎるため）。
 * 「あなたに向いている理由」と「今週の一歩」は常に見せる。
 */
export function RecommendationCard({ rec, featured = false }: { rec: Recommendation; featured?: boolean }) {
  const layerKey = rec.layer === '潜在型' ? 'senzai' : 'kenzai'
  const details = (
    <>
      <IconRow icon="users" label="困っている人・会社">{rec.who_needs}</IconRow>
      <IconRow icon="target-arrow" label="ねらい目の理由">{rec.niche_point}</IconRow>
    </>
  )

  return (
    <article className="relative mt-5">
      <div className="absolute inset-x-0 top-0 z-[1] flex -translate-y-1/2 justify-center">
        <p className="bubble">おすすめ No.{rec.rank}</p>
      </div>
      <div className={`card px-5 pb-6 pt-10 sm:px-7 ${featured ? 'border-2 border-brand' : ''}`}>
        <div className="text-center">
          <span className={`badge badge--${layerKey}`}>{rec.layer}</span>
          <h3 className={`mt-2 leading-snug ${featured ? 'text-2xl' : 'text-xl'}`}>{rec.job_title}</h3>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5" aria-label="掛け合わせた強み">
            {rec.combo.map((t, i) => (
              <span key={`${t}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-sub" aria-hidden>×</span>}
                <span className={`tag tag--${layerKey}`}>{t}</span>
              </span>
            ))}
          </p>
        </div>
        <p className="mt-4 leading-relaxed">{rec.what}</p>

        <div className="mt-4 divide-y divide-dashed divide-line border-t border-dashed border-line">
          <IconRow icon="bulb" label="あなたに向いている理由">
            <Quoted text={rec.why_you} />
          </IconRow>
          {featured && details}
        </div>
        {!featured && (
          <details className="group border-t border-dashed border-line pt-3">
            <summary className="btn-text inline-block list-none [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">くわしく見る（困っている人・ねらい目の理由）</span>
              <span className="hidden group-open:inline">閉じる</span>
            </summary>
            <div className="divide-y divide-dashed divide-line">{details}</div>
          </details>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon="sparkles" label="強み活用度" value={rec.fit} />
          <Stat icon="chart-bar" label="市場ニーズ" value={rec.market_need} />
          <Stat icon="file-text" label="契約の形" value={rec.contract_style} />
        </dl>

        <div className="mt-5 flex gap-3 rounded-[var(--radius-sm)] bg-brand-paper p-4">
          <Icon name="walk" className="mt-0.5 shrink-0 text-brand-ink" />
          <div>
            <p className="text-xs font-bold text-brand-ink">今週の一歩</p>
            <p className="mt-1 leading-relaxed">{rec.first_step}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-well px-1 py-3">
      <dt className="flex flex-col items-center gap-1 text-[0.72rem] text-sub">
        <Icon name={icon} size={20} className="text-brand-ink" />
        {label}
      </dt>
      {/* ◎○△ だけのときは記号が細く見えるので大きくする */}
      <dd className={`mt-0.5 font-bold leading-snug ${value.length === 1 ? 'text-xl text-brand-ink' : 'text-sm'}`}>{value}</dd>
    </div>
  )
}
