import Image from 'next/image'
import Link from 'next/link'
import logo from '@/assets/fukugyou-academy-logo.png'
import { OPERATOR, SITE_NAME } from '@/lib/site'

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header>
      <div className="top-band" />
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3">
          {/* 複業アカデミーのロゴ（元の画像は 1400×938。高さ40pxで表示） */}
          <Image src={logo} alt="複業アカデミー" width={60} height={40} loading="eager" />
          <span aria-hidden className="h-6 w-px bg-line" />
          <span className="font-display text-[1.05rem] font-bold tracking-wider">{SITE_NAME}</span>
        </Link>
        {right}
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-xs text-sub sm:flex-row sm:items-center sm:justify-between">
        <p>運営：{OPERATOR}</p>
        <nav className="flex gap-5">
          <Link href="/privacy" className="underline underline-offset-2">回答の取り扱い</Link>
        </nav>
      </div>
    </footer>
  )
}
