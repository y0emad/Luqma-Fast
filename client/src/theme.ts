import { theme as antdTheme, type ThemeConfig } from 'antd'
import type { Lang } from './i18n'

export const colors = {
  brand: '#E53935',
  brandDark: '#C62828',
  sun: '#FFC107',
  coal: '#212121',
  success: '#2E7D32',
}

const modes = {
  light: { page: '#FAFAFA', ink: colors.coal, surface: '#FFFFFF' },
  dark: { page: '#121212', ink: '#F5F5F5', surface: '#1E1E1E' },
}

const FONTS = {
  en: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
  ar: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
}

export function makeTheme(dark: boolean, lang: Lang): ThemeConfig {
  const m = dark ? modes.dark : modes.light
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors.brand,
      colorInfo: colors.brand,
      colorWarning: colors.sun,
      colorSuccess: colors.success,
      colorError: colors.brandDark,
      colorTextBase: m.ink,
      colorBgBase: dark ? m.page : '#FFFFFF',
      colorBgLayout: m.page,
      colorBgContainer: m.surface,
      colorBgElevated: m.surface,
      colorLink: colors.brand,
      borderRadius: 12,
      controlHeight: 40,
      fontFamily: FONTS[lang],
    },
    components: {
      Button: { primaryShadow: 'none', fontWeight: 600 },
      Layout: { headerBg: m.surface, footerBg: m.page },
      Card: { borderRadiusLG: 16 },
      Rate: { starColor: colors.sun },
      Segmented: { itemSelectedBg: colors.coal, itemSelectedColor: '#FFFFFF' },
    },
  }
}
