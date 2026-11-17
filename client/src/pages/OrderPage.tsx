import { useState } from 'react'
import { Alert, App, Button, Skeleton } from 'antd'
import { CarOutlined, CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined, FireOutlined, HourglassOutlined, LikeOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../lib/api'
import type { Order, OrderStatus, PaymentStart } from '../types'
import { OrderProgress } from '../components/OrderProgress'
import { StatusTag } from '../components/StatusTag'
import { EmptyState } from '../components/EmptyState'
import { RateOrder } from '../components/RateOrder'
import { clock, money, shortId, timeAgo } from '../lib/format'

const HERO: Record<OrderStatus, { icon: React.ReactNode; tone: string }> = {
  awaiting_payment: { icon: <CreditCardOutlined />, tone: 'bg-sun text-coal' },
  pending: { icon: <HourglassOutlined />, tone: 'bg-coal text-white' },
  accepted: { icon: <LikeOutlined />, tone: 'bg-coal text-white' },
  preparing: { icon: <FireOutlined />, tone: 'bg-brand text-white' },
  on_the_way: { icon: <CarOutlined />, tone: 'bg-brand text-white' },
  delivered: { icon: <CheckCircleOutlined />, tone: 'bg-[#2E7D32] text-white' },
  cancelled: { icon: <CloseCircleOutlined />, tone: 'bg-line text-ink' },
}

const ACTIVE: OrderStatus[] = ['awaiting_payment', 'pending', 'accepted', 'preparing', 'on_the_way']

export function OrderPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const payment = params.get('payment')
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const order = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<{ data: Order }>(`/orders/${id}`)).data.data,
    refetchInterval: (q) => (q.state.data && ACTIVE.includes(q.state.data.status) ? 10_000 : false),
  })

  if (order.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />
  if (!order.data) return <EmptyState icon={<ShoppingOutlined />} title={t('errors.notFoundTitle')} action={<Link to="/orders"><Button>{t('orders.title')}</Button></Link>} />

  const o = order.data
  const r = typeof o.restaurant_id === 'object' ? o.restaurant_id : null
  const hero = HERO[o.status]
  const canCancel = o.status === 'awaiting_payment' || o.status === 'pending'

  async function payNow() {
    setBusy(true)
    try {
      const res = await api.post<{ payment: PaymentStart }>(`/orders/${o._id}/pay`, {})
      window.location.assign(res.data.payment.checkout_url)
    } catch (err) {
      message.error(getErrorMessage(err))
      setBusy(false)
    }
  }

  function cancel() {
    modal.confirm({
      title: t('orders.cancelConfirm'),
      okText: t('orders.cancel'),
      okButtonProps: { danger: true },
      cancelText: t('common.no'),
      onOk: async () => {
        try {
          await api.patch(`/orders/${o._id}/cancel`, {})
          message.success(t('orders.cancelled'))
          await queryClient.invalidateQueries({ queryKey: ['order', id] })
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
        } catch (err) {
          message.error(getErrorMessage(err))
        }
      },
    })
  }

  const banner =
    payment === 'success' ? (
      <Alert type="success" showIcon title={t('orders.paymentSuccess')} />
    ) : payment === 'failed' ? (
      <Alert type="error" showIcon title={t('orders.paymentFailed')} />
    ) : payment === 'pending' ? (
      <Alert type="info" showIcon title={t('orders.paymentPending')} />
    ) : null

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-5">
        {banner}
        <section className={`rise relative overflow-hidden rounded-[2rem] p-6 ${hero.tone}`}>
          <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
          <p className="m-0 text-sm opacity-80">{t('orders.order', { id: shortId(o._id) })}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">{hero.icon}</span>
            <div>
              <p className="m-0 text-2xl font-black">{t(`status.${o.status}`)}</p>
              <p className="m-0 text-sm opacity-80">{t('orders.placed', { time: timeAgo(o.created_at) })}</p>
            </div>
          </div>
          {o.status === 'cancelled' && o.cancel_reason && <p className="mt-4 mb-0 rounded-xl bg-white/40 p-3 text-sm">{o.cancel_reason}</p>}
        </section>

        {o.status === 'delivered' && <RateOrder order={o} restaurantName={r?.name ?? ''} />}

        {o.status !== 'cancelled' && o.status !== 'awaiting_payment' && (
          <section className="rise rounded-3xl border border-line bg-card p-5" style={{ animationDelay: '60ms' }}>
            <OrderProgress order={o} />
          </section>
        )}

        {(canCancel || (o.status === 'awaiting_payment' && o.payment_method === 'card')) && (
          <div className="flex gap-3">
            {o.status === 'awaiting_payment' && o.payment_method === 'card' && (
              <Button type="primary" size="large" icon={<CreditCardOutlined />} loading={busy} onClick={payNow} className="flex-1">
                {t('orders.payNow')}
              </Button>
            )}
            {canCancel && (
              <Button size="large" danger onClick={cancel} className="flex-1">
                {t('orders.cancel')}
              </Button>
            )}
          </div>
        )}
      </div>

      <section className="rise rounded-3xl border border-line bg-card p-5" style={{ animationDelay: '100ms' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-lg font-extrabold">{t('orders.summary')}</h2>
          <StatusTag status={o.status} />
        </div>
        <p className="mt-0 mb-3 font-bold">{r?.name}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {o.items.map((it) => (
            <li key={it.item_id} className="flex justify-between gap-2">
              <span>
                <span className="font-bold text-brand">{it.quantity}×</span> {it.name}
              </span>
              <span>{money(Math.round(it.price * it.quantity * 100) / 100)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-line pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>{t('cart.subtotal')}</span>
            <span>{money(o.total)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{t('cart.delivery')}</span>
            <span>{o.delivery_charge === 0 ? t('restaurant.freeDelivery') : money(o.delivery_charge)}</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold">
            <span>{t('cart.total')}</span>
            <span className="text-brand">{money(o.grand_total)}</span>
          </div>
        </div>
        <p className={`mt-3 mb-0 text-sm font-semibold ${o.refunded ? 'text-[#1565C0]' : o.payment_status ? 'text-[#2E7D32]' : 'text-muted'}`}>
          <CreditCardOutlined />{' '}
          {o.refunded ? t('orders.refunded') : o.payment_method === 'card' ? (o.payment_status ? t('orders.paidOnline') : t('orders.unpaid')) : t('orders.payOnDelivery')}
        </p>

        <div className="mt-5 rounded-2xl bg-page p-4 text-sm">
          <p className="m-0 text-xs text-muted">{t('orders.deliverTo')}</p>
          <p className="m-0 font-semibold">{o.address}</p>
          {o.instructions && (
            <>
              <p className="mt-3 mb-0 text-xs text-muted">{t('orders.notes')}</p>
              <p className="m-0">{o.instructions}</p>
            </>
          )}
        </div>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">{t('orders.history')}</summary>
          <ul className="mt-2 mb-0 flex list-none flex-col gap-1 p-0 text-muted">
            {o.status_history.map((h, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {t(`status.${h.status}`)} · {t(`actor.${h.by}`)}
                </span>
                <span>{clock(h.at)}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  )
}
