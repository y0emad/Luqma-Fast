import { useEffect, useRef, useState } from 'react'
import { AutoComplete, Button, Input } from 'antd'
import { AimOutlined, EnvironmentFilled, SearchOutlined } from '@ant-design/icons'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import 'leaflet/dist/leaflet.css'
import { currentPosition, reverseGeocode, searchPlaces, type Place, type Reverse } from '../location/geo'
import { usePrefs } from '../prefs/usePrefs'

export type Center = { lat: number; lng: number }

function MapEvents({ onMove }: { onMove: (c: Center) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      onMove({ lat: c.lat, lng: c.lng })
    },
  })
  return null
}

function FlyTo({ target }: { target: (Center & { n: number }) | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17, { duration: 0.8 })
  }, [target, map])
  return null
}

function FixSize() {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(id)
  }, [map])
  return null
}

type Props = {
  initial: Center
  zoom?: number
  autoLocate?: boolean
  pinLabel?: string
  className?: string
  onChange: (c: Center) => void
  onResolved?: (r: Reverse | null) => void
  onDetecting?: (busy: boolean) => void
  onLocateError?: () => void
  target?: (Center & { n: number }) | null
}

export function MapPicker({ initial, zoom = 15, autoLocate = false, pinLabel, className = 'h-72 sm:h-80', onChange, onResolved, onDetecting, onLocateError, target = null }: Props) {
  const { t } = useTranslation()
  const { lang } = usePrefs()
  const [center, setCenter] = useState<Center>(initial)
  const [flyTarget, setFlyTarget] = useState<(Center & { n: number }) | null>(null)
  const [locating, setLocating] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [listOpen, setListOpen] = useState(false)
  const callbacks = useRef({ onChange, onResolved, onDetecting, onLocateError })
  useEffect(() => {
    callbacks.current = { onChange, onResolved, onDetecting, onLocateError }
  })

  useEffect(() => {
    if (!autoLocate) return
    currentPosition()
      .then((pos) => setFlyTarget({ ...pos, n: Date.now() }))
      .catch(() => callbacks.current.onLocateError?.())
  }, [autoLocate])

  useEffect(() => {
    callbacks.current.onChange(center)
    const ctrl = new AbortController()
    const id = setTimeout(() => {
      callbacks.current.onDetecting?.(true)
      reverseGeocode(center.lat, center.lng, lang, ctrl.signal)
        .then((r) => callbacks.current.onResolved?.(r))
        .catch(() => undefined)
        .finally(() => {
          if (!ctrl.signal.aborted) callbacks.current.onDetecting?.(false)
        })
    }, 600)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [center, lang])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return
    const ctrl = new AbortController()
    const id = setTimeout(() => {
      searchPlaces(q, lang, ctrl.signal)
        .then(setResults)
        .catch(() => undefined)
    }, 450)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [query, lang])

  async function locateMe() {
    setLocating(true)
    try {
      const pos = await currentPosition()
      setFlyTarget({ ...pos, n: Date.now() })
    } catch {
      onLocateError?.()
    } finally {
      setLocating(false)
    }
  }

  function pick(value: string) {
    const place = results.find((r) => `${r.lat},${r.lng}` === value)
    if (!place) return
    setListOpen(false)
    setQuery(place.label)
    setFlyTarget({ lat: place.lat, lng: place.lng, n: Date.now() })
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line ${className}`}>
      <div className="absolute inset-x-3 top-3 z-[600]">
        <AutoComplete
          value={query}
          onChange={(v) => {
            setQuery(v)
            setListOpen(true)
            if (v.trim().length < 3) setResults([])
          }}
          onSelect={pick}
          open={listOpen && results.length > 0}
          onFocus={() => setListOpen(true)}
          onBlur={() => setListOpen(false)}
          options={results.map((r) => ({
            value: `${r.lat},${r.lng}`,
            label: (
              <div className="py-1">
                <div className="truncate text-sm font-semibold">{r.label}</div>
                <div className="truncate text-xs text-muted">{r.detail}</div>
              </div>
            ),
          }))}
          className="w-full"
          popupMatchSelectWidth
        >
          <Input size="large" allowClear prefix={<SearchOutlined className="text-muted" />} placeholder={t('location.searchPh')} className="!rounded-full !shadow-md" />
        </AutoComplete>
      </div>

      <div className="h-full w-full" dir="ltr">
        <MapContainer center={[initial.lat, initial.lng]} zoom={zoom} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <MapEvents onMove={setCenter} />
          <FlyTo target={[flyTarget, target].filter((x): x is Center & { n: number } => !!x).sort((a, b) => b.n - a.n)[0] ?? null} />
          <FixSize />
        </MapContainer>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
        <div className="-mt-10 flex flex-col items-center">
          {pinLabel && <span className="rounded-full bg-coal px-3 py-1 text-xs font-bold whitespace-nowrap text-white">{pinLabel}</span>}
          <EnvironmentFilled className="text-[44px] text-brand drop-shadow" />
        </div>
      </div>

      <Button icon={<AimOutlined />} loading={locating} onClick={locateMe} className="!absolute end-3 bottom-3 z-[600] !rounded-full !shadow-md">
        {t('location.useMine')}
      </Button>
    </div>
  )
}
