import Image from 'next/image'
import { Quoted } from '@/components/Quoted'
import type { DiagnosisResult } from '@/lib/schemas'
import { CTA_LABEL, CTA_URL } from '@/lib/site'
import { BubbleCard, IconRow } from './Blocks'
import { CtaLink } from './Buttons'
import { Icon } from './Icon'
import { MarketMap } from './MarketMap'
import { RecommendationCard } from './RecommendationCard'

/**
 * 診断結果の画面。
 * いちばん知りたい「おすすめの仕事」を先に見せ、そのあとに得意な市場などを置く（スマホで長くスクロールさせる前に核心へ）。
 * 申し込みの案内は、講師との面談へ誘う（2026-10-24 に、ポートフォリオづくりの案内から変えた）。
 * 見た目は、イラストと吹き出しの見出し・アイコン付きの行で読ませる（2026-10-26 に、文章中心の画面から変えた）。
 * イラスト・二つ名 → 強み（要約・タグ・選んだ回答） → ニッチ複業3つ → 小さな面談の案内 → 市場 → 伸ばす強み → 注意点 → 面談の申し込み → 注意書き
 */

/**
 * 仕事のタイプごとのイラスト（src/data/questions.ts の JOB_FAMILIES と同じ並び）。
 * unDraw の絵の色を、サイトのオレンジ・青に変えたもの（public/illustrations/）。大きさは絵の縦横の比を伝えるためのもの
 */
const FAMILY_ILLUSTRATIONS = [
  { src: '/illustrations/talk.svg', width: 986, height: 656 }, // 人と話す仕事
  { src: '/illustrations/plan.svg', width: 800, height: 546 }, // 企画・発信する仕事
  { src: '/illustrations/office.svg', width: 866, height: 576 }, // 組織を支える仕事
  { src: '/illustrations/create.svg', width: 800, height: 601 }, // つくる仕事
  { src: '/illustrations/care.svg', width: 1086, height: 783 }, // 人をケアする・教える仕事
  { src: '/illustrations/field.svg', width: 800, height: 484 }, // 現場を動かす仕事
] as const

