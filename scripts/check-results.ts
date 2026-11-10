// 診断結果の部品（src/data/catalog/）と、組み立てた結果の点検。AIもネットも使わないので、何度流しても料金はかからない。
// 使い方: `npm run check:results`
//   ONLY=office のように部品のファイル名（talk / plan / office / create / care / field）を付けると、その仕事のタイプだけ点検する。
//   SAMPLES=50000 で、ためしに組み立てる回答の数を変えられる（既定 20000）。
// 1. 部品そのものの点検（数・文字数・書き方・書いてはいけない言葉・回答IDの書き間違い）
// 2. でたらめに作った回答で結果を組み立て、決まりごと（3件・顕在型2/潜在型1・引用・時間の制約・六角形・診断番号）を点検
// 3. テスト用4人の結果を .persona-results/ に保存し、要点を表示
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FAMILIES } from '@/data/catalog'
import type { Family, Job } from '@/data/catalog/types'
import { activeQuestions, DETAIL_BY_FAMILY, DEEP_BY_DETAIL, JOB_FAMILIES, optionLabel, Q, type Answers } from '@/data/questions'
import { validateAnswers } from '@/lib/answers'
import { diagnose } from '@/lib/diagnose'
import { RADAR_AXES, radarScores } from '@/lib/radar'
import { decodeResultCode, encodeResultCode } from '@/lib/result-code'
import { resultSchema, type DiagnosisResult } from '@/lib/schemas'

const FILES = ['talk', 'plan', 'office', 'create', 'care', 'field']
const ONLY = process.env.ONLY
const SAMPLES = Number(process.env.SAMPLES || 20000)
if (ONLY && !FILES.includes(ONLY)) {
  console.error(`ONLY は ${FILES.join(' / ')} のどれかにしてください（「${ONLY}」は無い）`)
  process.exit(1)
}

const errors: string[] = []
const warnings: string[] = []

// ── 書いてはいけない言葉（src/data/catalog/types.ts・docs/02-result-rules.md の「書き方の決まり」） ──
// inCautions：注意点（caution）でも見るもの。注意点は「〇〇は資格が必要です」のように説明に使う言葉が多いので、金額だけ見る
const POLICY_PATTERNS: { re: RegExp; why: string; inCautions: boolean }[] = [
  {
    re: /\d[\d,.]*\s*(万|千|百)?円|[〇一二三四五六七八九十百千万億]*[十百千万億]円|数[十百千万]+円|月収|年収\s*\d|時給\s*\d|日給|月\s*\d+\s*万|\d+\s*万\s*(稼|以上|超|アップ)|\d+\s*ドル|\$\s*\d/,
    why: '金額',
    inCautions: true,
  },
  {
    re: /稼げ|稼ぐ|儲か|儲け|確実に|誰でも|必ず(稼|儲|成功|収入)|不労所得|高収入|楽して/,
    why: '誇大な表現',
    inCautions: false,
  },
  {
    re: /申請.{0,6}代行|代行.{0,4}申請|(補助金|助成金).{0,8}(申請書|代行)|確定申告.{0,4}(代行|作成)|税務(申告|代理|相談)|社会保険.{0,6}代行|労務手続き.{0,4}代行|登記|法律相談|契約書.{0,4}(作成代行|リーガルチェック|審査)|投資の?助言|銘柄|金融商品.{0,4}(勧誘|販売)|職業紹介|人材紹介|転職.{0,3}(斡旋|あっせん)|医療行為|診断・治療|保険.{0,2}(募集|販売)|不動産.{0,2}仲介|旅行.{0,2}手配/,
    why: '資格や許可が必要な仕事',
    inCautions: false,
  },
  { re: /情報商材|ネットワークビジネス|マルチ商法|アフィリエイト/, why: '勧めない仕事', inCautions: false },
]

function policy(where: string, text: string, isCaution = false) {
  const s = text.normalize('NFKC')
  for (const p of POLICY_PATTERNS) {
    if (isCaution && !p.inCautions) continue
    const m = s.match(p.re)
    if (m) errors.push(`${where}: 書いてはいけない言葉（${p.why}）「${m[0]}」`)
  }
}

