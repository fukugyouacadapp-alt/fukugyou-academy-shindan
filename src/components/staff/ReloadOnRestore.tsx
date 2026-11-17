'use client'

import { useEffect } from 'react'

/**
 * ブラウザの「戻る」「進む」で、講師用のページが前の状態のまま出てきたら、読み直す（2026-11-12）。
 * Safari などは、溜めさせない指定があっても、ページを丸ごと覚えておいて「戻る」で出すことがある。
 * 読み直すとページを開き直す扱いになり、ログインのページへ回る（src/proxy.ts）
 */
export function ReloadOnRestore() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload()
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])
  return null
}