export function ResultView({
  result,
  highlights = [],
  family = null,
  banner,
  footerActions,
}: {
  result: DiagnosisResult
  /** 「あなたが選んだ回答から」に並べる、その人が選んだ回答の文言 */
  highlights?: string[]
  /** 1「いまの仕事に近いのは？」で選んだ仕事のタイプの番号。いちばん上のイラストを選ぶ（分からなければ出さない） */
  family?: number | null
  /** 二つ名の上に出す知らせ（見本であること・精度が低いかもしれないこと） */
  banner?: React.ReactNode
  /** いちばん下のボタン（もう一度診断する など） */
  footerActions?: React.ReactNode
}) {
  const illustration = family === null ? undefined : FAMILY_ILLUSTRATIONS[family]
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20">
      {banner && <div className="mt-6">{banner}</div>}

      {/* イラスト・二つ名 */}
      <section className="pt-8 text-center sm:pt-12">
        {illustration && (
          // 飾りの絵なので読み上げない（中身は二つ名と文章で伝える）。最初に目に入るので、後回しにせず読み込む
          <Image {...illustration} alt="" loading="eager" className="mx-auto h-auto w-[min(100%,300px)]" />
        )}
        <p className={`eyebrow justify-center ${illustration ? 'mt-6' : ''}`}>あなたの複業の二つ名</p>
        {/* 枠を文字の幅に合わせるため、見出し自体は行の中の箱にし、外側の div で行を分ける */}
        <div className="mt-3">
          <h1 className="nickname-frame max-w-2xl text-[1.6rem] leading-snug sm:text-4xl">{result.nickname}</h1>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-sub">{result.nickname_reason}</p>
      </section>

      {/* 要約・タグ・選んだ回答 */}
      <BubbleCard label="あなたの強み、ひとことで">
        <p className="text-[1.05rem] leading-loose">
          <Quoted text={result.summary} />
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="強みハッシュタグ">
          {/* key に番号も入れる：同じタグが2回入っても、表示が崩れないように（以下の一覧も同じ） */}
          {result.strength_tags.map((t, i) => (
            <li key={`${t}-${i}`} className="tag">{t}</li>
          ))}
        </ul>
        {highlights.length > 0 && (
          <div className="mt-6 border-t border-dashed border-line pt-5">
            <p className="text-xs font-bold text-sub">この結果は、あなたが選んだ次の回答などから読み解きました</p>
            <ul className="mt-3 flex flex-col gap-2">
              {highlights.map(h => (
                <li key={h} className="flex items-start gap-2">
                  <Icon name="circle-check" size={22} className="shrink-0 text-brand-ink" />
                  <span className="quote">「{h}」</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </BubbleCard>

      {/* ニッチ複業 */}
      <Section eyebrow="おすすめのニッチ複業" title="あなたの強みが活きる3つの仕事" lead="顕在型（本業スキルをすぐ活かせる仕事）を2つ、潜在型（自分では気づきにくい強みを活かす仕事）を1つ選びました。">
        <div className="flex flex-col gap-6">
          {result.recommendations.map((rec, i) => (
            <RecommendationCard key={`${rec.rank}-${i}`} rec={rec} featured={rec.rank === 1} />
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-sub">
          ※「強み活用度」「市場ニーズ」「ねらい目の理由」は、あなたの回答をもとにした目安です。実際の案件の数を調べたものではありません。
        </p>
      </Section>

      {CTA_URL && (
        <section className="card mt-8 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3.5">
            <span className="icon-dot">
              <Icon name="messages" />
            </span>
            <p className="text-sm leading-relaxed">
              <span className="font-bold">この3つから、どれを選んで、どう始めるか。</span>
              <br />
              講師との無料面談で、一緒に考えてみませんか。
            </p>
          </div>
          <CtaLink href={CTA_URL} label={CTA_LABEL} />
        </section>
      )}

      {/* 市場 */}
      <BubbleCard label="あなたが活きる場所">
        <MarketMap market={result.market} />
      </BubbleCard>

      {/* 伸ばす強み ＋ 注意点 */}
      <section className="mt-8 grid gap-4">
        <div className="card px-4 py-1 sm:px-6">
          <IconRow icon="seedling" label="伸ばすと選択肢が広がる強み">{result.growth_hint}</IconRow>
        </div>
        {result.cautions.length > 0 && (
          <div className="notice notice--wait flex gap-3">
            <Icon name="alert-triangle" className="mt-0.5 shrink-0 text-brand-ink" />
            <div>
              <p className="font-bold">注意しておきたいこと</p>
              <ul className="mt-1 list-disc pl-5">
                {result.cautions.map((c, i) => (
                  <li key={`${c}-${i}`}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 面談の申し込み */}
      <section className="mt-12 rounded-[var(--radius-md)] bg-brand-paper p-6 text-center sm:p-10">
        <Image src="/illustrations/meeting.svg" width={882} height={765} alt="" className="mx-auto h-auto w-[min(100%,200px)]" />
        <p className="eyebrow mt-5 justify-center">次の一歩</p>
        <h2 className="mt-3 text-xl leading-snug sm:text-2xl">
          この結果をもとに、
          <br className="hidden sm:inline" />
          講師と面談してみませんか？
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">
          3つの仕事のどれから始めるか、本業とどう両立するか。面談では、この結果を見ながら、あなたに合う始め方を講師と一緒に考えます。面談は無料です。
        </p>
        {CTA_URL ? (
          <div className="mt-6">
            <CtaLink href={CTA_URL} label={CTA_LABEL} />
          </div>
        ) : (
          <p className="mt-6 text-xs text-sub">（申し込み先は準備中です）</p>
        )}
      </section>

      {/* 固定の注意書き */}
      <ul className="mt-10 flex flex-col gap-1 text-xs leading-relaxed text-sub">
        <li>・複業（副業）を始める前に、お勤め先の就業規則（副業のルール）を確認してください。</li>
        <li>・この結果は、選んだ回答をもとにした提案です。収入や案件の獲得を約束するものではありません。</li>
      </ul>

      {footerActions && <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">{footerActions}</div>}
    </div>
  )
}

function Section({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-2">{title}</h2>
      {lead && <p className="mt-2 text-sm leading-relaxed text-sub">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}
