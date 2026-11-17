import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Switch, Upload } from 'antd'
import { CameraOutlined, DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { api, getErrorMessage } from '../../lib/api'
import type { Category, Item } from '../../types'
import { FoodImage } from '../../components/FoodImage'
import { money } from '../../lib/format'

type ItemForm = { name: string; price: number; category_id: string; vegetarian: boolean; status: boolean }

export function MenuManagePage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [newCat, setNewCat] = useState('')
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [form] = Form.useForm<ItemForm>()

  const categories = useQuery({ queryKey: ['my-categories'], queryFn: async () => (await api.get<{ data: Category[] }>('/my-restaurant/categories')).data.data })
  const items = useQuery({ queryKey: ['my-items'], queryFn: async () => (await api.get<{ data: Item[] }>('/my-restaurant/items')).data.data })

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['my-items'] }), queryClient.invalidateQueries({ queryKey: ['my-categories'] })])

  async function addCategory() {
    if (!newCat.trim()) return
    try {
      await api.post('/my-restaurant/categories', { name: newCat.trim() })
      setNewCat('')
      await refresh()
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  async function deleteCategory(id: string) {
    try {
      await api.delete(`/my-restaurant/categories/${id}`)
      await refresh()
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  function openEditor(item: Item | 'new') {
    setEditing(item)
    setFiles([])
    form.setFieldsValue(
      item === 'new'
        ? { name: '', price: undefined, category_id: categories.data?.[0]?._id, vegetarian: false, status: true }
        : { name: item.name, price: item.price, category_id: item.category_id, vegetarian: item.vegetarian, status: item.status === 'active' },
    )
  }

  async function save(values: ItemForm) {
    setSaving(true)
    try {
      const file = files[0]?.originFileObj
      if (editing === 'new') {
        const body = new FormData()
        body.append('name', values.name)
        body.append('price', String(values.price))
        body.append('category_id', values.category_id)
        body.append('vegetarian', String(values.vegetarian))
        body.append('status', values.status ? 'active' : 'inactive')
        if (file) body.append('ItemsImg', file)
        await api.post('/my-restaurant/items', body)
      } else if (editing) {
        await api.patch(`/my-restaurant/items/${editing._id}`, {
          name: values.name,
          price: values.price,
          category_id: values.category_id,
          vegetarian: values.vegetarian,
          status: values.status ? 'active' : 'inactive',
        })
        if (file) {
          const body = new FormData()
          body.append('ItemsImg', file)
          await api.put(`/my-restaurant/items/${editing._id}/image`, body)
        }
      }
      message.success(t('dash.saved'))
      setEditing(null)
      await refresh()
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item: Item, active: boolean) {
    try {
      await api.patch(`/my-restaurant/items/${item._id}`, { status: active ? 'active' : 'inactive' })
      await refresh()
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  async function remove(item: Item) {
    try {
      await api.delete(`/my-restaurant/items/${item._id}`)
      await refresh()
    } catch (err) {
      message.error(getErrorMessage(err))
    }
  }

  const catName = (id: string) => categories.data?.find((c) => c._id === id)?.name ?? ''
  const shown = (items.data ?? []).filter((i) => filter === 'all' || i.category_id === filter)

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl border border-line bg-card p-4 lg:sticky lg:top-20 lg:self-start">
        <h2 className="mt-0 mb-3 text-lg font-extrabold">{t('dash.categories')}</h2>
        <div className="mb-3 flex gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} onPressEnter={addCategory} placeholder={t('dash.newCategory')} maxLength={60} />
          <Button type="primary" icon={<PlusOutlined />} onClick={addCategory} aria-label={t('dash.newCategory')} />
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          <li>
            <button type="button" onClick={() => setFilter('all')} className={`w-full cursor-pointer rounded-xl border-none px-3 py-2 text-start text-sm font-semibold ${filter === 'all' ? 'bg-coal text-white' : 'bg-transparent text-ink hover:bg-line'}`}>
              {t('common.all')} <span className="opacity-60">{items.data?.length ?? 0}</span>
            </button>
          </li>
          {categories.data?.map((c) => {
            const n = items.data?.filter((i) => i.category_id === c._id).length ?? 0
            return (
              <li key={c._id} className="flex items-center gap-1">
                <button type="button" onClick={() => setFilter(c._id)} className={`flex-1 cursor-pointer rounded-xl border-none px-3 py-2 text-start text-sm font-semibold ${filter === c._id ? 'bg-coal text-white' : 'bg-transparent text-ink hover:bg-line'}`}>
                  {c.name} <span className="opacity-60">{n}</span>
                </button>
                <Popconfirm title={t('common.delete')} onConfirm={() => deleteCategory(c._id)} okText={t('common.yes')} cancelText={t('common.no')}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t('common.delete')} />
                </Popconfirm>
              </li>
            )
          })}
        </ul>
      </aside>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="m-0 text-3xl font-black">{t('dash.menuTitle')}</h1>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => openEditor('new')} disabled={!categories.data?.length}>
            {t('dash.newItem')}
          </Button>
        </div>
        {items.isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <article key={item._id} className={`rise overflow-hidden rounded-3xl border border-line bg-card transition ${item.status === 'inactive' ? 'opacity-60' : ''}`}>
                <div className="relative h-36">
                  <FoodImage src={item.cover} alt={item.name} seed={item._id} className="h-full w-full" />
                  <span className="absolute start-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-coal">{catName(item.category_id)}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="m-0 truncate text-base font-bold">{item.name}</h3>
                    <span className="shrink-0 font-extrabold text-brand">{money(item.price)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <Switch size="small" checked={item.status === 'active'} onChange={(v) => toggle(item, v)} />
                      {item.status === 'active' ? t('dash.active') : t('dash.hidden')}
                    </span>
                    <span className="flex gap-1">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditor(item)} aria-label={t('common.edit')} />
                      <Popconfirm title={t('dash.deleteItemConfirm')} onConfirm={() => remove(item)} okText={t('common.delete')} okButtonProps={{ danger: true }} cancelText={t('common.cancel')}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t('common.delete')} />
                      </Popconfirm>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal open={editing !== null} title={editing === 'new' ? t('dash.newItem') : t('common.edit')} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save} className="!mt-4">
          <Form.Item name="name" label={t('dash.itemName')} rules={[{ required: true, message: t('auth.required') }]}>
            <Input maxLength={100} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="price" label={t('dash.price')} rules={[{ required: true, message: t('auth.required') }]}>
              <InputNumber min={0.5} step={0.5} className="!w-full" />
            </Form.Item>
            <Form.Item name="category_id" label={t('dash.category')} rules={[{ required: true, message: t('auth.required') }]}>
              <Select options={categories.data?.map((c) => ({ value: c._id, label: c.name }))} />
            </Form.Item>
          </div>
          <div className="flex gap-6">
            <Form.Item name="vegetarian" label={t('restaurant.vegetarian')} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="status" label={t('dash.active')} valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item label={t('dash.image')} required={editing === 'new'}>
            <Upload accept="image/png,image/jpeg" maxCount={1} beforeUpload={() => false} fileList={files} onChange={({ fileList }) => setFiles(fileList)} listType="picture">
              <Button icon={editing === 'new' ? <UploadOutlined /> : <CameraOutlined />}>{t('dash.changePhoto')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
