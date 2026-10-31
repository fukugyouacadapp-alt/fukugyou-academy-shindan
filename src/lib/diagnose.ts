import { FAMILIES } from '@/data/catalog'
import type { Job } from '@/data/catalog/types'
import {
  byLabel, deepCite, deepQuestion, detailQuestion, idOf, optionLabel, pickMarketAxes, Q,
  type Answers, type ChoiceQuestion,
} from '@/data/questions'
import { directionOf, radarScores } from '@/lib/radar'
import type { DiagnosisResult, Recommendation } from '@/lib/schemas'

/**
 * 診断結果の組み立て（AIは使わない）。
 * 用意した部品（src/data/catalog/）から、回答に合う仕事を点数で選び、
 * 文面は選んだ回答の言葉を「」で引用しながら組み立てる。ブラウザの中だけで動き、回答はどこにも送らない。
 * 決まりごと（docs/02-result-rules.md）：顕在型2つ・潜在型1つの3件／理由は回答の引用2つ以上／
 * 使える時間が週3時間未満なら毎週の定例が要る仕事を出さない／「将来の独立に備えたい」なら月額継続を1つ以上
 */

const SHORT_TIME = idOf(Q.q7_2, '3時間未満')
const GOAL = {
  income: idOf(Q.q7_1, '収入を増やしたい'),
  independence: idOf(Q.q7_1, '将来の独立に備えたい'),
  favorite: idOf(Q.q7_1, '好きなことを仕事にしたい'),
  social: idOf(Q.q7_1, '社会や地域の役に立ちたい'),
}
/** 「好きなことを仕事にしたい」人に、潜在型で先に出す経験（発信・趣味） */
const FAVORITE_EXPERIENCES = new Set([idOf(Q.q6, 'SNSやブログでの発信'), idOf(Q.q6, '趣味・スポーツ・ものづくり')])

// ── 回答を引用する言い回し（「〜うえに」「〜ので」「〜ことに加えて」に続く形） ──

const CITE: Record<'q2' | 'q3' | 'q4' | 'q5', string> = {
  q2: '「{x}」ことにいちばん自信がある',
  q3: '人から「{x}」と頼まれることが多い',
  q4: '「{x}」にやる気が出る',
  q5: '仕事で「{x}」と関わることが多い',
}

const CITE_Q6 = byLabel(Q.q6, {
  '子育て・介護と仕事の両立': '「{x}」を経験している',
  '地域活動・PTA・ボランティア': '「{x}」に関わってきた',
  'SNSやブログでの発信': '「{x}」を続けてきた',
  '趣味・スポーツ・ものづくり': '「{x}」に打ち込んできた',
  '転職や病気など、大きな壁を越えた経験': '「{x}」がある',
})

/** 要約の3文目の結び。つらさを伴うこともある経験は「武器」と呼ばず、同じ立場の人に寄り添える力として書く（2026-10-28） */
const EXPERIENCE_VALUE = byLabel(Q.q6, {
  '子育て・介護と仕事の両立': '同じように両立に悩む人に寄り添える力になります',
  '転職や病気など、大きな壁を越えた経験': '同じように壁にぶつかっている人に寄り添える力になります',
})

// ── 強みの言葉（選択肢ごと） ──

/** 二つ名の前半。頼まれること（なければ、いちばん自信がある経験）から */
const NICK_Q3 = byLabel(Q.q3, {
  '相談に乗る・話を聞く': '本音を引き出す',
  '資料や文章を整える': '言葉を整える',
  '数字やデータをまとめる': '数字で語れる',
  '段取りを組む・進行役': '段取り上手な',
  '教える・やり方を伝える': 'やり方を手渡す',
  'パソコン・ITツールのこと': 'ITに強い',
})
const NICK_Q2 = byLabel(Q.q2, {
  '人を育てる・教える': '人を育てる',
  'チームをまとめる・引っぱる': 'チームを動かす',
  '新しいことを立ち上げる': 'ゼロから立ち上げる',
  '仕組みを整える・効率よくする': '仕組みを整える',
  'お客様と信頼関係を築く': '信頼を築く',
})

const PERSON_Q4 = byLabel(Q.q4, {
  '人から感謝されたとき': '人の役に立つことを大切にする人',
  '目標を達成したとき': '目標に向かって粘り強く進める人',
  '人が成長したとき': '人の成長を後押しできる人',
  '仕組みがうまく回ったとき': '仕組みで周りを楽にできる人',
  '新しいものが形になったとき': '新しいものを形にするのが好きな人',
})

