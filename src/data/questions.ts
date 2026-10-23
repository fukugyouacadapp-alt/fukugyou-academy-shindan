/**
 * 診断の設問。すべて選択式（文字を入力する欄は作らない）。
 * 「全10問（8画面＋AIの深掘り）・選択肢は5つ前後」に絞った版（2026-10-23。それまでの19画面版は長すぎるため）。
 * 選択肢を大まかにした分は、1の「具体的には？」と、最後のAIの深掘り（STEP5）で具体化する。
 *
 * 文言は docs/01-site-build-prompt.md の4章と同じ。画面にもAIにもこの文言がそのまま渡る。
 * 選択肢のIDは「設問ID.番号」（例: q3.2）。並び順を変えるとIDがずれる。
 * 公開後は、診断の途中だった人の回答がずれないよう、足すときは末尾に足すこと。
 * 「特にない」系は noneLabel で指定すると常に最後に置かれる。
 *
 * このファイルは import を持たない（scripts/run-personas.mjs が Node から直接読むため）。
 */

export type Option = { id: string; label: string }

export type ChoiceQuestion = {
  kind: 'choice'
  id: string
  no: string
  step: StepNo
  title: string
  /** AIに渡すときの見出し（docs/02-ai-prompts.md「0. 回答の渡し方」） */
  aiLabel: string
  /** 1 なら1つだけ選ぶ。2以上なら「◯つまで」。null は上限なし */
  max: number | null
  options: Option[]
  /** これを選ぶと他は選べない（「特にない」など）。options の最後に入っている */
  noneId?: string
  note?: string
}

export type SliderQuestion = {
  kind: 'slider'
  id: string
  no: string
  step: StepNo
  left: string
  right: string
  aiLabel: string
}

export type Question = ChoiceQuestion | SliderQuestion
export type StepNo = 1 | 2 | 3 | 4

/** STEP5 は AIの深掘り */
export const STEPS: Record<StepNo | 5, { title: string; lead: string }> = {
  1: { title: 'あなたの仕事', lead: 'まずは、いまのお仕事について教えてください。' },
  2: { title: 'あなたの強み', lead: 'まわりから見たあなたを思い浮かべて選んでください。' },
  3: { title: '相手と経験', lead: '仕事に関係ないことでも大丈夫です。意外な強みのタネになります。' },
  4: { title: 'これからの働き方', lead: '直感で選んでください。' },
  5: { title: '最後に、もう少しだけ', lead: 'あなたの回答を見て、AIがもう少しだけ聞きたいことがあります。' },
}

function choice(
  q: Omit<ChoiceQuestion, 'kind' | 'options' | 'noneId'> & { labels: string[]; noneLabel?: string },
): ChoiceQuestion {
  const { labels, noneLabel, ...rest } = q
  const all = noneLabel ? [...labels, noneLabel] : labels
  const options = all.map((label, i) => ({ id: `${q.id}.${i + 1}`, label }))
  return {
    kind: 'choice',
    ...rest,
    options,
    noneId: noneLabel ? options[options.length - 1].id : undefined,
  }
}

// ── STEP1 あなたの仕事 ──────────────────────────────

/** 1 の選択肢（仕事のタイプ）と、それぞれの「具体的には？」の選択肢 */
export const JOB_FAMILIES: { label: string; details: string[] }[] = [
  { label: '人と話す仕事（営業・接客・サポート）', details: ['法人営業', '個人向けの営業・販売', '接客・店舗', 'カスタマーサポート'] },
  { label: '企画・発信する仕事（企画・マーケ・広報）', details: ['企画・事業開発', 'マーケティング・広告', '広報・SNS運用', '経営・事業の責任者'] },
  { label: '組織を支える仕事（人事・経理・総務・公務員）', details: ['人事・採用', '経理・財務', '総務・事務', '公務員・団体職員'] },
  { label: 'つくる仕事（IT・デザイン・制作）', details: ['エンジニア・IT', 'Webデザイン・UI', '映像・写真・グラフィック', 'ライティング・編集'] },
  { label: '人をケアする・教える仕事（医療・介護・教育）', details: ['医療・看護', '介護・福祉', '保育・幼児教育', '学校・塾・研修講師'] },
  { label: '現場を動かす仕事（製造・物流・建設）', details: ['製造・品質管理', '物流・運送', '建設・施工管理', '飲食・調理'] },
]

