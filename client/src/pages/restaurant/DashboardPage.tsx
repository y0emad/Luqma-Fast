import { App, Button, DatePicker, Skeleton, Switch } from 'antd'
import { CheckCircleOutlined, DollarOutlined, RightOutlined, ShoppingOutlined, TrophyOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { api, getErrorMessage } from '../../lib/api'
import type { Stats } from '../../types'
import { money } from '../../lib/format'
import { useMyRestaurant, useUpdateMyRestaurant } from '../../lib/myRestaurant'
import { useAuth } from '../../auth/useAuth'
import { ReviewsSection } from '../../components/ReviewsSection'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { message } = App.useApp()
  const restaurant = useMyRestaurant()
  const update = useUpdateMyRestaurant()
  const [day, setDay] = useState<Dayjs>(dayjs())
  const dayParam = day.format('YYYY-MM-DD')

  const stats = useQuery({
    queryKey: ['stats', dayParam],
    queryFn: async () => (await api.get<{ data: Stats }>('/my-restaurant/stats', { params: { day: dayParam } })).data.data,
    refetchInterval: 30_000,
  })

  const live = useQuery({
    queryKey: ['board', 'pending', 'count'],
    queryFn: async () => (await api.get<{ pagination: { total: number } }>('/my-restaurant/orders', { params: { status: 'pending' } })).data.pagination.total,
    refetchInterval: 15_000,
  })

  async function toggleOpen(open: boolean) {
    try {
      await update.mutateAsync({ isClosed: !open })
      message.success(t('dash.saved'))
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  const s = stats.data
  const cards = [
    { label: t('dash.ordersToday'), value: s ? String(s.orders.total) : '—', icon: <ShoppingOutlined />, tone: 'bg-coal text-white' },
    { label: t('dash.revenue'), value: s ? money(s.revenue) : '—', icon: <DollarOutlined />, tone: 'bg-brand text-white' },
    { label: t('dash.avgOrder'), value: s ? money(s.average_order_value) : '—', icon: <WalletOutlined />, tone: 'bg-sun text-coal' },
    { label: t('dash.delivered'), value: s ? String(s.orders.by_status.delivered ?? 0) : '—', icon: <CheckCircleOutlined />, tone: 'bg-card text-ink border border-line' },
  ]
  const maxQty = Math.max(1, ...(s?.top_items.map((i) => i.quantity) ?? [1]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-black">{t('dash.hello', { name: user?.name ?? '' })}</h1>
          <p className="m-0 text-muted">{restaurant.data?.name}</p>
        </div>
        {restaurant.data && (
          <div className={`flex items-center gap-3 rounded-full px-4 py-2 ${restaurant.data.isClosed ? 'bg-line' : 'bg-[#E8F5E9] text-[#1B5E20]'}`}>
            <span className="text-sm font-bold">{restaurant.data.isClosed ? t('dash.closed') : t('dash.open')}</span>
            <Switch checked={!restaurant.data.isClosed} loading={update.isPending} onChange={toggleOpen} />
          </div>
        )}
      </div>

      {(live.data ?? 0) > 0 && (
        <Link to="/restaurant/orders" className="no-underline">
          <div className="rise flex items-center justify-between rounded-3xl bg-sun px-5 py-4 text-coal">
            <span className="flex items-center gap-3 font-bold">
              <span className="pulse-ring flex h-10 w-10 items-center justify-center rounded-full bg-coal text-lg text-sun">{live.data}</span>
              {t('status.pending')}
            </span>
            <RightOutlined className="rtl:rotate-180" />
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold">{t('dash.today')}</h2>
        <DatePicker value={day} onChange={(d) => d && setDay(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className={`rise rounded-3xl p-5 ${c.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="text-2xl opacity-80">{c.icon}</span>
            <p className="mt-3 mb-0 text-sm opacity-80">{c.label}</p>
            {stats.isLoading ? <Skeleton.Input active size="small" /> : <p className="m-0 text-2xl font-black">{c.value}</p>}
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="mt-0 mb-4 flex items-center gap-2 text-lg font-extrabold">
          <TrophyOutlined className="text-sun" /> {t('dash.topItems')}
        </h2>
        {s?.top_items.length ? (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {s.top_items.map((item, i) => (
              <li key={item.item_id} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${i === 0 ? 'bg-sun text-coal' : 'bg-line text-ink'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-bold">{item.name}</span>
                    <span className="text-muted">{t('dash.sold', { count: item.quantity })}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
                  </div>
                </div>
                <span className="w-24 text-end text-sm font-bold">{money(item.revenue)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-muted">{t('dash.noSales')}</p>
        )}
      </section>

      <ReviewsSection url="/my-restaurant/reviews" queryKey={['mine']} />

      <Link to="/restaurant/orders">
        <Button type="primary" size="large" block>
          {t('dash.liveBoard')}
        </Button>
      </Link>
    </div>
  )
}
