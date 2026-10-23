/* eslint-disable @typescript-eslint/no-require-imports -- node で直接動かす CommonJS のスクリプトのため */
// Turbopack が残した PostCSS の孤児プロセス（.next/dev/build/postcss.js）を掃除する。
// `npm run dev` の直前（predev）に自動で走る。webpack 起動では発生しないが、
// 誤って Turbopack を起動してしまった後の後始末として置いている。
//
// 止めるのは「このプロジェクトのフォルダの .next の中の postcss.js」を動かしている node だけ。
// 同じPCで動いている別のプロジェクトの開発サーバーまで止めてしまわないように、フォルダで絞る。
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// このスクリプトの1つ上＝プロジェクトのフォルダ。
// process.cwd() だと、親フォルダから実行されたときに配下の全プロジェクトが対象になってしまうので、
// スクリプトの置き場所から決める（npm run から動くときは process.cwd() と同じ場所になる）。
const projectDir = path.resolve(__dirname, "..");

try {
  if (process.platform === "win32") {
    // フォルダ名は環境変数で PowerShell に渡す（' や [ ] を含むフォルダ名でも壊れないように）。
    // コマンドラインの区切りは \ と / のどちらもありうるので \ にそろえ、大文字小文字も区別せずに比べる。
    const ps = [
      "$dir = $env:KILL_POSTCSS_PROJECT_DIR.Replace('/', '\\').TrimEnd('\\').ToLowerInvariant() + '\\.next\\';",
      "$p = @(Get-CimInstance Win32_Process | Where-Object {",
      "  $c = ([string]$_.CommandLine).Replace('/', '\\').ToLowerInvariant();",
      "  $_.Name -eq 'node.exe' -and $c.Contains($dir) -and $c.Contains('postcss.js')",
      "});",
      "$p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue };",
      "$p.Count",
    ].join(" ");
    const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
      encoding: "utf8",
      timeout: 20000,
      env: { ...process.env, KILL_POSTCSS_PROJECT_DIR: projectDir },
    });
    const n = Number((r.stdout || "").trim());
    if (n > 0) console.log(`[predev] PostCSS の孤児プロセスを ${n} 個終了しました`);
  } else {
    // pkill -f は正規表現で探すので、フォルダ名の中の記号（. など）はそのままの文字として扱わせる
    const escaped = projectDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    spawnSync("pkill", ["-f", `${escaped}/\\.next/.*postcss\\.js`], { stdio: "ignore" });
  }
} catch {
  // 掃除に失敗しても起動は止めない
}