// ── 表記：画面に出る文は「副業」ではなく「複業」（2026-10-26 にそろえた）。keywords は募集サイトで引く検索語なので見ない ──
function notation(where: string, text: string) {
  if (text.includes('副業')) errors.push(`${where}: 「副業」ではなく「複業」と書いてください`)
}

// ── 1. 部品の点検 ──

/** 回答の根拠に使える選択肢ID（q2〜q6。「特にない」系は除く） */
const EVIDENCE_IDS = new Set(
  [Q.q2, Q.q3, Q.q4, Q.q5, Q.q6].flatMap(q => q.options.filter(o => o.id !== q.noneId).map(o => o.id)),
)
const HIDDEN_KEYS = ['q6.1', 'q6.2', 'q6.3', 'q6.4', 'q6.5'] as const

const len = (s: string) => [...s].length

function checkText(where: string, value: unknown, max: number, opts: { end?: string | RegExp; noEnd?: string; warnOver?: number } = {}) {
  if (typeof value !== 'string' || value.trim() === '') return void errors.push(`${where}: 空です`)
  if (len(value) > max) errors.push(`${where}: ${len(value)}字（${max}字まで）「${value}」`)
  else if (opts.warnOver && len(value) > opts.warnOver) warnings.push(`${where}: ${len(value)}字（目安は${opts.warnOver}字まで）`)
  if (typeof opts.end === 'string' && !value.endsWith(opts.end)) errors.push(`${where}: 「${opts.end}」で終えてください「${value}」`)
  if (opts.end instanceof RegExp && !opts.end.test(value)) errors.push(`${where}: 終わり方が決まりと違います「${value}」`)
  if (opts.noEnd && value.endsWith(opts.noEnd)) errors.push(`${where}: 「${opts.noEnd}」で終えないでください`)
  if (/[{}]/.test(value)) errors.push(`${where}: { } が残っています`)
}

