import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { OPERATOR, SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: '回答の取り扱い',
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="section-title">回答の取り扱い</h1>
        <div className="mt-8 flex flex-col gap-8 leading-relaxed">
          <Block title="名前・連絡先はうかがいません">
            {SITE_NAME}は登録不要です。名前・メールアドレス・会社名などを入力する欄はありません。回答はすべて選択式です。
          </Block>
          <Block title="回答と結果は保存しません">
            回答と診断結果は、お使いのブラウザの中（タブを閉じると消える一時的な保存場所）にだけ置かれます。運営のサーバーやデータベースには保存しません。
          </Block>
          <Block title="AIによる分析">
            深掘りの質問と診断結果をつくるため、STEP1〜4で選んだ回答の文言と、深掘り（STEP5）の質問・そこで選んだ答えを、Google の生成AI（Gemini API）に送ります。回答はすべて決まった選択肢から選ぶ形なので、名前や連絡先などが送られることはありません。
            無料の利用枠を使っている間は、Google の規約により、送った内容とAIの答えが Google のサービス改善に使われたり、品質の確認のために Google の担当者が読んだりすることがあります。
          </Block>
          <Block title="回数制限とアクセスの記録">
            AIの利用が集中しすぎないよう、短い時間に同じ場所から何度も診断された場合は、しばらくお待ちいただくことがあります。そのために、接続元の IP アドレス（インターネット上の住所にあたる番号）を、サーバーのメモリの中で一時的に使います。データベースなどには保存せず、時間がたつと消えます。
            なお、このサイトを置いているサービス（Vercel）の通常のアクセス記録には、IP アドレスや見たページ、ブラウザの種類などが一定期間残ることがあります。
          </Block>
          <Block title="アクセスの計測">
            サイトの改善のため、Vercel Web Analytics で、どのページが見られたか・どこから来たか・端末の種類などを、個人を特定しない形で数えています。あわせて、「診断を始めた」「深掘りの質問をとばした」「診断を終えた」「X でシェアするボタンを押した」「申し込みボタンを押した」という操作の回数を数えています。診断を終えたときは、結果の確からしさの目安（AIがつける「高い」か「低い」かの2通り）だけを一緒に送ります。回答の中身や診断結果の文章は送りません。
          </Block>
          <Block title="結果について">
            診断結果はAIによる提案です。収入や案件の獲得を約束するものではありません。副業を始める前に、お勤め先の就業規則（副業のルール）を確認してください。
          </Block>
          <Block title="運営">{OPERATOR}</Block>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  )
}
