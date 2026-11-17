import { CheckOutlined, CarOutlined, FireOutlined, HomeOutlined, LikeOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Order, OrderStatus } from '../types'
import { clock } from '../lib/format'

const FLOW: { status: OrderStatus; icon: React.ReactNode }[] = [
  { status: 'pending', icon: <ShoppingOutlined /> },
  { status: 'accepted', icon: <LikeOutlined /> },
  { status: 'preparing', icon: <FireOutlined /> },
  { status: 'on_the_way', icon: <CarOutlined /> },
  { status: 'delivered', icon: <HomeOutlined /> },
]

export function OrderProgress({ order }: { order: Order }) {
  const { t } = useTranslation()
  const current = FLOW.findIndex((s) => s.status === order.status)
  const when = (status: OrderStatus) => order.status_history.find((h) => h.status === status)?.at

  return (
    <ol className="flex flex-col gap-4">
      {FLOW.map((step, i) => {
        const done = current >= 0 && i < current
        const now = i === current
        const at = when(step.status)
        return (
          <li key={step.status} className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                done ? 'bg-brand text-white' : now ? 'pulse-ring bg-sun text-coal' : 'bg-line text-muted'
              }`}
            >
              {done ? <CheckOutlined /> : step.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`m-0 text-sm ${now ? 'font-bold' : done ? 'font-medium' : 'text-muted'}`}>{t(`status.${step.status}`)}</p>
            </div>
            {at && (done || now) && <span className="text-xs text-muted">{clock(at)}</span>}
          </li>
        )
      })}
    </ol>
  )
}
