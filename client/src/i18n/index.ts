import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import 'dayjs/locale/ar'
import en from './en'
import ar from './ar'

export type Lang = 'en' | 'ar'
const LANG_KEY = 'luqma_lang'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.updateLocale('ar', { meridiem: (hour: number) => (hour < 12 ? 'ص' : 'م') })

function savedLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'en' || saved === 'ar') return saved
  } catch {
    return 'ar'
  }
  return navigator.language?.startsWith('en') ? 'en' : 'ar'
}

function applyLang(lng: string) {
  const lang: Lang = lng === 'en' ? 'en' : 'ar'
  dayjs.locale(lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    return
  }
}

i18n.on('languageChanged', applyLang)

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: savedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyLang(i18n.language)

export const currentLang = (): Lang => (i18n.language === 'en' ? 'en' : 'ar')

export default i18n
