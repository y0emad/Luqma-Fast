import axios, { type AxiosRequestConfig } from 'axios'
import i18n, { currentLang } from '../i18n'
import { apiErrorsAr } from '../i18n/apiErrors.ar'

export const TOKEN_KEY = 'luqma_token'
export const REFRESH_KEY = 'luqma_refresh'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20_000,
})

export function saveTokens(token: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null
  try {
    const res = await axios.post(`${api.defaults.baseURL}/users/newToken`, { refreshToken })
    saveTokens(res.data.token, res.data.refreshToken)
    return res.data.token as string
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean }
    const isAuthCall = original?.url?.startsWith('/users/login') || original?.url?.startsWith('/users/newToken')
    if (axios.isAxiosError(error) && error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !original._retried && !isAuthCall) {
      original._retried = true
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
        return api(original)
      }
      clearTokens()
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg: string | undefined = error.response?.data?.message
    if (msg) return (currentLang() === 'ar' && apiErrorsAr[msg]) || msg
    if (!error.response) return i18n.t('errors.cantReach')
  }
  return i18n.t('errors.generic')
}
