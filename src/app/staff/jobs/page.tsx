import type { Metadata } from 'next'
import { JobCatalog } from '@/components/staff/JobCatalog'
import { StaffShell } from '@/components/staff/StaffNav'

/** 講師用の「おすすめに出る仕事の一覧」。パスワードは /staff と同じ（src/proxy.ts）。/staff からだけリンクする */
export const metadata: Metadata = {
  title: '講師用・仕事の一覧',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <StaffShell current="/staff/jobs">
      <JobCatalog />
    </StaffShell>
  )
}
