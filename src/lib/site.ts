/** サイト名。変えるときはここだけ直す（2026-10-25 に「複業ニッチ診断」から変えた） */
export const SITE_NAME = '複業診断'

/** シェア文に付けるハッシュタグ（# は付けない） */
export const SHARE_HASHTAG = '複業診断'

/**
 * https: で始まる正しいURLのときだけ、そのURLを返す。それ以外は空文字。
 * `javascript:` で始まる値をそのままリンクにすると、押した人のブラウザで勝手な処理が動いてしまう。
 * 書き間違い（https:// 抜けなど）も、壊れたリンクを出すより「ボタンを出さない」ほうが安全なので空にする。
 */
function httpsUrlOrEmpty(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

/** 結果画面の申し込みボタンのリンク先（講師との面談の申し込みページ）。未設定・https: 以外ならボタンを出さない */
export const CTA_URL = httpsUrlOrEmpty(process.env.NEXT_PUBLIC_CTA_URL)

/** 申し込みボタンの文言（面談は無料。LINE で受け付けるなら「LINEで無料面談を申し込む」など、リンク先に合わせて変える） */
export const CTA_LABEL = process.env.NEXT_PUBLIC_CTA_LABEL || '無料面談を申し込む'

export const OPERATOR = '複業アカデミー（Color WiTh株式会社）'

/** 運営会社のプライバシーポリシー（フッターと「回答の取り扱い」ページからリンクする） */
export const PRIVACY_POLICY_URL = 'https://color-with.com/privacy-policy/'