function checkTag(where: string, tag: unknown) {
  if (typeof tag !== 'string' || !/^#[^#\s]+$/.test(tag)) return void errors.push(`${where}: タグは # から始め、空白を入れない「${tag}」`)
  if (len(tag) - 1 > 12) errors.push(`${where}: タグが長い（${len(tag) - 1}字・12字まで）「${tag}」`)
}

function checkJob(where: string, job: Job, kind: 'kenzai' | 'hidden' | 'extension') {
  checkText(`${where} title`, job.title, 32, { warnOver: 25 })
  if (!Array.isArray(job.tags) || job.tags.length < 2 || job.tags.length > 3) errors.push(`${where}: tags は2〜3個`)
  job.tags?.forEach((t, i) => checkTag(`${where} tags[${i}]`, t))
  if (new Set(job.tags).size !== job.tags?.length) errors.push(`${where}: tags が重なっています`)
  checkText(`${where} what`, job.what, 130, { end: '。', warnOver: 90 })
  checkText(`${where} who`, job.who, 60, { noEnd: '。' })
  checkText(`${where} because`, job.because, 70, { end: 'ます。' })
  // 画面では前に「〜ので、」が付くので、「〜ので、〜ので、」と重ならないように
  if (/ので|から[、。]/.test(job.because ?? '')) errors.push(`${where} because: 「ので」「から」を入れないでください（前に「〜ので、」が付きます）「${job.because}」`)
  checkText(`${where} niche`, job.niche, 80, { end: 'からです。' })
  checkText(`${where} step`, job.step, 70, { end: '。' })
  if (!Array.isArray(job.keywords) || job.keywords.length < 2 || job.keywords.length > 3) errors.push(`${where}: keywords は2〜3個`)
  job.keywords?.forEach((k, i) => checkText(`${where} keywords[${i}]`, k, 20))
  if (!['単発納品', '月額継続', '時間単価', '成果報酬'].includes(job.contract)) errors.push(`${where}: contract が決まりの値ではない「${job.contract}」`)
  if (!['◎ 案件多数', '○ 案件あり', '△ 案件少なめ'].includes(job.market)) errors.push(`${where}: market が決まりの値ではない「${job.market}」`)
  if (job.stage !== 'front' && job.stage !== 'back') errors.push(`${where}: stage は front か back`)
  if (job.target !== 'b' && job.target !== 'c') errors.push(`${where}: target は b か c`)
  if (!Array.isArray(job.evidence) || job.evidence.length < 2 || job.evidence.length > 5) errors.push(`${where}: evidence は2〜5個`)
  for (const id of job.evidence ?? []) {
    if (!EVIDENCE_IDS.has(id)) errors.push(`${where}: evidence に使えないID「${id}」（q2〜q6 の選択肢IDだけ。「特にない」系は不可）`)
  }
  if (new Set(job.evidence).size !== job.evidence?.length) errors.push(`${where}: evidence が重なっています`)
  if (kind === 'kenzai') {
    if (!job.deep?.length) errors.push(`${where}: 顕在型には deep（1〜4）を1つ以上`)
    if (job.details) errors.push(`${where}: details は潜在型だけ`)
  } else {
    if (job.deep) errors.push(`${where}: deep は顕在型だけ`)
    if (kind === 'extension' && job.details) errors.push(`${where}: 本業の延長（extension）に details は付けない`)
  }
  for (const n of job.deep ?? []) if (![1, 2, 3, 4].includes(n)) errors.push(`${where}: deep は1〜4「${n}」`)
  for (const n of job.details ?? []) if (![1, 2, 3, 4].includes(n)) errors.push(`${where}: details は1〜4「${n}」`)
  if (job.caution !== undefined) checkText(`${where} caution`, job.caution, 100, { end: '。' })
  for (const [field, text] of Object.entries({ title: job.title, what: job.what, who: job.who, because: job.because, niche: job.niche, step: job.step, tags: job.tags?.join(' '), keywords: job.keywords?.join(' ') })) {
    if (typeof text !== 'string') continue
    policy(`${where} ${field}`, text)
    if (field !== 'keywords') notation(`${where} ${field}`, text)
  }
  if (job.caution) {
    policy(`${where} caution`, job.caution, true)
    notation(`${where} caution`, job.caution)
  }
}

function checkFamily(family: Family, index: number) {
  const name = FILES[index]
  const spec = JOB_FAMILIES[index]
  if (family.label !== spec.label) errors.push(`${name}: label が questions.ts と違う「${family.label}」`)
  // 数が違っても、書いてある分は点検する（書きかけの途中でも確かめられるように）
  if (family.details.length !== spec.details.length) errors.push(`${name}: details が${family.details.length}つ（${spec.details.length}つのはず）`)
  const ids = new Set<string>()
  const titles = new Map<string, string>()
  const detailTags = new Set(family.details.flatMap(d => [...d.tags, ...d.deep.map(x => x.tag)]))
  const seen = (where: string, job: Job) => {
    if (ids.has(job.id)) errors.push(`${where}: id「${job.id}」が重なっています`)
    ids.add(job.id)
    if (titles.has(job.title)) errors.push(`${where}: 職種名「${job.title}」が ${titles.get(job.title)} と重なっています`)
    titles.set(job.title, where)
  }

  family.details.forEach((d, j) => {
    const where = `${name} ${d.label}`
    if (d.label !== spec.details[j]?.label) errors.push(`${where}: label が questions.ts と違う（${spec.details[j]?.label ?? '（無い）'} のはず）`)
    checkText(`${where} role`, d.role, 10)
    if (d.tags.length < 2 || d.tags.length > 3) errors.push(`${where}: tags は2〜3個`)
    d.tags.forEach((t, i) => checkTag(`${where} tags[${i}]`, t))
    checkText(`${where} know`, d.know, 20)
    checkText(`${where} field.b`, d.field?.b, 20)
    checkText(`${where} field.c`, d.field?.c, 20)
    if (d.lean !== 'b' && d.lean !== 'c') errors.push(`${where}: lean は b か c`)
    checkText(`${where} growth`, d.growth, 80, { end: '。' })
    if (d.caution !== undefined) checkText(`${where} caution`, d.caution, 100, { end: '。' })
    if (d.caution) policy(`${where} caution`, d.caution, true)
    policy(`${where} growth`, d.growth)
    // 二つ名・強み・市場の名前として画面に出る言葉も見る
    const names = [d.role, d.know, d.field?.b, d.field?.c, ...d.tags, ...d.deep.flatMap(x => [x.tag, x.know])].join(' ')
    policy(`${where} role/know/field/tags`, names)
    notation(`${where} caution/growth/role/know/field/tags`, [d.caution ?? '', d.growth, names].join(' '))
    if (d.deep.length !== 4) errors.push(`${where}: deep は4つ（STEP5 の選択肢と同じ数）`)
    d.deep.forEach((x, k) => {
      checkTag(`${where} deep[${k}].tag`, x.tag)
      checkText(`${where} deep[${k}].know`, x.know, 20)
    })
    // 2026-11-11 に案件の少ない仕事（△）を外したので、数はそろっていない。2つに満たないときは、同じタイプのほかの仕事の内容から補う（diagnose.ts）
    if (d.jobs.length < 1) errors.push(`${where}: 顕在型（jobs）が0つ（1つ以上いる）`)
    else if (d.jobs.length < 2) warnings.push(`${where}: 顕在型（jobs）が${d.jobs.length}つ（足りない分は、同じタイプのほかの仕事の内容から補う）`)
    if (d.jobs.filter(job => job.regular).length > 2) errors.push(`${where}: regular（毎週の定例が要る仕事）が3つ以上あります（2つまで）`)
    if (!d.jobs.some(job => job.contract === '月額継続' && !job.regular)) {
      warnings.push(`${where}: 毎週の定例が要らない月額継続の仕事がありません（週3時間未満で「将来の独立に備えたい」人に、月額継続を出せないことがあります）`)
    }
    for (let k = 1; k <= 4; k++) {
      if (!d.jobs.some(job => job.deep?.includes(k))) warnings.push(`${where}: STEP5 の答え${k}「${spec.details[j]?.deep.options[k - 1]}」に合う仕事（deep に ${k}）がありません`)
      else if (!d.jobs.some(job => job.deep?.includes(k) && !job.regular)) {
        warnings.push(`${where}: STEP5 の答え${k}「${spec.details[j]?.deep.options[k - 1]}」に合う仕事が、毎週の定例が要る仕事だけです（週3時間未満の人には上位に出せません）`)
      }
    }
    d.jobs.forEach((job, k) => {
      const w = `${where} jobs[${k}](${job.id})`
      seen(w, job)
      checkJob(w, job, 'kenzai')
    })
  })

  for (const key of HIDDEN_KEYS) {
    const jobs = family.hidden[key] ?? []
    const where = `${name} hidden['${key}']（${optionLabel(key)}）`
    if (jobs.length > 3) errors.push(`${where}: ${jobs.length}つ（3つまで）`)
    if (jobs.length === 0) warnings.push(`${where}: 0つ（この経験を選んだ人には、本業の延長（extension）から出す）`)
    if (jobs.filter(job => !job.details).length < 1 && jobs.length > 0) {
      warnings.push(`${where}: 3つとも details 付き（どの仕事の内容の人にも合うものを1つ以上入れると安心）`)
    }
    jobs.forEach((job, k) => {
      const w = `${where}[${k}](${job.id})`
      seen(w, job)
      checkJob(w, job, 'hidden')
      if (detailTags.has(job.tags[0])) errors.push(`${w}: 1つ目のタグ「${job.tags[0]}」が本業のタグと同じ（潜在型の1つ目は「仕事の外の経験」側のタグ）`)
    })
  }
  if (family.extension.length < 1) errors.push(`${name} extension: 0つ（1つ以上いる）`)
  family.extension.forEach((job, k) => {
    const w = `${name} extension[${k}](${job.id})`
    seen(w, job)
    checkJob(w, job, 'extension')
    if (detailTags.has(job.tags[0])) errors.push(`${w}: 1つ目のタグ「${job.tags[0]}」が本業のタグと同じ（潜在型の1つ目は、本業の延長で身についた強みのタグ）`)
  })
}

if (FAMILIES.length !== JOB_FAMILIES.length) errors.push(`catalog/index.ts: 仕事のタイプが${FAMILIES.length}つ（${JOB_FAMILIES.length}つのはず）`)
const targets = FAMILIES.map((f, i) => ({ f, i })).filter(({ i }) => !ONLY || FILES[i] === ONLY)
for (const { f, i } of targets) checkFamily(f, i)

const ready = targets.filter(({ f }) => f.details.length === 4 && f.details.every(d => d.jobs.length >= 1) && f.extension.length >= 1)

// ── 2. 組み立てた結果の点検 ──

/** 決まった順で同じ乱数を出す（点検の結果が毎回同じになるように） */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = random(20261024)
const pickOne = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)]

