'use client'

import { SLIDER_VALUES, sliderLabel, type SliderQuestion } from '@/data/questions'

const SIZES: Record<number, number> = { [-2]: 40, [-1]: 32, 0: 24, 1: 32, 2: 40 }

/**
 * 5段階のスライダー（中身は押しボタン5つ。選んだものが「押された状態」として読み上げられる。
 * ラジオの役割を名乗ると矢印キーでの移動が要るので、名乗らない）。
 * 両端ほど丸を大きくして「強くそう思う」が直感でわかるようにしている。
 */
export function SliderScale({ q, value, onChange }: { q: SliderQuestion; value: number | undefined; onChange: (v: number) => void }) {
  const labelId = `${q.id}-label`
  return (
    <div className="card px-4 py-5 sm:px-6">
      <p id={labelId} className="sr-only">{`${q.left}か、${q.right}か`}</p>
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm font-bold leading-snug [word-break:auto-phrase]">
        <span>{q.left}</span>
        <span className="text-right">{q.right}</span>
      </div>
      <div role="group" aria-labelledby={labelId} className="flex items-center justify-between px-1">
        {SLIDER_VALUES.map(v => {
          const on = value === v
          const size = SIZES[v]
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              aria-label={sliderLabel(q, v)}
              onClick={() => onChange(v)}
              className="grid h-11 w-11 place-items-center rounded-full"
            >
              <span
                className="block rounded-full border-2 transition-colors duration-100"
                style={{
                  width: size,
                  height: size,
                  borderColor: on ? 'var(--color-accent)' : 'var(--color-rule-strong)',
                  background: on ? 'var(--color-accent)' : 'var(--color-surface)',
                }}
              />
            </button>
          )
        })}
      </div>
      <p aria-hidden className="mt-1 text-center text-[0.72rem] text-sub">どちらとも</p>
    </div>
  )
}
