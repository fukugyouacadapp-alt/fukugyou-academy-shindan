'use client'

import { track } from '@vercel/analytics'

/** 申し込みボタン。押した回数だけ数える */
export function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto" onClick={() => track('cta_click')}>
      {label}
    </a>
  )
}