const q1 = choice({
  id: 'q1', no: '1', step: 1, max: 1,
  title: 'いまの仕事に近いのは？', aiLabel: '仕事のタイプ',
  labels: JOB_FAMILIES.map(f => f.label),
})

/** 1-2「具体的には？」は、1 で選んだ仕事のタイプごとに別の設問として持つ（IDがぶつからないように q1_2_<番号>） */
export const DETAIL_BY_FAMILY: Record<string, ChoiceQuestion> = Object.fromEntries(
  JOB_FAMILIES.map((family, i) => [
    q1.options[i].id,
    choice({
      id: `q1_2_${i + 1}`, no: '1-2', step: 1, max: 1,
      title: '具体的には？', aiLabel: '仕事の内容',
      labels: family.details,
    }),
  ]),
)

const q2 = choice({
  id: 'q2', no: '2', step: 1, max: 1,
  title: 'これまでの仕事で、いちばん自信がある経験は？', aiLabel: 'いちばん自信がある経験',
  labels: ['人を育てる・教える', 'チームをまとめる・引っぱる', '新しいことを立ち上げる', '仕組みを整える・効率よくする', 'お客様と信頼関係を築く'],
})

// ── STEP2 あなたの強み ──────────────────────────────

const q3 = choice({
  id: 'q3', no: '3', step: 2, max: 2,
  title: '人からよく頼まれることは？', aiLabel: '人からよく頼まれること',
  labels: ['相談に乗る・話を聞く', '資料や文章を整える', '数字やデータをまとめる', '段取りを組む・進行役', '教える・やり方を伝える', 'パソコン・ITツールのこと'],
  noneLabel: '特にない・わからない',
})

const q4 = choice({
  id: 'q4', no: '4', step: 2, max: 1,
  title: '仕事でやる気が出る瞬間は？', aiLabel: 'やる気が出る瞬間',
  labels: ['人から感謝されたとき', '目標を達成したとき', '人が成長したとき', '仕組みがうまく回ったとき', '新しいものが形になったとき'],
})

// ── STEP3 相手と経験 ──────────────────────────────

const q5 = choice({
  id: 'q5', no: '5', step: 3, max: 2,
  title: '仕事で関わることが多い相手は？', aiLabel: '仕事で関わることが多い相手',
  labels: ['会社の経営者・社長', '会社の担当者・社員', '個人のお客様', '子ども・学生・若手', '高齢者・患者・利用者'],
})

const q6 = choice({
  id: 'q6', no: '6', step: 3, max: 2,
  title: '仕事の外で、人に話せるくらいの経験は？', aiLabel: '仕事の外で、人に話せる経験',
  labels: ['子育て・介護と仕事の両立', '地域活動・PTA・ボランティア', 'SNSやブログでの発信', '趣味・スポーツ・ものづくり', '転職や病気など、大きな壁を越えた経験'],
  noneLabel: '特にない',
  note: '話したくないものは選ばなくて大丈夫です。「特にない」でも診断できます。',
})

// ── STEP4 これからの働き方 ──────────────────────────────

const q7_1 = choice({
  id: 'q7_1', no: '7-1', step: 4, max: 1,
  title: '複業でかなえたいことは？', aiLabel: '複業でかなえたいこと',
  labels: ['収入を増やしたい', 'スキルや経験を広げたい', '将来の独立に備えたい', '好きなことを仕事にしたい', '社会や地域の役に立ちたい'],
})

const q7_2 = choice({
  id: 'q7_2', no: '7-2', step: 4, max: 1,
  title: '複業に使える時間は（1週間で）？', aiLabel: '複業に使える時間（週）',
  labels: ['3時間未満', '3〜5時間', '5〜10時間', '10時間以上'],
})

