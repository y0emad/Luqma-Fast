import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const UPDATED = '2026-11-12'

export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t } = useTranslation()
  const sections = t(`legal.${kind}`, { returnObjects: true }) as [string, string][]
  const title = t(kind === 'terms' ? 'legal.termsTitle' : 'legal.privacyTitle')
  const intro = t(kind === 'terms' ? 'legal.termsIntro' : 'legal.privacyIntro')

  return (
    <article className="mx-auto max-w-3xl">
      <header className="rise mb-6 flex items-start gap-4 rounded-[2rem] bg-coal p-7 text-white">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sun text-2xl text-coal">
          {kind === 'terms' ? <FileTextOutlined /> : <SafetyCertificateOutlined />}
        </span>
        <div>
          <h1 className="m-0 text-3xl font-black">{title}</h1>
          <p className="mt-2 mb-1 text-white/85">{intro}</p>
          <p className="m-0 text-xs text-white/60">{t('legal.updated', { date: UPDATED })}</p>
        </div>
      </header>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {sections.map(([heading, body], i) => (
          <li key={heading} className="rise rounded-3xl border border-line bg-card p-5" style={{ animationDelay: `${i * 40}ms` }}>
            <h2 className="m-0 flex items-center gap-3 text-lg font-extrabold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFEBEE] text-sm font-black text-brand">{i + 1}</span>
              {heading}
            </h2>
            <p className="mt-2 mb-0 leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/contact">{t('contact.title')}</Link>
        {' · '}
        <Link to={kind === 'terms' ? '/privacy' : '/terms'}>{t(kind === 'terms' ? 'legal.privacyTitle' : 'legal.termsTitle')}</Link>
      </p>
    </article>
  )
}

export function TermsPage() {
  return <LegalPage kind="terms" />
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />
}
