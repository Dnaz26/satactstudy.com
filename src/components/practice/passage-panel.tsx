'use client'

export function PassagePanel({ title, content }: { title?: string | null; content: string }) {
  return (
    <aside className="rounded-2xl border border-transparent neu p-5">
      {title ? <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fog">{title}</h2> : null}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">{content}</p>
    </aside>
  )
}
