import { createContext, useContext } from 'react'

export type AddressTitle = 'home' | 'work' | 'other'

export type DeliveryLocation = {
  lat: number
  lng: number
  street: string
  area?: string
  building?: string
  floor?: string
  apartment?: string
  landmark?: string
  title?: AddressTitle
}

export const CAIRO = { lat: 30.0444, lng: 31.2357 }

export type LocationContextValue = {
  location: DeliveryLocation | null
  setLocation: (next: DeliveryLocation) => void
  pickerOpen: boolean
  openPicker: () => void
  closePicker: () => void
}

export const LocationContext = createContext<LocationContextValue | null>(null)

export function useDeliveryLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useDeliveryLocation must be used inside <LocationProvider>')
  return ctx
}

export function shortLabel(l: DeliveryLocation | null) {
  if (!l) return ''
  return [l.area, l.street].filter(Boolean)[0] ?? ''
}

export function fullAddress(l: DeliveryLocation, labels: { building: string; floor: string; apartment: string }) {
  const unit = [
    l.building && `${labels.building} ${l.building}`,
    l.floor && `${labels.floor} ${l.floor}`,
    l.apartment && `${labels.apartment} ${l.apartment}`,
  ]
    .filter(Boolean)
    .join('، ')
  return [l.street, l.area, unit, l.landmark].filter(Boolean).join(' - ')
}
