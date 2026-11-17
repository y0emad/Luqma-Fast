import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { CreditCardOutlined, DeleteOutlined, DollarOutlined, EnvironmentFilled, LockOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useCart } from '../cart/useCart'
import { useAuth } from '../auth/useAuth'
import { api, getErrorMessage } from '../lib/api'
import { isEgyptianMobile, money } from '../lib/format'
import { FoodImage } from '../components/FoodImage'
import { QtyStepper } from '../components/QtyStepper'
import { EmptyState } from '../components/EmptyState'
import type { Order, PaymentStart } from '../types'
import { fullAddress, useDeliveryLocation } from '../location/useDeliveryLocation'

type Checkout = { phone?: string; instructions?: string }
const CHECKOUT_KEY = 'luqma_checkout'

function savedCheckout(): Partial<Checkout> {
  try {
    return JSON.parse(localStorage.getItem(CHECKOUT_KEY) ?? '{}') as Partial<Checkout>
  } catch {
    return {}
  }
}

export function CartPage() {
  const { t } = useTranslation()
  const cart = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { location, openPicker } = useDeliveryLocation()

  if (!cart.restaurant || !cart.lines.length) {
    return (
      <EmptyState
        icon={<ShoppingCartOutlined />}
        title={t('cart.empty')}
        body={t('cart.emptyBody')}
        action={
          <Link to="/">
            <Button type="primary" size="large">
              {t('cart.browse')}
            </Button>
          </Link>
        }
      />
    )
  }

  const delivery = cart.restaurant.delivery_fee
  const total = Math.round((cart.subtotal + delivery) * 100) / 100
  const deliveryAddress = location ? fullAddress(location, { building: t('location.building'), floor: t('location.floor'), apartment: t('location.apartment') }) : ''

  async function placeOrder(values: Checkout) {
    if (!cart.restaurant) return
    if (!location) {
      setError(t('location.required'))
      openPicker()
      return
    }
    setBusy(true)
    setError(null)
    try {
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify({ phone: values.phone }))
      const res = await api.post<{ data: Order; payment?: PaymentStart }>('/orders/createOrder', {
        restaurant_id: cart.restaurant._id,
        address: deliveryAddress,
        instructions: values.instructions?.trim() || undefined,
        payment_method: method,
        ...(values.phone ? { phone: values.phone.trim() } : {}),
        items: cart.lines.map((l) => ({ item_id: l.item._id, quantity: l.quantity })),
      })
      cart.clear()
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (res.data.payment?.checkout_url) {
        window.location.assign(res.data.payment.checkout_url)
        return
      }
      navigate(`/orders/${res.data.data._id}`, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rise rounded-3xl border border-line bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FoodImage src={cart.restaurant.restaurantImg} alt={cart.restaurant.name} seed={cart.restaurant._id} className="h-12 w-12 rounded-xl" />
            <div>
              <h1 className="m-0 text-xl font-extrabold">{t('cart.title')}</h1>
              <Link to={`/r/${cart.restaurant._id}`} className="text-sm">
                {t('cart.from', { name: cart.restaurant.name })}
              </Link>
            </div>
          </div>
          <Button type="text" danger icon={<DeleteOutlined />} onClick={cart.clear}>
            {t('cart.clear')}
          </Button>
        </div>

        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {cart.lines.map((l) => (
            <li key={l.item._id} className="flex items-center gap-3 py-3">
              <FoodImage src={l.item.cover} alt={l.item.name} seed={l.item._id} className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-bold">{l.item.name}</p>
                <p className="m-0 text-sm text-muted">{money(l.item.price)}</p>
              </div>
              <QtyStepper size="sm" value={l.quantity} onChange={(n) => cart.setQuantity(l.item._id, n)} />
              <span className="w-20 text-end font-bold">{money(Math.round(l.item.price * l.quantity * 100) / 100)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-page p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t('cart.subtotal')}</span>
            <span>{money(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('cart.delivery')}</span>
            <span>{delivery === 0 ? t('restaurant.freeDelivery') : money(delivery)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-dashed border-line pt-3 text-lg font-extrabold">
            <span>{t('cart.total')}</span>
            <span className="text-brand">{money(total)}</span>
          </div>
        </div>
      </section>

      <section className="rise rounded-3xl border border-line bg-card p-5" style={{ animationDelay: '80ms' }}>
        {!user ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <LockOutlined className="text-4xl text-brand" />
            <Link to="/login" state={{ from: '/cart' }}>
              <Button type="primary" size="large">
                {t('cart.loginToOrder')}
              </Button>
            </Link>
          </div>
        ) : (
          <Form layout="vertical" requiredMark={false} onFinish={placeOrder} initialValues={savedCheckout()} size="large">
            <p className="mt-0 mb-2 font-semibold">{t('cart.address')}</p>
            <button
              type="button"
              onClick={openPicker}
              className={`mb-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-3 text-start text-ink transition hover:border-brand ${location ? 'border-line' : 'border-dashed border-brand'}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFEBEE] text-xl text-brand">
                <EnvironmentFilled />
              </span>
              <span className="min-w-0 flex-1">
                {location ? (
                  <>
                    <span className="block text-xs font-bold text-muted">{t(`location.${location.title ?? 'other'}`)}</span>
                    <span className="block text-sm font-semibold">{deliveryAddress}</span>
                  </>
                ) : (
                  <span className="block font-bold text-brand">{t('location.choose')}</span>
                )}
              </span>
              <span className="shrink-0 text-sm font-bold text-brand">{location ? t('location.change') : ''}</span>
            </button>
            <Form.Item
              name="phone"
              label={t('cart.phone')}
              rules={[
                { required: method === 'card', message: t('auth.invalidPhone') },
                { validator: (_, v) => (!v || isEgyptianMobile(v) ? Promise.resolve() : Promise.reject(new Error(t('auth.invalidPhone')))) },
              ]}
            >
              <Input placeholder={t('cart.phonePlaceholder')} dir="ltr" inputMode="tel" />
            </Form.Item>
            <Form.Item name="instructions" label={`${t('cart.instructions')} (${t('common.optional')})`}>
              <Input placeholder={t('cart.instructionsPlaceholder')} maxLength={300} />
            </Form.Item>

            <p className="mb-2 font-semibold">{t('cart.payment')}</p>
            <div className="mb-2 grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'cash', icon: <DollarOutlined />, label: t('cart.cash') },
                  { key: 'card', icon: <CreditCardOutlined />, label: t('cart.card') },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 bg-card px-3 py-4 text-sm font-bold text-ink transition ${
                    method === m.key ? 'border-brand bg-[#FFEBEE] text-brand-dark dark:bg-brand/15' : 'border-line hover:border-brand/50'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
            {method === 'card' && <p className="mt-0 mb-4 text-xs text-muted">{t('cart.cardHint')}</p>}

            {error && <Alert type="error" showIcon title={error} className="!my-4" />}

            <Button type="primary" htmlType="submit" block size="large" loading={busy} className="!mt-4 !h-14 !rounded-2xl !text-base">
              {t('cart.placeOrder', { total: money(total) })}
            </Button>
          </Form>
        )}
      </section>
    </div>
  )
}
