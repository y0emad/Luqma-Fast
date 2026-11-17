export type UserType = 'user' | 'admin' | 'restaurant'

export type User = {
  _id: string
  name: string
  email: string
  type: UserType
  photo?: string
  verified: boolean
}

export type GeoPoint = { type: 'Point'; coordinates: [number, number] }

export type Restaurant = {
  _id: string
  user_id: string
  city_id: string
  name: string
  description?: string
  address: string
  location: GeoPoint
  cuisines: string[]
  opening_time: string
  closing_time: string
  restaurantImg?: string
  delivery_time: string
  delivery_fee: number
  rating: number
  ratings_count?: number
  isClosed: boolean
  is_open?: boolean
}

export type Category = { _id: string; restaurant_id: string; name: string }

export type Item = {
  _id: string
  restaurant_id: string
  category_id: string
  name: string
  cover: string
  vegetarian: boolean
  price: number
  status: 'active' | 'inactive'
}

export const ORDER_STATUSES = ['awaiting_payment', 'pending', 'accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderItem = { item_id: string; name: string; price: number; quantity: number }

export type Order = {
  _id: string
  user_id: string | { _id: string; name: string; email: string }
  restaurant_id: string | { _id: string; name: string; restaurantImg?: string; address?: string; user_id?: string }
  status: OrderStatus
  status_history: { status: OrderStatus; at: string; by: 'user' | 'restaurant' | 'admin' | 'payment' | 'system' }[]
  cancel_reason?: string
  address: string
  phone?: string
  instructions?: string
  items: OrderItem[]
  total: number
  delivery_charge: number
  grand_total: number
  payment_status: boolean
  payment_method: 'cash' | 'card'
  refunded: boolean
  review?: { rating: number; comment?: string; created_at: string }
  created_at: string
}

export type Pagination = { page: number; perPage: number; totalPages: number; total: number; nextPage: number | null; prevPage: number | null }

export type Paged<T> = { data: T[]; pagination: Pagination }

export type City = { _id: string; name: string; lat: number; lon: number }

export type Stats = {
  orders: { total: number; by_status: Record<string, number> }
  revenue: number
  average_order_value: number
  top_items: { item_id: string; name: string; quantity: number; revenue: number }[]
}

export type PaymentStart = { payment_id: string; amount_cents: number; checkout_url: string; expires_in_minutes?: number }

export type Review = { _id: string; rating: number; comment: string | null; created_at: string; author: string | null; items: string[] }

export type ReviewsPage = Paged<Review> & { rating: number; ratings_count: number; breakdown: Record<string, number> }

export type ContactMessage = { _id: string; name: string; email: string; subject: 'order' | 'restaurant' | 'payment' | 'other'; message: string; order_ref?: string; read: boolean; created_at: string }
