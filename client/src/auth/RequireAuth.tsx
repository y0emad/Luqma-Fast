import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router'
import { homeFor, useAuth } from './useAuth'
import type { UserType } from '../types'

export function RequireAuth({ type }: { type?: UserType }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (type && user.type !== type) return <Navigate to={homeFor(user)} replace />

  return <Outlet />
}
