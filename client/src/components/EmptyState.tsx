import type { ReactNode } from 'react'

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rise flex flex-col items-center rounded-3xl border border-dashed border-line bg-card px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sun-soft text-3xl text-brand">{icon}</div>
      <h3 className="m-0 text-lg font-bold">{title}</h3>
      {body && <p className="mt-1 mb-0 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
