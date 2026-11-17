import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Skeleton, Spin, Switch, TimePicker, Upload } from 'antd'
import { CameraOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs, { type Dayjs } from 'dayjs'
import { api, getErrorMessage } from '../../lib/api'
import { FoodImage } from '../../components/FoodImage'
import { useMyRestaurant, useUpdateMyRestaurant } from '../../lib/myRestaurant'
import { MapPicker, type Center } from '../../components/MapPicker'
import { distanceKm, type Reverse } from '../../location/geo'

type SettingsForm = {
  name: string
  description?: string
  address: string
  opening_time: Dayjs
  closing_time: Dayjs
  delivery_time: string
  delivery_fee: number
  open: boolean
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const restaurant = useMyRestaurant()
  const update = useUpdateMyRestaurant()
  const [form] = Form.useForm<SettingsForm>()
  const [uploading, setUploading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const pin = useRef<Center | null>(null)
  const moved = useRef(false)
  const addressEdited = useRef(false)

  useEffect(() => {
    const r = restaurant.data
    if (!r) return
    form.setFieldsValue({
      name: r.name,
      description: r.description,
      address: r.address,
      opening_time: dayjs(r.opening_time, 'HH:mm'),
      closing_time: dayjs(r.closing_time, 'HH:mm'),
      delivery_time: r.delivery_time,
      delivery_fee: r.delivery_fee,
      open: !r.isClosed,
    })
  }, [restaurant.data, form])

  async function save(values: SettingsForm) {
    try {
      await update.mutateAsync({
        name: values.name,
        description: values.description,
        address: values.address,
        opening_time: values.opening_time.format('HH:mm'),
        closing_time: values.closing_time.format('HH:mm'),
        delivery_time: values.delivery_time,
        delivery_fee: values.delivery_fee,
        isClosed: !values.open,
        ...(moved.current && pin.current ? { location: { type: 'Point', coordinates: [pin.current.lng, pin.current.lat] } } : {}),
      })
      moved.current = false
      message.success(t('dash.saved'))
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('restaurantImg', file)
      await api.put('/my-restaurant/image', body)
      await queryClient.invalidateQueries({ queryKey: ['my-restaurant'] })
      message.success(t('dash.saved'))
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
    return false
  }

  if (restaurant.isLoading || !restaurant.data) return <Skeleton active paragraph={{ rows: 8 }} />
  const r = restaurant.data
  const original: Center = { lat: r.location.coordinates[1], lng: r.location.coordinates[0] }

  function onPinMove(c: Center) {
    pin.current = c
    if (distanceKm(c, original) > 0.005) moved.current = true
  }

  function onAddress(rev: Reverse | null) {
    if (moved.current && rev?.label && !addressEdited.current) form.setFieldsValue({ address: rev.label })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mt-0 mb-5 text-3xl font-black">{t('dash.settingsTitle')}</h1>
      <div className="relative mb-6 h-48 overflow-hidden rounded-3xl">
        <FoodImage src={r.restaurantImg} alt={r.name} seed={r._id} className="h-full w-full" />
        <Upload accept="image/png,image/jpeg" showUploadList={false} beforeUpload={uploadImage}>
          <Button icon={<CameraOutlined />} loading={uploading} className="!absolute end-4 bottom-4">
            {t('dash.changePhoto')}
          </Button>
        </Upload>
      </div>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save} size="large" className="rounded-3xl border border-line bg-card p-5">
        <Form.Item name="open" label={t('dash.acceptingOrders')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="name" label={t('dash.restaurantName')} rules={[{ required: true, min: 2, message: t('auth.required') }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={`${t('dash.description')} (${t('common.optional')})`}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} />
        </Form.Item>
        <Form.Item label={t('dash.locationTitle')} extra={t('dash.locationHint')}>
          <MapPicker initial={original} zoom={16} pinLabel={t('location.pinRestaurant')} className="h-72" onChange={onPinMove} onResolved={onAddress} onDetecting={setDetecting} />
        </Form.Item>
        <Form.Item name="address" label={<span className="flex items-center gap-2">{t('dash.address')} {detecting && <Spin size="small" />}</span>} rules={[{ required: true, message: t('auth.required') }]}>
          <Input onChange={() => (addressEdited.current = true)} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="opening_time" label={t('dash.openingTime')} rules={[{ required: true, message: t('auth.required') }]}>
            <TimePicker format="HH:mm" minuteStep={15} className="!w-full" />
          </Form.Item>
          <Form.Item name="closing_time" label={t('dash.closingTime')} rules={[{ required: true, message: t('auth.required') }]}>
            <TimePicker format="HH:mm" minuteStep={15} className="!w-full" />
          </Form.Item>
          <Form.Item name="delivery_time" label={t('dash.deliveryTime')} rules={[{ required: true, message: t('auth.required') }]}>
            <Input placeholder="30 min" />
          </Form.Item>
          <Form.Item name="delivery_fee" label={t('dash.deliveryFee')} rules={[{ required: true, message: t('auth.required') }]}>
            <InputNumber min={0} step={1} className="!w-full" />
          </Form.Item>
        </div>
        <Button type="primary" htmlType="submit" loading={update.isPending} block>
          {t('common.save')}
        </Button>
      </Form>
    </div>
  )
}
