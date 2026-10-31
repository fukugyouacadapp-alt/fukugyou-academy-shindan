/**
 * 診断の設問。すべて選択式（文字を入力する欄は作らない）。
 * 「全10問（9画面）・選択肢は5つ前後」に絞った版（2026-10-23。それまでの19画面版は長すぎるため）。
 * 選択肢を大まかにした分は、1の「具体的には？」と、最後の深掘り（STEP5）で具体化する。
 * STEP5 は 2026-10-24 に、AIが作る質問から、仕事の内容ごとに用意した4択1問に変えた。
 *
 * 文言は docs/01-site-build-prompt.md の4章と同じ。結果の「向いている理由」などにも、この文言がそのまま引用される。
 * 選択肢のIDは「設問ID.番号」（例: q3.2）。並び順を変えるとIDがずれる
 * （結果の部品 src/data/catalog/ も、このIDで回答を見ている）。
 * 公開後は、診断の途中だった人の回答がずれないよう、足すときは末尾に足すこと。
 * 「特にない」系は noneLabel で指定すると常に最後に置かれる。
 */

export type Option = { id: string; label: string }

export type ChoiceQuestion = {
  kind: 'choice'
  id: string
  no: string
  step: StepNo
  title: string
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
}

export type Question = ChoiceQuestion | SliderQuestion
export type StepNo = 1 | 2 | 3 | 4 | 5

