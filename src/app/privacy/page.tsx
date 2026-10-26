import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { OPERATOR, PRIVACY_POLICY_URL, SITE_NAME } from '@/lib/site'

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
          <Block title="回答は外に送りません">
            診断結果は、お使いのブラウザの中で、あらかじめ用意した文面を回答に合わせて組み合わせてつくります。回答の中身を、運営のサーバーや外部のAIなどに送ることはありません。
          </Block>
          <Block title="アクセスの記録">
            このサイトを置いているサービス（Vercel）の通常のアクセス記録には、IP アドレス（インターネット上の住所にあたる番号）や見たページ、ブラウザの種類などが一定期間残ることがあります。
          </Block>
          <Block title="アクセスの計測">
            サイトの改善のため、Vercel Web Analytics で、どのページが見られたか・どこから来たか・端末の種類などを、個人を特定しない形で数えています。あわせて、「診断を始めた」「診断を終えた」「申し込みボタンを押した」という操作の回数を数えています。診断を終えたときは、結果のくわしさの目安（選んだ回答の多さで決まる「高い」か「低い」かの2通り）だけを一緒に送ります。回答の中身や診断結果の文章は送りません。
          </Block>
          <Block title="結果について">
            診断結果は、選んだ回答をもとにした提案です。収入や案件の獲得を約束するものではありません。複業を始める前に、お勤め先の就業規則（会社の外で働くときの決まり）を確認してください。
          </Block>
          <Block title="運営">
            {OPERATOR}。個人情報の取り扱いは、運営会社の
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-2">
              プライバシーポリシー
            </a>
            に従います。
          </Block>
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
