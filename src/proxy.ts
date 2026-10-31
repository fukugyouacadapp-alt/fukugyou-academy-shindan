import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 講師用のページ（/staff）にパスワードをかける（2026-10-31）。
 * ブラウザが出す「ユーザー名とパスワード」の窓で入れてもらう（Basic 認証）。ユーザー名は何でもよく、パスワードだけ確かめる。
 * パスワードは環境変数 STAFF_PASSWORD（Vercel の設定画面か `vercel env add`。画面のコードには埋め込まない）。
 * 未設定のときは、誰も入れないようにする（設定し忘れたまま、講師用のページが開いてしまわないように）。
 * なお、結果を組み立てる仕組みと文面の部品は、本人の画面でも使うので、もともと誰でも読める。ここで守るのは「講師用の画面」そのもの
 */
export function proxy(request: NextRequest) {
  const password = process.env.STAFF_PASSWORD
  if (!password) return text('講師用のページは、まだパスワードが設定されていません。', 503)

  const [scheme, encoded] = (request.headers.get('authorization') ?? '').split(' ')
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    if (sameText(decoded.slice(decoded.indexOf(':') + 1), password)) return NextResponse.next()
  }
  const res = text('講師用のページです。パスワードを入れてください。', 401)
  res.headers.set('WWW-Authenticate', 'Basic realm="staff", charset="UTF-8"')
  return res
}

export const config = {
  matcher: ['/staff', '/staff/:path*'],
}

function text(body: string, status: number) {
  return new NextResponse(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}

/** 文字列が同じか。かかる時間から一致の具合を探られないよう、ハッシュにしてから同じ長さで比べる */
function sameText(a: string, b: string): boolean {
  const hash = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(hash(a), hash(b))
}
