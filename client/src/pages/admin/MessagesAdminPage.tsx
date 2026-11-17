import { useState } from 'react'
import { App, Button, Checkbox, Pagination, Skeleton } from 'antd'
import { CheckOutlined, MailOutlined, UndoOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import type { ContactMessage, Paged } from '../../types'
import { EmptyState } from '../../components/EmptyState'
import { timeAgo } from '../../lib/format'

export function MessagesAdminPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [onlyUnread, setOnlyUnread] = useState(false)

  const inbox = useQuery({
    queryKey: ['inbox', page, onlyUnread],
    queryFn: async () => (await api.get<Paged<ContactMessage> & { unread: number }>('/contact', { params: { page, ...(onlyUnread ? { unread: 'true' } : {}) } })).data,
    refetchInterval: 30_000,
  })

  async function setRead(m: ContactMessage, read: boolean) {
    try {
      await api.patch(`/contact/${m._id}`, { read })
      await queryClient.invalidateQueries({ queryKey: ['inbox'] })
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-3xl font-black">{t('admin.inboxTitle')}</h1>
          {!!inbox.data?.unread && <p className="m-0 text-sm font-semibold text-brand">{t('admin.unread', { count: inbox.data.unread })}</p>}
        </div>
        <Checkbox
          checked={onlyUnread}
          onChange={(e) => {
            setOnlyUnread(e.target.checked)
            setPage(1)
          }}
        >
          {t('admin.onlyUnread')}
        </Checkbox>
      </div>

      {inbox.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : inbox.data?.data.length ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {inbox.data.data.map((m) => (
              <li key={m._id} className={`rise rounded-3xl border bg-card p-5 ${m.read ? 'border-line' : 'border-brand/50'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="m-0 flex items-center gap-2 font-bold">
                      {!m.read && <span className="h-2 w-2 rounded-full bg-brand" />}
                      {m.name}
                      <span className="rounded-full bg-sun-soft px-2 py-0.5 text-xs font-semibold text-[#7A5A00]">{t(`contact.subjects.${m.subject}`)}</span>
                      {m.order_ref && <span className="text-xs text-muted">#{m.order_ref}</span>}
                    </p>
                    <p className="m-0 text-xs text-muted" dir="ltr">
                      {m.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{timeAgo(m.created_at)}</span>
                </div>
                <p className="mt-3 mb-4 text-sm leading-relaxed whitespace-pre-line">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button icon={<MailOutlined />} href={`mailto:${m.email}?subject=${encodeURIComponent('Luqma Fast')}`} onClick={() => !m.read && setRead(m, true)}>
                    {t('admin.reply')}
                  </Button>
                  {m.read ? (
                    <Button type="text" icon={<UndoOutlined />} onClick={() => setRead(m, false)}>
                      {t('admin.markUnread')}
                    </Button>
                  ) : (
                    <Button type="text" icon={<CheckOutlined />} onClick={() => setRead(m, true)}>
                      {t('admin.markRead')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {inbox.data.pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination current={page} total={inbox.data.pagination.total} pageSize={inbox.data.pagination.perPage} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={<MailOutlined />} title={t('admin.noMessages')} />
      )}
    </div>
  )
}
