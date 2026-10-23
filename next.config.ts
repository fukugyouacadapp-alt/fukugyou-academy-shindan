import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// 全ページ・全APIの応答に付ける安全のための指示（ブラウザ向け）。
// CSP は「他のサイトの枠の中に表示させない」の1項目だけにしている。
// スクリプトの読み込み元まで縛ると、アクセス解析（@vercel/analytics）や Next.js が
// ページに埋め込む小さなスクリプトが止まって画面が壊れる恐れがあり、実機で確かめられていないため。
const SECURITY_HEADERS = [
  // ファイルの種類をブラウザに推測させない（画像のふりをした別物を実行させない）
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへ移動するとき、相手に渡すのはドメインまで（ページのURLの続きは渡さない）
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 他のサイトの枠（iframe）の中に表示させない＝見えないボタンを重ねるなりすましを防ぐ。
  // 古いブラウザ向けの X-Frame-Options と、今のブラウザ向けの CSP の両方で伝える
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // カメラ・マイク・位置情報は使わないので、ページからは一切使えないようにしておく
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // ホームフォルダに別の package-lock.json があると Next がそちらを「根元」と誤認するので、
  // このプロジェクトのフォルダを明示的に根元にする。
  outputFileTracingRoot: path.join(__dirname),
  // 「Next.js で作っています」という名乗り（X-Powered-By）を返さない。攻撃の手がかりを減らすため
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default function config(phase: string): NextConfig {
  // Turbopack + @tailwindcss/postcss の組み合わせで PostCSS の子プロセスが増殖し
  // （このPCの別プロジェクトで 2026-08-20 実測: 240 プロセス / 12.7GB）、PC 全体がメモリ不足で固まる。
  // 開発サーバーは必ず webpack（`npm run dev`）で起動すること。
  // どうしても Turbopack を試すときだけ ALLOW_TURBOPACK=1 を付ける。
  if (
    phase === PHASE_DEVELOPMENT_SERVER &&
    process.env.TURBOPACK &&
    !process.env.ALLOW_TURBOPACK
  ) {
    throw new Error(
      "[shindan-site] Turbopack での開発サーバー起動は禁止です。`npm run dev`（webpack 固定）を使ってください。" +
        " 理由: Turbopack が PostCSS 子プロセスを大量に残し、メモリ不足で PC が固まるため（CLAUDE.md 参照）。"
    );
  }
  return nextConfig;
}