function randomAnswers(familyIndex: number): Answers {
  const a: Answers = { q1: [Q.q1.options[familyIndex].id] }
  // 前の答えで次の設問が決まる（1-2 → STEP5）ので、出てくる設問が増えなくなるまで繰り返す
  for (let round = 0; round < 3; round++) {
    for (const q of activeQuestions(a)) {
      if (a[q.id] !== undefined) continue
      if (q.kind === 'slider') {
        a[q.id] = pickOne([-2, -1, 0, 1, 2])
        continue
      }
      const real = q.options.filter(o => o.id !== q.noneId)
      if (q.noneId && rnd() < 0.15) {
        a[q.id] = [q.noneId]
        continue
      }
      const count = q.max === 1 ? 1 : 1 + Math.floor(rnd() * Math.min(q.max ?? 2, 2))
      const chosen = new Set<string>()
      while (chosen.size < count) chosen.add(pickOne(real).id)
      a[q.id] = [...chosen]
    }
  }
  return a
}

const jobsOf = (f: Family) => [...f.details.flatMap(d => d.jobs), ...Object.values(f.hidden).flat(), ...f.extension]
/** 職種名から部品を引く表。職種名が重ならないのは仕事のタイプの中だけなので、タイプごとに持つ */
const jobByTitle = FAMILIES.map(f => new Map(jobsOf(f).map(j => [j.title, j])))
/** 選ばれた回数（キーは「仕事のタイプの番号:職種名」） */
const usage = new Map<string, number>()
const problemCount = new Map<string, number>()
const problemExample = new Map<string, string>()
/** 合う複業の方向ごとの人数（6通りが、ほどよく散らばっているかを見る） */
const directionCount = new Map<string, number>()

