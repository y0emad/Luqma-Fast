import { useTranslation } from 'react-i18next'
import type { OrderStatus } from '../types'

const STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-sun-soft text-[#7A5A00]',
  pending: 'bg-sun-soft text-[#7A5A00]',
  accepted: 'bg-[#FFEBEE] text-brand-dark',
  preparing: 'bg-[#FFEBEE] text-brand-dark',
  on_the_way: 'bg-brand text-white',
  delivered: 'bg-[#E8F5E9] text-[#1B5E20]',
  cancelled: 'bg-line text-muted',
}

export function StatusTag({ status }: { status: OrderStatus }) {
  const { t } = useTranslation()
  return <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${STYLES[status]}`}>{t(`status.${status}`)}</span>
}
