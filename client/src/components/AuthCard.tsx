import type { ReactNode } from 'react'
import { LogoMark } from './Logo'

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-card md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white md:flex">
        <div className="absolute -end-16 -top-16 h-56 w-56 rounded-full bg-sun/90" aria-hidden="true" />
        <div className="absolute -bottom-24 -start-10 h-64 w-64 rounded-full bg-coal/25" aria-hidden="true" />
        <div className="relative">
          <LogoMark size={64} onRed />
        </div>
        <div className="relative">
          <p className="m-0 text-4xl leading-tight font-extrabold">
            لقمة
            <br />
            ع السريع
          </p>
          <p className="mt-2 mb-0 text-lg font-semibold text-white/90">Luqma Fast</p>
        </div>
      </div>
      <div className="rise p-6 sm:p-10">
        <h1 className="m-0 text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>}
        {children}
        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </div>
    </div>
  )
}