/** 顕在型のタグが本業のタグと重なってしまったときの代わり */
const TAG_Q3 = byLabel(Q.q3, {
  '相談に乗る・話を聞く': '#相談対応',
  '資料や文章を整える': '#資料作成',
  '数字やデータをまとめる': '#データ集計',
  '段取りを組む・進行役': '#進行管理',
  '教える・やり方を伝える': '#マニュアル作成',
  'パソコン・ITツールのこと': '#ITツール活用',
})
const TAG_Q2 = byLabel(Q.q2, {
  '人を育てる・教える': '#人材育成',
  'チームをまとめる・引っぱる': '#チームづくり',
  '新しいことを立ち上げる': '#新規立ち上げ',
  '仕組みを整える・効率よくする': '#業務改善',
  'お客様と信頼関係を築く': '#関係づくり',
})

/** 得意な市場の説明。働き方の好みの軸ごと・寄り方（左・真ん中・右）ごと */
const AXIS_COMMENT: Record<string, Record<'left' | 'mid' | 'right', string>> = {
  q8_1: {
    left: '会社を相手にすると、あなたの仕事の経験がそのまま信頼の材料になります。',
    mid: '会社にも個人にも届けられるので、始めやすいほうから選べます。',
    right: '個人のお客様を相手にすると、あなたの人柄や経験が選ばれる理由になります。',
  },
  q8_2: {
    left: '前に立って話したり教えたりする役回りで、力が出やすいタイプです。',
    mid: '前に立つことも裏で支えることもできるので、仕事の形を選べます。',
    right: '前に立つより、そばで支える役回りで力が出ます。',
  },
  q8_3: {
    left: '1件ずつ納めて終わる仕事なら、本業と両立しながら実績を積みやすくなります。',
    mid: '単発でも継続でも受けられるので、まずは小さく試してから広げられます。',
    right: '長く伴走する仕事なら、相手との信頼が積み重なって次の依頼につながります。',
  },
}

const SHORT_TIME_CAUTION = '使える時間が少ないうちは、1回で終わる仕事を1件だけ受けて、続けられそうか確かめてから広げましょう。'

// ── 組み立て ──

const fill = (template: string, x: string) => template.replace('{x}', x)
const uniq = <T,>(list: T[]) => [...new Set(list)]
const picks = (answers: Answers, q: ChoiceQuestion) => {
  const v = answers[q.id]
  return Array.isArray(v) ? v.filter(id => id !== q.noneId) : []
}
const sliderValue = (answers: Answers, id: string) => (typeof answers[id] === 'number' ? (answers[id] as number) : 0)
const label = (id: string) => optionLabel(id) ?? ''
/** 選択肢IDの設問の部分（'q3.2' → 'q3'） */
const questionOf = (id: string) => id.slice(0, id.lastIndexOf('.'))

/** 根拠の回答ごとの重み（頼まれること＞自信・相手・経験＞やる気） */
const WEIGHT: Record<string, number> = { q2: 2, q3: 3, q4: 1, q5: 2, q6: 2 }
/** 働き方の好み1段あたりの点。好みが真ん中（0）なら、どちらの仕事にも点は動かない */
const LEAN = 0.75

type Layer = Recommendation['layer']
type Pick = { job: Job; layer: Layer; score: number; order: number; experience?: string }

/**
 * 検証済みの回答（src/lib/answers.ts の validateAnswers を通したもの）から結果をつくる。
 * 同じ回答からは、いつも同じ結果になる。
 */
