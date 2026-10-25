'use client'

import { useSyncExternalStore } from 'react'
import type { Answers } from '@/data/questions'
import { resultSchema, type DiagnosisResult } from '@/lib/schemas'

/**
 * 回答・結果はブラウザの sessionStorage にだけ置く（タブを閉じると消える。サーバーには保存しない）。
 * プライベートブラウズ等で sessionStorage が使えないこともあるので、読み書きは必ず try で包み、
 * 書けなかったときはこのファイルの中のメモリに置く（同じタブで画面を移る間は回答が引き継がれる。再読み込みで消える）。
 * 読み出すときは形を確かめ、合わなければ「無い」として扱う（古い形の保存内容で画面が落ちないように）。
 */

// v2：結果をAIで作る形から、部品で組み立てる形に変えた（2026-10-24）。前の形で保存された回答・結果を読まないように版を上げた
const PREFIX = 'shindan:v2:'
export const KEYS = {
  answers: `${PREFIX}answers`,
  screen: `${PREFIX}screen`,
  result: `${PREFIX}result`,
} as const

/** sessionStorage に書けなかった値の置き場。null は「消した」印（sessionStorage に残った古い値を読まないため） */
const memory = new Map<string, string | null>()

function read(key: string): unknown {
  let raw: string | null
  if (memory.has(key)) {
    raw = memory.get(key) ?? null
  } else {
    try {
      raw = window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  }
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  const raw = value === null ? null : JSON.stringify(value)
  try {
    if (raw === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, raw)
    memory.delete(key)
  } catch {
    // 保存できなくても画面は動かす。同じタブの中では、メモリから読めるようにしておく
    memory.set(key, raw)
    // 古い値が残っていると、再読み込みでメモリが消えたときに古い回答・結果が出てしまうので、消せるなら消す
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // 消せない環境ならそのまま
    }
  }
}

// ── 読み出した中身の確認 ──

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')

/** 回答は「選んだIDの配列」か「数（スライダー）」の項目だけ残す */
function toAnswers(v: unknown): Answers | null {
  if (!isObject(v)) return null
  const entries = Object.entries(v).filter(
    (e): e is [string, string[] | number] => isStringArray(e[1]) || (typeof e[1] === 'number' && Number.isFinite(e[1])),
  )
  return Object.fromEntries(entries)
}

function toResult(v: unknown): DiagnosisResult | null {
  const parsed = resultSchema.safeParse(v)
  return parsed.success ? parsed.data : null
}

function toScreen(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

export const store = {
  answers: () => toAnswers(read(KEYS.answers)),
  setAnswers: (a: Answers) => write(KEYS.answers, a),
  screen: () => toScreen(read(KEYS.screen)),
  setScreen: (n: number) => write(KEYS.screen, n),
  /** 組み立てた結果。回答を変えたら消す（結果画面は、これが無いときだけ組み立てて「読み解いています」を見せる） */
  result: () => toResult(read(KEYS.result)),
  setResult: (r: DiagnosisResult | null) => write(KEYS.result, r),
  clearAll: () => Object.values(KEYS).forEach(k => write(k, null)),
}

const noopSubscribe = () => () => {}

/**
 * ブラウザで動いているか。sessionStorage を読む画面は、これが true になってから中身を描く
 * （サーバーで描いた中身とずれて画面が崩れるのを防ぐ）。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
