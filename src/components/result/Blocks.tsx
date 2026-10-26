import { Icon, type IconName } from './Icon'

/** 上ふちに吹き出しの見出しを載せた箱。見出しは箱の線にまたがるように置く */
export function BubbleCard({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative mt-14 ${className}`}>
      <div className="absolute inset-x-0 top-0 z-[1] flex -translate-y-1/2 justify-center px-4">
        <h2 className="bubble">{label}</h2>
      </div>
      <div className="card px-5 pb-6 pt-10 sm:px-8 sm:pb-8">{children}</div>
    </section>
  )
}

/** 頭にアイコンの丸を置いた1行（小さな見出し＋本文）。並べたときは点線で区切る */
export function IconRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-4 sm:gap-4">
      <span className="icon-dot">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-sub">{label}</p>
        <div className="mt-1 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
