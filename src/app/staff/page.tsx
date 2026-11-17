import type { Metadata } from 'next'
import { connection } from 'next/server'
import { StaffShell } from '@/components/staff/StaffNav'
import { StaffView } from '@/components/staff/StaffView'

/** 講師用のページ。パスワードは src/proxy.ts でかける。どのページからもリンクしない */
export const metadata: Metadata = {
  title: '講師用',
  robots: { index: false, follow: false },
}

/** 開くたびにその場で作る（作り置きにすると、本番でブラウザに画面を溜めさせない指定が上書きされるおそれがあり、そうなると「戻る」でパスワードなしに前の画面が出るため。2026-11-12） */
export default async function Page() {
  await connection()
  return (
    <StaffShell current="/staff">
      <StaffView />
    </StaffShell>
  )
}
