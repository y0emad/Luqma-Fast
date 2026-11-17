import { Spin } from 'antd'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { RequireAuth } from './auth/RequireAuth'
import { RouteError } from './pages/RouteError'

const page = (load: () => Promise<{ Component: React.ComponentType }>) => ({ lazy: load })

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    ),
    children: [
      { path: '/', ...page(async () => ({ Component: (await import('./pages/HomePage')).HomePage })) },
      { path: '/r/:id', ...page(async () => ({ Component: (await import('./pages/RestaurantPage')).RestaurantPage })) },
      { path: '/cart', ...page(async () => ({ Component: (await import('./pages/CartPage')).CartPage })) },
      { path: '/contact', ...page(async () => ({ Component: (await import('./pages/ContactPage')).ContactPage })) },
      { path: '/terms', ...page(async () => ({ Component: (await import('./pages/LegalPage')).TermsPage })) },
      { path: '/privacy', ...page(async () => ({ Component: (await import('./pages/LegalPage')).PrivacyPage })) },
      { path: '/login', ...page(async () => ({ Component: (await import('./pages/auth/LoginPage')).LoginPage })) },
      { path: '/signup', ...page(async () => ({ Component: (await import('./pages/auth/SignupPage')).SignupPage })) },
      { path: '/verify-email', ...page(async () => ({ Component: (await import('./pages/auth/VerifyEmailPage')).VerifyEmailPage })) },
      { path: '/forgot-password', ...page(async () => ({ Component: (await import('./pages/auth/ForgotPasswordPage')).ForgotPasswordPage })) },
      { path: '/reset-password', ...page(async () => ({ Component: (await import('./pages/auth/ResetPasswordPage')).ResetPasswordPage })) },
      {
        element: <RequireAuth type="user" />,
        children: [
          { path: '/orders', ...page(async () => ({ Component: (await import('./pages/OrdersPage')).OrdersPage })) },
          { path: '/orders/:id', ...page(async () => ({ Component: (await import('./pages/OrderPage')).OrderPage })) },
        ],
      },
      {
        element: <RequireAuth type="restaurant" />,
        children: [
          { path: '/restaurant', ...page(async () => ({ Component: (await import('./pages/restaurant/DashboardPage')).DashboardPage })) },
          { path: '/restaurant/orders', ...page(async () => ({ Component: (await import('./pages/restaurant/OrdersBoardPage')).OrdersBoardPage })) },
          { path: '/restaurant/menu', ...page(async () => ({ Component: (await import('./pages/restaurant/MenuManagePage')).MenuManagePage })) },
          { path: '/restaurant/settings', ...page(async () => ({ Component: (await import('./pages/restaurant/SettingsPage')).SettingsPage })) },
        ],
      },
      {
        element: <RequireAuth type="admin" />,
        children: [
          { path: '/admin/restaurants', ...page(async () => ({ Component: (await import('./pages/admin/RestaurantsAdminPage')).RestaurantsAdminPage })) },
          { path: '/admin/messages', ...page(async () => ({ Component: (await import('./pages/admin/MessagesAdminPage')).MessagesAdminPage })) },
          { path: '/admin/cities', ...page(async () => ({ Component: (await import('./pages/admin/CitiesAdminPage')).CitiesAdminPage })) },
        ],
      },
      { path: '*', ...page(async () => ({ Component: (await import('./pages/NotFoundPage')).NotFoundPage })) },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
