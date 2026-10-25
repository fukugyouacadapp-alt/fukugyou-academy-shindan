@AGENTS.md

# 複業診断（shindan-site）

複業アカデミーの無料診断サイト。選択式の質問に答えると、強みを #ハッシュタグ にし、ニッチな複業を3つ提案する。
AIは使わない（2026-10-24 に Gemini をやめた）。用意した文面の部品（`src/data/catalog/`）を、回答に合わせてブラウザの中で組み立てる（`src/lib/diagnose.ts`）。
仕様は `docs/01-site-build-prompt.md`、結果の組み立て方と文面の決まりは `docs/02-result-rules.md`（`src/data/catalog/types.ts` の決まりと同じ。直すときは両方）。

## ローカル起動ルール（必読）

- 開発サーバーは **必ず `npm run dev`** で起動する（中身は `next dev --webpack` 固定）。別ポートが必要なら `npm run dev -- -p 3100`。
- `next dev` / `npx next dev` / `--turbopack` の直叩きは **禁止**。next.config.ts がエラーで止める仕組みだが、そもそも打たないこと。
- 理由: Turbopack + @tailwindcss/postcss の組み合わせで PostCSS の子プロセスが増殖し（このPCの別プロジェクトで 2026-08-20 実測: 240 個 / 12.7GB）、PC 全体がメモリ不足で固まる。この PC は起動前の空きメモリが 1〜2GB しかない。
- 本番用の組み立ても `npm run build`（`next build --webpack`）を使う。
- 動作確認は起動後に `curl http://localhost:3000/` を数本叩く程度に留め、ブラウザタブを何枚も開かない。

## 必要な設定（`.env.local`）

`.env.example` をコピーして作る。中身は申し込みボタンのリンク先（`NEXT_PUBLIC_CTA_URL`）など。APIキーは要らない（無くても診断は最後まで動く）。

## 確認のしかた

- `npm run lint` と `npx tsc --noEmit`
- `npm run check:results`（開発サーバーは要らない・料金もかからない）: 結果の部品（数・文字数・書き方・禁止語・回答IDの書き間違い）と、でたらめな回答2万通りで組み立てた結果（3件・顕在型2/潜在型1・引用・時間の制約）を点検し、テスト用4人の結果を `.persona-results/` に保存する。部品・設問・`diagnose.ts` を直したら必ず流す。`ONLY=office` で仕事のタイプを絞れる
- 画面は `/result?sample=1` で、結果の見本（テスト用Aさんの回答で組み立てたもの）を表示できる

## 本番（Vercel）

- 本番URL: https://fukugyou-academy-shindan.vercel.app （Vercel のチーム haikiekis-projects ／ プロジェクト fukugyou-academy-shindan。2026-10-25 に初公開）
- GitHub にはつないでいない。公開はこのフォルダから `vercel deploy --prod --yes --scope haikiekis-projects`（Vercel 側で組み立てるので、このPCのメモリはほぼ使わない）。送らないファイルは `.vercelignore`
- 環境変数は Vercel の設定画面か `vercel env add <名前> production --scope haikiekis-projects --project fukugyou-academy-shindan`（値は標準入力で渡す）。`NEXT_PUBLIC_` で始まる値は組み立てのときに埋め込まれるので、変えたら公開し直す
- いま入っているのは `NEXT_PUBLIC_SITE_URL`（本番URL）だけ。面談の申し込みURL `NEXT_PUBLIC_CTA_URL` は未設定（ボタンの代わりに「申し込み先は準備中です」が出る）
- Claude の Vercel MCP には、このプロジェクトの設定・環境変数を変える権限がない（403）。CLI（`vercel api` / `vercel env`）を使う

## 本番に出す前に

- Vercel の環境変数に `NEXT_PUBLIC_CTA_URL` を入れる
- セキュリティヘッダーは `next.config.ts`。CSP は埋め込み禁止（frame-ancestors）だけで、スクリプトの制限はまだ入れていない（入れるなら本番相当で動作確認してから）
- 本番公開（Vercel への反映）は必ずユーザーの確認を取ってから

## 作りの要点

- 回答はすべて選択式で、選択肢のIDで持つ。文言は `src/data/questions.ts` から引く。結果の部品もこのIDで回答を見ているので、選択肢の並びを変えたら `npm run check:results`
- STEP5（深掘り）は、1-2「具体的には？」の答えごとに用意した4択1問（`questions.ts` の JOB_FAMILIES）。引用の言い回し（cite）も同じ場所
- 結果は `src/lib/diagnose.ts` が部品から点数で選んで組み立てる（同じ回答なら毎回同じ結果）。選び方は `docs/02-result-rules.md` の3章
- 「書いてはいけない言葉」（金額・「稼げる」・資格が必要な仕事など）は、部品を書く段階で `npm run check:results` が見る（`scripts/check-results.ts` の POLICY_PATTERNS）。言い回しを足すときは `docs/02-result-rules.md`「5. 部品の書き方の決まり」とそろえる
- 点検の道具は Node で `src/` の TypeScript をそのまま読む（`scripts/alias-hooks.mjs` が `@/` を読み替える）。`diagnose.ts` から読むファイルに JSX（画面の部品）を入れない
- 回答・結果はブラウザの sessionStorage にだけ置く。サーバーにもデータベースにも保存しない
- 見た目の決まりごとは `src/app/globals.css` の冒頭と `src/app/tokens.css`（運営会社サイト color-with.com に合わせた値）。色は tokens.css の名前で引き、画面側に #hex を書かない

## 触らないもの

- 隣の `../fukugyou-coach`（複業アカデミーAIコーチ）のフォルダは、参考に読むのはよいが、書き換えない（ファイルの変更・追加・削除をしない）。このサイトは単体で動くように作る
