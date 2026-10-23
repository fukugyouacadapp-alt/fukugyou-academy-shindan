'use client'

import type { Option } from '@/data/questions'

type Props = {
  labelId: string
  options: Option[]
  /** 1 なら1つだけ選ぶ。それ以外は複数（null は上限なし） */
  max: number | null
  noneId?: string
  value: string[]
  /** byKeyboard は Enter・スペースで押したとき true（キーボードのときは自動で次へ進めないため） */
  onChange: (next: string[], byKeyboard: boolean) => void
}

/**
 * 選択肢の札。どの設問も「押すと選ばれる／もう一度押すと外れる」トグルとして読み上げられるようにしてある
 * （ラジオの役割を名乗ると矢印キーでの移動が要るので、名乗らない）。
 * 「特にない」は他と一緒に選べない。上限に達したら、残りの札は押せなくする。
 */
export function ChoiceGroup({ labelId, options, max, noneId, value, onChange }: Props) {
  const single = max === 1
  const full = max !== null && !single && value.length >= max

  function toggle(id: string, byKeyboard: boolean) {
    if (single) return onChange([id], byKeyboard)
    if (value.includes(id)) return onChange(value.filter(v => v !== id), byKeyboard)
    if (id === noneId) return onChange([id], byKeyboard)
    const withoutNone = value.filter(v => v !== noneId)
    if (max !== null && withoutNone.length >= max) return
    onChange([...withoutNone, id], byKeyboard)
  }

  const button = (o: Option) => {
    const on = value.includes(o.id)
    const disabled = !on && full && o.id !== noneId
    return (
      <button
        key={o.id}
        type="button"
        className="choice"
        aria-pressed={on}
        disabled={disabled}
        // detail が 0 のクリックは、マウスや指ではなくキーボード（Enter・スペース）で押されたもの
        onClick={e => toggle(o.id, e.detail === 0)}
      >
        {o.label}
      </button>
    )
  }
  const none = options.find(o => o.id === noneId)

  // 「特にない」は長い選択肢の末尾に埋もれないよう、線で区切って別の行に置く
  return (
    <div role="group" aria-labelledby={labelId}>
      <div className="flex flex-wrap gap-2">{options.filter(o => o.id !== noneId).map(button)}</div>
      {none && <div className="mt-3 border-t border-dashed border-line pt-3">{button(none)}</div>}
    </div>
  )
}
