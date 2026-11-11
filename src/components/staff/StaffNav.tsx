import Link from 'next/link'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'

/**
 * 講師用のページ（/staff・/staff/jobs）の枠（2026-11-11）。
 * 上の帯に「講師用」の札、その下にページを行き来するタブを置く（「結果の部品の一覧」/staff/parts は同じ日に外した）。タブは画面の上に貼り付け、下まで読んでも切り替えられるようにする。
 * 中身は PC では横幅を広げ（max-w-5xl）、一度に多く見えるようにする
 */
const PAGES = [
  { href: '/staff', label: '結果を見る' },
  { href: '/staff/jobs', label: '仕事の一覧' },] as const

export function StaffShell({ current, children }: { current: (typeof PAGES)[number]['href']; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader right={<span className="staff-label">講師用</span>} />
      <nav aria-label="講師用のページ" className="staff-tabs print:hidden">
        <div className="mx-auto flex max-w-5xl overflow-x-auto px-4">
          {PAGES.map(p => (
            <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined} className="staff-tab">
              {p.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  )
}
