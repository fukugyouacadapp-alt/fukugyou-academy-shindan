import type { Metadata } from 'next'
import { connection } from 'next/server'
import { JobCatalog } from '@/components/staff/JobCatalog'
import { StaffShell } from '@/components/staff/StaffNav'

/** 講師用の「おすすめに出る仕事の一覧」。パスワードは /staff と同じ（src/proxy.ts）。/staff からだけリンクする */
export const metadata: Metadata = {
  title: '講師用・仕事の一覧',
  robots: { index: false, follow: false },
}

/** 開くたびにその場で作る（作り置きにすると、本番でブラウザに画面を溜めさせない指定が上書きされるおそれがあり、そうなると「戻る」でパスワードなしに前の画面が出るため。2026-11-12） */
export default async function Page() {
  await connection()
  return (
    <StaffShell current="/staff/jobs">
      <JobCatalog />
    </StaffShell>
  )
}
