import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_NAME } from '@/lib/site'
import './globals.css'

// 運営会社サイト（color-with.com）と同じ Noto Sans JP を、見出しにも本文にも使う
const noto = Noto_Sans_JP({
  variable: '--font-noto',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

/**
 * 本番のURL（SNSでシェアしたときの画像・URLの基準）。http/https の正しいURLのときだけ使う。
 * 「https://」抜けなどの書き間違いで new URL が失敗すると、サイトの組み立て（ビルド）ごと止まってしまうため、
 * 使えない値は無視して、組み立てのログに注意だけ出す。
 */
function siteUrl(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url
  } catch {
    // 下の注意へ
  }
  console.warn(`[layout] NEXT_PUBLIC_SITE_URL「${raw}」は正しいURLではないので使いません（https:// から書いてください）`)
  return undefined
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${SITE_NAME}｜強みから見つける、あなただけの複業`,
    template: `%s｜${SITE_NAME}`,
  },
  description:
    '選ぶだけ約3分。あなたの強みを #ハッシュタグ で言葉にし、強みが活きるニッチな複業を5つ提案します。複業アカデミーの無料診断。',
  openGraph: {
    title: `${SITE_NAME}｜強みから見つける、あなただけの複業`,
    description: '選ぶだけ約3分。強みが活きるニッチな複業を5つ提案します。',
    siteName: SITE_NAME,
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: { card: 'summary' },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
