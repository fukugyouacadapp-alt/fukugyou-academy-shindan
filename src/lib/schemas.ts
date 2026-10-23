import { z } from 'zod'

/**
 * AIの出力の「かたち」。
 * - zod の定義：サーバーで受け取った結果を確かめる（崩れていたら1回だけやり直す）
 * - GEMINI_* の定義：Gemini に「この形で返して」と渡す（responseSchema。OpenAPI の書き方）
 *
 * 文字数は指示文より少しゆるくしてある。数文字はみ出しただけで結果を捨てると、
 * 待たせた末にエラーになるため。崩れを見るのは「形」と「選択肢の値」。
 */

export const LAYERS = ['顕在型', '潜在型'] as const
export const CONTRACT_STYLES = ['単発納品', '月額継続', '時間単価', '成果報酬'] as const
export const FITS = ['◎', '○', '△'] as const
export const MARKET_NEEDS = ['◎ 案件多数', '○ 案件あり', '△ 案件少なめ'] as const

const text = (max: number) => z.string().trim().min(1).max(max)
const tag = z.string().trim().min(2).max(30)

const evidenceItem = z.object({ label: text(40), evidence: text(80) })

export const recommendationSchema = z.object({
  rank: z.int().min(1).max(5),
  layer: z.enum(LAYERS),
  job_title: text(45),
  combo: z.array(tag).min(2).max(4),
  what: text(200),
  who_needs: text(150),
  why_you: text(250),
  niche_point: text(150),
  contract_style: z.enum(CONTRACT_STYLES),
  fit: z.enum(FITS),
  market_need: z.enum(MARKET_NEEDS),
  search_keywords: z.array(text(40)).min(1).max(4),
  first_step: text(150),
})

export const resultSchema = z.object({
  nickname: text(30),
  nickname_reason: text(120),
  summary: text(300),
  confidence: z.enum(['high', 'low']),
  strength_tags: z.array(tag).min(3).max(10),
  strengths: z.object({
    mind: z.array(evidenceItem).min(1).max(4),
    technique: z.array(evidenceItem).min(1).max(4),
    knowledge: z.array(evidenceItem).min(1).max(4),
    core: text(120),
  }),
  skill_map: z.object({
    hongyo: z.array(tag).min(1).max(5),
    kenzai: z.array(tag).min(1).max(5),
    senzai: z.array(tag).min(1).max(5),
  }),
  market: z.object({
    domain_name: text(40),
    axes: z.array(z.object({ left: text(20), right: text(20), position: z.int().min(-2).max(2) })).length(2),
    comment: text(200),
  }),
  recommendations: z.array(recommendationSchema).length(5),
  growth_hint: text(150),
  cautions: z.array(text(200)).max(5),
})

export type DiagnosisResult = z.infer<typeof resultSchema>
export type Recommendation = z.infer<typeof recommendationSchema>

export const followUpSchema = z.object({
  questions: z
    .array(
      z.object({
        question: text(60),
        options: z.array(text(40)).length(4),
        intent: z.string().optional(),
      }),
    )
    .min(1)
    .max(2),
})

// ── Gemini に渡す形（OpenAPI の書き方。type は大文字） ──

const S = { type: 'STRING' } as const
const strArr = { type: 'ARRAY', items: S } as const
const evidence = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { label: S, evidence: S }, required: ['label', 'evidence'] },
} as const

export const GEMINI_RESULT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    nickname: S,
    nickname_reason: S,
    summary: S,
    confidence: { type: 'STRING', enum: ['high', 'low'] },
    strength_tags: strArr,
    strengths: {
      type: 'OBJECT',
      properties: { mind: evidence, technique: evidence, knowledge: evidence, core: S },
      required: ['mind', 'technique', 'knowledge', 'core'],
      propertyOrdering: ['mind', 'technique', 'knowledge', 'core'],
    },
    skill_map: {
      type: 'OBJECT',
      properties: { hongyo: strArr, kenzai: strArr, senzai: strArr },
      required: ['hongyo', 'kenzai', 'senzai'],
      propertyOrdering: ['hongyo', 'kenzai', 'senzai'],
    },
    market: {
      type: 'OBJECT',
      properties: {
        domain_name: S,
        axes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { left: S, right: S, position: { type: 'INTEGER' } },
            required: ['left', 'right', 'position'],
          },
        },
        comment: S,
      },
      required: ['domain_name', 'axes', 'comment'],
      propertyOrdering: ['domain_name', 'axes', 'comment'],
    },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rank: { type: 'INTEGER' },
          layer: { type: 'STRING', enum: [...LAYERS] },
          job_title: S,
          combo: strArr,
          what: S,
          who_needs: S,
          why_you: S,
          niche_point: S,
          contract_style: { type: 'STRING', enum: [...CONTRACT_STYLES] },
          fit: { type: 'STRING', enum: [...FITS] },
          market_need: { type: 'STRING', enum: [...MARKET_NEEDS] },
          search_keywords: strArr,
          first_step: S,
        },
        required: ['rank', 'layer', 'job_title', 'combo', 'what', 'who_needs', 'why_you', 'niche_point', 'contract_style', 'fit', 'market_need', 'search_keywords', 'first_step'],
        propertyOrdering: ['rank', 'layer', 'job_title', 'combo', 'what', 'who_needs', 'why_you', 'niche_point', 'contract_style', 'fit', 'market_need', 'search_keywords', 'first_step'],
      },
    },
    growth_hint: S,
    cautions: strArr,
  },
  required: ['nickname', 'nickname_reason', 'summary', 'confidence', 'strength_tags', 'strengths', 'skill_map', 'market', 'recommendations', 'growth_hint', 'cautions'],
  propertyOrdering: ['nickname', 'nickname_reason', 'summary', 'confidence', 'strength_tags', 'strengths', 'skill_map', 'market', 'recommendations', 'growth_hint', 'cautions'],
} as const