/** 独立の決まりは、月額継続の仕事が無い仕事の内容では守れないことがあるので、「注意」にとどめる */
const INDEPENDENCE_ISSUE = '将来の独立に備えたい人なのに、月額継続の仕事が無い'

function inspect(r: DiagnosisResult, a: Answers): string[] {
  const issues: string[] = []
  const parsed = resultSchema.safeParse(r)
  if (!parsed.success) issues.push(`形が崩れている（${parsed.error.issues.slice(0, 2).map(i => `${i.path.join('.')}: ${i.message}`).join(' / ')}）`)
  const kenzai = r.recommendations.filter(x => x.layer === '顕在型').length
  if (kenzai !== 2) issues.push(`顕在型が${kenzai}件（2件のはず）`)
  if (new Set(r.recommendations.map(x => x.job_title)).size !== 3) issues.push('同じ仕事が2回出ている')
  const short = (a.q7_2 as string[])[0] === Q.q7_2.options[0].id
  const familyIndex = Q.q1.options.findIndex(o => o.id === (a.q1 as string[])[0])
  /** その人が選んだ回答の言葉（理由の引用は、この中の言葉だけのはず） */
  const chosen = new Set(Object.values(a).flatMap(v => (Array.isArray(v) ? v.map(id => optionLabel(id) ?? '') : [])))
  for (const rec of r.recommendations) {
    const quotes = [...rec.why_you.matchAll(/「([^」]+)」/g)].map(m => m[1])
    if (quotes.length < 2) issues.push(`理由の引用が${quotes.length}個`)
    for (const q of quotes) if (!chosen.has(q)) issues.push(`理由の引用が、選んだ回答の言葉ではない「${q}」`)
    if (rec.layer === '潜在型' && !rec.combo.some(t => r.skill_map.senzai.includes(t))) issues.push('潜在型に潜在型のタグがない')
    if (short && jobByTitle[familyIndex]?.get(rec.job_title)?.regular) issues.push('週3時間未満なのに、毎週の定例が要る仕事が出ている')
  }
  const independence = (a.q7_1 as string[]).includes(Q.q7_1.options[2].id)
  if (independence && !r.recommendations.some(x => x.contract_style === '月額継続')) issues.push(INDEPENDENCE_ISSUE)
  // 六角形：並びが RADAR_AXES と同じか。途中経過で見せた力が、あとの答えで変わらないか
  // （それぞれの力を、見せる STEP までの設問だけで組み立て直して、最後の値と比べる）
  if (r.radar.map(p => p.id).join() !== RADAR_AXES.map(x => x.id).join()) issues.push('六角形の並びが RADAR_AXES と違う')
  const stepOf = new Map(activeQuestions(a).map(q => [q.id, q.step]))
  for (const axis of RADAR_AXES) {
    const partial = Object.fromEntries(Object.entries(a).filter(([id]) => (stepOf.get(id) ?? 9) <= axis.step))
    const early = radarScores(partial).find(p => p.id === axis.id)?.value
    const final = r.radar.find(p => p.id === axis.id)?.value
    if (early !== final) issues.push(`六角形の「${axis.label}」が、途中経過（STEP${axis.step}の後）と結果で違う`)
  }
  // 診断番号：番号にして戻すと、元の回答（選んだ順も）とそっくり同じになるか。講師用のページで同じ結果を作り直せることの確かめ
  const decoded = decodeResultCode(encodeResultCode(a))
  if (!decoded.ok) issues.push(`診断番号から回答に戻せない（${decoded.error}）`)
  else if (JSON.stringify(decoded.answers) !== JSON.stringify(a)) issues.push('診断番号から戻した回答が、元の回答と違う')
  const text = [r.nickname, r.nickname_reason, r.summary, r.market.domain_name, r.market.comment, r.direction.name, r.direction.text].join('\n')
  if (/undefined|null|\{x\}/.test(text) || /undefined/.test(JSON.stringify(r))) issues.push('文面に undefined などが混じっている')
  // 組み立てた文（diagnose.ts が足す言い回しも含む）。結果には keywords が入らないので、まるごと見てよい
  if (JSON.stringify(r).includes('副業')) issues.push('文面に「副業」が混じっている（「複業」と書く）')
  return issues
}

