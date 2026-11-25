# 複業診断（shindan-site）引継ぎ資料

最終更新: 2026-11-26

複業アカデミー様側で、このサイトの保守・改修を引き継いでいただく開発者の方に向けた資料です。
最初に「0. サマリー」と「3. 引継ぎの手順」を読めば、移管作業は進められます。
開発をしないご担当者さま向けには、[引継ぎのご案内（HANDOVER-guide.md）](HANDOVER-guide.md) を別に用意しています。

> **このリポジトリは公開（Public）です。** パスワード・APIキー・受講者や担当者の個人名・打ち合わせのメモは、
> コードにもこの資料にも入れないでください。秘密の値は Vercel の環境変数にだけ置きます。

---

## 0. サマリー

| 項目 | 内容 |
| --- | --- |
| サービス | 複業アカデミーの無料診断サイト「複業診断」 |
| 何をするか | 選択式の質問（いまは6問）に答えると、強みを #ハッシュタグ にし、合う複業を3つ提案する。結果の1つ目だけ見せ、残り2つは「続きは無料面談で」と伏せる |
| 本番URL | https://fukugyou-academy-shindan.vercel.app （2026-10-25 初公開） |
| 技術構成 | Next.js 16（App Router）＋ React 19 ＋ Tailwind CSS 4 ＋ TypeScript。Vercel でホスティング |
| AI | **使っていない**（2026-10-24 に Gemini をやめた）。用意した文面の部品を、回答に合わせてブラウザの中で組み立てる |
| データベース | **なし**。回答・結果はサーバーに保存しない（本人のブラウザの sessionStorage にだけ置く） |
| 外部サービス | Vercel（ホスティング・アクセス解析 `@vercel/analytics`）のみ |
| 秘密の値 | 講師用ページのパスワード `STAFF_PASSWORD` の1つだけ（Vercel の環境変数） |
| 公開のしかた | **GitHub とはつないでいない**。手元から `vercel deploy --prod` で送っている（移管後は GitHub 連携に切り替えるのがおすすめ。3章） |

---

## 1. いまの持ち主と、移管の方針

| もの | いまの置き場所 | 移管の方針 |
| --- | --- | --- |
| ソースコード | GitHub `fukugyouacadapp-alt/fukugyou-academy-shindan`（公開） | 複業アカデミー様の GitHub（Organization など）へ **リポジトリごと移管**（Transfer）する。履歴も残る |
| ホスティング | Vercel チーム `haikiekis-projects` ／ プロジェクト `fukugyou-academy-shindan` | 複業アカデミー様の Vercel チームへ **プロジェクトごと移管**（Transfer Project）するか、新しく作り直す（3章） |
| 本番URL | `fukugyou-academy-shindan.vercel.app`（Vercel の無料サブドメイン） | 独自ドメイン（例: `shindan.〇〇.com`）に切り替える場合は、移管後に複業アカデミー様側で設定する |
| 講師用パスワード | Vercel の環境変数 `STAFF_PASSWORD` | 値は資料には書かない。移管後に **複業アカデミー様側で新しい値に変える**（3章 STEP 4） |

### 注意

- Vercel の無料プラン（Hobby）は、規約上、商用利用ができません。複業アカデミー様の集客に使うサイトなので、移管先は **Pro プラン以上のチーム** をおすすめします
- 回答はサーバーに残らないので、**移すべき利用者データはありません**。移管で止まるのは、切り替えの数分間だけです

---

## 2. サービスの仕様

### 2.1 画面

| URL | 画面 | 誰が使うか |
| --- | --- | --- |
| `/` | トップ（見出しと「診断をはじめる」ボタン） | 一般の方 |
| `/shindan` | 診断（選択式。STEP1〜5） | 一般の方 |
| `/result` | 結果（#ハッシュタグ・強みの六角形・合う複業3つ・診断番号・申し込みボタン） | 一般の方 |
| `/result?sample=1` | 結果の見本（テスト用の回答で組み立てたもの。確認用） | 開発者 |
| `/privacy` | 回答の取り扱い | 一般の方 |
| `/staff` | 講師用。診断番号を入れると、その人の結果を **伏せずに全部** 見られる。コピー・印刷つき | 講師 |
| `/staff/jobs` | 講師用。提案される仕事の一覧 | 講師 |
| `/staff/login` | 講師用のログイン | 講師 |

### 2.2 診断の流れと「診断番号」

1. 本人が設問に答えると、結果画面に **診断番号**（11文字。例 `A3F7-K9QX-2MB`）が出る
2. 本人は無料面談を申し込むときに、この番号を講師に伝える
3. 講師は `/staff` に番号を入れて、伏せていた2件を含む結果を見る

診断番号は **回答そのものを短く書き直したもの** で、サーバーには何も保存していません。同じ回答からは必ず同じ結果になるので、番号だけで結果を作り直せます（`src/lib/result-code.ts`）。名前などの個人情報は入りません。

