import type { Metadata } from 'next'
import { StaffShell } from '@/components/staff/StaffNav'
import { StaffView } from '@/components/staff/StaffView'

/** 講師用のページ。パスワードは src/proxy.ts でかける。どのページからもリンクしない */
export const metadata: Metadata = {
  title: '講師用',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <StaffShell current="/staff">
      <StaffView />
    </StaffShell>
  )
}
