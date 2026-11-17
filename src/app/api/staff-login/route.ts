import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_BASE, makeTicket, ONCE_COOKIE, ONCE_SECONDS, safeNext, sameOrigin, sameText, SESSION_COOKIE, SESSION_SECONDS, staffPassword } from '@/lib/staff-auth'

/**
 * 講師用のページのログインの受け口（2026-11-11）。/staff/login のフォームから送られてくる。
 * パスワードが合えば、入場券と通行証（src/lib/staff-auth.ts）を渡して、開こうとしていたページへ戻す。
 * 違えば、少し待たせてからログインのページへ戻す（総当たりで試されにくくする）
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse('別のサイトからは送れません。', { status: 403 })

  const form = await request.formData().catch(() => null)
  const next = safeNext(form?.get('next'))
  const input = form?.get('password')
  const password = staffPassword()
  if (!password) return new NextResponse('講師用のページは、まだパスワードが設定されていません。', { status: 503 })

  if (typeof input !== 'string' || !sameText(input, password)) {
    await new Promise(r => setTimeout(r, 800))
    const back = new URL('/staff/login', request.url)
    back.searchParams.set('error', '1')
    back.searchParams.set('next', next)
    return NextResponse.redirect(back, 303)
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303)
  const base = { ...COOKIE_BASE, secure: request.nextUrl.protocol === 'https:' }
  res.cookies.set(ONCE_COOKIE, makeTicket('once', password), { ...base, maxAge: ONCE_SECONDS })
  res.cookies.set(SESSION_COOKIE, makeTicket('session', password), { ...base, maxAge: SESSION_SECONDS })
  return res
}
