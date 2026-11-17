import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  loginWithTokens: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function homeFor(user: User | null) {
  if (user?.type === 'restaurant') return '/restaurant'
  if (user?.type === 'admin') return '/admin/restaurants'
  return '/'
}
