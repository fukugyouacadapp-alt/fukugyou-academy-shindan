import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { StaffView } from '@/components/staff/StaffView'

/** 講師用のページ。パスワードは src/proxy.ts でかける。どのページからもリンクしない */
export const metadata: Metadata = {
  title: '講師用',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <StaffView />
      </main>
      <SiteFooter />
    </>
  )
}
