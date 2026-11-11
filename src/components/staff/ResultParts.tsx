import { FAMILIES } from '@/data/catalog'
import { JOB_FAMILIES, optionLabel, SLIDERS } from '@/data/questions'
import { RESULT_PARTS } from '@/lib/diagnose'
import { RADAR_AXES } from '@/lib/radar'
import { StaffNav } from './StaffNav'

/**
 * 講師用の「結果の部品の一覧」（/staff/parts。2026-11-11）。
 * 結果画面のうち、おすすめの仕事（/staff/jobs）以外の部品（二つ名・まとめ・六角形・タグ・得意な市場・伸ばす強み・注意点・理由の言い回し）を並べる。
 * 言葉の表は src/lib/diagnose.ts・src/lib/radar.ts・src/data/catalog からそのまま読むので、部品を直すとここも変わる。
 * 文の「型」（どうつなぐか）の説明だけは diagnose() の中身を見て書いたもの。型を変えたらここも直す
 */

const P = RESULT_PARTS
const shortLabel = (label: string) => label.replace(/（.*）$/, '')
/** 選択肢IDの表を、選択肢の言葉の表にする（設問の並び順） */
const rowsOf = (table: Record<string, string>) => Object.entries(table).map(([id, value]) => [optionLabel(id) ?? id, value] as const)
const jobsWithCaution = FAMILIES.flatMap(f => [...f.details.flatMap(d => d.jobs), ...Object.values(f.hidden).flat(), ...f.extension]).filter(
  j => j.caution,
).length

const SECTIONS = [
  { id: 'nickname', title: '二つ名' },
  { id: 'summary', title: 'まとめの文章' },
  { id: 'radar', title: '強みの六角形と、合う複業の方向' },
  { id: 'reason', title: '向いている理由の言い回し' },
  { id: 'tags', title: '強みのタグ' },
  { id: 'market', title: '得意な市場' },
  { id: 'cautions', title: '注意点' },
  { id: 'details', title: '仕事の内容ごとの部品（24種類）' },
] as const

