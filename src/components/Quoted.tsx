/**
 * 「」で囲まれた部分（＝その人が選んだ回答の引用）に下線風の色を敷いて強調する。
 * 「自分の言葉が使われている」と一目でわかるようにするため。
 */
export function Quoted({ text }: { text: string }) {
  const parts = text.split(/(「[^「」]+」)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('「') && p.endsWith('」') ? (
          <span key={i} className="quote">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}
