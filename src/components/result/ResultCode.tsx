'use client'

import { useState } from 'react'

/**
 * 診断番号（src/lib/result-code.ts）の表示。結果画面の「続きは無料面談で」の中に置く。
 * 面談の予約のときに伝えてもらうと、講師が講師用のページ（/staff）で同じ結果を作り直せる（2026-10-31。要件定義8章の2の案B）。
 * コピーできない環境（LINE の中のブラウザなど）もあるので、番号の文字は長押しで選べるようにしておく
 */
export function ResultCode({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="card mx-auto mt-6 max-w-lg p-4 text-center sm:p-5">
      <p className="text-xs font-bold text-sub">あなたの診断番号</p>
      <p className="mt-1 select-all text-2xl font-bold tracking-[0.12em] tabular-nums">{code}</p>
      <button type="button" className="btn-secondary mt-3 !min-h-10 !px-5 !py-1.5 text-sm" onClick={copy}>
        {state === 'copied' ? 'コピーしました' : '番号をコピーする'}
      </button>
      {state === 'failed' && <p className="mt-2 text-xs text-sub">コピーできませんでした。番号を長押しして、コピーしてください。</p>}
      <p className="mt-3 text-left text-xs leading-relaxed text-sub">
        面談の予約のときに、この番号をお伝えください。講師が、あなたの診断結果を見て面談の準備をします。番号は選んだ回答を短い記号にしたもので、名前などは入っていません。
      </p>
    </div>
  )
}