let built = 0
if (ready.length > 0) {
  for (let n = 0; n < SAMPLES; n++) {
    const { i } = pickOne(ready)
    const raw = randomAnswers(i)
    const checked = validateAnswers(raw)
    if (!checked.ok) {
      errors.push(`点検用の回答が通らない: ${checked.error}`)
      break
    }
    let r: DiagnosisResult
    try {
      r = diagnose(checked.value)
    } catch (e) {
      errors.push(`結果を組み立てられない: ${e instanceof Error ? e.message : e}（${JSON.stringify(raw)}）`)
      break
    }
    built++
    directionCount.set(r.direction.name, (directionCount.get(r.direction.name) ?? 0) + 1)
    for (const rec of r.recommendations) usage.set(`${i}:${rec.job_title}`, (usage.get(`${i}:${rec.job_title}`) ?? 0) + 1)
    for (const issue of inspect(r, checked.value)) {
      const key = issue.replace(/「[^」]*」/g, '「…」')
      problemCount.set(key, (problemCount.get(key) ?? 0) + 1)
      if (!problemExample.has(key)) problemExample.set(key, `${issue}（${JSON.stringify(raw)}）`)
    }
  }
  for (const [key, count] of problemCount) {
    const line = `結果の点検 ${count}/${built}件: ${problemExample.get(key)}`
    // 注意は60件までしか表示しないので、独立の決まりの注意はほかの注意に押し出されないよう先頭に置く
    if (key === INDEPENDENCE_ISSUE) warnings.unshift(line)
    else errors.push(line)
  }
  for (const { f, i } of ready) {
    for (const job of jobsOf(f)) {
      if (!usage.has(`${i}:${job.title}`)) warnings.push(`${built}通りの回答で、一度も選ばれなかった仕事: ${f.label} の「${job.title}」`)
    }
  }
}

