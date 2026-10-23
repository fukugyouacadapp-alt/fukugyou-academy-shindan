@AGENTS.md

# 複業ニッチ診断（shindan-site）

複業アカデミーの無料診断サイト。選択式の質問に答えると、AI（Gemini）が強みを #ハッシュタグ にし、ニッチな複業を5つ提案する。
仕様は `docs/01-site-build-prompt.md`、AIへの指示文は `docs/02-ai-prompts.md`（`src/lib/prompts.ts` と同じ文面。直すときは両方）。

## ローカル起動ルール（必読）

- 開発サーバーは **必ず `npm run dev`** で起動する（中身は `next dev --webpack` 固定）。別ポートが必要なら `npm run dev -- -p 3100`。
- `next dev` / `npx next dev` / `--turbopack` の直叩きは **禁止**。next.config.ts がエラーで止める仕組みだが、そもそも打たないこと。
- 理由: Turbopack + @tailwindcss/postcss の組み合わせで PostCSS の子プロセスが増殖し（このPCの別プロジェクトで 2026-08-20 実測: 240 個 / 12.7GB）、PC 全体がメモリ不足で固まる。この PC は起動前の空きメモリが 1〜2GB しかない。
- 本番用の組み立ても `npm run build`（`next build --webpack`）を使う。
- 動作確認は起動後に `curl http://localhost:3000/` を数本叩く程度に留め、ブラウザタブを何枚も開かない。

## 必要な設定（`.env.local`）

`.env.example` をコピーして作る。`GEMINI_API_KEY` が無いと診断のところで「混み合っています」になる（サーバーのログに `GEMINI_API_KEY が設定されていません`）。

## 確認のしかた

- `npm run lint` と `npx tsc --noEmit`
- `npm run test:personas`（開発サーバーを起動した状態で）: テスト用4人（`scripts/test-personas.mjs`）の回答でAIを実際に呼び、結果を `.persona-results/` に保存して、決まりごと（5件・顕在型3/潜在型2・引用・禁止語）を点検する。AIを数回呼ぶので料金が少しかかる
- 画面は `/result?sample=1` で、AIを呼ばずに結果の見本を表示できる

## 本番に出す前に

- Vercel の環境変数に `GEMINI_API_KEY`・`NEXT_PUBLIC_CTA_URL` を入れる
- 回数制限（`src/lib/rate-limit.ts`）はサーバーのメモリで数えているだけ（実行環境ごと・再起動で0）。**Vercel の Firewall でレート制限ルールを足す**こと（例: `/api/diagnose` を同じIPから1時間に10回まで）
- **Google 側でもキーの使いすぎを止める**（Google Cloud の予算アラート・1日の上限）。サイト内の上限は実行環境ごとなので、請求額の本当の天井にはならない
- IPアドレスは `process.env.VERCEL` があれば Vercel のヘッダー、なければ `cf-connecting-ip`（Cloudflare）を見る。それ以外の置き場所に出すなら `clientIp` を見直す（偽れるヘッダーを信じると回数制限をすり抜けられる）
- セキュリティヘッダーは `next.config.ts`。CSP は埋め込み禁止（frame-ancestors）だけで、スクリプトの制限はまだ入れていない（入れるなら本番相当で動作確認してから）
- 本番公開（Vercel への反映）は必ずユーザーの確認を取ってから

## 作りの要点

- 回答はすべて選択式。ブラウザからは選択肢のIDだけを受け取り、`src/lib/answers.ts` で文言に戻してからAIに渡す（勝手な文章をAIに渡さない）
- 例外の深掘り（STEP5）は、AIが作った質問をブラウザが送り返すので、`/api/followup` で署名を付けて `/api/diagnose` で確かめる（`src/lib/followup-sig.ts`）。署名が合わない質問は使わない
- 「書いてはいけない言葉」の点検（`src/lib/schemas.ts` の policyIssues）は、普通の文を引っかけると2回とも落ちて結果が出せなくなる。言い回しを足すときは狭めに書き、`docs/02-ai-prompts.md`「7. 守ること」とそろえる
- 回答・結果はブラウザの sessionStorage にだけ置く。サーバーにもデータベースにも保存しない
- 見た目の決まりごとは `src/app/globals.css` の冒頭と `src/app/tokens.css`（運営会社サイト color-with.com に合わせた値）。色は tokens.css の名前で引き、画面側に #hex を書かない

## 触らないもの

- 隣の `../fukugyou-coach`（複業アカデミーAIコーチ）のフォルダは、参考に読むのはよいが、書き換えない（ファイルの変更・追加・削除をしない）。このサイトは単体で動くように作る
