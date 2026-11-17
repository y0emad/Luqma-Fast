import { useMemo, useState } from 'react'
import { App, Button, Skeleton } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, ClockCircleOutlined, EnvironmentOutlined, PlusOutlined, ShoppingCartOutlined, StarFilled } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import type { Category, Item, Restaurant } from '../types'
import { FoodImage } from '../components/FoodImage'
import { QtyStepper } from '../components/QtyStepper'
import { EmptyState } from '../components/EmptyState'
import { ReviewsSection } from '../components/ReviewsSection'
import { useCart, type CartRestaurant } from '../cart/useCart'
import { money, to12h } from '../lib/format'
import { usePrefs } from '../prefs/usePrefs'

type Menu = { restaurant: Restaurant; category: Category[]; items: Item[] }

export function RestaurantPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { lang } = usePrefs()
  const { modal } = App.useApp()
  const navigate = useNavigate()
  const cart = useCart()
  const [activeCat, setActiveCat] = useState<string | null>(null)

  const menu = useQuery({
    queryKey: ['menu', id],
    queryFn: async () => (await api.get<{ data: Menu }>(`/items/getMenu/${id}`)).data.data,
  })

  const groups = useMemo(() => {
    if (!menu.data) return []
    return menu.data.category
      .map((c) => ({ category: c, items: menu.data.items.filter((i) => i.category_id === c._id) }))
      .filter((g) => g.items.length)
  }, [menu.data])

  if (menu.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton.Node active className="!h-56 !w-full !rounded-3xl" />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }
  if (menu.isError || !menu.data) {
    return <EmptyState icon={<ShoppingCartOutlined />} title={t('restaurant.notFound')} action={<Link to="/"><Button type="primary">{t('errors.goHome')}</Button></Link>} />
  }

  const r = menu.data.restaurant
  const open = r.is_open !== false
  const cartRestaurant: CartRestaurant = { _id: r._id, name: r.name, delivery_fee: r.delivery_fee, opening_time: r.opening_time, closing_time: r.closing_time, restaurantImg: r.restaurantImg }
  const cartHere = cart.restaurant?._id === r._id && cart.count > 0
  const Back = lang === 'ar' ? ArrowRightOutlined : ArrowLeftOutlined

  function add(item: Item) {
    if (cart.add(cartRestaurant, item) === 'other-restaurant') {
      modal.confirm({
        title: t('restaurant.otherRestaurantTitle'),
        content: t('restaurant.otherRestaurantBody', { name: cart.restaurant?.name }),
        okText: t('restaurant.newCart'),
        cancelText: t('common.cancel'),
        onOk: () => cart.replaceWith(cartRestaurant, item),
      })
    }
  }

  function jump(catId: string) {
    setActiveCat(catId)
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rise relative overflow-hidden rounded-[2rem] border border-line bg-card">
        <div className="relative h-52 sm:h-64">
          <FoodImage src={r.restaurantImg} alt={r.name} seed={r._id} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-coal/85 via-coal/30 to-transparent" />
          <button type="button" onClick={() => navigate(-1)} aria-label={t('common.back')} className="absolute start-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white text-coal">
            <Back />
          </button>
          <div className="absolute inset-x-5 bottom-5 text-white">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${open ? 'bg-sun text-coal' : 'bg-white text-coal'}`}>
                {open ? t('restaurant.hours', { from: to12h(r.opening_time), to: to12h(r.closing_time) }) : t('restaurant.closedNow', { from: to12h(r.opening_time) })}
              </span>
              {r.delivery_fee === 0 && <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold">{t('restaurant.freeDelivery')}</span>}
            </div>
            <h1 className="m-0 text-3xl font-black sm:text-4xl">{r.name}</h1>
            <p className="mt-1 mb-0 text-sm text-white/85">{r.cuisines.join(' · ')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-4 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <StarFilled className="text-sun" /> {r.ratings_count ? `${r.rating.toFixed(1)} · ${t('reviews.count', { n: r.ratings_count })}` : t('reviews.new')}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <ClockCircleOutlined /> {r.delivery_time}
          </span>
          <span className="flex items-center gap-1.5 text-muted">{r.delivery_fee === 0 ? t('restaurant.freeDelivery') : t('restaurant.deliveryFee', { fee: money(r.delivery_fee) })}</span>
          <span className="flex items-center gap-1.5 text-muted">
            <EnvironmentOutlined /> {r.address}
          </span>
        </div>
        {r.description && <p className="m-0 border-t border-line px-5 py-4 text-sm text-muted">{r.description}</p>}
      </section>

      {groups.length > 1 && (
        <div className="no-scrollbar sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto bg-page/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          {groups.map((g) => (
            <button
              key={g.category._id}
              type="button"
              onClick={() => jump(g.category._id)}
              className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeCat === g.category._id ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink hover:border-brand'
              }`}
            >
              {g.category.name} <span className="opacity-60">{g.items.length}</span>
            </button>
          ))}
        </div>
      )}

      {groups.length ? (
        groups.map((g) => (
          <section key={g.category._id} id={`cat-${g.category._id}`} className="scroll-mt-32">
            <h2 className="mt-0 mb-3 text-xl font-extrabold">{g.category.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {g.items.map((item, i) => {
                const qty = cart.restaurant?._id === r._id ? cart.quantityOf(item._id) : 0
                return (
                  <div key={item._id} className="rise flex gap-4 rounded-3xl border border-line bg-card p-3 transition hover:border-brand/40" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <FoodImage src={item.cover} alt={item.name} seed={item._id} className="h-24 w-24 shrink-0 rounded-2xl" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start gap-2">
                        <h3 className="m-0 flex-1 truncate text-base font-bold">{item.name}</h3>
                        {item.vegetarian && <span className="shrink-0 rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[11px] font-bold text-[#1B5E20]">{t('restaurant.vegetarian')}</span>}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <span className="text-lg font-extrabold text-brand">{money(item.price)}</span>
                        {qty > 0 ? (
                          <QtyStepper size="sm" value={qty} onChange={(n) => cart.setQuantity(item._id, n)} />
                        ) : (
                          <Button type="primary" shape="round" icon={<PlusOutlined />} disabled={!open} onClick={() => add(item)}>
                            {t('restaurant.addToCart')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      ) : (
        <EmptyState icon={<ShoppingCartOutlined />} title={t('restaurant.emptyMenu')} />
      )}

      <ReviewsSection url={`/restaurants/${r._id}/reviews`} queryKey={['restaurant', r._id]} />

      {cartHere && (
        <div className="sticky bottom-20 z-20 md:bottom-6">
          <Link to="/cart" className="no-underline">
            <div className="rise mx-auto flex max-w-xl items-center justify-between rounded-full bg-coal px-6 py-3.5 text-white">
              <span className="flex items-center gap-2 font-bold">
                <ShoppingCartOutlined className="text-sun" /> {t('restaurant.viewCart', { count: cart.count })}
              </span>
              <span className="font-extrabold text-sun">{money(cart.subtotal)}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
