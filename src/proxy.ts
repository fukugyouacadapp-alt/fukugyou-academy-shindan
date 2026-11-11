import { NextResponse, type NextRequest } from 'next/server'
import { checkTicket, COOKIE_BASE, ONCE_COOKIE, SESSION_COOKIE, staffPassword } from '@/lib/staff-auth'

/**
 * 講師用のページ（/staff）の入口の見張り（2026-10-31。2026-11-11 に「開くたびに毎回パスワード」へ変更）。
 * 札の仕組みは src/lib/staff-auth.ts。
 * - ページを開く（再読み込み・アドレス直打ちを含む）：ログイン直後の入場券が要る。なければログインのページ（/staff/login）へ回す
 * - 上のタブで切り替える（ページ全体は読み直さず、中身だけを取りに来る）：通行証が要る
 * パスワードが未設定のときは、誰も入れないようにする（設定し忘れたまま、講師用のページが開いてしまわないように）。
 * なお、結果を組み立てる仕組みと文面の部品は、本人の画面でも使うので、もともと誰でも読める。ここで守るのは「講師用の画面」そのもの
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/staff/login') return NextResponse.next()

  const password = staffPassword()
  if (!password) return text('講師用のページは、まだパスワードが設定されていません。', 503)

  // タブの切り替え（ページ全体ではなく、中身だけを取りに来る）。
  // 見分けには、ブラウザが自動で付ける Sec-Fetch-Dest を使う（ページを開くときは document。Next.js 自身の rsc という印は、proxy からは見えない）。
  // この印を付けない古いブラウザでは、毎回「ページを開く」扱いになり、タブを切り替えてもパスワードを聞かれる（安全側に倒れる）
  if (!opensPage(request)) {
    if (checkTicket('session', request.cookies.get(SESSION_COOKIE)?.value, password)) return noStore(NextResponse.next())
    return text('ログインし直してください。', 401)
  }

  // ページを開く：入場券を確かめ、その場で捨てる（次に開くときは、またパスワードが要る）
  if (checkTicket('once', request.cookies.get(ONCE_COOKIE)?.value, password)) {
    const res = noStore(NextResponse.next())
    res.cookies.delete({ name: ONCE_COOKIE, path: COOKIE_BASE.path })
    return res
  }
  const login = new URL('/staff/login', request.url)
  login.searchParams.set('next', pathname)
  return noStore(NextResponse.redirect(login, 303))
}

export const config = {
  matcher: ['/staff', '/staff/:path*'],
}

function opensPage(request: NextRequest) {
  const dest = request.headers.get('sec-fetch-dest')
  return dest === null || dest === 'document' || dest === 'iframe'
}

/** ブラウザやサーバーに講師用のページを溜めさせない（「戻る」で、パスワードなしに前の画面が出ないように） */
function noStore(res: NextResponse) {
  res.headers.set('cache-control', 'private, no-store')
  return res
}

function text(body: string, status: number) {
  return new NextResponse(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
