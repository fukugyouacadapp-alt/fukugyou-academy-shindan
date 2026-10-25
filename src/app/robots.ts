import type { MetadataRoute } from 'next'

// 集客用の公開サイトなのでトップは検索に載せる。診断・結果の画面は中身が人ごとに違うので載せない
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/shindan', '/result'] },
  }
}
