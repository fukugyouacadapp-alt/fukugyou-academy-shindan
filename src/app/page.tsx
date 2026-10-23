import Link from 'next/link'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { RecommendationCard } from '@/components/result/RecommendationCard'
import { SkillLayerMap } from '@/components/result/SkillLayerMap'
import { SAMPLE_RESULT } from '@/data/sample-result'
import { STEPS } from '@/data/questions'

const PROMISES = [
  { no: '01', title: '強みが #ハッシュタグ になる', body: '自分では当たり前だと思っていることを、自己紹介や案件探しにそのまま使える言葉にします。' },
  { no: '02', title: 'ニッチな複業が5つ見つかる', body: '「Webライター」のようなよくある副業ではなく、強みの掛け合わせで、ライバルが少なそうな仕事を提案します。' },
  { no: '03', title: '今週の一歩がわかる', body: '提案ごとに、案件を探すキーワードと、30分〜2時間でできる最初の一歩が付きます。' },
]

const FLOW = [
  { step: 1, time: '1分' },
  { step: 2, time: '30秒' },
  { step: 3, time: '30秒' },
  { step: 4, time: '30秒' },
  { step: 5, time: '30秒' },
] as const

const FAQ = [
  { q: '本当に無料ですか？', a: '無料です。登録やメールアドレスの入力もいりません。' },
  { q: '文章を書く必要はありますか？', a: 'ありません。すべて選ぶだけで答えられます。' },
  { q: '回答はどこかに保存されますか？', a: 'サーバーには保存しません。回答と結果は、お使いのブラウザの中にだけ置かれ、タブを閉じると消えます。結果をつくるため、選んだ回答の文言（深掘りの質問とその答えを含む）をAI（Google Gemini）に送ります。名前や連絡先はうかがわないので、送ることもありません。くわしくはページ下の「回答の取り扱い」をご覧ください。' },
]

export default function Home() {
  const sample = SAMPLE_RESULT
  return (
    <>
      <SiteHeader right={<Link href="/shindan" className="btn-primary !min-h-11 !px-5 !py-2 !text-sm">診断する</Link>} />
      <main className="flex-1">
        {/* ── ファーストビュー ── */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">複業アカデミーの無料診断</p>
            <h1 className="mt-4 text-[1.85rem] leading-[1.45] sm:text-[2.6rem]">
              あなたの&ldquo;当たり前&rdquo;に、
              <br />
              まだ名前のない
              <br className="sm:hidden" />
              複業が眠っている。
            </h1>
            <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed">
              選ぶだけ約3分。あなたの強みを <span className="whitespace-nowrap font-bold text-brand-ink">#ハッシュタグ</span>（#で始まるキーワード）で言葉にし、その強みが活きる
              <span className="whitespace-nowrap font-bold">ニッチな複業</span>を5つ提案します。
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/shindan" className="btn-primary w-full !min-h-14 !text-lg sm:w-auto sm:!px-12">診断をはじめる</Link>
              <Link href="/result?sample=1" className="btn-text">結果の見本を見る</Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="診断の特長">
              {['約3分', '選ぶだけ', '無料', '登録不要'].map(t => (
                <li key={t} className="badge">{t}</li>
              ))}
            </ul>
          </div>

          {/* 結果の見本（二つ名・タグ・1位の仕事） */}
          <div className="card relative p-6 sm:p-8" aria-label="診断結果の見本">
            <span className="badge absolute right-4 top-4">結果の見本</span>
            <p className="text-xs font-bold text-sub">あなたの複業の二つ名</p>
            <p className="mt-2 font-display text-2xl font-bold leading-snug">{sample.nickname}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {sample.strength_tags.slice(0, 5).map(t => (
                <li key={t} className="tag">{t}</li>
              ))}
            </ul>
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-xs font-bold text-sub">おすすめのニッチ複業 No.1</p>
              <p className="mt-1 text-lg font-bold leading-snug">{sample.recommendations[0].job_title}</p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                {sample.recommendations[0].combo.map((t, i) => (
                  <span key={t} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-sub">×</span>}
                    <span className="tag tag--kenzai !text-xs">{t}</span>
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        {/* ── わかること ── */}
        <section className="bg-well">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <p className="eyebrow">この診断でわかること</p>
            <h2 className="section-title mt-2">強みを言葉にして、仕事につなげる</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PROMISES.map(p => (
                <div key={p.no} className="card p-6">
                  <p className="font-display text-2xl font-bold text-brand-ink">{p.no}</p>
                  <h3 className="mt-2 text-lg leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 考え方 ── */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">診断の考え方</p>
            <h2 className="section-title mt-2">複業は、本業の延長にある</h2>
            <p className="mt-4 leading-relaxed">
              複業とは「複数の本業を積み重ねて、可能性を拡げる働き方」。本業を捨てるのではなく、本業で培ったものを起点に、外へ広げていきます。
            </p>
            <dl className="mt-6 flex flex-col gap-4">
              <Layer name="本業" color="var(--layer-hongyo-ink)">いまの仕事で、そのまま使っているスキル</Layer>
              <Layer name="顕在型" color="var(--layer-kenzai-ink)">本業スキルを、別の会社・別の立場で活かす仕事</Layer>
              <Layer name="潜在型" color="var(--layer-senzai-ink)">子育て・発信・地域活動など、本業の延長や仕事の外で培ったことを活かす仕事。自分では気づきにくい強みです</Layer>
            </dl>
          </div>
          <SkillLayerMap map={sample.skill_map} />
        </section>

        {/* ── 結果の見本 ── */}
        <section className="bg-well">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <p className="eyebrow">結果の見本</p>
            <h2 className="section-title mt-2">「なぜあなたに向いているか」まで書きます</h2>
            <p className="mt-3 text-sm leading-relaxed text-sub">人事・採用の仕事をしている方の回答例です。あなたが選んだ回答を引用しながら、理由を説明します。</p>
            <div className="mt-8">
              <RecommendationCard rec={sample.recommendations[0]} featured />
            </div>
            <div className="mt-6 text-center">
              <Link href="/result?sample=1" className="btn-secondary">結果の見本をぜんぶ見る</Link>
            </div>
          </div>
        </section>

        {/* ── 流れ ── */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <p className="eyebrow">診断の流れ</p>
          <h2 className="section-title mt-2">5つのステップ、全10問・すべて選ぶだけ</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW.map(f => (
              <li key={f.step} className="card flex items-start gap-4 p-5">
                <span className="font-display text-sm font-bold text-brand-ink">STEP{f.step}</span>
                <span>
                  <span className="block font-bold">{STEPS[f.step].title}</span>
                  <span className="text-xs text-sub">約{f.time}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── よくある質問 ── */}
        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="section-title">よくある質問</h2>
          <dl className="mt-6 flex flex-col divide-y divide-line border-y border-line">
            {FAQ.map(f => (
              <div key={f.q} className="py-5">
                <dt className="font-bold">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 最後の誘い ── */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-3xl rounded-[var(--radius-md)] bg-brand-paper px-6 py-12 text-center">
            <h2 className="text-xl leading-snug sm:text-2xl">あなたの強みに、名前をつけてみませんか。</h2>
            <p className="mt-3 text-sm">約3分・選ぶだけ・無料・登録不要</p>
            <Link href="/shindan" className="btn-primary mt-7 !min-h-14 !text-lg sm:!px-12">診断をはじめる</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function Layer({ name, color, children }: { name: string; color: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3">
      <dt className="font-display font-bold" style={{ color }}>{name}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  )
}
