import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 強みの3層マップ。教材スライド（docs/reference/skill-layers.png）と同じく、
 * 内側の「本業」から外側の「潜在型」へ、入れ子の半円で可能性が拡がる様子を描く。
 */

const LAYERS = [
  { key: 'senzai', name: '潜在型', desc: '本業の延長や、仕事の外で培った強み' },
  { key: 'kenzai', name: '顕在型', desc: '本業スキルを、別の会社で活かす' },
  { key: 'hongyo', name: '本業', desc: 'いまの仕事のスキル' },
] as const

type LayerKey = (typeof LAYERS)[number]['key']

const ARCH_STYLE: Record<LayerKey, React.CSSProperties> = {
  senzai: { background: 'var(--layer-senzai-paper)', borderColor: 'var(--layer-senzai-rule)' },
  kenzai: { background: 'var(--layer-kenzai-paper)', borderColor: 'var(--layer-kenzai-rule)' },
  hongyo: { background: 'var(--layer-hongyo-paper)', borderColor: 'var(--layer-hongyo-rule)' },
}

const NAME_COLOR: Record<LayerKey, string> = {
  senzai: 'var(--layer-senzai-ink)',
  kenzai: 'var(--layer-kenzai-ink)',
  hongyo: 'var(--layer-hongyo-ink)',
}

function Arch({ layer, tags, children }: { layer: (typeof LAYERS)[number]; tags: string[]; children?: React.ReactNode }) {
  return (
    <div
      className="border border-b-0 px-3 pt-5 sm:px-5"
      style={{ ...ARCH_STYLE[layer.key], borderRadius: '50% 50% 0 0 / 72px 72px 0 0' }}
    >
      <p className="text-center leading-tight">
        <span className="font-display text-base font-bold" style={{ color: NAME_COLOR[layer.key] }}>{layer.name}</span>
        <span className="mt-0.5 block text-xs text-sub">{layer.desc}</span>
      </p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2 px-[6%]" aria-label={`${layer.name}の強み`}>
        {tags.map((t, i) => (
          <li key={`${t}-${i}`} className={`tag tag--${layer.key} bg-[var(--color-surface)]`}>{t}</li>
        ))}
      </ul>
      <div className={children ? 'mt-4' : 'pb-5'}>{children}</div>
    </div>
  )
}

function Arrow({ side }: { side: 'left' | 'right' }) {
  return (
    <span aria-hidden className={`absolute bottom-0 top-6 flex w-[18px] flex-col items-center ${side === 'left' ? 'left-0' : 'right-0'}`}>
      <span style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '14px solid var(--color-accent)' }} />
      <span className="w-[6px] flex-1 rounded-b-full" style={{ background: 'var(--gradient-arrow)' }} />
    </span>
  )
}

export function SkillLayerMap({ map, compact = false }: { map: DiagnosisResult['skill_map']; compact?: boolean }) {
  const [senzai, kenzai, hongyo] = LAYERS
  return (
    <figure className={compact ? '' : 'mx-auto max-w-xl'}>
      <div className="relative px-6 sm:px-8">
        <Arrow side="left" />
        <Arrow side="right" />
        <Arch layer={senzai} tags={map.senzai}>
          <Arch layer={kenzai} tags={map.kenzai}>
            <Arch layer={hongyo} tags={map.hongyo} />
          </Arch>
        </Arch>
        <div className="h-px bg-[var(--color-rule-strong)]" />
      </div>
      {!compact && (
        <figcaption className="mt-3 text-center text-xs text-sub">
          内側から外側へ。本業を起点に、可能性が拡がります
        </figcaption>
      )}
    </figure>
  )
}
