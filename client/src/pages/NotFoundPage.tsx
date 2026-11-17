import { Button } from 'antd'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogoMark } from '../components/Logo'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="rise flex flex-col items-center py-20 text-center">
      <div className="relative mb-6">
        <span className="text-8xl font-black text-line">404</span>
        <span className="absolute inset-0 flex items-center justify-center">
          <LogoMark size={64} />
        </span>
      </div>
      <h1 className="m-0 text-2xl font-extrabold">{t('errors.notFoundTitle')}</h1>
      <p className="mt-2 text-muted">{t('errors.notFoundBody')}</p>
      <Link to="/">
        <Button type="primary" size="large">
          {t('errors.goHome')}
        </Button>
      </Link>
    </div>
  )
}
