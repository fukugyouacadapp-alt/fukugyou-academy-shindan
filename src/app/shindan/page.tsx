import type { Metadata } from 'next'
import { SiteHeader } from '@/components/SiteChrome'
import { Quiz } from '@/components/quiz/Quiz'

export const metadata: Metadata = {
  title: '診断',
  robots: { index: false, follow: false },
}

export default function ShindanPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Quiz />
      </main>
    </>
  )
}
