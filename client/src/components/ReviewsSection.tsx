import { Button, Rate, Skeleton } from 'antd'
import { StarFilled } from '@ant-design/icons'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import type { ReviewsPage } from '../types'
import { timeAgo } from '../lib/format'

export function ReviewsSection({ url, queryKey }: { url: string; queryKey: unknown[] }) {
  const { t } = useTranslation()
  const reviews = useInfiniteQuery({
    queryKey: ['reviews', ...queryKey],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await api.get<ReviewsPage>(url, { params: { page: pageParam } })).data,
    getNextPageParam: (last) => last.pagination.nextPage ?? undefined,
  })

  if (reviews.isLoading) return <Skeleton active paragraph={{ rows: 4 }} />
  const first = reviews.data?.pages[0]
  if (!first) return null
  const list = reviews.data!.pages.flatMap((p) => p.data)
  const max = Math.max(1, ...Object.values(first.breakdown))

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="mt-0 mb-4 text-xl font-extrabold">{t('reviews.title')}</h2>
      {first.ratings_count ? (
        <>
          <div className="mb-5 grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-sun-soft px-8 py-4 text-[#7A5A00]">
              <span className="text-5xl leading-none font-black">{first.rating.toFixed(1)}</span>
              <Rate disabled allowHalf value={Math.round(first.rating * 2) / 2} className="!mt-2 !text-base" />
              <span className="mt-1 text-xs font-semibold">{t('reviews.count', { n: first.ratings_count })}</span>
            </div>
            <div className="flex flex-col justify-center gap-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="flex w-6 items-center gap-0.5 font-bold">
                    {n}
                    <StarFilled className="text-sun" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-sun" style={{ width: `${((first.breakdown[n] ?? 0) / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-end text-muted">{first.breakdown[n] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {list.map((r) => (
              <li key={r._id} className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coal text-sm font-bold text-sun">{(r.author ?? '?').slice(0, 1).toUpperCase()}</span>
                    <span className="text-sm font-bold">{r.author}</span>
                  </span>
                  <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
                </div>
                <Rate disabled value={r.rating} className="!mt-1 !text-sm" />
                {r.comment && <p className="mt-1 mb-0 text-sm">{r.comment}</p>}
                {!!r.items.length && <p className="mt-1 mb-0 text-xs text-muted">{r.items.join(' · ')}</p>}
              </li>
            ))}
          </ul>
          {reviews.hasNextPage && (
            <Button block onClick={() => reviews.fetchNextPage()} loading={reviews.isFetchingNextPage}>
              {t('reviews.more')}
            </Button>
          )}
        </>
      ) : (
        <p className="m-0 text-sm text-muted">{t('reviews.empty')}</p>
      )}
    </section>
  )
}
