import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Item } from '../types'
import { CartContext, type CartLine, type CartRestaurant } from './useCart'

const CART_KEY = 'luqma_cart'

type Saved = { restaurant: CartRestaurant | null; lines: CartLine[] }

function load(): Saved {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw) return JSON.parse(raw) as Saved
  } catch {
    return { restaurant: null, lines: [] }
  }
  return { restaurant: null, lines: [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(load)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state))
    } catch {
      return
    }
  }, [state])

  const add = useCallback(
    (restaurant: CartRestaurant, item: Item) => {
      if (state.restaurant && state.restaurant._id !== restaurant._id && state.lines.length) return 'other-restaurant'
      setState((s) => {
        const existing = s.lines.find((l) => l.item._id === item._id)
        const lines = existing
          ? s.lines.map((l) => (l.item._id === item._id ? { ...l, quantity: Math.min(l.quantity + 1, 50) } : l))
          : [...s.lines, { item, quantity: 1 }]
        return { restaurant, lines }
      })
      return 'added'
    },
    [state.restaurant, state.lines.length],
  )

  const replaceWith = useCallback((restaurant: CartRestaurant, item: Item) => {
    setState({ restaurant, lines: [{ item, quantity: 1 }] })
  }, [])

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setState((s) => {
      const lines = quantity <= 0 ? s.lines.filter((l) => l.item._id !== itemId) : s.lines.map((l) => (l.item._id === itemId ? { ...l, quantity: Math.min(quantity, 50) } : l))
      return { restaurant: lines.length ? s.restaurant : null, lines }
    })
  }, [])

  const clear = useCallback(() => setState({ restaurant: null, lines: [] }), [])

  const value = useMemo(() => {
    const count = state.lines.reduce((n, l) => n + l.quantity, 0)
    const subtotal = Math.round(state.lines.reduce((n, l) => n + l.item.price * l.quantity, 0) * 100) / 100
    const quantityOf = (itemId: string) => state.lines.find((l) => l.item._id === itemId)?.quantity ?? 0
    return { restaurant: state.restaurant, lines: state.lines, count, subtotal, quantityOf, add, replaceWith, setQuantity, clear }
  }, [state, add, replaceWith, setQuantity, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
