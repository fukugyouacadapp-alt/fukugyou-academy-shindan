import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_BASE, ONCE_COOKIE, sameOrigin, SESSION_COOKIE } from '@/lib/staff-auth'

/** 講師用のページのログアウト（2026-11-11）。渡した札（src/lib/staff-auth.ts）を消して、ログインのページへ戻す */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse('別のサイトからは送れません。', { status: 403 })

  const res = NextResponse.redirect(new URL('/staff/login?out=1', request.url), 303)
  res.cookies.delete({ name: ONCE_COOKIE, path: COOKIE_BASE.path })
  res.cookies.delete({ name: SESSION_COOKIE, path: COOKIE_BASE.path })
  return res
}
