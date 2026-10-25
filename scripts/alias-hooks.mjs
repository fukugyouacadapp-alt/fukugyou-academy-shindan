// Node から src/ の TypeScript をそのまま読み込むための下準備（node --import で先に読ませる）。
// Next.js と同じく「@/〜」を src/〜 に読み替え、拡張子を省いた import には .ts / .tsx / /index.ts を補う。
// 型の書き込み（: string など）は Node が自分で取り除く（Node 22.18 以降）。JSX（.tsx の画面部品）は読めない。
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'

const SRC = new URL('../src/', import.meta.url)
const EXTENSIONS = ['.ts', '.tsx', '/index.ts']

const isFile = url => existsSync(url) && statSync(url).isFile()

function withExtension(base) {
  if (isFile(base)) return base
  for (const ext of EXTENSIONS) {
    const url = new URL(base.href + ext)
    if (isFile(url)) return url
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const url = withExtension(new URL(specifier.slice(2), SRC))
      if (url) return nextResolve(url.href, context)
    }
    const fromTs = context.parentURL && /\.tsx?$/.test(context.parentURL)
    if (fromTs && (specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const url = withExtension(new URL(specifier, context.parentURL))
      if (url) return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
})