> **気をつけること：** 設問の選択肢の数や並びを変えると、番号の1文字目（版）が変わり、変更前に出た番号は開けなくなります。面談待ちの人がいる時期に設問を変えるときは注意してください。

### 2.3 設問の形（6問／9問の切り替え）

`src/data/question-set.ts` の1行で切り替えられます。

```ts
export const QUESTION_SET: QuestionSet = 'short' // 'short' = 6問（いま） / 'full' = 9問（2026-11-18 より前の形）
```

どちらの形で答えた人の番号も、講師用ページで開けます。

### 2.4 結果の出し方

- 仕事の候補（部品）は、仕事のタイプ別に `src/data/catalog/` の6ファイル（office・talk・plan・create・care・field）に入っている
- `src/lib/diagnose.ts` が回答から点数を付けて3件を選び、文面を組み立てる（「顕在型2件＋潜在型1件」）
- 強みの六角形（6つの力）は `src/lib/radar.ts`
- 詳しい決まりは [`docs/02-result-rules.md`](02-result-rules.md)、画面と設問の仕様は [`docs/01-site-build-prompt.md`](01-site-build-prompt.md)

### 2.5 文面の決まり（変えるときは要相談）

- 画面では「**複業**」と書き、「副業」は使わない
- 金額・「稼げる」・資格が必要な仕事などは書かない（`npm run check:results` が自動で見つける）
- 結果で伏せずに見せる件数は `src/lib/site.ts` の `OPEN_JOBS`（いまは1。2026-11-10 の打ち合わせで決定）

### 2.6 要件定義

複業アカデミー様の要件定義（最新版・2026-10-29）: https://shindan.optima-sail.com/youken
仕様書（`docs/01`）と食い違うときは、要件定義を正とします。

---

## 3. 引継ぎの手順

### STEP 1: GitHub リポジトリの移管

1. 複業アカデミー様側で、受け取る GitHub アカウント（または Organization）を決めて、引継ぎ元に伝える
2. 引継ぎ元が GitHub の `Settings` → `General` → 一番下の `Danger Zone` → `Transfer ownership` で移管する
3. 受け取った側で、リポジトリを **非公開（Private）にするか** を決める（いまは公開。秘密の値は入っていないので公開のままでも問題はない）

### STEP 2: Vercel プロジェクトの移管

次のどちらかで進めます。

- **A. プロジェクトごと移す（おすすめ）**
  引継ぎ元が Vercel の `fukugyou-academy-shindan` → `Settings` → `General` → `Transfer Project` で、複業アカデミー様の Vercel チームへ移す。本番URL・環境変数・アクセス解析の記録がそのまま引き継がれる
- **B. 新しく作り直す**
  複業アカデミー様の Vercel で、移管済みの GitHub リポジトリから新しいプロジェクトを作る。この場合、本番URLが変わる（`〇〇.vercel.app`）ので、古いURLを使っている告知・リンクがあれば差し替える。環境変数（STEP 4）も入れ直す

### STEP 3: GitHub 連携で自動公開にする（おすすめ）

いまは GitHub とつないでおらず、引継ぎ元のPCから手で公開しています。移管後は、Vercel の `Settings` → `Git` で移管済みのリポジトリをつなぐと、`main` に push するたびに本番へ自動で出るようになります。

- フレームワークの設定は Vercel が自動で Next.js と判定する。ビルドの命令は `package.json` の `npm run build`（`next build --webpack`）がそのまま使われる
- 手で公開したい場合は、リポジトリのフォルダで `vercel deploy --prod`

### STEP 4: 環境変数の設定

Vercel の `Settings` → `Environment Variables`（Production）で設定します。項目の説明は [`.env.example`](../.env.example) にもあります。

| 名前 | いまの状態 | 内容 |
| --- | --- | --- |
| `STAFF_PASSWORD` | 設定済み | 講師用ページのパスワード。**移管後に必ず新しい値に変える**（変えると、ログイン中の講師は全員ログアウトされる）。未設定だと講師用ページは誰も開けない |
| `NEXT_PUBLIC_SITE_URL` | 設定済み（本番URL） | SNSでシェアしたときの画像・URLの基準。`https://` から書く。独自ドメインにしたら書き換える |
| `NEXT_PUBLIC_CTA_URL` | **未設定** | 結果画面の申し込みボタンのリンク先（面談の申し込みフォーム・LINE公式など）。`https://` で始まるURLだけ有効。未設定の間は「申し込み先は準備中です」と出てボタンが出ない |
| `NEXT_PUBLIC_CTA_LABEL` | 未設定 | 申し込みボタンの文言。空なら「無料面談を予約する」 |

> `NEXT_PUBLIC_` で始まる値は、ビルドのときに画面へ埋め込まれます。変えたら **公開し直し（再デプロイ）** が必要です。`STAFF_PASSWORD` も、変えたら再デプロイしてください。

### STEP 5: 動作確認