/** short は「得意な市場」の図に出す短い名前（10字以内） */
function slider(id: string, no: string, left: string, right: string, short: [string, string]): SliderQuestion & { short: [string, string] } {
  return { kind: 'slider', id, no, step: 4, left, right, aiLabel: `${short[0]} ↔ ${short[1]}`, short }
}

/** 並び順は、偏りが同じくらいのときに「得意な市場」の軸として優先する順 */
const sliders = [
  slider('q8_1', '8-1', '会社・組織を相手にしたい（toB）', '個人を相手にしたい（toC）', ['会社（toB）', '個人（toC）']),
  slider('q8_2', '8-2', '前に出て話す・教える', '裏方で支える・つくる', ['前に出る', '裏方で支える']),
  slider('q8_3', '8-3', '単発で納品して終わりたい', '継続して伴走したい', ['単発で納品', '継続して伴走']),
]

export const SLIDER_VALUES = [-2, -1, 0, 1, 2] as const

// ── まとめ ──────────────────────────────

export const Q = { q1, q2, q3, q4, q5, q6, q7_1, q7_2 } as const

export const SLIDERS: SliderQuestion[] = sliders

/** 回答の入れ物。選択式は選んだIDの配列、スライダーは -2〜+2 の数 */
export type Answers = Record<string, string[] | number>

/**
 * STEP5（AIの深掘り）の1問。
 * sig は /api/followup が付ける署名。診断のときに「サーバーのAIが作った質問のままか」を確かめるのに使う
 * （書き換えられた質問は診断に使わない）
 */
export type FollowUp = { question: string; options: string[]; answer: string | null; sig?: string }

export const FOLLOWUP_NONE = 'どれも当てはまらない'

export type MarketAxis = { left: string; right: string; position: number }

/**
 * 「得意な市場」の2軸。働き方の好み（8）のうち 0 から最も離れている2つを選ぶ（同じなら並び順）。
 * AIに任せると軸の選び方や短い名前が毎回ぶれるので、ここで決めてAIには「この2軸を使って」と渡す。
 */
export function pickMarketAxes(answers: Answers): [MarketAxis, MarketAxis] {
  const ranked = sliders
    .map((s, order) => ({ s, order, size: Math.abs(Number(answers[s.id] ?? 0)) }))
    .sort((a, b) => b.size - a.size || a.order - b.order)
  const toAxis = ({ s }: (typeof ranked)[number]): MarketAxis => ({
    left: s.short[0],
    right: s.short[1],
    position: typeof answers[s.id] === 'number' ? (answers[s.id] as number) : 0,
  })
  return [toAxis(ranked[0]), toAxis(ranked[1])]
}

/** 1-2「具体的には？」（1 の答えで変わる）。未回答なら null */
export function detailQuestion(answers: Answers): ChoiceQuestion | null {
  const family = answers[q1.id]
  if (!Array.isArray(family) || family.length === 0) return null
  // "__proto__" などを送られても、もとから持っている設問以外は引かない
  return Object.hasOwn(DETAIL_BY_FAMILY, family[0]) ? DETAIL_BY_FAMILY[family[0]] : null
}

/** いまの回答で聞くべき設問を、画面の順に並べる。1-2 は 1 の答えで出し分けるので、ここで毎回組み立てる */
export function activeQuestions(answers: Answers): Question[] {
  const list: (Question | null)[] = [q1, detailQuestion(answers), q2, q3, q4, q5, q6, q7_1, q7_2, ...sliders]
  return list.filter((q): q is Question => q !== null)
}

/** IDから選択肢の文言を引く（1-2 は仕事のタイプごとの全設問から探す） */
const LABEL_BY_ID: Map<string, string> = new Map(
  [...Object.values(Q), ...Object.values(DETAIL_BY_FAMILY)].flatMap(q => q.options.map(o => [o.id, o.label] as const)),
)

export function optionLabel(id: string): string | undefined {
  return LABEL_BY_ID.get(id)
}
