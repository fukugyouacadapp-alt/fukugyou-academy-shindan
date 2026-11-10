import { byLabel, deepQuestion, DETAIL_BY_FAMILY, Q, type Answers, type StepNo } from '@/data/questions'

/**
 * 強みの六角形（6つの力）。要件定義（複業アカデミー様・2026-10-29 版）の R13・R11。
 * 回答から点数で出す（AIは使わない。同じ回答なら同じ形）。
 * 診断の途中（STEP2・3・4 の後）に「描きかけ」で見せるので、それぞれの力は、見せる時点までに答えた設問だけで決める
 * （あとの答えで、一度見せた形が変わらないように。npm run check:results が確かめる）。
 * STEP2 の後に2つ、STEP3 の後に4つ、STEP4 の後に5つ、結果画面で6つそろう。決まりは docs/02-result-rules.md の7章。
 */

export type RadarAxisId = 'people' | 'plan' | 'voice' | 'system' | 'expert' | 'keep'

/** 回答のうち、点数に使うもの。選んだ選択肢のIDは設問をまたいで重ならないので、1つの表で引ける */
type Ctx = { ids: Set<string>; deep: boolean; slider: (id: string) => number }

type Axis = {
  id: RadarAxisId
  label: string
  /** 六角形の下の一覧に添える短い説明 */
  hint: string
  /** この STEP を答え終えたら見せる。点数に使うのは、この STEP までの設問だけ */
  step: StepNo
  /** 途中経過で、いちばん高い力として出すときの一言 */
  line: string
  /** 結果の「合う複業の方向」（いちばん高い力で決める） */
  direction: { name: string; text: string }
  /** これだけ点があれば 5（いちばん外側） */
  cap: number
  points: (c: Ctx) => number
}

/** 1「いまの仕事に近いのは？」の点（JOB_FAMILIES と同じ並び：話す・企画・組織・つくる・ケア・現場） */
function byFamily(points: [number, number, number, number, number, number]): Record<string, number> {
  return Object.fromEntries(Q.q1.options.map((o, i) => [o.id, points[i]]))
}

/** 1-2「具体的には？」の点。文言は仕事のタイプをまたいで重ならないので、文言で書く */
function byDetail(table: Record<string, number>): Record<string, number> {
  const options = Object.values(DETAIL_BY_FAMILY).flatMap(q => q.options)
  return Object.fromEntries(
    Object.entries(table).map(([label, value]) => {
      const option = options.find(o => o.label === label)
      if (!option) throw new Error(`1-2 に「${label}」がありません`)
      return [option.id, value]
    }),
  )
}

const merge = (...tables: Record<string, number>[]): Record<string, number> => Object.assign({}, ...tables)
const sumOf = (c: Ctx, table: Record<string, number>) => [...c.ids].reduce((s, id) => s + (table[id] ?? 0), 0)

const PEOPLE = merge(
  byFamily([2, 1, 1, 0, 2, 0]),
  byDetail({ '人事・採用': 1, '公務員・団体職員': 1 }),
  byLabel(Q.q2, { '人を育てる・教える': 1, 'チームをまとめる・引っぱる': 1, 'お客様と信頼関係を築く': 2 }),
  byLabel(Q.q3, { '相談に乗る・話を聞く': 2, '教える・やり方を伝える': 1, '段取りを組む・進行役': 1 }),
  byLabel(Q.q4, { '人から感謝されたとき': 1, '人が成長したとき': 1 }),
)

const SYSTEM = merge(
  byFamily([0, 0, 2, 1, 0, 2]),
  byDetail({ '経理・財務': 1, '総務・事務': 1, 'エンジニア・IT': 1 }),
  byLabel(Q.q2, { '仕組みを整える・効率よくする': 2 }),
  byLabel(Q.q3, { '資料や文章を整える': 1, '数字やデータをまとめる': 2, '段取りを組む・進行役': 2, 'パソコン・ITツールのこと': 1 }),
  byLabel(Q.q4, { '仕組みがうまく回ったとき': 2, '目標を達成したとき': 1 }),
)

