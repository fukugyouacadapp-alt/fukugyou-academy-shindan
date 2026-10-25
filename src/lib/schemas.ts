import { z } from 'zod'

/**
 * 診断結果の「かたち」。
 * 結果は src/lib/diagnose.ts が用意した部品から組み立てる。この定義は、
 * ブラウザに保存した結果を読み戻すときの確認（src/lib/storage.ts）と、部品の点検（npm run check:results）に使う。
 */

export const LAYERS = ['顕在型', '潜在型'] as const
export const CONTRACT_STYLES = ['単発納品', '月額継続', '時間単価', '成果報酬'] as const
export const FITS = ['◎', '○', '△'] as const
export const MARKET_NEEDS = ['◎ 案件多数', '○ 案件あり', '△ 案件少なめ'] as const

const text = (max: number) => z.string().trim().min(1).max(max)
const tag = z.string().trim().min(2).max(30)


export const recommendationSchema = z.object({
  rank: z.int().min(1).max(3),
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
  first_step: text(150),
})

export const resultSchema = z.object({
  nickname: text(30),
  nickname_reason: text(120),
  summary: text(300),
  confidence: z.enum(['high', 'low']),
  strength_tags: z.array(tag).min(3).max(10),
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
  recommendations: z.array(recommendationSchema).length(3),
  growth_hint: text(150),
  cautions: z.array(text(200)).max(5),
})

export type DiagnosisResult = z.infer<typeof resultSchema>
export type Recommendation = z.infer<typeof recommendationSchema>
