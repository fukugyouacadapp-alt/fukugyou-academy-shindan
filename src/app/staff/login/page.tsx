import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { safeNext, staffPassword } from '@/lib/staff-auth'

/**
 * 講師用のページのログイン（2026-11-11）。講師用のページは、開くたびにここでパスワードを入れる（仕組みは src/lib/staff-auth.ts）。
 * 送り先は /api/staff-login。画面の部品を動かさない、ふつうのフォームで送る
 */
export const metadata: Metadata = {
  title: '講師用ログイン',
  robots: { index: false, follow: false },
}

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const next = safeNext(params.next)
  const failed = params.error === '1'
  const loggedOut = params.out === '1'
  const ready = !!staffPassword()

  return (
    <>
      <SiteHeader right={<span className="staff-label">講師用</span>} />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-md px-4 py-12">
          <h1 className="section-title">講師用のページ</h1>
          <p className="mt-2 text-sm leading-relaxed text-sub">
            パスワードを入れてください。ページを開くたび（再読み込みを含む）に入れていただきます。
          </p>
          {!ready && (
            <p role="alert" className="notice notice--danger mt-4">
              講師用のページは、まだパスワードが設定されていません。サイトの管理者に連絡してください。
            </p>
          )}
          {failed && (
            <p role="alert" className="notice notice--danger mt-4">
              パスワードが違います。もう一度入れてください。
            </p>
          )}
          {loggedOut && !failed && <p className="notice mt-4">ログアウトしました。</p>}
          {ready && (
            <form method="post" action="/api/staff-login" className="mt-6 flex flex-col gap-3">
              <input type="hidden" name="next" value={next} />
              <label htmlFor="staff-password" className="text-sm font-bold">パスワード</label>
              <input
                id="staff-password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                className="min-h-12 rounded-[var(--radius-sm)] border border-line-strong bg-[var(--color-surface)] px-4 text-lg"
              />
              <button type="submit" className="btn-primary mt-2">開く</button>
              <p className="text-xs leading-relaxed text-sub">
                正しいパスワードを入れてもこの画面に戻ってしまうときは、ブラウザの設定でクッキー（サイトが預ける小さな記録）を有効にしてください。
              </p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
