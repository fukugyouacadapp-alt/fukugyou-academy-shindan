import { Quoted } from '@/components/Quoted'
import type { DiagnosisResult } from '@/lib/schemas'
import { CTA_LABEL, CTA_URL } from '@/lib/site'
import { CtaLink, ShareButton } from './Buttons'
import { MarketMap } from './MarketMap'
import { RecommendationCard } from './RecommendationCard'

/**
 * 診断結果の画面。
 * いちばん知りたい「おすすめの仕事」を先に見せ、そのあとに得意な市場などを置く（スマホで長くスクロールさせる前に核心へ）。
 * 申し込みの案内は、講師との面談へ誘う（2026-10-24 に、ポートフォリオづくりの案内から変えた）。
 * 二つ名 → 要約・タグ・選んだ回答 → ニッチ複業3つ → 小さな面談の案内 → 市場 → 伸ばす強み → 注意点 → 面談の申し込み → 注意書き
 */
export function ResultView({
  result,
  highlights = [],
  banner,
  footerActions,
}: {
  result: DiagnosisResult
  /** 「あなたが選んだ回答から」に並べる、その人が選んだ回答の文言 */
  highlights?: string[]
  /** 二つ名の上に出す知らせ（見本であること・精度が低いかもしれないこと） */
  banner?: React.ReactNode
  /** いちばん下のボタン（もう一度診断する など） */
  footerActions?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20">
      {banner && <div className="mt-6">{banner}</div>}

      {/* 二つ名 */}
      <section className="pt-10 text-center sm:pt-14">
        <p className="eyebrow justify-center">あなたの複業の二つ名</p>
        <h1 className="mx-auto mt-4 max-w-xl text-[1.75rem] leading-snug sm:text-4xl">{result.nickname}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sub">{result.nickname_reason}</p>
        <div className="mt-6 flex justify-center">
          <ShareButton nickname={result.nickname} tags={result.strength_tags} />
        </div>
      </section>

      {/* 要約・タグ・選んだ回答 */}
      <section className="card mt-10 p-5 sm:p-7">
        <h2 className="text-base">あなたの強み、ひとことで</h2>
        <p className="mt-3 text-[1.05rem] leading-loose">
          <Quoted text={result.summary} />
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="強みハッシュタグ">
          {/* key に番号も入れる：同じタグが2回入っても、表示が崩れないように（以下の一覧も同じ） */}
          {result.strength_tags.map((t, i) => (
            <li key={`${t}-${i}`} className="tag">{t}</li>
          ))}
        </ul>
        {highlights.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-bold text-sub">この結果は、あなたが選んだ次の回答などから読み解きました</p>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {highlights.map(h => (
                <li key={h} className="quote">「{h}」</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ニッチ複業 */}
      <Section eyebrow="おすすめのニッチ複業" title="あなたの強みが活きる3つの仕事" lead="顕在型（本業スキルをすぐ活かせる仕事）を2つ、潜在型（自分では気づきにくい強みを活かす仕事）を1つ選びました。">
        <div className="flex flex-col gap-5">
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
          <p className="text-sm leading-relaxed">
            <span className="font-bold">この3つから、どれを選んで、どう始めるか。</span>
            <br />
            講師との無料面談で、一緒に考えてみませんか。
          </p>
          <CtaLink href={CTA_URL} label={CTA_LABEL} />
        </section>
      )}

      {/* 市場 */}
      <Section eyebrow="得意な市場・領域" title="あなたが活きる場所">
        <MarketMap market={result.market} />
      </Section>

      {/* 伸ばす強み ＋ 注意点 */}
      <section className="mt-12 grid gap-4">
        <div className="card p-5 sm:p-6">
          <h2 className="text-base">伸ばすと選択肢が広がる強み</h2>
          <p className="mt-2 leading-relaxed">{result.growth_hint}</p>
        </div>
        {result.cautions.length > 0 && (
          <div className="notice notice--wait">
            <p className="font-bold">注意しておきたいこと</p>
            <ul className="mt-1 list-disc pl-5">
              {result.cautions.map((c, i) => (
                <li key={`${c}-${i}`}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 面談の申し込み */}
      <section className="mt-12 rounded-[var(--radius-md)] bg-brand-paper p-6 text-center sm:p-10">
        <p className="eyebrow justify-center">次の一歩</p>
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
