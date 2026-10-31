import Image from 'next/image'
import { Quoted } from '@/components/Quoted'
import { RadarChart } from '@/components/RadarChart'
import { caseStudyFor } from '@/data/case-studies'
import { RADAR_AXES } from '@/lib/radar'
import type { DiagnosisResult, Recommendation } from '@/lib/schemas'
import { CTA_LABEL, CTA_URL, OPEN_JOBS } from '@/lib/site'
import { BubbleCard, IconRow } from './Blocks'
import { CtaLink } from './Buttons'
import { Icon } from './Icon'
import { RecommendationCard } from './RecommendationCard'
import { ResultCode } from './ResultCode'

/**
 * 診断結果の画面。並びは要件定義（複業アカデミー様・2026-10-29 版）の4章「結果画面」のとおり（2026-10-31 に組み替えた）。
 * イラスト・キャッチフレーズ → 強みの一言（要約・タグ・選んだ回答） → 6つの力の六角形 → 合う複業の方向
 * → おすすめの仕事3つ（一部を伏せる） → アカデミー生の事例（文面を受け取ってから） → 面談の予約 → 注意書き
 * 仕事は、OPEN_JOBS（src/lib/site.ts）の数だけ見せて、残りはぼかしと鍵で「続きは無料面談で」にする（要件定義 R14）。
 * 予約のボタンは、この画面のいちばん下の1か所だけに置く（途中経過の画面には置かない）。そのすぐ上に、講師へ伝えてもらう診断番号を出す。
 * 講師用のページ（/staff）でも同じ画面を使う（forStaff）。そのときは仕事を3つとも見せ、講師向けの欄（得意な市場・伸ばす強み・注意点）を足し、予約の欄は出さない。
 * 見た目は、イラストと吹き出しの見出し・アイコン付きの行で読ませる（2026-10-26 に、文章中心の画面から変えた）。
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
  code,
  forStaff = false,
  banner,
  footerActions,
}: {
  result: DiagnosisResult
  /** 「あなたが選んだ回答から」に並べる、その人が選んだ回答の文言 */
  highlights?: string[]
  /** 1「いまの仕事に近いのは？」で選んだ仕事のタイプの番号。いちばん上のイラストを選ぶ（分からなければ出さない） */
  family?: number | null
  /** 診断番号（src/lib/result-code.ts）。予約の欄に出す */
  code?: string
  /** 講師用のページで使うとき true（仕事を全部見せ、講師向けの欄を足し、予約の欄を出さない） */
  forStaff?: boolean
  /** キャッチフレーズの上に出す知らせ（見本であること・精度が低いかもしれないこと） */
  banner?: React.ReactNode
  /** いちばん下のボタン（もう一度診断する など） */
  footerActions?: React.ReactNode
}) {
  const illustration = family === null ? undefined : FAMILY_ILLUSTRATIONS[family]
  const open = forStaff ? result.recommendations.length : OPEN_JOBS
  const openJobs = result.recommendations.slice(0, open)
  const lockedJobs = result.recommendations.slice(open)
  const caseStudy = caseStudyFor(result.direction.name)
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20">
      {banner && <div className="mt-6">{banner}</div>}

      {/* 1. イラスト・キャッチフレーズ */}
      <section className="pt-8 text-center sm:pt-12">
        {illustration && (
          // 飾りの絵なので読み上げない（中身はキャッチフレーズと文章で伝える）。最初に目に入るので、後回しにせず読み込む
          <Image {...illustration} alt="" loading="eager" className="mx-auto h-auto w-[min(100%,300px)]" />
        )}
        <p className={`eyebrow justify-center ${illustration ? 'mt-6' : ''}`}>あなたのキャッチフレーズ</p>
        {/* 枠を文字の幅に合わせるため、見出し自体は行の中の箱にし、外側の div で行を分ける */}
        <div className="mt-3">
          <h1 className="nickname-frame max-w-2xl text-[1.6rem] leading-snug sm:text-4xl">{result.nickname}</h1>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-sub">{result.nickname_reason}</p>
      </section>

      {/* 1. 強みの一言（要約・タグ・選んだ回答） */}
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

      {/* 2. 6つの力（六角形）と 3. 合う複業の方向。伏せずに見せる（要件定義 R13） */}
      <BubbleCard label="あなたの6つの力">
        <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,300px)_1fr]">
          <RadarChart axes={result.radar} className="mx-auto w-full max-w-[300px]" />
          <ul className="grid grid-cols-2 gap-2">
            {result.radar.map(p => (
              <li key={p.id} className="rounded-[var(--radius-sm)] bg-well px-3 py-2">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold">{p.label}</span>
                  <span className="text-xs font-bold tabular-nums text-brand-ink">{p.value}/5</span>
                </p>
                <p className="text-xs text-sub">{RADAR_AXES.find(a => a.id === p.id)?.hint}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-7 border-t border-dashed border-line pt-6 text-center">
          <p className="text-xs font-bold text-sub">合う複業の方向</p>
          <p className="mt-2 text-xl font-bold leading-snug sm:text-2xl">あなたは「{result.direction.name}」</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">{result.direction.text}</p>
        </div>
      </BubbleCard>

      {/* 4・5. ニッチ複業。OPEN_JOBS の数だけ見せ、残りは伏せる */}
      <Section eyebrow="おすすめのニッチ複業" title="あなたの強みが活きる3つの仕事" lead="顕在型（本業スキルをすぐ活かせる仕事）を2つ、潜在型（自分では気づきにくい強みを活かす仕事）を1つ選びました。">
        {openJobs.length > 0 && (
          <div className="flex flex-col gap-6">
            {openJobs.map((rec, i) => (
              <RecommendationCard key={`${rec.rank}-${i}`} rec={rec} featured={rec.rank === 1} />
            ))}
          </div>
        )}
        {lockedJobs.length > 0 && <LockedJobs recs={lockedJobs} />}
        {openJobs.length > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-sub">
            ※「強み活用度」「市場ニーズ」「ねらい目の理由」は、あなたの回答をもとにした目安です。実際の案件の数を調べたものではありません。
          </p>
        )}
      </Section>

      {/* 講師向けの欄（講師用のページだけ） */}
      {forStaff && (
        <section className="card mt-8 px-4 py-1 sm:px-6">
          <IconRow icon="map-pin" label="得意な市場">
            {result.market.domain_name}。{result.market.comment}
          </IconRow>
          <IconRow icon="seedling" label="伸ばすと選択肢が広がる強み">{result.growth_hint}</IconRow>
          {result.cautions.length > 0 && (
            <IconRow icon="alert-triangle" label="注意しておきたいこと">
              <ul className="list-disc pl-5">
                {result.cautions.map((c, i) => (
                  <li key={`${c}-${i}`}>{c}</li>
                ))}
              </ul>
            </IconRow>
          )}
        </section>
      )}

      {/* 6. アカデミー生の事例（文面を受け取ってから。無ければ出さない） */}
      {caseStudy && (
        <BubbleCard label="アカデミー生の事例">
          <p className="font-bold">{caseStudy.title}</p>
          <p className="mt-2 leading-relaxed">{caseStudy.text}</p>
          <p className="mt-3 text-xs text-sub">※ 一人の例です。同じ結果になることを約束するものではありません。</p>
        </BubbleCard>
      )}

      {/* 7. 面談の予約。予約のボタンは、この画面ではここだけ（講師用のページでは出さない） */}
      {!forStaff && (
        <section id="consult" className="mt-12 rounded-[var(--radius-md)] bg-brand-paper p-6 text-center sm:p-10">
          <Image src="/illustrations/meeting.svg" width={882} height={765} alt="" className="mx-auto h-auto w-[min(100%,200px)]" />
          <p className="eyebrow mt-5 justify-center">続きは無料面談で</p>
          <h2 className="mt-3 text-xl leading-snug sm:text-2xl">
            {lockedJobs.length > 0 ? (
              <>
                伏せた{lockedJobs.length}つの仕事を、
                <br className="hidden sm:inline" />
                講師と一緒に見てみませんか？
              </>
            ) : (
              <>
                この結果をもとに、
                <br className="hidden sm:inline" />
                講師と面談してみませんか？
              </>
            )}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">
            面談では、この結果を見ながら、あなたに合う仕事と始め方を講師と一緒に考えます。3つのうちどれから始めるか、本業とどう両立するかも相談できます。面談は無料です。
          </p>
          {/*
            選択肢にぴったり当てはまらなかった人への一言。記入欄は作らないので（docs/01-site-build-prompt.md の3章）、
            誰が当てはまらなかったかは分からない。全員に出す（2026-10-28）
          */}
          <div className="card mx-auto mt-6 max-w-lg p-4 text-left text-sm leading-relaxed">
            <p className="font-bold">選択肢にぴったりの仕事がなかった人へ</p>
            <p className="mt-1">
              いくつかの仕事にまたがる働き方や、まだ名前のない働き方は、それ自体があなたの強みになります。自分の仕事をどう名乗るかも、面談で一緒に考えられます。
            </p>
          </div>
          {code && <ResultCode code={code} />}
          <div className="mt-6">
            {CTA_URL ? (
              <CtaLink href={CTA_URL} label={CTA_LABEL} />
            ) : (
              // 予約ページのURLが入るまでは、押せないボタンの形だけ見せる（要件定義7章：飛び先は仮でよい）
              <>
                <span aria-disabled="true" className="btn-primary w-full cursor-not-allowed opacity-50 sm:w-auto">
                  {CTA_LABEL}
                </span>
                <p className="mt-3 text-xs text-sub">（予約ページは準備中です）</p>
              </>
            )}
          </div>
        </section>
      )}

      {/* 8. 固定の注意書き */}
      <ul className="mt-10 flex flex-col gap-1 text-xs leading-relaxed text-sub">
        <li>・複業を始める前に、お勤め先の就業規則（会社の外で働くときの決まり）を確認してください。</li>
        <li>・この結果は、選んだ回答をもとにした提案です。収入や案件の獲得を約束するものではありません。</li>
      </ul>

      {footerActions && <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">{footerActions}</div>}
    </div>
  )
}

/**
 * 伏せた仕事。ぼかしと鍵で「中身がある」ことだけ見せる（要件定義 R14）。
 * 本物の仕事の名前や理由は画面に入れない（ぼかしは見た目だけなので、ページの中身を覗けば読めてしまうため）。
 * ぼかしの下は、どの人にも同じ見本の文。順位と顕在型・潜在型だけは、その人の結果を使う
 */
function LockedJobs({ recs }: { recs: Recommendation[] }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-[var(--radius-md)] border border-line">
      <div aria-hidden className="pointer-events-none flex select-none flex-col gap-4 p-5 blur-[5px]">
        {recs.map(rec => (
          <div key={rec.rank} className="card p-4">
            <p className="text-xs font-bold text-brand-ink">
              おすすめ No.{rec.rank}　{rec.layer}
            </p>
            <p className="mt-1 text-lg font-bold">あなたの経験が活きる、ねらい目の仕事の名前</p>
            <p className="mt-2 text-sm">向いている理由：選んだ回答をもとに、この仕事があなたに合う理由が入ります。</p>
            <p className="mt-1 text-sm">最初の一歩：今週からできる、小さな一歩が入ります。</p>
            <p className="mt-1 text-sm">1年の道のり：始めてから1年で、どこまで進めるかの目安が入ります。</p>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-[var(--color-surface)]/40 p-4">
        <div className="card flex max-w-sm flex-col items-center px-5 py-6 text-center">
          <span className="icon-dot">
            <Icon name="lock" />
          </span>
          <p className="mt-3 font-bold">{recs.length === 3 ? '3つの仕事の中身は' : `残り${recs.length}つの仕事は`}、無料面談で</p>
          <p className="mt-2 text-sm leading-relaxed text-sub">仕事の名前・向いている理由・最初の一歩・1年の道のりを、講師が面談でお伝えします。</p>
          <a href="#consult" className="btn-text mt-3">
            面談について見る
          </a>
        </div>
      </div>
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
