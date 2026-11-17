import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import { LocationProvider } from './location/LocationProvider'
import { PrefsProvider } from './prefs/PrefsProvider'
import { initialDark } from './prefs/usePrefs'
import AppRoutes from './App.tsx'
import './index.css'

document.documentElement.classList.toggle('dark', initialDark())

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <PrefsProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </PrefsProvider>
    </StyleProvider>
  </StrictMode>,
)
