/** サイト名。変えるときはここだけ直す（2026-10-25 に「複業ニッチ診断」から変えた） */
export const SITE_NAME = '複業診断'

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

/** 申し込みボタンの文言（面談は無料。リンク先に合わせて変える。要件定義の結果画面の見本は「無料面談を予約する」） */
export const CTA_LABEL = process.env.NEXT_PUBLIC_CTA_LABEL || '無料面談を予約する'

/**
 * 結果画面で、伏せずに見せる仕事の数（0〜3）。残りは、ぼかしと鍵で「続きは無料面談で」にする（要件定義 R14）。
 * 伏せる範囲は、要件定義8章の1でまだ決まっていない（「2つ見せて1つ伏せる」「1つだけ見せる」など。最終判断は高橋さん）。
 * いまは要件定義4章の画面の見本どおり、3つとも伏せている（2026-10-31）。決まったら、ここの数だけ変える
 */
export const OPEN_JOBS: 0 | 1 | 2 | 3 = 0

export const OPERATOR = '複業アカデミー（Color WiTh株式会社）'

/** 運営会社のプライバシーポリシー（フッターと「回答の取り扱い」ページからリンクする） */
export const PRIVACY_POLICY_URL = 'https://color-with.com/privacy-policy/'
