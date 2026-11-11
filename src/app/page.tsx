import Link from 'next/link'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'

/** トップは見出しとはじめるボタンだけ（説明は診断の画面に任せる。結果の見本へのリンクは 2026-10-25 に外した）。運営者と回答の扱いの1行は 2026-10-31 に足したが、同じ日に外した（運営者と回答の扱いはフッターから） */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <p className="eyebrow">複業アカデミーの無料診断</p>
          {/* 幅が狭いときは「合う」のあとで折り返す（言葉の途中で切れないように） */}
          <h1 className="mt-5 text-[1.85rem] leading-[1.45] sm:text-[2.6rem]">
            <span className="inline-block">あなたの強みに合う</span>
            <span className="inline-block">複業がわかる</span>
          </h1>
          <p className="mt-5 text-[1.05rem]">選ぶだけ約3分・無料・登録不要</p>
          {/* 2026-11-11 に、角の丸みが小さい長方形・ふんわりした影・2段の文字・右端の丸い矢印の形にした（色はそのまま） */}
          <Link href="/shindan" className="btn-start mt-10 w-full sm:w-auto">
            <span className="btn-start__sub">今すぐ無料で</span>
            診断をはじめる
            <span aria-hidden className="btn-start__arrow">
              {/* Tabler Icons の arrow-right（MIT License。public/third-party-licenses.txt） */}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l14 0" />
                <path d="M13 18l6 -6" />
                <path d="M13 6l6 6" />
              </svg>
            </span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
