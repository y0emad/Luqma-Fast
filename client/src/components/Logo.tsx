import { useTranslation } from 'react-i18next'

export function LogoMark({ size = 36, onRed = false }: { size?: number; onRed?: boolean }) {
  const circle = onRed ? '#FFFFFF' : '#E53935'
  const detail = onRed ? '#E53935' : '#FFFFFF'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={circle} />
      <path d="M12 34h40a20 20 0 0 1-40 0z" fill="#FFC107" />
      <rect x="9" y="31" width="46" height="4" rx="2" fill={detail} />
      <path d="M24 14c-3 3 3 5 0 9M32 11c-3 4 3 6 0 11M40 14c-3 3 3 5 0 9" stroke={detail} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`font-extrabold leading-none tracking-tight ${inverted ? 'text-white' : 'text-ink'}`} style={{ fontSize: size * 0.55 }}>
        {i18n.language === 'en' ? (
          <>
            Luqma <span className={inverted ? 'text-sun' : 'text-brand'}>Fast</span>
          </>
        ) : (
          <>
            لقمة <span className={inverted ? 'text-sun' : 'text-brand'}>ع السريع</span>
          </>
        )}
      </span>
      <span className="sr-only">{t('brand.name')}</span>
    </span>
  )
}
