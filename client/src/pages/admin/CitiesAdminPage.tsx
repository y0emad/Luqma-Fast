import { App, Button, Form, Input, InputNumber, Skeleton, Spin } from 'antd'
import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { api, getErrorMessage } from '../../lib/api'
import type { City } from '../../types'
import { EmptyState } from '../../components/EmptyState'
import { MapPicker } from '../../components/MapPicker'
import { CAIRO } from '../../location/useDeliveryLocation'

export function CitiesAdminPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<{ name: string; lat: number; lon: number }>()
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const nameEdited = useRef(false)
  const cities = useQuery({ queryKey: ['cities'], queryFn: async () => (await api.get<{ data: City[] }>('/city/getCities')).data.data })

  async function create(values: { name: string; lat: number; lon: number }) {
    setSaving(true)
    try {
      await api.post('/city/createCity', values)
      form.resetFields()
      nameEdited.current = false
      message.success(t('dash.saved'))
      await queryClient.invalidateQueries({ queryKey: ['cities'] })
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.4fr_1fr]">
      <section className="rounded-3xl border border-line bg-card p-5 md:self-start">
        <h2 className="mt-0 mb-4 text-lg font-extrabold">{t('admin.newCity')}</h2>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={create} initialValues={{ lat: CAIRO.lat, lon: CAIRO.lng }}>
          <Form.Item extra={t('location.moveMap')}>
            <MapPicker
              initial={CAIRO}
              zoom={11}
              pinLabel={t('location.pinCity')}
              className="h-64"
              onChange={(c) => form.setFieldsValue({ lat: c.lat, lon: c.lng })}
              onResolved={(r) => {
                if (r?.city && !nameEdited.current) form.setFieldsValue({ name: r.city })
              }}
              onDetecting={setDetecting}
            />
          </Form.Item>
          <Form.Item name="lat" hidden rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="lon" hidden rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="name" label={<span className="flex items-center gap-2">{t('admin.cityName')} {detecting && <Spin size="small" />}</span>} rules={[{ required: true, message: t('auth.required') }]}>
            <Input onChange={() => (nameEdited.current = true)} />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving} block>
            {t('common.add')}
          </Button>
        </Form>
      </section>
      <section>
        <h1 className="mt-0 mb-4 text-3xl font-black">{t('admin.citiesTitle')}</h1>
        {cities.isLoading ? (
          <Skeleton active />
        ) : cities.data?.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cities.data.map((c) => (
              <li key={c._id} className="rise flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEBEE] text-brand">
                  <EnvironmentOutlined />
                </span>
                <span className="flex-1 font-bold">{c.name}</span>
                <span className="text-xs text-muted" dir="ltr">
                  {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<EnvironmentOutlined />} title={t('admin.newCity')} />
        )}
      </section>
    </div>
  )
}
