import { useRef, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Pagination, Select, Skeleton, Spin, TimePicker, Upload } from 'antd'
import { PlusOutlined, ShopOutlined, UploadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs, { type Dayjs } from 'dayjs'
import type { UploadFile } from 'antd'
import { api, getErrorMessage } from '../../lib/api'
import type { City, Paged, Restaurant } from '../../types'
import { FoodImage } from '../../components/FoodImage'
import { EmptyState } from '../../components/EmptyState'
import { money, to12h } from '../../lib/format'
import { MapPicker, type Center } from '../../components/MapPicker'
import { distanceKm, type Reverse } from '../../location/geo'
import { CAIRO } from '../../location/useDeliveryLocation'

type NewRestaurant = {
  email: string
  password: string
  name: string
  city_id: string
  address: string
  lat: number
  lng: number
  cuisines: string[]
  opening_time: Dayjs
  closing_time: Dayjs
  delivery_time: string
  delivery_fee: number
}

export function RestaurantsAdminPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [form] = Form.useForm<NewRestaurant>()
  const [detecting, setDetecting] = useState(false)
  const addressEdited = useRef(false)
  const cityPicked = useRef(false)
  const [cityNote, setCityNote] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<(Center & { n: number }) | null>(null)

  const list = useQuery({ queryKey: ['admin-restaurants', page], queryFn: async () => (await api.get<Paged<Restaurant>>('/restaurants/getRestaurants', { params: { page } })).data })
  const cities = useQuery({ queryKey: ['cities'], queryFn: async () => (await api.get<{ data: City[] }>('/city/getCities')).data.data })

  function onCity(id: string) {
    cityPicked.current = true
    const c = cities.data?.find((x) => x._id === id)
    if (c) setFlyTo({ lat: c.lat, lng: c.lon, n: Date.now() })
  }

  function onMapMove(c: Center) {
    form.setFieldsValue({ lat: c.lat, lng: c.lng })
    if (cityPicked.current || !cities.data?.length) return
    const nearest = cities.data
      .map((city) => ({ city, km: distanceKm(c, { lat: city.lat, lng: city.lon }) }))
      .sort((a, b) => a.km - b.km)[0]
    if (nearest && nearest.km <= 60) {
      form.setFieldsValue({ city_id: nearest.city._id })
      setCityNote(t('admin.nearestCity'))
    } else {
      form.setFieldsValue({ city_id: undefined })
      setCityNote(t('admin.noCityNear'))
    }
  }

  function onAddress(r: Reverse | null) {
    if (r?.label && !addressEdited.current) form.setFieldsValue({ address: r.label })
  }

  async function create(v: NewRestaurant) {
    setSaving(true)
    try {
      const body = new FormData()
      body.append('email', v.email.trim().toLowerCase())
      body.append('password', v.password)
      body.append('name', v.name)
      body.append('city_id', v.city_id)
      body.append('address', v.address)
      body.append('location', JSON.stringify({ type: 'Point', coordinates: [v.lng, v.lat] }))
      body.append('cuisines', JSON.stringify(v.cuisines))
      body.append('opening_time', v.opening_time.format('HH:mm'))
      body.append('closing_time', v.closing_time.format('HH:mm'))
      body.append('delivery_time', v.delivery_time)
      body.append('delivery_fee', String(v.delivery_fee))
      const file = files[0]?.originFileObj
      if (file) body.append('restaurantImg', file)
      await api.post('/restaurants/createRestaurant', body)
      message.success(t('admin.created'))
      setOpen(false)
      form.resetFields()
      addressEdited.current = false
      cityPicked.current = false
      setFiles([])
      await queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] })
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="m-0 text-3xl font-black">{t('admin.restaurantsTitle')}</h1>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t('admin.newRestaurant')}
        </Button>
      </div>

      {list.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : list.data?.data.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.data.map((r) => (
              <article key={r._id} className="rise overflow-hidden rounded-3xl border border-line bg-card">
                <FoodImage src={r.restaurantImg} alt={r.name} seed={r._id} className="h-32 w-full" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 truncate font-bold">{r.name}</h3>
                    <span className={`text-xs font-bold ${r.isClosed ? 'text-brand' : 'text-[#2E7D32]'}`}>{r.isClosed ? t('common.closed') : t('common.open')}</span>
                  </div>
                  <p className="m-0 truncate text-sm text-muted">{r.cuisines.join(' · ')}</p>
                  <p className="mt-2 mb-0 text-xs text-muted">
                    {to12h(r.opening_time)}–{to12h(r.closing_time)} · {money(r.delivery_fee)}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {list.data.pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination current={page} total={list.data.pagination.total} pageSize={list.data.pagination.perPage} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={<ShopOutlined />} title={t('home.noRestaurants')} />
      )}

      <Modal open={open} title={t('admin.newRestaurant')} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} width={760} destroyOnHidden>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={create}
          initialValues={{ opening_time: dayjs('09:00', 'HH:mm'), closing_time: dayjs('23:00', 'HH:mm'), delivery_time: '30 min', delivery_fee: 15, lat: CAIRO.lat, lng: CAIRO.lng, cuisines: [] }}
          className="!mt-4"
        >
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="email" label={t('admin.ownerEmail')} rules={[{ required: true, type: 'email', message: t('auth.invalidEmail') }]}>
              <Input dir="ltr" />
            </Form.Item>
            <Form.Item name="password" label={t('admin.ownerPassword')} rules={[{ required: true, min: 8, message: t('auth.shortPassword') }]}>
              <Input.Password dir="ltr" />
            </Form.Item>
            <Form.Item name="name" label={t('dash.restaurantName')} rules={[{ required: true, message: t('auth.required') }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item label={t('dash.locationTitle')} extra={t('location.moveMap')}>
            <MapPicker initial={CAIRO} zoom={13} pinLabel={t('location.pinRestaurant')} className="h-72" target={flyTo} onChange={onMapMove} onResolved={onAddress} onDetecting={setDetecting} />
          </Form.Item>
          <Form.Item name="lat" hidden rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="lng" hidden rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <div className="grid gap-x-3 sm:grid-cols-[2fr_1fr]">
            <Form.Item name="address" label={<span className="flex items-center gap-2">{t('dash.address')} {detecting && <Spin size="small" />}</span>} rules={[{ required: true, message: t('auth.required') }]}>
              <Input onChange={() => (addressEdited.current = true)} />
            </Form.Item>
            <Form.Item name="city_id" label={t('admin.city')} extra={cityNote} rules={[{ required: true, message: t('admin.noCityNear') }]}>
              <Select options={cities.data?.map((c) => ({ value: c._id, label: c.name }))} onChange={onCity} />
            </Form.Item>
          </div>
          <Form.Item name="cuisines" label={t('admin.cuisines')} extra={t('admin.cuisinesHint')} rules={[{ required: true, type: 'array', min: 1, message: t('auth.required') }]}>
            <Select mode="tags" tokenSeparators={[',', '،']} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-4">
            <Form.Item name="opening_time" label={t('dash.openingTime')} rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} className="!w-full" />
            </Form.Item>
            <Form.Item name="closing_time" label={t('dash.closingTime')} rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} className="!w-full" />
            </Form.Item>
            <Form.Item name="delivery_time" label={t('dash.deliveryTime')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="delivery_fee" label={t('dash.deliveryFee')} rules={[{ required: true }]}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </div>
          <Form.Item label={`${t('dash.image')} (${t('common.optional')})`}>
            <Upload accept="image/png,image/jpeg" maxCount={1} beforeUpload={() => false} fileList={files} onChange={({ fileList }) => setFiles(fileList)} listType="picture">
              <Button icon={<UploadOutlined />}>{t('dash.changePhoto')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
