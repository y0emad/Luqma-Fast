import { useState } from 'react'
import { App, Button, Input, Rate } from 'antd'
import { StarFilled } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../lib/api'
import type { Order } from '../types'

export function RateOrder({ order, restaurantName }: { order: Order; restaurantName: string }) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const labels = t('reviews.stars', { returnObjects: true }) as string[]

  if (order.review) {
    return (
      <section className="rise rounded-3xl border border-line bg-card p-5">
        <p className="m-0 text-sm font-bold text-muted">{t('reviews.yours')}</p>
        <div className="mt-1 flex items-center gap-3">
          <Rate disabled value={order.review.rating} />
          <span className="text-sm font-bold">{labels[order.review.rating - 1]}</span>
        </div>
        {order.review.comment && <p className="mt-2 mb-0 text-sm">“{order.review.comment}”</p>}
      </section>
    )
  }

  async function submit() {
    setBusy(true)
    try {
      await api.post(`/orders/${order._id}/review`, { rating, comment: comment.trim() || undefined })
      message.success(t('reviews.thanks'))
      await queryClient.invalidateQueries({ queryKey: ['order', order._id] })
      void queryClient.invalidateQueries({ queryKey: ['reviews'] })
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rise relative overflow-hidden rounded-3xl bg-sun p-5 text-coal">
      <StarFilled className="pointer-events-none absolute -end-4 -top-4 text-8xl text-white/30" aria-hidden="true" />
      <h2 className="relative m-0 text-xl font-black">{t('reviews.rateTitle')}</h2>
      <p className="relative mt-1 mb-3 text-sm">{t('reviews.rateBody', { name: restaurantName })}</p>
      <div className="relative flex flex-wrap items-center gap-3">
        <Rate value={rating} onChange={setRating} style={{ color: '#212121' }} className="!text-3xl [&_.ant-rate-star-zero_.anticon]:!text-white/70" />
        {rating > 0 && <span className="rounded-full bg-coal px-3 py-1 text-xs font-bold text-sun">{labels[rating - 1]}</span>}
      </div>
      {rating > 0 && (
        <div className="relative mt-3 flex flex-col gap-3">
          <Input.TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('reviews.commentPh')} maxLength={500} autoSize={{ minRows: 2, maxRows: 4 }} />
          <Button type="primary" size="large" loading={busy} onClick={submit} className="!bg-coal hover:!bg-black">
            {t('reviews.submit')}
          </Button>
        </div>
      )}
    </section>
  )
}
