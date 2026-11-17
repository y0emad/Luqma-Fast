import { useEffect, useMemo, useState } from 'react'
import { Input, Skeleton } from 'antd'
import { SearchOutlined, ShopOutlined, ShoppingCartOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import type { Paged, Restaurant } from '../types'
import { RestaurantCard } from '../components/RestaurantCard'
import { EmptyState } from '../components/EmptyState'
import { LocationChip } from '../components/LocationChip'
import { LogoMark } from '../components/Logo'
import { CAIRO, useDeliveryLocation } from '../location/useDeliveryLocation'

const RADIUS_KM = 15

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export function HomePage() {
  const { t } = useTranslation()
  const { location } = useDeliveryLocation()
  const place = location ?? CAIRO
  const [term, setTerm] = useState('')
  const [cuisine, setCuisine] = useState<string | null>(null)
  const search = useDebounced(term.trim())

  const restaurants = useQuery({
    queryKey: ['nearby', place.lat, place.lng, search],
    queryFn: async () => {
      const params = { latitude: place.lat, longitude: place.lng, radius: RADIUS_KM, page: 1, ...(search ? { name: search } : {}) }
      const url = search ? '/restaurants/searchNearbyRestaurants' : '/restaurants/getNearbyRestaurants'
      return (await api.get<Paged<Restaurant>>(url, { params })).data
    },
  })

  const all = useMemo(() => restaurants.data?.data ?? [], [restaurants.data])
  const cuisines = useMemo(() => [...new Set(all.flatMap((r) => r.cuisines))].slice(0, 10), [all])
  const shown = cuisine ? all.filter((r) => r.cuisines.includes(cuisine)) : all

  return (
    <div className="flex flex-col gap-8">
      <section className="rise relative overflow-hidden rounded-[2rem] bg-brand px-6 py-8 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -end-20 -top-24 h-72 w-72 rounded-full bg-sun" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 end-24 h-56 w-56 rounded-full bg-coal/25" aria-hidden="true" />
        <div className="relative max-w-xl">
          <div className="mb-5">
            <LocationChip />
          </div>
          <h1 className="m-0 text-4xl leading-tight font-black sm:text-5xl">{t('home.heroTitle')}</h1>
          <p className="mt-3 mb-6 text-base text-white/90 sm:text-lg">{t('home.heroSubtitle')}</p>
          <Input
            size="large"
            allowClear
            prefix={<SearchOutlined className="text-muted" />}
            placeholder={t('home.searchPlaceholder')}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="!rounded-2xl !py-3"
          />
        </div>
        <div className="pointer-events-none absolute end-8 bottom-6 hidden lg:block" aria-hidden="true">
          <LogoMark size={160} onRed />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="rise flex items-center justify-between gap-4 rounded-3xl bg-sun p-6 text-coal" style={{ animationDelay: '80ms' }}>
          <div>
            <p className="m-0 text-sm font-bold">{t('home.offerKicker')}</p>
            <p className="m-0 text-3xl font-black">{t('home.offerTitle')}</p>
            <p className="mt-1 mb-0 text-sm">{t('home.offerBody')}</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-coal text-4xl text-sun">
            <ShoppingCartOutlined />
          </div>
        </div>
        <div className="rise grid grid-cols-3 gap-2 rounded-3xl border border-line bg-card p-4" style={{ animationDelay: '140ms' }}>
          {[
            { icon: <ShopOutlined />, title: t('home.how1'), body: t('home.how1b') },
            { icon: <ShoppingCartOutlined />, title: t('home.how2'), body: t('home.how2b') },
            { icon: <WalletOutlined />, title: t('home.how3'), body: t('home.how3b') },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEBEE] text-lg text-brand">{s.icon}</span>
              <span className="text-xs font-bold">{s.title}</span>
              <span className="text-[11px] leading-tight text-muted">{s.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="m-0 text-2xl font-extrabold">{t('home.nearYou')}</h2>
            <p className="m-0 text-sm text-muted">
              {t('home.radius', { km: RADIUS_KM })}
              {restaurants.data && ` · ${t('home.results', { count: restaurants.data.pagination.total })}`}
            </p>
          </div>
        </div>

        {cuisines.length > 1 && (
          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
            {[null, ...cuisines].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                onClick={() => setCuisine(c)}
                className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  cuisine === c ? 'border-coal bg-coal text-white dark:border-white dark:bg-white dark:text-coal' : 'border-line bg-card text-ink hover:border-brand'
                }`}
              >
                {c ?? t('common.all')}
              </button>
            ))}
          </div>
        )}

        {restaurants.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-line bg-card">
                <Skeleton.Node active className="!h-44 !w-full" />
                <div className="p-4">
                  <Skeleton active paragraph={{ rows: 2 }} title={false} />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r, i) => (
              <RestaurantCard key={r._id} restaurant={r} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<ShopOutlined />} title={t('home.noRestaurants')} body={t('home.noRestaurantsBody')} />
        )}
      </section>
    </div>
  )
}