- [ ] 本番URLのトップが開き、診断を最後まで答えられる
- [ ] 結果画面に診断番号が出る。申し込みボタンが正しいリンク先に飛ぶ（`NEXT_PUBLIC_CTA_URL` を入れた場合）
- [ ] `/staff` を開くとパスワードを聞かれ、新しいパスワードで入れる。診断番号を入れると3件とも見える
- [ ] 古いパスワードでは入れない
- [ ] Vercel の Analytics（アクセス解析）が記録されている

### STEP 6: 引継ぎ元の後片付け

- [ ] 引継ぎ元の Vercel から、プロジェクトがなくなっている（作り直した場合は旧プロジェクトを削除）
- [ ] 引継ぎ元のPCのフォルダは保管用に移す（削除はしない）

---

## 4. 手元で動かす

### 必要なもの

- Node.js 22 以上（Vercel の本番は Node.js 24。Vercel では 2026-10 から Node.js 20 は使えない）
- APIキーは不要。`.env.local` が無くても診断は最後まで動く

### 起動

```bash
npm install
cp .env.example .env.local   # 必要に応じて値を入れる。講師用ページを試すなら STAFF_PASSWORD に適当な値
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

> **開発サーバーは必ず `npm run dev`（webpack 固定）で起動してください。** Turbopack（`next dev` の既定）と Tailwind CSS 4 の組み合わせで、裏で動く PostCSS のプロセスが大量に残り、PC のメモリが足りなくなる不具合を実際に確認しています。`next.config.ts` で Turbopack 起動を止めています（どうしても試すときだけ `ALLOW_TURBOPACK=1`）。
> `predev` で動く `scripts/kill-postcss-orphans.js` は、残ったプロセスを掃除する Windows 向けの補助です。

### 直したあとの確認

```bash
npm run lint
npx tsc --noEmit
npm run check:results
```

`npm run check:results` は、結果の部品（数・文字数・書き方・禁止語・回答IDの書き間違い）と、でたらめな回答2万通りで組み立てた結果を点検します。**部品・設問・`diagnose.ts` を直したら必ず流してください。** 開発サーバーも料金も要りません。

---

## 5. ファイルの地図

```
src/
  app/                  画面（App Router）
    page.tsx              トップ
    shindan/              診断
    result/               結果
    privacy/              回答の取り扱い
    staff/                講師用（一覧・ログイン）
    api/staff-login|logout  講師ログインの受け口
  proxy.ts              講師用ページの入口の見張り（Next.js 16 で middleware.ts から名前が変わったもの）
  data/
    questions.ts          設問と選択肢（選択肢はIDで持つ）
    question-set.ts       6問／9問の切り替え
    catalog/              結果の部品（仕事の候補）。types.ts に書き方の決まり
    case-studies.ts       結果に添える事例
  lib/
    diagnose.ts           結果の組み立て（点数で3件選ぶ）
    radar.ts              強みの六角形
    result-code.ts        診断番号の作り方・読み方
    staff-auth.ts         講師ログインの札（クッキー）の作り方
    storage.ts            回答の保存（sessionStorage）
    site.ts               サイト名・申し込みボタン・伏せる件数・運営会社
  components/           画面の部品
scripts/
  check-results.ts      結果の点検（npm run check:results）
docs/
  01-site-build-prompt.md  画面と設問の仕様
  02-result-rules.md       結果の組み立て方と文面の決まり
```

開発の注意点の詳細は [`CLAUDE.md`](../CLAUDE.md) にもまとめています（AI の開発補助ツール向けに書いたものですが、人が読んでも分かる内容です）。

---

## 6. セキュリティと個人情報

- 回答・結果はサーバーに送らず、本人のブラウザ（sessionStorage）にだけ置く。タブを閉じると消える
- 講師用ページは、**開くたびにパスワードを聞く** 作り。ログイン直後の1回だけ使える札と、タブ切り替え用の札（2時間で切れる）をクッキーで渡す。札にはパスワードから作った署名を付けているので、パスワードを変えると出した札はすべて無効になる（`src/lib/staff-auth.ts`・`src/proxy.ts`）
- 結果の部品と組み立ての仕組みは、本人の画面でも使うので誰でも読める。講師用ページで守っているのは「伏せた結果を一覧で見られる画面」そのもの
- セキュリティヘッダー（埋め込み禁止など）は `next.config.ts`。スクリプトの読み込み元を縛る CSP はまだ入れていない（アクセス解析が止まらないか、本番相当で確かめてから入れる）
- アクセス解析は Vercel Analytics（クッキーを使わない方式）

---

## 7. 残っている作業・おすすめの改善

| 優先 | 内容 |
| --- | --- |
| 高 | `NEXT_PUBLIC_CTA_URL`（申し込み先）を設定する。いまは申し込みボタンが出ていない |
| 高 | 移管後に `STAFF_PASSWORD` を新しい値に変える |
| 中 | 独自ドメインにするか決める。変えたら `NEXT_PUBLIC_SITE_URL` も変える |
| 中 | GitHub 連携の自動公開にする（3章 STEP 3） |
| 低 | スクリプトの読み込み元を縛る CSP を入れる（6章） |
