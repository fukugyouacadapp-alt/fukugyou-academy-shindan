'use client'

import { track } from '@vercel/analytics'
import { SHARE_HASHTAG } from '@/lib/site'

/** X（旧Twitter）でシェア。リンク先はトップページ（結果はサーバーに保存しないので、結果ページは他人には見えない） */
export function ShareButton({ nickname, tags }: { nickname: string; tags: string[] }) {
  function share() {
    const top3 = tags.slice(0, 3).join(' ')
    const text = `私の複業の二つ名は『${nickname}』でした。\n強みタグ：${top3}\n#${SHARE_HASHTAG}`
    const url = `${window.location.origin}/`
    track('share_x')
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }
  return (
    <button type="button" className="btn-secondary" onClick={share}>
      Xでシェアする
    </button>
  )
}

/** 申し込みボタン。押した回数だけ数える */
export function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto" onClick={() => track('cta_click')}>
      {label}
    </a>
  )
}
