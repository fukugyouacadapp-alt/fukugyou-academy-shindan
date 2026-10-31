import type { Answers } from '@/data/questions'
import { highlightLabels, jobFamilyIndex } from '@/lib/answers'
import { diagnose } from '@/lib/diagnose'
import { encodeResultCode } from '@/lib/result-code'
import type { DiagnosisResult } from '@/lib/schemas'

/**
 * 結果の見本（テスト用 Aさん：人事・採用の子育て中リーダー）。/result?sample=1（結果の見本）の表示に使う。
 * 本物の診断と同じ組み立て（src/lib/diagnose.ts）で作るので、部品を直すと見本も一緒に変わる。
 * 回答は scripts/check-results.ts のテスト用Aさんと同じ。
 */
const SAMPLE_ANSWERS: Answers = {
  q1: ['q1.3'], // 組織を支える仕事（人事・経理・総務・公務員）
  q1_2_3: ['q1_2_3.1'], // 人事・採用
  q2: ['q2.1'], // 人を育てる・教える
  q3: ['q3.1', 'q3.2'], // 相談に乗る・話を聞く／資料や文章を整える
  q4: ['q4.3'], // 人が成長したとき
  q5: ['q5.4', 'q5.2'], // 子ども・学生・若手／会社の担当者・社員
  q6: ['q6.1', 'q6.2'], // 子育て・介護と仕事の両立／地域活動・PTA・ボランティア
  q7_1: ['q7_1.2'], // スキルや経験を広げたい
  q7_2: ['q7_2.2'], // 3〜5時間
  q8_1: -1,
  q8_2: 1,
  q8_3: 1,
  q9_3_1: ['q9_3_1.2'], // 求人票・採用広報
}

/**
 * 見本の結果と「あなたが選んだ回答から」・診断番号。見本を開いたときだけ組み立てる
 * （読み込みのたびに組み立てると、失敗したときに本物の結果ページまで開けなくなるため）
 */
export function buildSample(): { result: DiagnosisResult; highlights: string[]; family: number | null; code: string } {
  return {
    result: diagnose(SAMPLE_ANSWERS),
    highlights: highlightLabels(SAMPLE_ANSWERS),
    family: jobFamilyIndex(SAMPLE_ANSWERS),
    code: encodeResultCode(SAMPLE_ANSWERS),
  }
}
