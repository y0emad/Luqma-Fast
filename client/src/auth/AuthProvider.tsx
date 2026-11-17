import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, clearTokens, saveTokens, TOKEN_KEY } from '../lib/api'
import type { User } from '../types'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ user: User }>('/users/me')
    setUser(res.data.user)
  }, [])

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    api
      .get<{ user: User }>('/users/me')
      .then((res) => setUser(res.data.user))
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(() => {
    if (localStorage.getItem(TOKEN_KEY)) void api.post('/users/logout').catch(() => undefined)
    clearTokens()
    setUser(null)
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY || e.oldValue === e.newValue) return
      if (!e.newValue) {
        setUser(null)
        return
      }
      api
        .get<{ user: User }>('/users/me')
        .then((res) => setUser(res.data.user))
        .catch(() => setUser(null))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const loginWithTokens = useCallback((token: string, refreshToken: string, next: User) => {
    saveTokens(token, refreshToken)
    setUser(next)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: User; token: string; refreshToken: string }>('/users/login', { email, password })
      loginWithTokens(res.data.token, res.data.refreshToken, res.data.user)
      return res.data.user
    },
    [loginWithTokens],
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithTokens, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}