export function diagnose(answers: Answers): DiagnosisResult {
  const familyIndex = Q.q1.options.findIndex(o => o.id === picks(answers, Q.q1)[0])
  const detailQ = detailQuestion(answers)
  const deepQ = deepQuestion(answers)
  const family = FAMILIES[familyIndex]
  const detailIndex = detailQ ? detailQ.options.findIndex(o => o.id === picks(answers, detailQ)[0]) : -1
  const detail = family?.details[detailIndex]
  if (!family || !detail || !detailQ || !deepQ) throw new Error('仕事のタイプ・内容が回答にありません')

  const detailLabel = label(picks(answers, detailQ)[0])
  const deepId = picks(answers, deepQ)[0] as string | undefined
  /** STEP5 の答えの番号（1〜4）。「どれも当てはまらない」なら null */
  const deepNo = deepId ? deepQ.options.findIndex(o => o.id === deepId) + 1 : null
  const deepTemplate = deepCite(deepQ.id)
  if (!deepTemplate) throw new Error(`${deepQ.no} の引用の言い回しがありません`)
  const deepClause = deepId ? fill(deepTemplate, label(deepId)) : null
  const detailClause = `「${detailLabel}」の仕事をしている`

  const q2 = picks(answers, Q.q2)[0]
  const q3 = picks(answers, Q.q3)
  const q4 = picks(answers, Q.q4)[0]
  const q6 = picks(answers, Q.q6)
  // かなえたいことは2つまで選べる。選んだものの効き目は、どれも足す
  const goals = new Set(picks(answers, Q.q7_1))
  const short = picks(answers, Q.q7_2)[0] === SHORT_TIME
  const picked = new Set([q2, ...q3, q4, ...picks(answers, Q.q5), ...q6])
  const lean = { b2c: sliderValue(answers, 'q8_1'), stage: sliderValue(answers, 'q8_2'), term: sliderValue(answers, 'q8_3') }

  function cite(id: string): string {
    const q = questionOf(id)
    if (q === 'q6') return fill(CITE_Q6[id] ?? '「{x}」の経験がある', label(id))
    return fill(CITE[q as keyof typeof CITE] ?? '「{x}」を選んだ', label(id))
  }

  /** 強み活用度の決め手（頼まれること・いちばんの自信が、この仕事の根拠に入っているか） */
  const strongMatch = (job: Job) => job.evidence.some(id => (questionOf(id) === 'q2' || questionOf(id) === 'q3') && picked.has(id))
  const deepMatch = (job: Job) => deepNo !== null && !!job.deep?.includes(deepNo)

  function score(job: Job): number {
    let s = 0
    job.evidence.forEach((id, i) => {
      if (picked.has(id)) s += (WEIGHT[questionOf(id)] ?? 0) + (i === 0 ? 0.5 : 0)
    })
    s += LEAN * (job.target === 'b' ? -lean.b2c : lean.b2c)
    s += LEAN * (job.stage === 'front' ? -lean.stage : lean.stage)
    // 単発か継続か：月額継続は継続側、単発納品は単発側。時間単価・成果報酬はどちらとも決まらないので動かさない
    const term = job.contract === '月額継続' ? 1 : job.contract === '単発納品' ? -1 : 0
    s += LEAN * term * lean.term
    if (goals.has(GOAL.income)) s += job.market === '◎ 案件多数' ? 2 : job.market === '○ 案件あり' ? 1 : 0
    if (goals.has(GOAL.independence) && job.contract === '月額継続') s += 1.5
    if (goals.has(GOAL.social) && job.social) s += 2
    return s
  }

  /** 毎週の定例が要る仕事を、時間が少ない人には点数にかかわらず後ろへ回す */
  const tooBusy = (job: Job) => (short && job.regular ? 1 : 0)
  const rank = (jobs: Job[], layer: Layer, bonus: (job: Job) => number, experience?: string): Pick[] =>
    jobs
      .map((job, order) => ({ job, layer, order, experience, score: score(job) + bonus(job) }))
      .sort((a, b) => tooBusy(a.job) - tooBusy(b.job) || b.score - a.score || a.order - b.order)

  // 顕在型：仕事の内容ごとの5つから2つ。STEP5 の答えに合う仕事を強く上げる
  const kenzaiPool = rank(detail.jobs, '顕在型', job => (deepMatch(job) ? 5 : 0))
  const kenzai = kenzaiPool.slice(0, 2)

  // 潜在型：仕事の外の経験ごとの部品から1つ（経験を2つ選んだ人は、それぞれのいちばん上を比べて点数の高いほう）。
  // 経験が「特にない」なら本業の延長から
  const hiddenBonus = (experience: string) => (job: Job) =>
    (job.details?.includes(detailIndex + 1) ? 3 : 0) + (goals.has(GOAL.favorite) && FAVORITE_EXPERIENCES.has(experience) ? 2 : 0)
  const senzai: Pick[] = q6
    .slice(0, 2)
    .map(exp => rank(family.hidden[exp as keyof typeof family.hidden] ?? [], '潜在型', hiddenBonus(exp), exp)[0])
    .filter((p): p is Pick => !!p)
    .sort((a, b) => tooBusy(a.job) - tooBusy(b.job) || b.score - a.score)
    .slice(0, 1)
  // 部品が無いとき（「特にない」の人も）は、本業の延長から補って必ず1つにする
  if (senzai.length === 0) senzai.push(...rank(family.extension, '潜在型', () => 0).slice(0, 1))

  // 「将来の独立に備えたい」人には、月額継続の仕事を1つ以上入れる（無ければ顕在型の2位と入れ替える）
  if (goals.has(GOAL.independence) && ![...kenzai, ...senzai].some(p => p.job.contract === '月額継続')) {
    const ongoing = kenzaiPool.slice(2).find(p => p.job.contract === '月額継続' && !(short && p.job.regular))
    if (ongoing) kenzai[1] = ongoing
  }

  const recommendations: Recommendation[] = [...kenzai, ...senzai].map((p, i) => {
    const { job } = p
    const clauses = uniq(
      [
        p.layer === '顕在型' && deepMatch(job) ? deepClause : null,
        p.experience ? cite(p.experience) : null,
        ...job.evidence.filter(id => picked.has(id)).map(cite),
        // STEP5 に答えていれば、仕事の内容はその言い回し（「人事では「面接・選考」を担当してきた」）に含まれるので重ねない
        deepClause ?? detailClause,
        cite(q2),
        cite(q4),
      ].filter((c): c is string => !!c),
    )
    const [a, b] = clauses
    // 「〜ことが多いことに加えて」と重ならないよう、「多い」で終わるときは「うえに」でつなぐ
    const joint = i % 2 === 1 && !a.endsWith('多い') ? 'ことに加えて' : 'うえに'
    const fit =
      p.layer === '顕在型'
        ? deepMatch(job) || strongMatch(job) ? '◎' : '○'
        : strongMatch(job) ? '◎' : job.details && !job.details.includes(detailIndex + 1) ? '△' : '○'
    return {
      rank: i + 1,
      layer: p.layer,
      job_title: job.title,
      combo: job.tags,
      what: job.what,
      who_needs: job.who,
      why_you: `${a}${joint}、${b}ので、${job.because}`,
      niche_point: job.niche,
      contract_style: job.contract,
      fit,
      market_need: job.market,
      first_step: job.step,
    }
  })

  // 強みの3層：本業は仕事の内容（＋STEP5）、潜在型は選んだ潜在型の仕事の「経験」側のタグ、顕在型は残りのタグ
  const deepPart = deepNo ? detail.deep[deepNo - 1] : null
  const hongyo = uniq([...detail.tags, ...(deepPart ? [deepPart.tag] : [])]).slice(0, 4)
  const senzaiTags = uniq([
    ...senzai.map(p => p.job.tags[0]),
    ...senzai.flatMap(p => p.job.tags.slice(1)).filter(t => !hongyo.includes(t)),
  ]).slice(0, 4)
  let kenzaiTags = uniq(kenzai.flatMap(p => p.job.tags))
    .filter(t => !hongyo.includes(t) && !senzaiTags.includes(t))
    .slice(0, 4)
  if (kenzaiTags.length === 0) kenzaiTags = [q3.length > 0 ? TAG_Q3[q3[0]] : TAG_Q2[q2]]

  const radar = radarScores(answers)
  const experience = q6.length > 0 ? `仕事の外で${cite(q6[0])}` : null
  const axes = pickMarketAxes(answers)
  const side = (p: number) => (p < 0 ? 'left' : p > 0 ? 'right' : 'mid')
  const who = lean.b2c < 0 ? 'b' : lean.b2c > 0 ? 'c' : detail.lean
  const how = lean.stage < 0 ? '前に立って支える' : lean.stage > 0 ? '裏方で支える' : 'そばで支える'

  return {
    nickname: `${q3.length > 0 ? NICK_Q3[q3[0]] : NICK_Q2[q2]}${detail.role}`,
    nickname_reason:
      q3.length > 0
        ? `人から「${label(q3[0])}」と頼まれる力と、「${detailLabel}」の仕事で積んだ経験を、両方持っているからです。`
        : `「${label(q2)}」ことへの自信と、「${detailLabel}」の仕事で積んだ経験を、両方持っているからです。`,
    summary: [
      q3.length > 0
        ? `人から「${label(q3[0])}」と頼まれることが多く、「${label(q4)}」にやる気が出る、${PERSON_Q4[q4]}です。`
        : `「${label(q2)}」ことにいちばん自信があり、「${label(q4)}」にやる気が出る、${PERSON_Q4[q4]}です。`,
      `${deepClause ?? `「${detailLabel}」の仕事で積み上げてきた`}経験は、別の会社や立場でもそのまま活かせます。`,
      experience ? `さらに、${experience}ことも、${EXPERIENCE_VALUE[q6[0]] ?? '複業ではあなただけの武器になります'}。` : '',
    ].join(''),
    confidence: q3.length === 0 && q6.length === 0 ? 'low' : 'high',
    strength_tags: uniq([...hongyo, ...kenzaiTags, ...senzaiTags]).slice(0, 8),
    // 画面には出していない（強みの3層マップの欄は 2026-10-24 に外した）。強みハッシュタグの材料と、点検に使う
    skill_map: { hongyo, kenzai: kenzaiTags, senzai: senzaiTags },
    market: {
      domain_name: `${detail.field[who]}を${how}仕事`,
      axes: axes.map(({ left, right, position }) => ({ left, right, position })),
      comment: axes.map(a => AXIS_COMMENT[a.id]?.[side(a.position)] ?? '').join(''),
    },
    radar: radar.map(({ id, label, value }) => ({ id, label, value })),
    direction: directionOf(radar),
    recommendations,
    growth_hint: detail.growth,
    cautions: uniq(
      [detail.caution, ...[...kenzai, ...senzai].map(p => p.job.caution), short ? SHORT_TIME_CAUTION : undefined].filter(
        (c): c is string => !!c,
      ),
    ).slice(0, 5),
  }
}
