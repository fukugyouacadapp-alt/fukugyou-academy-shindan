/**
 * 結果画面に添える、アカデミー生の事例（要件定義 R15。例：看護師 → オンライン秘書）。
 * 文面は高橋さんから受け取ってから入れる（2026-10-31 時点では、まだ受け取っていないので空）。1件も無ければ、事例の欄は出さない。
 * direction に「合う複業の方向」の名前（src/lib/radar.ts）を書くと、その方向の人に優先して出す。書かなければ誰にでも出せる事例。
 * 金額を書くときは、例であること・同じ結果を約束しないことが伝わる書き方にする（要件定義 R7）。
 */
export type CaseStudy = {
  /** 見出し（例：「看護師 → オンライン秘書」） */
  title: string
  /** 本文（2〜3文） */
  text: string
  direction?: string
}

export const CASE_STUDIES: CaseStudy[] = []

/** その人に添える事例を1件選ぶ（同じ方向の事例を優先。無ければ方向の指定が無い事例） */
export function caseStudyFor(direction: string): CaseStudy | null {
  return CASE_STUDIES.find(c => c.direction === direction) ?? CASE_STUDIES.find(c => !c.direction) ?? null
}