export function ResultParts() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10">
      <p className="eyebrow">講師用</p>
      <h1 className="section-title mt-2">結果の部品の一覧</h1>
      <p className="mt-2 text-sm leading-relaxed text-sub">
        結果画面のうち、おすすめの仕事以外の部品を並べています。結果は AI で作らず、ここにある言葉を回答に合わせて選び、つないで作ります。
      </p>
      <StaffNav current="/staff/parts" />

      <nav aria-label="このページの目次" className="card mt-6 px-5 py-4 text-sm">
        <p className="font-bold">目次</p>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
          {SECTIONS.map(s => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="btn-text">{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="nickname">
        <How>
          「前半」＋「後半」でできています。前半は、3「人から頼まれること」で最初に選んだもの（選んでいなければ、2「いちばん自信がある経験」）で決まります。後半は、1-2「具体的には？」で選んだ仕事の内容で決まります（下の「仕事の内容ごとの部品」）。
        </How>
        <Example>例：「本音を引き出す」＋「採用の伴走者」＝「本音を引き出す採用の伴走者」</Example>
        <Pairs head={['3 人から頼まれること', '二つ名の前半']} rows={rowsOf(P.NICK_Q3)} />
        <Pairs head={['2 いちばん自信がある経験（3 が未回答のとき）', '二つ名の前半']} rows={rowsOf(P.NICK_Q2)} />
        <Sub>二つ名の理由（2通り）</Sub>
        <Quote>人から「（3 の答え）」と頼まれる力と、「（仕事の内容）」の仕事で積んだ経験を、両方持っているからです。</Quote>
        <Quote>「（2 の答え）」ことへの自信と、「（仕事の内容）」の仕事で積んだ経験を、両方持っているからです。（3 が未回答のとき）</Quote>
      </Section>

      <Section id="summary">
        <How>3つの文をつなげて作ります。3文目は、6「仕事の外の経験」を選んだ人だけに出ます。</How>
        <Sub>1文目</Sub>
        <Quote>人から「（3 の答え）」と頼まれることが多く、「（4 の答え）」にやる気が出る、（4 で決まる人物像）です。</Quote>
        <p className="mt-1 text-xs text-sub">3 が未回答なら、前半が「「（2 の答え）」ことにいちばん自信があり、」になります。</p>
        <Pairs head={['4 やる気が出る瞬間', '人物像']} rows={rowsOf(P.PERSON_Q4)} />
        <Sub>2文目</Sub>
        <Quote>（深掘りの言い回し）経験は、別の会社や立場でもそのまま活かせます。</Quote>
        <p className="mt-1 text-xs text-sub">
          深掘りの言い回しは仕事の内容ごとに違います（下の「仕事の内容ごとの部品」）。深掘りで「どれも当てはまらない」なら「「（仕事の内容）」の仕事で積み上げてきた」になります。
        </p>
        <Sub>3文目</Sub>
        <Quote>さらに、仕事の外で（6 の言い回し）ことも、（結び）。</Quote>
        <Pairs head={['6 仕事の外の経験', '言い回し（「」の中に経験の名前が入る）']} rows={rowsOf(P.CITE_Q6)} />
        <Pairs
          head={['6 仕事の外の経験', '結び']}
          rows={[...rowsOf(P.EXPERIENCE_VALUE), ['上のどれでもない経験', '複業ではあなただけの武器になります']]}
        />
      </Section>

      <Section id="radar">
        <How>
          6つの力を、回答から点数で 1〜5 にします。いちばん高い力で「合う複業の方向」（6通り）が決まります。途中経過（STEP3 の後）では、上の4つまでを見せ、「いちばん高い力の一言」を出します。
        </How>
        <ul className="mt-4 flex flex-col gap-3">
          {RADAR_AXES.map(a => (
            <li key={a.id} className="card px-5 py-4 text-sm">
              <p className="font-bold">
                {a.label}
                <span className="ml-2 font-normal text-sub">{a.hint}</span>
              </p>
              <dl className="mt-2 flex flex-col gap-2 leading-relaxed">
                <Row term="途中経過での一言">{a.line}</Row>
                <Row term="合う複業の方向">
                  <span className="font-bold">{a.direction.name}</span>　{a.direction.text}
                </Row>
              </dl>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-sub">点数の付け方は docs/02-result-rules.md の7章にあります。</p>
      </Section>

      <Section id="reason">
        <How>
          おすすめの仕事の「向いている理由」は、その人の回答を2つ引用した前半と、仕事ごとの後半（/staff/jobs の「向いている理由（後半）」）をつないで作ります。
        </How>
        <Quote>（引用1）うえに、（引用2）ので、（仕事ごとの後半）</Quote>
        <p className="mt-1 text-xs text-sub">2件目の仕事では「うえに」が「ことに加えて」になります（引用1が「多い」で終わるときを除く）。</p>
        <Pairs
          head={['引用する設問', '言い回し（「」の中に選んだ言葉が入る）']}
          rows={[
            ['2 いちばん自信がある経験', P.CITE.q2],
            ['3 人から頼まれること', P.CITE.q3],
            ['4 やる気が出る瞬間', P.CITE.q4],
            ['5 仕事で関わる相手', P.CITE.q5],
            ['1-2 仕事の内容（深掘りが未回答のとき）', '「（仕事の内容）」の仕事をしている'],
            ['9 深掘り', '仕事の内容ごとに違う（下の「仕事の内容ごとの部品」）'],
          ]}
        />
        <p className="mt-2 text-xs text-sub">6「仕事の外の経験」の言い回しは、上の「まとめの文章」の表と同じです。</p>
      </Section>

      <Section id="tags">
        <How>
          本業のタグ（仕事の内容のタグ＋深掘りの答えのタグ）と、選ばれた仕事のタグを合わせて、最大8つ出します。仕事のタグが本業のタグとすべて重なったときだけ、下の表の言葉で補います。
        </How>
        <Pairs head={['3 人から頼まれること', '補うタグ']} rows={rowsOf(P.TAG_Q3)} />
        <Pairs head={['2 いちばん自信がある経験（3 が未回答のとき）', '補うタグ']} rows={rowsOf(P.TAG_Q2)} />
      </Section>

      <Section id="market">
        <How>
          市場の名前は「（仕事の内容ごとの市場）を（支え方）仕事」です。市場は 8-1 で会社寄りなら会社向け、個人寄りなら個人向け、真ん中なら仕事の内容ごとに決めた側を使います。支え方は 8-2 で「前に立って支える」「裏方で支える」、真ん中なら「そばで支える」です。
        </How>
        <Example>例：「会社の採用・人づくり」＋「裏方で支える」＝「会社の採用・人づくりを裏方で支える仕事」</Example>
        <p className="mt-3 text-sm">
          説明文は、働き方の好み（8-1〜8-3）のうち偏りの大きい2つについて、下の文を1つずつつなげます。
        </p>
        {SLIDERS.map(s => {
          const c = P.AXIS_COMMENT[s.id]
          if (!c) return null
          return (
            <Pairs
              key={s.id}
              head={[`${s.no} ${s.left} ↔ ${s.right}`, '説明文']}
              rows={[
                ['左に寄せた', c.left],
                ['真ん中', c.mid],
                ['右に寄せた', c.right],
              ]}
            />
          )
        })}
      </Section>

      <Section id="cautions">
        <How>次の3種類を合わせて、最大5つ出します。</How>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
          <li>仕事の内容ごとの注意点（下の「仕事の内容ごとの部品」。ある内容だけ）</li>
          <li>
            選ばれた仕事の注意点（{jobsWithCaution}件の仕事にあり。/staff/jobs の各仕事の「くわしく」の中）
          </li>
          <li>
            7-2 で「3時間未満」を選んだ人：<span className="text-sub">{P.SHORT_TIME_CAUTION}</span>
          </li>
        </ul>
      </Section>

      <Section id="details">
        <How>1-2「具体的には？」で選んだ仕事の内容ごとに、次の部品を使います。</How>
        {FAMILIES.map((family, fi) => (
          <div key={family.label} className="mt-6">
            <h3 className="font-bold">{shortLabel(family.label)}</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {family.details.map((detail, di) => {
                const deep = JOB_FAMILIES[fi].details[di]?.deep
                return (
                  <li key={detail.label} className="card px-5 py-4 text-sm">
                    <p className="font-bold">{detail.label}</p>
                    <dl className="mt-2 flex flex-col gap-2 leading-relaxed">
                      <Row term="二つ名の後半">{detail.role}</Row>
                      <Row term="本業のタグ">{detail.tags.join('　')}</Row>
                      {deep && (
                        <Row term={`深掘り「${deep.title}」の答えごとのタグ`}>
                          <ul className="flex flex-col gap-0.5">
                            {deep.options.map((o, i) => (
                              <li key={o}>
                                {o} → {detail.deep[i]?.tag ?? '（なし）'}
                              </li>
                            ))}
                          </ul>
                        </Row>
                      )}
                      {deep && <Row term="深掘りの言い回し（{x} に答えが入る）">{deep.cite}</Row>}
                      <Row term="得意な市場">
                        会社向け：{detail.field.b}／個人向け：{detail.field.c}
                        <span className="text-sub">（8-1 が真ん中なら{detail.lean === 'b' ? '会社' : '個人'}向け）</span>
                      </Row>
                      <Row term="伸ばすと広がる強み">{detail.growth}</Row>
                      {detail.caution && <Row term="注意点">{detail.caution}</Row>}
                    </dl>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({ id, children }: { id: (typeof SECTIONS)[number]['id']; children: React.ReactNode }) {
  const n = SECTIONS.findIndex(s => s.id === id) + 1
  return (
    <section id={id} className="mt-12 scroll-mt-6">
      <h2 className="text-xl font-bold">
        {n}. {SECTIONS[n - 1].title}
      </h2>
      {children}
    </section>
  )
}

function How({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed">{children}</p>
}

function Example({ children }: { children: React.ReactNode }) {
  return <p className="notice mt-3 text-sm">{children}</p>
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-bold">{children}</h3>
}

function Quote({ children }: { children: React.ReactNode }) {
  return <p className="card mt-2 px-4 py-3 text-sm leading-relaxed">{children}</p>
}

function Pairs({ head, rows }: { head: [string, string]; rows: readonly (readonly [string, string])[] }) {
  return (
    <table className="mt-3 w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-line-strong text-xs text-sub">
          <th scope="col" className="w-2/5 py-1.5 pr-3 font-normal">{head[0]}</th>
          <th scope="col" className="py-1.5 font-normal">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a} className="border-b border-line align-top">
            <th scope="row" className="py-2 pr-3 font-normal">{a}</th>
            <td className="py-2 font-bold leading-relaxed">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-sub">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}
