// テスト用の回答で、開発サーバーの診断を実際に通して点検する。
// 使い方: 開発サーバーを起動した状態で `npm run test:personas`
//   BASE_URL（既定 http://localhost:3000）・ONLY（例: A）で対象を絞れる。
//   手元（localhost / 127.0.0.1）以外に向けるときは CONFIRM_REMOTE=1 も付ける（付けないと止まる）。
// AI を1人あたり2回（深掘り・診断）呼ぶので、料金が少しかかる。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DETAIL_BY_FAMILY, Q } from '../src/data/questions.ts'
import { PERSONAS } from './test-personas.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

// 本番などに向けて誤って流すと、AIの料金がかかるうえ、本番の回数制限（同じ場所から1時間に数回まで）も
// 使い切ってしまう。手元のサーバー以外に向けるときは、CONFIRM_REMOTE=1 を付けたときだけ動かす。
{
  let host = null
  try {
    host = new URL(BASE).hostname
  } catch {
    console.error(`[test:personas] BASE_URL「${BASE}」は正しいURLではありません（例: http://localhost:3000）`)
    process.exit(1)
  }
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(host)
  if (!isLocal && process.env.CONFIRM_REMOTE !== '1') {
    console.error(`[test:personas] 宛先が手元のサーバーではないので止めました: ${BASE}`)
    console.error('  このテストはAIを何度も呼ぶので料金がかかり、宛先のサイトの回数制限も使ってしまいます。')
    console.error('  本当にこの宛先で実行するときだけ、CONFIRM_REMOTE=1 を付けてください。')
    console.error('    PowerShell の場合: $env:CONFIRM_REMOTE=1; npm run test:personas')
    console.error('    bash の場合:       CONFIRM_REMOTE=1 npm run test:personas')
    process.exit(1)
  }
}

const OUT = join(process.cwd(), '.persona-results')
mkdirSync(OUT, { recursive: true })

function idsFor(question, labels) {
  return labels.map(label => {
    const opt = question.options.find(o => o.label === label)
    if (!opt) throw new Error(`${question.no} に「${label}」という選択肢がありません`)
    return opt.id
  })
}

/** 文言で書いたテスト回答を、画面が送るのと同じIDの形にする */
function toAnswers(src) {
  const out = {}
  for (const [key, value] of Object.entries(src)) {
    if (typeof value === 'number') out[key] = value
    else if (key === 'q1_2') {
      const familyId = idsFor(Q.q1, src.q1)[0]
      const q = DETAIL_BY_FAMILY[familyId]
      out[q.id] = idsFor(q, value)
    } else out[key] = idsFor(Q[key], value)
  }
  return out
}

async function post(path, body) {
  const started = Date.now()
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json, sec: ((Date.now() - started) / 1000).toFixed(1) }
}

const BANNED = [/\d[\d,]*\s*(万円|円)|月収|時給\s*\d|年収/, /稼げ|確実に|誰でも簡単/, /申請書の作成代行|(補助金|助成金)(申請)?の?代行|確定申告の?代行|税務(申告|代理)|社会保険の?手続き代行/]

function inspect(result) {
  const problems = []
  const recs = result.recommendations
  if (recs.length !== 5) problems.push(`提案が${recs.length}件`)
  const kenzai = recs.filter(r => r.layer === '顕在型').length
  if (kenzai !== 3) problems.push(`顕在型が${kenzai}件（3件のはず）`)
  for (const r of recs) {
    const quotes = (r.why_you.match(/「[^」]+」/g) || []).length
    if (quotes < 2) problems.push(`No.${r.rank} の理由の引用が${quotes}個`)
    if (r.combo.length < 2) problems.push(`No.${r.rank} が掛け合わせになっていない`)
    if (r.job_title.length > 30) problems.push(`No.${r.rank} の職種名が長い（${r.job_title.length}字）`)
  }
  for (const r of recs.filter(r => r.layer === '潜在型')) {
    if (!r.combo.some(t => result.skill_map.senzai.includes(t))) problems.push(`No.${r.rank}（潜在型）に潜在型のタグが入っていない`)
  }
  const text = JSON.stringify({ ...result, cautions: [] })
  for (const re of BANNED) {
    const m = text.match(re)
    if (m) problems.push(`禁止の言葉: ${m[0]}`)
  }
  return problems
}

