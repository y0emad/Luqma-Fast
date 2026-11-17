import { Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { LogoMark } from '../components/Logo'

export function RouteError() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page p-6 text-center text-ink">
      <LogoMark size={64} />
      <h1 className="mt-6 mb-2 text-2xl font-extrabold">{t('errors.generic')}</h1>
      <div className="mt-4 flex gap-3">
        <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
          {t('common.retry')}
        </Button>
        <Button size="large" href="/">
          {t('errors.goHome')}
        </Button>
      </div>
    </div>
  )
}