export const GEMINI_FOLLOWUP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { question: S, options: strArr, intent: S },
        required: ['question', 'options'],
        propertyOrdering: ['question', 'options', 'intent'],
      },
    },
  },
  required: ['questions'],
} as const

/**
 * 結果に書いてはいけない言葉が混じっていないか（docs/02-ai-prompts.md「7. 守ること」）。
 * 指示文で禁じていても、まれに出る。見つかったら1回だけ作り直す。
 * 普通の文まで引っかけると、2回とも落ちて結果を出せなくなるので、言い回しは狭めに書く（「確実に」単独は見ない、など）。
 * inCautions：注意点（cautions）でも見るもの。注意点は「〇〇の代行は資格が必要です」のように説明に使う言葉が多いので、金額だけ見る
 */
const POLICY_PATTERNS: { re: RegExp; why: string; inCautions: boolean }[] = [
  {
    re: /\d[\d,.]*\s*(万|千|百)?円|[〇一二三四五六七八九十百千万億]*[十百千万億]円|数[十百千万]+円|月収|年収\s*\d|時給\s*\d|日給|月\s*\d+\s*万|\d+\s*万\s*(稼|以上|超|アップ)|\d+\s*ドル|\$\s*\d/,
    why: '金額',
    inCautions: true,
  },
  {
    re: /稼げ|稼ぐ|儲か|儲け|確実に(稼|儲|収入|成功|成果|案件|仕事)|誰でも(簡単|稼|でき|すぐ)|必ず(稼|儲|成功|収入)|不労所得|高収入|楽して/,
    why: '誇大な表現',
    // 注意点には「『誰でも稼げる』をうたう案件に気をつけて」のような書き方がありうるので見ない
    inCautions: false,
  },
  {
    re: /申請.{0,6}代行|代行.{0,4}申請|(補助金|助成金).{0,8}(申請書|代行)|確定申告.{0,4}(代行|作成)|税務(申告|代理|相談)|社会保険.{0,6}代行|労務手続き.{0,4}代行|登記|法律相談|契約書.{0,4}(作成代行|リーガルチェック|審査)|投資の?助言|銘柄|金融商品.{0,4}(勧誘|販売)|職業紹介|転職.{0,3}(斡旋|あっせん)|医療行為|保険.{0,2}(募集|販売)|不動産.{0,2}仲介|旅行.{0,2}手配/,
    why: '資格や許可が必要な仕事',
    inCautions: false,
  },
  { re: /情報商材|ネットワークビジネス|マルチ商法/, why: '勧めない仕事', inCautions: false },
]

/** 全角の英数字・記号を半角にそろえる（「５万円」「１０，０００円」も見逃さないように） */
const nfkc = (s: string) => s.normalize('NFKC')

/** 結果の中の文字列をすべて取り出す（項目ごとに分けておく。つなげると「」が項目をまたいで対応してしまう） */
function texts(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(texts)
  if (v && typeof v === 'object') return Object.values(v).flatMap(texts)
  return []
}

/** answersText は AI に渡した回答の文章。「」の中がその回答の言葉そのものなら、本人の回答の引用なので見ない */
export function policyIssues(result: DiagnosisResult, answersText: string): string[] {
  const answers = nfkc(answersText)
  const strip = (s: string) => nfkc(s).replace(/「([^「」]*)」/g, (all, quote: string) => (quote && answers.includes(quote) ? '「」' : all))
  const body = texts({ ...result, cautions: [] }).map(strip)
  const cautions = texts(result.cautions).map(strip)
  return POLICY_PATTERNS.filter(p => body.some(s => p.re.test(s)) || (p.inCautions && cautions.some(s => p.re.test(s)))).map(p => p.why)
}

/**
 * 指示文の決まり（内訳・引用・職種名の長さ）が守られているか。
 * 形の検証（zod）に入れると、外れたときに結果が出せなくなるので、ここで別に数えて「1回だけ作り直す」に回す。
 * answersText は AI に渡した回答の文章（引用が本当に回答の言葉かを確かめるため）。
 */
export function qualityIssues(r: DiagnosisResult, answersText: string): string[] {
  const issues: string[] = []
  const kenzai = r.recommendations.filter(x => x.layer === '顕在型').length
  if (kenzai !== 3) issues.push(`顕在型が${kenzai}件（3件のはず）`)
  // 引用が回答の言葉かは、全角半角・空白・区切り記号の違いを無視して比べる（「3〜5時間」と「3~5時間」など）。
  // 2文字以下の引用は、見出しなどの短い言葉に偶然一致するので数えない
  const loose = (s: string) => nfkc(s).replace(/[\s・／/〜~、。,.]/g, '')
  const looseAnswers = loose(answersText)
  for (const rec of r.recommendations) {
    const quotes = [...rec.why_you.matchAll(/「([^」]+)」/g)].map(m => loose(m[1]))
    if (quotes.length < 2) issues.push(`No.${rec.rank} の引用が${quotes.length}個`)
    else if (!quotes.some(q => q.length >= 3 && looseAnswers.includes(q))) issues.push(`No.${rec.rank} の引用が回答の言葉ではない`)
    if (rec.job_title.length > 32) issues.push(`No.${rec.rank} の職種名が長い`)
    if (rec.layer === '潜在型' && !rec.combo.some(t => r.skill_map.senzai.includes(t))) {
      issues.push(`No.${rec.rank}（潜在型）に潜在型のタグがない`)
    }
  }
  return issues
}