const PLAN = merge(
  byFamily([0, 2, 0, 1, 0, 0]),
  byDetail({ '企画・事業開発': 1, '経営・事業の責任者': 1 }),
  byLabel(Q.q2, { '新しいことを立ち上げる': 2, 'チームをまとめる・引っぱる': 1 }),
  byLabel(Q.q4, { '新しいものが形になったとき': 2, '目標を達成したとき': 1 }),
  byLabel(Q.q5, { '会社の経営者・社長': 1 }),
  byLabel(Q.q6, { '趣味・スポーツ・ものづくり': 1, '地域活動・PTA・ボランティア': 1, 'SNSやブログでの発信': 1 }),
)

const VOICE = merge(
  byFamily([1, 2, 0, 0, 1, 0]),
  byDetail({ '広報・SNS運用': 1, 'マーケティング・広告': 1, '学校・塾・研修講師': 2, 'ライティング・編集': 1, '映像・写真・グラフィック': 1 }),
  byLabel(Q.q2, { '人を育てる・教える': 1 }),
  byLabel(Q.q3, { '教える・やり方を伝える': 2, '資料や文章を整える': 1 }),
  byLabel(Q.q5, { '個人のお客様': 1, '子ども・学生・若手': 1 }),
  byLabel(Q.q6, { 'SNSやブログでの発信': 3, '地域活動・PTA・ボランティア': 1 }),
)

const KEEP = merge(
  byLabel(Q.q2, { 'お客様と信頼関係を築く': 1 }),
  byLabel(Q.q4, { '人が成長したとき': 1 }),
  byLabel(Q.q6, { '子育て・介護と仕事の両立': 1 }),
  byLabel(Q.q7_1, { '将来の独立に備えたい': 1 }),
  byLabel(Q.q7_2, { '3〜5時間': 1, '5〜10時間': 2, '10時間以上': 3 }),
)

const EXPERT = merge(
  byFamily([0, 0, 1, 1, 1, 1]),
  byLabel(Q.q3, { '資料や文章を整える': 1, '数字やデータをまとめる': 1, 'パソコン・ITツールのこと': 1 }),
  byLabel(Q.q5, { '会社の経営者・社長': 1, '会社の担当者・社員': 1, '高齢者・患者・利用者': 1 }),
)

/**
 * 六角形の並び（上から時計回り）。名前と説明は要件定義の4章「方向性のポイント」の案のまま。
 * 並びは、途中経過で見せる順（STEP2 の後に対人力・仕組み化 → STEP3 の後に企画力・発信力 → STEP4 の後に継続力 → 結果で専門性）にして、
 * 描きかけの形が隣どうしで広がっていくようにした（要件定義の図の並びは「例」なので変えてよい）
 */
export const RADAR_AXES: readonly Axis[] = [
  {
    id: 'people', label: '対人力', hint: '人と話す・頼られる', step: 2, cap: 7,
    line: '人から頼られ、話を聞く力が光っています。',
    direction: { name: '人と組む伴走型', text: '相手の話を聞き、隣で支えながら一緒に進める複業が合っています。' },
    points: c => sumOf(c, PEOPLE),
  },
  {
    id: 'system', label: '仕組み化', hint: '整える・回す', step: 2, cap: 7,
    line: '段取りや仕組みを整える力が光っています。',
    direction: { name: '仕組みで支える裏方型', text: '段取りや仕組みを整えて、相手の仕事を楽にする複業が合っています。' },
    points: c => sumOf(c, SYSTEM),
  },
  {
    id: 'plan', label: '企画力', hint: 'ゼロから形にする', step: 3, cap: 6,
    line: 'まだ形のないものを形にする力が見えてきました。',
    direction: { name: 'ゼロから形にする企画型', text: 'まだ形のないものを企画し、立ち上げるところから関わる複業が合っています。' },
    points: c => sumOf(c, PLAN),
  },
  {
    id: 'voice', label: '発信力', hint: '前に出る・伝える', step: 3, cap: 6,
    line: '人に伝え、教える力が見えてきました。',
    direction: { name: '前に出て伝える発信型', text: '人前で話す・教える・発信するなど、伝えることが中心の複業が合っています。' },
    points: c => sumOf(c, VOICE),
  },
  {
    id: 'keep', label: '継続力', hint: '長く続ける', step: 4, cap: 9,
    line: '長く続けて信頼を積む力が見えてきました。',
    direction: { name: '長く寄り添う継続型', text: '1回で終わらず、同じ相手と長く付き合いながら信頼を積む複業が合っています。' },
    // 「継続して伴走したい」に寄るほど点が上がる（いちばん「単発」寄りで 0）
    points: c => sumOf(c, KEEP) + c.slider('q8_3') + 2,
  },
  {
    id: 'expert', label: '専門性', hint: '経験の深さ', step: 5, cap: 8,
    line: '本業で深めてきた経験が強みです。',
    direction: { name: '経験を深く活かす専門型', text: '本業で深めた経験や知識を、そのまま別の会社や人のために使う複業が合っています。' },
    // 最後の質問（STEP5）で、本業の中身を具体的に選べたら、経験が深いとみなす。会社相手に寄せたい人も少し足す
    points: c => sumOf(c, EXPERT) + (c.deep ? 2 : 0) + Math.max(0, -c.slider('q8_1')),
  },
]

