import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { ResultPage } from '@/components/result/ResultPage'

export const metadata: Metadata = {
  title: '診断結果',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <ResultPage />
      </main>
      <SiteFooter />
    </>
  )
}
