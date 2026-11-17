import { DownOutlined, EnvironmentFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { shortLabel, useDeliveryLocation } from '../location/useDeliveryLocation'

export function LocationChip({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t } = useTranslation()
  const { location, openPicker } = useDeliveryLocation()
  const label = shortLabel(location)
  const styles = tone === 'light' ? 'bg-white text-coal hover:bg-white/90' : 'bg-card text-ink border border-line hover:border-brand'

  return (
    <button type="button" onClick={openPicker} className={`flex max-w-full cursor-pointer items-center gap-2 rounded-full border-none px-4 py-2 text-start transition ${styles}`}>
      <EnvironmentFilled className="text-brand" />
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight text-muted">{t('location.deliverTo')}</span>
        <span className="block truncate text-sm leading-tight font-bold">{label || t('location.choose')}</span>
      </span>
      <DownOutlined className="text-xs" />
    </button>
  )
}
