import Link from 'next/link'

/** 講師用のページどうしを行き来するリンク（/staff・/staff/jobs・/staff/parts） */
const PAGES = [
  { href: '/staff', label: '診断番号から結果を見る' },
  { href: '/staff/jobs', label: 'おすすめに出る仕事の一覧' },
  { href: '/staff/parts', label: '結果の部品の一覧' },
] as const

export function StaffNav({ current }: { current: (typeof PAGES)[number]['href'] }) {
  return (
    <nav aria-label="講師用のページ" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {PAGES.map(p =>
        p.href === current ? (
          <span key={p.href} aria-current="page" className="font-bold">
            {p.label}
          </span>
        ) : (
          <Link key={p.href} href={p.href} className="btn-text">
            {p.label}
          </Link>
        ),
      )}
    </nav>
  )
}
