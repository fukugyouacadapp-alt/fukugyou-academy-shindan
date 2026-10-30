/**
 * 強みの六角形（6つの力。1〜5）。結果画面と、診断の途中のチェックポイントで使う。
 * shown に入っていない力は「描きかけ」として、軸を点線に、名前を「?」にし、形は中心から伸ばさない（要件定義 R11）。
 * 並びは src/lib/radar.ts の RADAR_AXES（上から時計回り）。色は tokens.css の名前で引く。
 */

type Point = { id: string; label: string; value: number }

const R = 80
const LEVELS = [1, 2, 3, 4, 5]

/** i 番目の軸（上から時計回りに60度ずつ）の、中心から r の位置 */
function at(i: number, r: number): [number, number] {
  const rad = ((-90 + 60 * i) * Math.PI) / 180
  return [r * Math.cos(rad), r * Math.sin(rad)]
}

const toPoints = (rs: number[]) => rs.map((r, i) => at(i, r).map(n => n.toFixed(1)).join(',')).join(' ')

/** 名前の置き場所。上下の軸は真ん中そろえ、右の軸は左そろえ、左の軸は右そろえ */
function labelProps(i: number): { x: number; y: number; textAnchor: 'start' | 'middle' | 'end' } {
  const [x, y] = at(i, R)
  if (i === 0) return { x, y: y - 12, textAnchor: 'middle' }
  if (i === 3) return { x, y: y + 22, textAnchor: 'middle' }
  return { x: x + (i < 3 ? 10 : -10), y: y + 5, textAnchor: i < 3 ? 'start' : 'end' }
}

export function RadarChart({ axes, shown, className = '' }: { axes: Point[]; shown?: string[]; className?: string }) {
  const isShown = (p: Point) => !shown || shown.includes(p.id)
  const visible = axes.filter(isShown)
  const hidden = axes.filter(p => !isShown(p))
  const description = [
    `強みの六角形。${visible.map(p => `${p.label}は5段階の${p.value}`).join('、')}`,
    hidden.length > 0 ? `まだわからない力：${hidden.map(p => p.label).join('、')}` : '',
  ]
    .filter(Boolean)
    .join('。')
  return (
    <svg viewBox="-150 -118 300 240" role="img" aria-label={description} className={className}>
      {LEVELS.map(level => (
        <polygon
          key={level}
          points={toPoints(axes.map(() => (R * level) / 5))}
          fill={level === 5 ? 'var(--color-surface)' : 'none'}
          stroke="var(--color-rule)"
          strokeWidth={1}
        />
      ))}
      {axes.map((p, i) => {
        const [x, y] = at(i, R)
        return (
          <line
            key={p.id}
            x1={0}
            y1={0}
            x2={x}
            y2={y}
            stroke={isShown(p) ? 'var(--color-rule)' : 'var(--color-rule-strong)'}
            strokeDasharray={isShown(p) ? undefined : '3 3'}
          />
        )
      })}
      {visible.length > 0 && (
        <polygon
          points={toPoints(axes.map(p => (isShown(p) ? (R * p.value) / 5 : 0)))}
          fill="var(--color-accent)"
          fillOpacity={0.18}
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {axes.map((p, i) => {
        if (!isShown(p)) return null
        const [x, y] = at(i, (R * p.value) / 5)
        return <circle key={p.id} cx={x} cy={y} r={3.5} fill="var(--color-accent-fill)" />
      })}
      {axes.map((p, i) => (
        <text
          key={p.id}
          {...labelProps(i)}
          fontFamily="inherit"
          fontSize={isShown(p) ? 13 : 15}
          fontWeight={700}
          fill={isShown(p) ? 'var(--color-ink)' : 'var(--color-muted)'}
        >
          {isShown(p) ? p.label : '?'}
        </text>
      ))}
    </svg>
  )
}
