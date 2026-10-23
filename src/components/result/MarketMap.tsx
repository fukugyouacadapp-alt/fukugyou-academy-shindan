import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 得意な市場・領域。教材の「市場を対極の2軸で切り、得意な範囲を四角で示す」を図にしたもの。
 * 横軸＝axes[0]（左が -2）、縦軸＝axes[1]（上が -2）。
 */

type Axis = DiagnosisResult['market']['axes'][number]

/** -2〜+2 を、図の端に寄りすぎない 20%〜80% の位置に置き換える（四角が端で切れないように） */
const toPercent = (p: number) => 20 + ((p + 2) / 4) * 60

function lean(axis: Axis): string {
  if (axis.position === 0) return `${axis.left}と${axis.right}の両方`
  const side = axis.position < 0 ? axis.left : axis.right
  return Math.abs(axis.position) === 2 ? `はっきり${side}寄り` : `${side}寄り`
}

export function MarketMap({ market }: { market: DiagnosisResult['market'] }) {
  const [x, y] = market.axes
  const left = toPercent(x.position)
  const top = toPercent(y.position)
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,340px)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-[var(--color-surface)]" role="img" aria-label={`得意な市場：横は${lean(x)}、縦は${lean(y)}`}>
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <span
          className="absolute grid h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] border-2 border-brand bg-brand-paper/80"
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          <span className="flex flex-col items-center gap-1 text-xs font-bold text-brand-ink">
            <span className="h-3 w-3 rounded-full bg-brand" />
            あなた
          </span>
        </span>
        <AxisLabel className="left-2 top-1/2 -translate-y-1/2">{x.left}</AxisLabel>
        <AxisLabel className="right-2 top-1/2 -translate-y-1/2 text-right">{x.right}</AxisLabel>
        <AxisLabel className="left-1/2 top-2 -translate-x-1/2 text-center">{y.left}</AxisLabel>
        <AxisLabel className="bottom-2 left-1/2 -translate-x-1/2 text-center">{y.right}</AxisLabel>
      </div>
      <div>
        <p className="text-xs font-bold text-sub">あなたが活きる市場</p>
        <p className="mt-1 font-display text-xl font-bold">{market.domain_name}</p>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          <li>横の軸：{lean(x)}</li>
          <li>縦の軸：{lean(y)}</li>
        </ul>
        <p className="mt-3 leading-relaxed">{market.comment}</p>
      </div>
    </div>
  )
}

function AxisLabel({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`absolute z-10 max-w-[40%] rounded-md bg-[var(--color-surface)]/90 px-1.5 py-0.5 text-[0.72rem] font-bold leading-tight text-fg ${className}`}>
      {children}
    </span>
  )
}