export const STEPS: Record<StepNo, { title: string; lead: string }> = {
  1: { title: 'あなたの仕事', lead: 'まずは、いまのお仕事について教えてください。' },
  2: { title: 'あなたの強み', lead: 'まわりから見たあなたを思い浮かべて選んでください。' },
  3: { title: '相手と経験', lead: '仕事に関係ないことでも大丈夫です。意外な強みのタネになります。' },
  4: { title: 'これからの働き方', lead: '直感で選んでください。' },
  5: { title: '最後に、もう少しだけ', lead: 'お仕事の中身を、もう少しだけ教えてください。提案する仕事がより具体的になります。' },
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

/**
 * 仕事の内容（1-2）ごとの深掘り（STEP5）。
 * cite は「向いている理由」で引用するときの言い回し。{x} に選んだ答えが入る。
 * 「〜うえに」「〜ので」「〜ことに加えて」に続くよう、動詞（〜している・〜してきた）で終える。
 */
type Deep = { title: string; options: string[]; cite: string }
type Detail = { label: string; deep: Deep }

/** 1 の選択肢（仕事のタイプ）と、それぞれの「具体的には？」の選択肢・深掘り */
export const JOB_FAMILIES: { label: string; details: Detail[] }[] = [
  {
    label: '人と話す仕事（営業・接客・サポート）',
    details: [
      { label: '法人営業', deep: { title: '法人営業で、いちばん力を入れてきたことは？', options: ['新しいお客様の開拓', '提案書・見積もりづくり', '長く付き合うお客様との関係づくり', 'チームや後輩の育成'], cite: '法人営業では「{x}」に力を入れてきた' } },
      { label: '個人向けの営業・販売', deep: { title: 'どんな商品を扱うことが多いですか？', options: ['住まい・車などの大きな買い物', '服・化粧品などの身近なもの', '習いごと・教室などのサービス', '家電・スマホ・通信'], cite: '個人向けの販売で「{x}」を扱ってきた' } },
      { label: '接客・店舗', deep: { title: 'お店では、どんな役割が多いですか？', options: ['接客・お客様の対応', '売り場づくり・陳列', 'スタッフの教育・シフト', '売上や在庫の管理'], cite: 'お店で「{x}」を任されてきた' } },
      { label: 'カスタマーサポート', deep: { title: 'サポートの仕事で、得意なことは？', options: ['電話・チャットでの対応', 'よくある質問・マニュアルづくり', 'クレームなど難しい対応', '問い合わせの分析・改善'], cite: 'サポートの仕事で「{x}」を担ってきた' } },
    ],
  },
  {
    label: '企画・発信する仕事（企画・マーケ・広報）',
    details: [
      { label: '企画・事業開発', deep: { title: '企画の仕事で、いちばん多いのは？', options: ['新しい商品・サービスの企画', '市場やお客様の調査', '社内外の人を巻き込む調整', '事業計画・数字づくり'], cite: '企画の仕事で「{x}」を手がけてきた' } },
      { label: 'マーケティング・広告', deep: { title: 'マーケティングで、得意な分野は？', options: ['Web広告・数字の分析', 'SNS・コンテンツづくり', 'イベント・展示会', 'メール・LINEでのお客様づくり'], cite: 'マーケティングでは「{x}」を担当してきた' } },
      { label: '広報・SNS運用', deep: { title: '広報の仕事で、担当することが多いのは？', options: ['プレスリリース・取材の対応', 'SNSの投稿・運用', '社内報・社内向けの発信', 'イベント・発表会の準備'], cite: '広報で「{x}」を担当してきた' } },
      { label: '経営・事業の責任者', deep: { title: '責任者として、力を入れてきたことは？', options: ['事業の立ち上げ・立て直し', '組織づくり・人の採用', 'お金・数字の管理', '取引先との交渉・提携'], cite: '責任者として「{x}」に力を入れてきた' } },
    ],
  },
  {
    label: '組織を支える仕事（人事・経理・総務・公務員）',
    details: [
      { label: '人事・採用', deep: { title: '人事の仕事で、担当することが多いのは？', options: ['面接・選考', '求人票・採用広報', '新人研修・育成', '評価・制度づくり'], cite: '人事では「{x}」を担当してきた' } },
      { label: '経理・財務', deep: { title: '経理の仕事で、担当することが多いのは？', options: ['毎日の記帳・請求書の処理', '月次・年次の決算', '予算・資金繰りの管理', '経理の仕組み・ツールの導入'], cite: '経理では「{x}」を担当してきた' } },
      { label: '総務・事務', deep: { title: '総務・事務で、任されることが多いのは？', options: ['備品・オフィスまわりの管理', '社内の手続き・書類の整理', '社内イベント・行事の運営', 'パソコン・社内ツールの管理'], cite: '総務・事務で「{x}」を任されてきた' } },
      { label: '公務員・団体職員', deep: { title: 'どんな分野の仕事が多いですか？', options: ['住民・利用者の窓口や相談', '地域・まちづくりの事業', '予算・計画・書類の作成', 'イベント・広報の企画'], cite: '公務員・団体職員として「{x}」に携わってきた' } },
    ],
  },
  {
    label: 'つくる仕事（IT・デザイン・制作）',
    details: [
      { label: 'エンジニア・IT', deep: { title: 'ITの仕事で、得意な分野は？', options: ['Webサイト・アプリの開発', '社内システム・業務の効率化', 'サーバー・ネットワーク・セキュリティ', 'データの集計・分析'], cite: 'ITの仕事で「{x}」を手がけてきた' } },
      { label: 'Webデザイン・UI', deep: { title: 'デザインで、手がけることが多いのは？', options: ['ホームページ・宣伝用のページ', 'アプリ・サービスの画面', 'バナー・SNS用の画像', 'ロゴ・ブランドづくり'], cite: 'デザインで「{x}」を手がけてきた' } },
      { label: '映像・写真・グラフィック', deep: { title: 'どの制作が多いですか？', options: ['動画の撮影・編集', '写真の撮影・加工', 'チラシ・パンフレット', 'イラスト・図解'], cite: '制作の仕事で「{x}」を手がけてきた' } },
      { label: 'ライティング・編集', deep: { title: '書く仕事で、多いのはどれですか？', options: ['インタビュー・取材記事', 'Webの記事・コラム', '広告・宣伝の文章', '本・冊子の編集'], cite: '書く仕事で「{x}」を手がけてきた' } },
    ],
  },
  {
    label: '人をケアする・教える仕事（医療・介護・教育）',
    details: [
      { label: '医療・看護', deep: { title: 'どんな場で働くことが多いですか？', options: ['病院の病棟・外来', 'クリニック・健診', '訪問看護・在宅医療', '医療事務・病院の運営'], cite: '医療の現場で「{x}」の仕事をしてきた' } },
      { label: '介護・福祉', deep: { title: 'どんな場で働くことが多いですか？', options: ['施設での介護', '訪問・在宅の介護', 'ケアプラン・相談の仕事', '障がいのある方の支援'], cite: '介護・福祉で「{x}」に携わってきた' } },
      { label: '保育・幼児教育', deep: { title: '保育の仕事で、得意なことは？', options: ['遊びや制作の企画', '保護者との関わり・相談', 'お便り・掲示物づくり', '新人の保育士の指導'], cite: '保育の仕事で「{x}」を担ってきた' } },
      { label: '学校・塾・研修講師', deep: { title: '教える相手は、どの人が多いですか？', options: ['小学生・中学生', '高校生・受験生', '社会人（企業研修など）', '趣味・習いごとの大人'], cite: '「{x}」を相手に教えてきた' } },
    ],
  },
  {
    label: '現場を動かす仕事（製造・物流・建設）',
    details: [
      { label: '製造・品質管理', deep: { title: 'ものづくりの仕事で、多いのは？', options: ['品質のチェック・管理', '生産の段取り・工程の管理', '現場の改善・安全の活動', '機械・設備の保守'], cite: 'ものづくりの現場で「{x}」を担ってきた' } },
      { label: '物流・運送', deep: { title: '物流の仕事で、多いのは？', options: ['倉庫の管理・在庫', '配送・ドライバー', '配車・ルートの管理', '現場スタッフのまとめ役'], cite: '物流の現場で「{x}」を担ってきた' } },
      { label: '建設・施工管理', deep: { title: '建設の仕事で、多いのは？', options: ['工事の段取り・工程の管理', '安全・品質の管理', '図面・書類づくり', '職人さん・業者との調整'], cite: '建設の現場で「{x}」を担ってきた' } },
      { label: '飲食・調理', deep: { title: '飲食の仕事で、多いのは？', options: ['調理・メニューづくり', '接客・ホール', 'お店の運営・数字の管理', '仕込み・衛生の管理'], cite: '飲食の現場で「{x}」を担ってきた' } },
    ],
  },
]

const q1 = choice({
  id: 'q1', no: '1', step: 1, max: 1,
  title: 'いまの仕事に近いのは？',
  labels: JOB_FAMILIES.map(f => f.label),
  note: 'ぴったりのものがなければ、いちばん近いものを選んでください。いくつかにまたがる仕事なら、時間をいちばん使っているほうで大丈夫です。いま働いていない人は、これまでの仕事で選べます。',
})

/** 1-2「具体的には？」は、1 で選んだ仕事のタイプごとに別の設問として持つ（IDがぶつからないように q1_2_<番号>） */
export const DETAIL_BY_FAMILY: Record<string, ChoiceQuestion> = Object.fromEntries(
  JOB_FAMILIES.map((family, i) => [
    q1.options[i].id,
    choice({
      id: `q1_2_${i + 1}`, no: '1-2', step: 1, max: 1,
      title: '具体的には？',
      labels: family.details.map(d => d.label),
    }),
  ]),
)

const q2 = choice({
  id: 'q2', no: '2', step: 1, max: 1,
  title: 'これまでの仕事で、いちばん自信がある経験は？',
  labels: ['人を育てる・教える', 'チームをまとめる・引っぱる', '新しいことを立ち上げる', '仕組みを整える・効率よくする', 'お客様と信頼関係を築く'],
})

// ── STEP2 あなたの強み ──────────────────────────────

const q3 = choice({
  id: 'q3', no: '3', step: 2, max: 2,
  title: '人からよく頼まれることは？',
  labels: ['相談に乗る・話を聞く', '資料や文章を整える', '数字やデータをまとめる', '段取りを組む・進行役', '教える・やり方を伝える', 'パソコン・ITツールのこと'],
  noneLabel: '特にない・わからない',
})

const q4 = choice({
  id: 'q4', no: '4', step: 2, max: 1,
  title: '仕事でやる気が出る瞬間は？',
  labels: ['人から感謝されたとき', '目標を達成したとき', '人が成長したとき', '仕組みがうまく回ったとき', '新しいものが形になったとき'],
})

// ── STEP3 相手と経験 ──────────────────────────────

const q5 = choice({
  id: 'q5', no: '5', step: 3, max: 2,
  title: '仕事で関わることが多い相手は？',
  labels: ['会社の経営者・社長', '会社の担当者・社員', '個人のお客様', '子ども・学生・若手', '高齢者・患者・利用者'],
})

const q6 = choice({
  id: 'q6', no: '6', step: 3, max: 2,
  title: '仕事の外で、人に話せるくらいの経験は？',
  labels: ['子育て・介護と仕事の両立', '地域活動・PTA・ボランティア', 'SNSやブログでの発信', '趣味・スポーツ・ものづくり', '転職や病気など、大きな壁を越えた経験'],
  noneLabel: '特にない',
  note: '話したくないものは選ばなくて大丈夫です。「特にない」でも診断できます。',
})

// ── STEP4 これからの働き方 ──────────────────────────────

/** 2026-10-31 に「1つ」から「2つまで」にした（叶えたいことが複数ある人が、全部選びたくなるため。試した人の感想から） */
const q7_1 = choice({
  id: 'q7_1', no: '7-1', step: 4, max: 2,
  title: '複業でかなえたいことは？',
  labels: ['収入を増やしたい', 'スキルや経験を広げたい', '将来の独立に備えたい', '好きなことを仕事にしたい', '社会や地域の役に立ちたい'],
})

const q7_2 = choice({
  id: 'q7_2', no: '7-2', step: 4, max: 1,
  title: '複業に使える時間は（1週間で）？',
  labels: ['3時間未満', '3〜5時間', '5〜10時間', '10時間以上'],
})

/** short は「得意な市場」の図に出す短い名前（10字以内） */
function slider(id: string, no: string, left: string, right: string, short: [string, string]): SliderQuestion & { short: [string, string] } {
  return { kind: 'slider', id, no, step: 4, left, right, short }
}

/** 並び順は、偏りが同じくらいのときに「得意な市場」の軸として優先する順 */
const sliders = [
  slider('q8_1', '8-1', '会社・組織を相手にしたい（toB）', '個人を相手にしたい（toC）', ['会社（toB）', '個人（toC）']),
  slider('q8_2', '8-2', '前に出て話す・教える', '裏方で支える・つくる', ['前に出る', '裏方で支える']),
  slider('q8_3', '8-3', '単発で納品して終わりたい', '継続して伴走したい', ['単発で納品', '継続して伴走']),
]

export const SLIDER_VALUES = [-2, -1, 0, 1, 2] as const

// ── STEP5 最後に、もう少しだけ ──────────────────────────────

/** 「どれも当てはまらない」を選んでも診断はできる（提案が少し大まかになるだけ） */
export const DEEP_NONE = 'どれも当てはまらない'

/** STEP5（深掘り）は、1-2 の選択肢ごとに別の設問として持つ（IDは q9_<仕事のタイプの番号>_<仕事の内容の番号>） */
export const DEEP_BY_DETAIL: Record<string, ChoiceQuestion> = Object.fromEntries(
  JOB_FAMILIES.flatMap((family, i) =>
    family.details.map((detail, j) => [
      DETAIL_BY_FAMILY[q1.options[i].id].options[j].id,
      choice({
        id: `q9_${i + 1}_${j + 1}`, no: '9', step: 5, max: 1,
        title: detail.deep.title,
        labels: detail.deep.options,
        noneLabel: DEEP_NONE,
      }),
    ]),
  ),
)

// ── まとめ ──────────────────────────────

export const Q = { q1, q2, q3, q4, q5, q6, q7_1, q7_2 } as const

export const SLIDERS: SliderQuestion[] = sliders

/** 回答の入れ物。選択式は選んだIDの配列、スライダーは -2〜+2 の数 */
export type Answers = Record<string, string[] | number>

export type MarketAxis = { left: string; right: string; position: number }

/**
 * 「得意な市場」の2軸。働き方の好み（8）のうち 0 から最も離れている2つを選ぶ（同じなら並び順）。
 * どの軸を選んだかは、結果の文面（src/lib/diagnose.ts の市場の説明）にも使う。
 */
export function pickMarketAxes(answers: Answers): [MarketAxis & { id: string }, MarketAxis & { id: string }] {
  const ranked = sliders
    .map((s, order) => ({ s, order, size: Math.abs(Number(answers[s.id] ?? 0)) }))
    .sort((a, b) => b.size - a.size || a.order - b.order)
  const toAxis = ({ s }: (typeof ranked)[number]) => ({
    id: s.id,
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

/** STEP5 の深掘り（1-2 の答えで変わる）。1-2 が未回答なら null */
export function deepQuestion(answers: Answers): ChoiceQuestion | null {
  const detail = detailQuestion(answers)
  const picked = detail ? answers[detail.id] : undefined
  if (!Array.isArray(picked) || picked.length === 0) return null
  return Object.hasOwn(DEEP_BY_DETAIL, picked[0]) ? DEEP_BY_DETAIL[picked[0]] : null
}

/** いまの回答で聞くべき設問を、画面の順に並べる。1-2 と STEP5 は前の答えで出し分けるので、ここで毎回組み立てる */
export function activeQuestions(answers: Answers): Question[] {
  const list: (Question | null)[] = [q1, detailQuestion(answers), q2, q3, q4, q5, q6, q7_1, q7_2, ...sliders, deepQuestion(answers)]
  return list.filter((q): q is Question => q !== null)
}

/** IDから選択肢の文言を引く（1-2・STEP5 は全設問から探す） */
const LABEL_BY_ID: Map<string, string> = new Map(
  [...Object.values(Q), ...Object.values(DETAIL_BY_FAMILY), ...Object.values(DEEP_BY_DETAIL)].flatMap(q =>
    q.options.map(o => [o.id, o.label] as const),
  ),
)

export function optionLabel(id: string): string | undefined {
  return LABEL_BY_ID.get(id)
}

/** 選択肢の文言からIDを引く（文言を変えたときに、ここで気づけるよう見つからなければ止める） */
export function idOf(q: ChoiceQuestion, label: string): string {
  const option = q.options.find(o => o.label === label)
  if (!option) throw new Error(`${q.no} に「${label}」がありません`)
  return option.id
}

/** 文言ごとの値を、IDごとの表に置き換える */
export function byLabel<T>(q: ChoiceQuestion, table: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(table).map(([label, value]) => [idOf(q, label), value]))
}

/** STEP5 の答えを「向いている理由」で引用するときの言い回し（{x} 入り）。設問IDから引く */
export function deepCite(deepQuestionId: string): string | undefined {
  const m = /^q9_(\d+)_(\d+)$/.exec(deepQuestionId)
  if (!m) return undefined
  return JOB_FAMILIES[Number(m[1]) - 1]?.details[Number(m[2]) - 1]?.deep.cite
}
