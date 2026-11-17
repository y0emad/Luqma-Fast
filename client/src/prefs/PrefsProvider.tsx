import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import arEG from 'antd/es/locale/ar_EG'
import enUS from 'antd/es/locale/en_US'
import { useTranslation } from 'react-i18next'
import { makeTheme } from '../theme'
import type { Lang } from '../i18n'
import { DARK_KEY, initialDark, PrefsContext } from './usePrefs'

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'en' ? 'en' : 'ar'
  const [dark, setDark] = useState(initialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(DARK_KEY, String(dark))
    } catch {
      return
    }
  }, [dark])

  const setLang = useCallback((next: Lang) => void i18n.changeLanguage(next), [i18n])

  return (
    <PrefsContext.Provider value={{ lang, setLang, dark, setDark }}>
      <ConfigProvider theme={makeTheme(dark, lang)} direction={lang === 'ar' ? 'rtl' : 'ltr'} locale={lang === 'ar' ? arEG : enUS}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </PrefsContext.Provider>
  )
}