export type RadarScore = { id: RadarAxisId; label: string; value: number; ratio: number }

/**
 * 点の割合（点 ÷ 目安）を 1〜5 にするときの曲がり具合。1 なら割合どおり、大きいほど中くらいの力が低めに出て、強い力だけがとがる。
 * 2026-11-10 の打ち合わせで「六角形をとがらせて強みをわかりやすく」となり、1 → 2 にした（割合 0.5 なら 3 → 2、0.75 なら 4 → 3）。
 * 力ごとに別々に決まるので、途中経過で見せた形が結果で変わらない決まりはそのまま。いちばん高い力（strongestAxis）も変わらない
 */
const SHARPNESS = 2

/** 6つの力の点（1〜5）。まだ答えていない設問の分は 0 点として数える（途中経過では、答え終えた力だけを見せる） */
export function radarScores(answers: Answers): RadarScore[] {
  const deepQ = deepQuestion(answers)
  const deepAnswer = deepQ ? answers[deepQ.id] : undefined
  const c: Ctx = {
    ids: new Set(Object.values(answers).flatMap(v => (Array.isArray(v) ? v : []))),
    deep: Array.isArray(deepAnswer) && deepAnswer.length > 0 && deepAnswer[0] !== deepQ?.noneId,
    slider: id => (typeof answers[id] === 'number' ? (answers[id] as number) : 0),
  }
  return RADAR_AXES.map(axis => {
    const ratio = Math.max(0, axis.points(c)) / axis.cap
    const value = Math.min(5, Math.max(1, 1 + Math.round(4 * Math.min(1, ratio) ** SHARPNESS)))
    return { id: axis.id, label: axis.label, value, ratio }
  })
}

/** その STEP を答え終えた時点で見せる力 */
export function axesShownAfter(step: StepNo): RadarAxisId[] {
  return RADAR_AXES.filter(a => a.step <= step).map(a => a.id)
}

export function axisOf(id: RadarAxisId): Axis {
  const axis = RADAR_AXES.find(a => a.id === id)
  if (!axis) throw new Error(`六角形に「${id}」がありません`)
  return axis
}

/** 見せている力のうち、いちばん高いもの（同じ高さなら、六角形の並びで先のもの） */
export function strongestAxis(scores: RadarScore[], shown: RadarAxisId[] = scores.map(s => s.id)): Axis {
  const top = scores.filter(s => shown.includes(s.id)).reduce((a, b) => (b.ratio > a.ratio ? b : a))
  return axisOf(top.id)
}

/** 結果の「合う複業の方向」。いちばん高い力で決める（6通り。要件定義 R3「勧めたい複業4〜6種」の受け皿） */
export function directionOf(scores: RadarScore[]): Axis['direction'] {
  return strongestAxis(scores).direction
}