// ── 3. テスト用4人 ──

const PERSONAS: { name: string; answers: Record<string, string[] | number> }[] = [
  {
    name: 'A：人事・採用の子育て中リーダー',
    answers: {
      q1: ['組織を支える仕事（人事・経理・総務・公務員）'], q1_2: ['人事・採用'], q9: ['求人票・採用広報'],
      q2: ['人を育てる・教える'], q3: ['相談に乗る・話を聞く', '資料や文章を整える'], q4: ['人が成長したとき'],
      q5: ['子ども・学生・若手', '会社の担当者・社員'], q6: ['子育て・介護と仕事の両立', '地域活動・PTA・ボランティア'],
      q7_1: ['スキルや経験を広げたい'], q7_2: ['3〜5時間'], q8_1: -1, q8_2: 1, q8_3: 1,
    },
  },
  {
    name: 'B：法人営業の管理職で、Xで発信している',
    answers: {
      q1: ['人と話す仕事（営業・接客・サポート）'], q1_2: ['法人営業'], q9: ['提案書・見積もりづくり'],
      q2: ['チームをまとめる・引っぱる'], q3: ['資料や文章を整える', '教える・やり方を伝える'], q4: ['目標を達成したとき'],
      q5: ['会社の経営者・社長', '会社の担当者・社員'], q6: ['SNSやブログでの発信'],
      q7_1: ['収入を増やしたい'], q7_2: ['5〜10時間'], q8_1: -2, q8_2: -1, q8_3: 1,
    },
  },
  {
    name: 'C：地方で介護と両立している経理担当（週3時間未満）',
    answers: {
      q1: ['組織を支える仕事（人事・経理・総務・公務員）'], q1_2: ['経理・財務'], q9: ['経理の仕組み・ツールの導入'],
      q2: ['仕組みを整える・効率よくする'], q3: ['数字やデータをまとめる', 'パソコン・ITツールのこと'], q4: ['仕組みがうまく回ったとき'],
      q5: ['会社の担当者・社員'], q6: ['子育て・介護と仕事の両立'],
      q7_1: ['社会や地域の役に立ちたい'], q7_2: ['3時間未満'], q8_1: -1, q8_2: 2, q8_3: -1,
    },
  },
  {
    name: 'D：回答が少ない人（「特にない」が多い）',
    answers: {
      q1: ['組織を支える仕事（人事・経理・総務・公務員）'], q1_2: ['総務・事務'], q9: ['どれも当てはまらない'],
      q2: ['お客様と信頼関係を築く'], q3: ['特にない・わからない'], q4: ['人から感謝されたとき'],
      q5: ['会社の担当者・社員'], q6: ['特にない'],
      q7_1: ['収入を増やしたい'], q7_2: ['3時間未満'], q8_1: 0, q8_2: 0, q8_3: 0,
    },
  },
]

