import { createContext, useContext } from 'react'
import type { Item, Restaurant } from '../types'

export type CartLine = { item: Item; quantity: number }

export type CartRestaurant = Pick<Restaurant, '_id' | 'name' | 'delivery_fee' | 'opening_time' | 'closing_time' | 'restaurantImg'>

export type CartContextValue = {
  restaurant: CartRestaurant | null
  lines: CartLine[]
  count: number
  subtotal: number
  quantityOf: (itemId: string) => number
  add: (restaurant: CartRestaurant, item: Item) => 'added' | 'other-restaurant'
  replaceWith: (restaurant: CartRestaurant, item: Item) => void
  setQuantity: (itemId: string, quantity: number) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
