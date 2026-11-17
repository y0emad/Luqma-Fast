import { useState } from 'react'
import { App, Button, Input, Segmented, Skeleton } from 'antd'
import { CarOutlined, CheckOutlined, CloseOutlined, FireOutlined, PhoneOutlined, SyncOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import type { Order, OrderStatus, Paged } from '../../types'
import { StatusTag } from '../../components/StatusTag'
import { money, shortId, timeAgo } from '../../lib/format'

const COLUMNS: OrderStatus[] = ['pending', 'accepted', 'preparing', 'on_the_way']
const DONE: OrderStatus[] = ['delivered', 'cancelled']

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: React.ReactNode }>> = {
  pending: { to: 'accepted', label: 'dash.accept', icon: <CheckOutlined /> },
  accepted: { to: 'preparing', label: 'dash.startPreparing', icon: <FireOutlined /> },
  preparing: { to: 'on_the_way', label: 'dash.sendOut', icon: <CarOutlined /> },
  on_the_way: { to: 'delivered', label: 'dash.markDelivered', icon: <CheckOutlined /> },
}

function useColumn(status: OrderStatus) {
  return useQuery({
    queryKey: ['board', status],
    queryFn: async () => (await api.get<Paged<Order>>('/my-restaurant/orders', { params: { status } })).data,
    refetchInterval: 15_000,
  })
}

function OrderTicket({ order, onMove }: { order: Order; onMove: (to: OrderStatus, reason?: string) => Promise<void> }) {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const [busy, setBusy] = useState(false)
  const next = NEXT[order.status]
  const customer = typeof order.user_id === 'object' ? order.user_id : null
  const canReject = order.status === 'pending' || order.status === 'accepted'

  async function move(to: OrderStatus, reason?: string) {
    setBusy(true)
    try {
      await onMove(to, reason)
    } finally {
      setBusy(false)
    }
  }

  function reject() {
    let reason = ''
    modal.confirm({
      title: t('dash.reject'),
      content: <Input.TextArea autoSize={{ minRows: 2 }} placeholder={t('dash.rejectReason')} onChange={(e) => (reason = e.target.value)} />,
      okText: t('dash.reject'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => move('cancelled', reason || undefined),
    })
  }

  return (
    <article className="rise rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-black">#{shortId(order._id)}</span>
        <span className="text-xs text-muted">{timeAgo(order.created_at)}</span>
      </div>
      <ul className="m-0 mb-3 flex list-none flex-col gap-1 p-0 text-sm">
        {order.items.map((it) => (
          <li key={it.item_id}>
            <span className="font-black text-brand">{it.quantity}×</span> {it.name}
          </li>
        ))}
      </ul>
      {order.instructions && <p className="mt-0 mb-3 rounded-xl bg-sun-soft px-3 py-2 text-xs text-[#7A5A00]">{order.instructions}</p>}
      <div className="mb-3 text-xs text-muted">
        <p className="m-0 font-semibold text-ink">{customer?.name}</p>
        <p className="m-0">{order.address}</p>
        {order.phone && (
          <a href={`tel:${order.phone}`} className="mt-1 inline-flex items-center gap-1">
            <PhoneOutlined /> <span dir="ltr">{order.phone}</span>
          </a>
        )}
      </div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-extrabold">{money(order.grand_total)}</span>
        <span className={`text-xs font-semibold ${order.payment_status ? 'text-[#2E7D32]' : 'text-muted'}`}>{order.payment_method === 'card' ? t('orders.paidOnline') : t('orders.payOnDelivery')}</span>
      </div>
      <div className="flex gap-2">
        {next && (
          <Button type="primary" icon={next.icon} loading={busy} onClick={() => move(next.to)} className="flex-1">
            {t(next.label)}
          </Button>
        )}
        {canReject && <Button danger icon={<CloseOutlined />} aria-label={t('dash.reject')} onClick={reject} disabled={busy} />}
      </div>
    </article>
  )
}

export function OrdersBoardPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [mobileCol, setMobileCol] = useState<OrderStatus>('pending')
  const [doneTab, setDoneTab] = useState<OrderStatus>('delivered')
  const columns = { pending: useColumn('pending'), accepted: useColumn('accepted'), preparing: useColumn('preparing'), on_the_way: useColumn('on_the_way') }
  const done = useColumn(doneTab)

  async function move(order: Order, to: OrderStatus, reason?: string) {
    try {
      await api.patch(`/orders/${order._id}/status`, { status: to, reason })
      await queryClient.invalidateQueries({ queryKey: ['board'] })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  const refreshing = Object.values(columns).some((c) => c.isFetching)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-3xl font-black">{t('dash.liveBoard')}</h1>
          <p className="m-0 flex items-center gap-2 text-sm text-muted">
            <SyncOutlined spin={refreshing} /> {t('dash.autoRefresh')}
          </p>
        </div>
      </div>

      <div className="md:hidden">
        <Segmented
          block
          value={mobileCol}
          onChange={(v) => setMobileCol(v as OrderStatus)}
          options={COLUMNS.map((s) => ({ value: s, label: `${t(`status.${s}`)} (${columns[s as keyof typeof columns].data?.pagination.total ?? 0})` }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => {
          const col = columns[status as keyof typeof columns]
          return (
            <section key={status} className={`flex-col gap-3 rounded-3xl bg-line/50 p-3 ${mobileCol === status ? 'flex' : 'hidden md:flex'}`}>
              <header className="flex items-center justify-between px-1">
                <StatusTag status={status} />
                <span className="text-sm font-black">{col.data?.pagination.total ?? 0}</span>
              </header>
              {col.isLoading ? (
                <Skeleton active />
              ) : col.data?.data.length ? (
                col.data.data.map((o) => <OrderTicket key={o._id} order={o} onMove={(to, reason) => move(o, to, reason)} />)
              ) : (
                <p className="my-6 text-center text-sm text-muted">{t('dash.noOrders')}</p>
              )}
            </section>
          )
        })}
      </div>

      <section className="rounded-3xl border border-line bg-card p-4">
        <Segmented value={doneTab} onChange={(v) => setDoneTab(v as OrderStatus)} options={DONE.map((s) => ({ value: s, label: t(`status.${s}`) }))} className="!mb-4" />
        {done.data?.data.length ? (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {done.data.data.map((o) => (
              <li key={o._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-bold">#{shortId(o._id)}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join('، ')}</span>
                <span className="font-bold">{money(o.grand_total)}</span>
                <span className="text-xs text-muted">{timeAgo(o.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">{t('dash.noOrders')}</p>
        )}
      </section>
    </div>
  )
}
