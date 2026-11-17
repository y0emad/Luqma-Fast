import { useState } from 'react'
import { Alert, Button, Pagination, Skeleton } from 'antd'
import { ProfileOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import type { Order, Paged } from '../types'
import { StatusTag } from '../components/StatusTag'
import { EmptyState } from '../components/EmptyState'
import { FoodImage } from '../components/FoodImage'
import { money, shortId, timeAgo } from '../lib/format'

export function OrdersPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [params] = useSearchParams()
  const orders = useQuery({
    queryKey: ['orders', page],
    queryFn: async () => (await api.get<Paged<Order>>('/orders/getOrders', { params: { page } })).data,
    refetchInterval: 20_000,
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mt-0 mb-5 text-3xl font-black">{t('orders.title')}</h1>
      {params.get('payment') === 'invalid' && <Alert type="warning" showIcon title={t('orders.paymentInvalid')} className="!mb-4" />}
      {orders.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : orders.data?.data.length ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {orders.data.data.map((o, i) => {
              const r = typeof o.restaurant_id === 'object' ? o.restaurant_id : null
              const count = o.items.reduce((n, it) => n + it.quantity, 0)
              return (
                <li key={o._id} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link to={`/orders/${o._id}`} className="flex items-center gap-4 rounded-3xl border border-line bg-card p-4 text-ink no-underline transition hover:border-brand/40">
                    <FoodImage src={r?.restaurantImg} alt={r?.name ?? ''} seed={r?._id ?? o._id} className="h-16 w-16 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{r?.name}</span>
                        <StatusTag status={o.status} />
                      </div>
                      <p className="m-0 text-sm text-muted">
                        {t('orders.order', { id: shortId(o._id) })} · {t('orders.items', { count })} · {timeAgo(o.created_at)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="m-0 font-extrabold text-brand">{money(o.grand_total)}</p>
                      <span className="text-xs font-semibold text-muted">{t('orders.track')}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          {orders.data.pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination current={page} total={orders.data.pagination.total} pageSize={orders.data.pagination.perPage} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<ProfileOutlined />}
          title={t('orders.empty')}
          body={t('orders.emptyBody')}
          action={
            <Link to="/">
              <Button type="primary" size="large">
                {t('cart.browse')}
              </Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
