import { Quoted } from '@/components/Quoted'
import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 強みの3要素（マインド／テクニック／ナレッジ）。3つの円が重なる中心が「その人ならではの強み」。
 * 図は小さく添えるだけにして、中身（core と各要素）は文字で読ませる。
 */

const ELEMENTS = [
  { key: 'mind', name: 'マインド', desc: '姿勢・価値観', color: 'var(--color-accent)', paper: 'var(--color-accent-paper)' },
  { key: 'technique', name: 'テクニック', desc: '再現できるやり方', color: 'var(--color-blue)', paper: 'var(--color-blue-paper)' },
  { key: 'knowledge', name: 'ナレッジ', desc: '知識・経験・資格', color: 'var(--color-sun)', paper: '#fdf3d8' },
] as const

function Venn() {
  const circles = [
    { cx: 112, cy: 92, ...ELEMENTS[0] },
    { cx: 188, cy: 92, ...ELEMENTS[1] },
    { cx: 150, cy: 158, ...ELEMENTS[2] },
  ]
  const labels = [
    { x: 82, y: 72 },
    { x: 218, y: 72 },
    { x: 150, y: 206 },
  ]
  return (
    <svg viewBox="0 0 300 250" className="mx-auto block w-full max-w-[260px]" role="img" aria-label="マインド・テクニック・ナレッジの3つが重なるところが、あなたならではの強み">
      {circles.map(c => (
        <circle key={c.key} cx={c.cx} cy={c.cy} r={74} fill={c.paper} fillOpacity={0.85} stroke={c.color} strokeWidth={2} style={{ mixBlendMode: 'multiply' }} />
      ))}
      {circles.map((c, i) => (
        <text key={c.key} x={labels[i].x} y={labels[i].y} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--color-ink)" style={{ fontFamily: 'inherit' }}>
          {c.name}
        </text>
      ))}
      <circle cx={150} cy={116} r={9} fill="var(--color-accent)" />
      <text x={150} y={142} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--color-ink)" style={{ fontFamily: 'inherit' }}>
        あなたの強み
      </text>
    </svg>
  )
}

export function StrengthTriad({ strengths }: { strengths: DiagnosisResult['strengths'] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-center gap-5 sm:grid-cols-[260px_1fr]">
        <Venn />
        <div className="rounded-[var(--radius-md)] border-2 border-brand bg-[var(--color-surface)] p-5">
          <p className="text-xs font-bold text-brand-ink">3つが重なる、あなたならではの強み</p>
          <p className="mt-2 font-display text-lg leading-relaxed">
            <Quoted text={strengths.core} />
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ELEMENTS.map(el => (
          <section key={el.key} className="card p-4" style={{ borderTop: `4px solid ${el.color}` }}>
            <h3 className="text-base">
              {el.name}
              <span className="ml-2 text-xs font-normal tracking-normal text-sub">{el.desc}</span>
            </h3>
            <ul className="mt-3 flex flex-col gap-3">
              {strengths[el.key].map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <p className="font-bold leading-snug">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-sub">根拠：<Quoted text={item.evidence} /></p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
