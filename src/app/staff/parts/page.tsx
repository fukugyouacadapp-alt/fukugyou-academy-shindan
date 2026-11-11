import type { Metadata } from 'next'
import { ResultParts } from '@/components/staff/ResultParts'
import { StaffShell } from '@/components/staff/StaffNav'

/** 講師用の「結果の部品の一覧」。パスワードは /staff と同じ（src/proxy.ts）。講師用のページからだけリンクする */
export const metadata: Metadata = {
  title: '講師用・結果の部品の一覧',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <StaffShell current="/staff/parts">
      <ResultParts />
    </StaffShell>
  )
}
