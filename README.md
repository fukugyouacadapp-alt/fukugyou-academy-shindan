# 複業診断（複業アカデミー）

選択式の6つの質問に答えると、その人の強みと、合いそうな複業を3つ提案する無料診断サイトです。

- 本番: https://fukugyou-academy-shindan.vercel.app
- 講師用ページ: https://fukugyou-academy-shindan.vercel.app/staff （パスワードが必要）

## 引継ぎ資料

このサイトは複業アカデミー様へ引継ぎ予定です。読む方に合わせて2つ用意しています。

| 資料 | 読む方 | 内容 |
| --- | --- | --- |
| [引継ぎのご案内](docs/HANDOVER-guide.md) | 開発をしないご担当者さま | サイトの使い方、引継ぎで受け取るもの、決めていただきたいこと |
| [引継ぎ資料](docs/HANDOVER.md) | 引継ぎ作業をする開発者 | 仕様、移管の手順、環境変数、手元での動かし方、ファイルの地図 |

## 開発者向けの要点

- Next.js 16（App Router）＋ React 19 ＋ Tailwind CSS 4 ＋ TypeScript。Vercel でホスティング
- AI・データベースは使っていない。回答はサーバーに保存しない
- 開発サーバーは必ず `npm run dev`（webpack 固定）で起動する。理由は [引継ぎ資料の4章](docs/HANDOVER.md#4-手元で動かす)
- 直したら `npm run lint`・`npx tsc --noEmit`・`npm run check:results` を流す

> このリポジトリは公開（Public）です。パスワードや個人情報は書き込まず、秘密の値は Vercel の環境変数にだけ置いてください。
