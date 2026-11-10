import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { JobCatalog } from '@/components/staff/JobCatalog'

/** 講師用の「おすすめに出る仕事の一覧」。パスワードは /staff と同じ（src/proxy.ts）。/staff からだけリンクする */
export const metadata: Metadata = {
  title: '講師用・仕事の一覧',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <JobCatalog />
      </main>
      <SiteFooter />
    </>
  )
}