/** 文言で書いたテスト回答を、画面が保存するのと同じIDの形にする（q1_2・q9 は、前の答えで決まる設問に置き換える） */
function toIds(src: Record<string, string[] | number>): Answers {
  const out: Answers = {}
  const ids = (q: { no: string; options: { id: string; label: string }[] }, labels: string[]) =>
    labels.map(l => {
      const o = q.options.find(x => x.label === l)
      if (!o) throw new Error(`${q.no} に「${l}」という選択肢がありません`)
      return o.id
    })
  for (const [key, value] of Object.entries(src)) {
    if (typeof value === 'number') out[key] = value
    else if (key === 'q1_2') {
      const q = DETAIL_BY_FAMILY[ids(Q.q1, src.q1 as string[])[0]]
      out[q.id] = ids(q, value)
    } else if (key === 'q9') {
      const detail = DETAIL_BY_FAMILY[ids(Q.q1, src.q1 as string[])[0]]
      const q = DEEP_BY_DETAIL[ids(detail, src.q1_2 as string[])[0]]
      out[q.id] = ids(q, value)
    } else out[key] = ids(Q[key as keyof typeof Q], value)
  }
  return out
}

const OUT = join(process.cwd(), '.persona-results')
const personaReady = new Set(ready.map(({ i }) => JOB_FAMILIES[i].label))
const personas = PERSONAS.filter(p => personaReady.has((p.answers.q1 as string[])[0]))
if (personas.length > 0) {
  mkdirSync(OUT, { recursive: true })
  console.log('━━ テスト用の人の結果（全文は .persona-results/）')
}
for (const [n, p] of personas.entries()) {
  const checked = validateAnswers(toIds(p.answers))
  if (!checked.ok) {
    errors.push(`テスト用 ${p.name}: 回答が通らない（${checked.error}）`)
    continue
  }
  const r = diagnose(checked.value)
  writeFileSync(join(OUT, `${String.fromCharCode(65 + n)}.json`), JSON.stringify({ name: p.name, result: r }, null, 2))
  console.log(`\n${p.name}`)
  console.log(`  二つ名「${r.nickname}」 confidence=${r.confidence}`)
  console.log(`  タグ: ${r.strength_tags.join(' ')}`)
  console.log(`  3層: 本業 ${r.skill_map.hongyo.join(' ')} ／ 顕在型 ${r.skill_map.kenzai.join(' ')} ／ 潜在型 ${r.skill_map.senzai.join(' ')}`)
  console.log(`  6つの力: ${r.radar.map(p => `${p.label}${p.value}`).join(' ')} → 方向「${r.direction.name}」`)
  for (const rec of r.recommendations) {
    console.log(`  No.${rec.rank} [${rec.layer}] ${rec.job_title}  ${rec.combo.join('×')}  活用${rec.fit} ${rec.market_need} ${rec.contract_style}`)
    console.log(`       理由: ${rec.why_you}`)
  }
  if (r.cautions.length > 0) console.log(`  注意: ${r.cautions.join(' / ')}`)
  for (const issue of inspect(r, checked.value)) errors.push(`テスト用 ${p.name}: ${issue}`)
}

// ── まとめ ──

console.log()
if (ready.length < targets.length) {
  const waiting = targets.filter(t => !ready.includes(t)).map(({ i }) => FILES[i])
  console.log(`部品がまだ揃っていないので、結果の組み立ては飛ばした: ${waiting.join(', ')}`)
}
console.log(`組み立てた結果: ${built}通り（${ready.map(({ i }) => FILES[i]).join(', ') || 'なし'}）`)
if (built > 0) {
  const spread = [...directionCount].sort((x, y) => y[1] - x[1]).map(([name, n]) => `${name} ${Math.round((n / built) * 100)}%`)
  console.log(`合う複業の方向: ${spread.join(' ／ ')}`)
}
if (warnings.length > 0) {
  console.log(`\n注意 ${warnings.length}件（直さなくても動くが、見直すとよい）`)
  for (const w of warnings.slice(0, 60)) console.log(`  - ${w}`)
  if (warnings.length > 60) console.log(`  …ほか${warnings.length - 60}件`)
}
if (errors.length > 0) {
  console.log(`\n直すところ ${errors.length}件`)
  for (const e of errors.slice(0, 120)) console.log(`  ✗ ${e}`)
  if (errors.length > 120) console.log(`  …ほか${errors.length - 120}件`)
  process.exit(1)
}
console.log('\n点検: 問題なし')
