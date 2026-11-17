import { ClockCircleOutlined, StarFilled } from '@ant-design/icons'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { Restaurant } from '../types'
import { FoodImage } from './FoodImage'
import { money, to12h } from '../lib/format'

export function RestaurantCard({ restaurant, index = 0 }: { restaurant: Restaurant; index?: number }) {
  const { t } = useTranslation()
  const open = restaurant.is_open !== false
  const free = restaurant.delivery_fee === 0

  return (
    <Link
      to={`/r/${restaurant._id}`}
      className="rise group block overflow-hidden rounded-3xl border border-line bg-card text-ink no-underline transition duration-200 hover:-translate-y-1 hover:border-brand/40"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="relative h-44 overflow-hidden">
        <FoodImage src={restaurant.restaurantImg} alt={restaurant.name} seed={restaurant._id} className="h-full w-full transition duration-300 group-hover:scale-105" />
        <div className="absolute inset-x-3 top-3 flex justify-between gap-2">
          {free ? <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-coal">{t('restaurant.freeDelivery')}</span> : <span />}
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-coal">
            <ClockCircleOutlined /> {restaurant.delivery_time}
          </span>
        </div>
        {!open && (
          <div className="absolute inset-0 flex items-center justify-center bg-coal/65">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-coal">{t('restaurant.closedNow', { from: to12h(restaurant.opening_time) })}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="m-0 truncate text-base font-bold">{restaurant.name}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-xs font-bold text-[#7A5A00]">
            <StarFilled className="text-sun" /> {restaurant.ratings_count ? `${restaurant.rating.toFixed(1)} (${restaurant.ratings_count})` : t('reviews.new')}
          </span>
        </div>
        <p className="mt-1 mb-3 truncate text-sm text-muted">{restaurant.cuisines.join(' · ')}</p>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{free ? t('restaurant.freeDelivery') : t('restaurant.deliveryFee', { fee: money(restaurant.delivery_fee) })}</span>
          <span className={`font-semibold ${open ? 'text-[#2E7D32]' : 'text-brand'}`}>{open ? t('common.open') : t('common.closed')}</span>
        </div>
      </div>
    </Link>
  )
}