// ── 不正な回答がはじかれるか ──
{
  const a = toAnswers(PERSONAS[0].answers)
  const bad1 = { ...a, q3: ['q3.999'] }
  const bad2 = { ...a, q3: ['q3.1', 'q3.2', 'q3.3'] }
  const bad3 = { ...a, q6: [Q.q6.options[0].id, Q.q6.noneId] }
  const r1 = await post('/api/diagnose', { answers: bad1 })
  const r2 = await post('/api/diagnose', { answers: bad2 })
  const r3 = await post('/api/diagnose', { answers: bad3 })
  const r4 = await post('/api/diagnose', { answers: a, followUps: [{ question: 'あ'.repeat(200), options: ['a', 'b', 'c', 'd'], answer: 'a' }] })
  console.log('【不正な回答のはじき方】')
  console.log(`  選択肢にないID   → ${r1.status} ${r1.json.error ?? ''}`)
  console.log(`  上限を超える数   → ${r2.status} ${r2.json.error ?? ''}`)
  console.log(`  特にない＋他     → ${r3.status} ${r3.json.error ?? ''}`)
  console.log(`  長すぎる深掘り   → ${r4.status} ${r4.json.error ?? ''}`)
  console.log()
}

const only = process.env.ONLY
for (const [i, p] of PERSONAS.entries()) {
  const letter = String.fromCharCode(65 + i)
  if (only && !only.includes(letter)) continue
  const answers = toAnswers(p.answers)
  console.log(`━━ ${p.name}`)

  const fu = await post('/api/followup', { answers })
  const questions = fu.json.questions ?? []
  console.log(`  深掘り（${fu.sec}秒・${fu.status}）: ${questions.length}問${fu.json.skipped ? `（${fu.json.skipped}）` : ''}`)
  // 深掘りは、それぞれ最初の選択肢を選んだことにする（署名 sig もそのまま返す。無いと診断で深掘りが省かれる）
  const followUps = questions.map(q => ({ question: q.question, options: q.options, sig: q.sig, answer: q.options[0] }))
  for (const f of followUps) console.log(`    Q: ${f.question}\n       [${f.options.join(' / ')}] → ${f.answer}`)

  const dg = await post('/api/diagnose', { answers, followUps })
  writeFileSync(join(OUT, `${letter}.json`), JSON.stringify({ name: p.name, followUps, response: dg.json }, null, 2))
  if (!dg.json.result) {
    console.log(`  診断（${dg.sec}秒）: 失敗 ${dg.status} ${dg.json.error ?? ''}`)
    continue
  }
  const r = dg.json.result
  console.log(`  診断（${dg.sec}秒）: 二つ名「${r.nickname}」 confidence=${r.confidence}`)
  console.log(`  タグ: ${r.strength_tags.join(' ')}`)
  console.log(`  3層: 本業 ${r.skill_map.hongyo.join(' ')} ／ 顕在型 ${r.skill_map.kenzai.join(' ')} ／ 潜在型 ${r.skill_map.senzai.join(' ')}`)
  console.log(`  市場: ${r.market.domain_name}（${r.market.axes.map(a => `${a.left}↔${a.right}:${a.position}`).join(', ')}）`)
  for (const rec of r.recommendations) {
    console.log(`  No.${rec.rank} [${rec.layer}] ${rec.job_title}  ${rec.combo.join('×')}  活用${rec.fit} ${rec.market_need} ${rec.contract_style}`)
  }
  const problems = inspect(r)
  console.log(problems.length ? `  ⚠ 点検: ${problems.join(' / ')}` : '  点検: 問題なし')
  console.log(`  見るポイント: ${p.check}`)
  console.log()
}
console.log(`結果の全文: ${OUT}`)
