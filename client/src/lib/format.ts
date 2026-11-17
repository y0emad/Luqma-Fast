import dayjs from 'dayjs'
import i18n from '../i18n'

export function money(value: number) {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return i18n.t('common.egp', { value: n })
}

export function imageUrl(path?: string | null) {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return `/uploads/${path.replace(/^\/?src\/uploads\//, '')}`
}

export function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

export function timeAgo(date: string) {
  return dayjs(date).fromNow()
}

export function clock(date: string) {
  return dayjs(date).format('h:mm A')
}

export function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return dayjs().hour(h).minute(m).format('h:mm A')
}

export function isEgyptianMobile(value: string) {
  return /^(\+20|0020|20)?0?1[0125]\d{8}$/.test(value.replace(/[\s-]/g, ''))
}

export function deliveryMinutes(text: string) {
  const n = parseInt(text, 10)
  return Number.isFinite(n) ? n : 30
}
