import { useRef, useState } from 'react'
import { App, Button, Checkbox, Input, Modal, Segmented, Spin } from 'antd'
import { HomeOutlined, ShopOutlined, StarOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CAIRO, useDeliveryLocation, type AddressTitle, type DeliveryLocation } from '../location/useDeliveryLocation'
import { distanceKm } from '../location/geo'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { MapPicker, type Center } from './MapPicker'

type SavedAddress = { _id: string; title: string; address: string; landmark?: string; house: string; lat: number; lon: number }

const TITLE_ICONS: Record<AddressTitle, React.ReactNode> = { home: <HomeOutlined />, work: <ShopOutlined />, other: <StarOutlined /> }
const asTitle = (v: string): AddressTitle => (v === 'home' || v === 'work' ? v : 'other')

function PickerBody({ initial, onDone }: { initial: DeliveryLocation | null; onDone: (next: DeliveryLocation) => void }) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const start: Center = initial ?? CAIRO
  const center = useRef<Center>(start)
  const [street, setStreet] = useState(initial?.street ?? '')
  const [area, setArea] = useState(initial?.area ?? '')
  const [building, setBuilding] = useState(initial?.building ?? '')
  const [floor, setFloor] = useState(initial?.floor ?? '')
  const [apartment, setApartment] = useState(initial?.apartment ?? '')
  const [landmark, setLandmark] = useState(initial?.landmark ?? '')
  const [title, setTitle] = useState<AddressTitle>(initial?.title ?? 'home')
  const [saveToAccount, setSaveToAccount] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const streetTouched = useRef(!!initial)

  const isCustomer = user?.type === 'user'
  const saved = useQuery({
    queryKey: ['addresses'],
    enabled: isCustomer,
    queryFn: async () => (await api.get<{ data: SavedAddress[] }>('/addresses/getAddressesLimit', { params: { limit: 10 } })).data.data,
  })

  function onMove(c: Center) {
    if (distanceKm(c, center.current) > 0.005) streetTouched.current = false
    center.current = c
  }

  function pickSaved(a: SavedAddress) {
    const [b, f, ap] = a.house.split('|')
    onDone({ lat: a.lat, lng: a.lon, street: a.address, building: b || undefined, floor: f || undefined, apartment: ap || undefined, landmark: a.landmark || undefined, title: asTitle(a.title) })
  }

  async function confirm() {
    if (!street.trim()) {
      setError(t('location.streetRequired'))
      return
    }
    const next: DeliveryLocation = {
      lat: center.current.lat,
      lng: center.current.lng,
      street: street.trim(),
      area: area.trim() || undefined,
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      apartment: apartment.trim() || undefined,
      landmark: landmark.trim() || undefined,
      title,
    }
    if (isCustomer && saveToAccount) {
      setSaving(true)
      try {
        await api.post('/addresses/createAddress', {
          title,
          address: next.street + (next.area ? ` - ${next.area}` : ''),
          landmark: next.landmark ?? '',
          house: [next.building ?? '', next.floor ?? '', next.apartment ?? ''].join('|'),
          lat: next.lat,
          lon: next.lng,
        })
        void queryClient.invalidateQueries({ queryKey: ['addresses'] })
      } catch {
        message.warning(t('location.notSaved'))
      } finally {
        setSaving(false)
      }
    }
    onDone(next)
  }

  return (
    <>
      {isCustomer && !!saved.data?.length && (
        <div className="mb-4">
          <p className="mt-0 mb-2 text-xs font-bold text-muted">{t('location.saved')}</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {saved.data.map((a) => (
              <button key={a._id} type="button" onClick={() => pickSaved(a)} className="flex max-w-60 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-start text-ink transition hover:border-brand">
                <span className="text-brand">{TITLE_ICONS[asTitle(a.title)]}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold">{t(`location.${asTitle(a.title)}`)}</span>
                  <span className="block truncate text-xs text-muted">{a.address}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <MapPicker
        initial={start}
        zoom={initial ? 17 : 13}
        autoLocate={!initial}
        pinLabel={t('location.pinHint')}
        onChange={onMove}
        onResolved={(r) => {
          if (r && !streetTouched.current) {
            setStreet(r.street)
            setArea(r.area ?? '')
          }
        }}
        onDetecting={setDetecting}
        onLocateError={() => setError(t('location.denied'))}
      />

      {error && <p className="mt-2 mb-0 text-sm text-brand">{error}</p>}

      <div className="mt-4 grid gap-3">
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-bold text-muted">
            {t('location.street')} {detecting && <Spin size="small" />}
          </label>
          <Input
            size="large"
            value={street}
            onChange={(e) => {
              streetTouched.current = true
              setStreet(e.target.value)
            }}
            placeholder={t('location.streetPh')}
            suffix={area ? <span className="text-xs text-muted">{area}</span> : null}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder={t('location.building')} maxLength={20} />
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={t('location.floor')} maxLength={10} />
          <Input value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder={t('location.apartment')} maxLength={10} />
        </div>
        <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder={t('location.landmarkPh')} maxLength={120} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented value={title} onChange={(v) => setTitle(v as AddressTitle)} options={(['home', 'work', 'other'] as const).map((k) => ({ value: k, label: t(`location.${k}`), icon: TITLE_ICONS[k] }))} />
          {isCustomer && (
            <Checkbox checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)}>
              {t('location.saveToAccount')}
            </Checkbox>
          )}
        </div>
        <Button type="primary" size="large" block loading={saving} onClick={confirm} className="!h-12 !rounded-2xl">
          {t('location.confirm')}
        </Button>
      </div>
    </>
  )
}

export function LocationPicker() {
  const { t } = useTranslation()
  const { location, setLocation, pickerOpen, closePicker } = useDeliveryLocation()

  return (
    <Modal open={pickerOpen} onCancel={closePicker} footer={null} width={720} centered destroyOnHidden title={t('location.title')}>
      {pickerOpen && (
        <PickerBody
          initial={location}
          onDone={(next) => {
            setLocation(next)
            closePicker()
          }}
        />
      )}
    </Modal>
  )
}
