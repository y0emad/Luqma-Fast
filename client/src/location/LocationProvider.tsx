import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocationContext, type DeliveryLocation } from './useDeliveryLocation'
import { LocationPicker } from '../components/LocationPicker'

const KEY = 'luqma_location'

function load(): DeliveryLocation | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DeliveryLocation
    return Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) ? parsed : null
  } catch {
    return null
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<DeliveryLocation | null>(load)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    try {
      if (location) localStorage.setItem(KEY, JSON.stringify(location))
    } catch {
      return
    }
  }, [location])

  const setLocation = useCallback((next: DeliveryLocation) => setLocationState(next), [])
  const openPicker = useCallback(() => setPickerOpen(true), [])
  const closePicker = useCallback(() => setPickerOpen(false), [])

  const value = useMemo(() => ({ location, setLocation, pickerOpen, openPicker, closePicker }), [location, setLocation, pickerOpen, openPicker, closePicker])

  return (
    <LocationContext.Provider value={value}>
      {children}
      <LocationPicker />
    </LocationContext.Provider>
  )
}
