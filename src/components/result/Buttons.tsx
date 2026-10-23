'use client'

import { track } from '@vercel/analytics'
import { useEffect, useRef, useState } from 'react'
import { SHARE_HASHTAG } from '@/lib/site'

/** 案件を探すキーワード。押すとコピーされる（副業サイトの検索欄にそのまま貼れるように） */
export function CopyChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  // 「コピーしました」を戻す予約。画面を離れたら取り消す（消えた札の状態を書き換えないように）
  const resetTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
  }, [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      // 続けて押されたら、最後に押してから 1.5 秒で戻す
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => {
        resetTimer.current = null
        setCopied(false)
      }, 1500)
    } catch {
      // コピーが許されていない環境では何もしない（文字は画面に見えているので手で写せる）
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-[var(--color-surface)] px-3 py-1.5 text-sm hover:bg-well"
    >
      <span>{text}</span>
      <span className="text-xs font-bold text-link" aria-live="polite">{copied ? 'コピーしました' : 'コピー'}</span>
    </button>
  )
}

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
