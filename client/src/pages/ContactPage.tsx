import { useState } from 'react'
import { Alert, Button, Form, Input, Select } from 'antd'
import { CheckCircleFilled, ClockCircleOutlined, ProfileOutlined, ShopOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../auth/useAuth'

type ContactForm = { name: string; email: string; subject: 'order' | 'restaurant' | 'payment' | 'other'; order_ref?: string; message: string }

export function ContactPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [form] = Form.useForm<ContactForm>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null)
  const subject = Form.useWatch('subject', form)

  async function onFinish(values: ContactForm) {
    setBusy(true)
    setError(null)
    try {
      await api.post('/contact', { ...values, order_ref: values.order_ref?.replace('#', '').trim() || undefined })
      setSent({ name: values.name.split(' ')[0], email: values.email })
      form.resetFields(['message', 'order_ref'])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const tips = [
    { icon: <ClockCircleOutlined />, title: t('contact.replyTime'), body: t('contact.replyTimeBody') },
    { icon: <ProfileOutlined />, title: t('contact.orderHelp'), body: t('contact.orderHelpBody') },
    { icon: <ShopOutlined />, title: t('contact.restaurantsJoin'), body: t('contact.restaurantsJoinBody') },
  ]

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.3fr]">
      <section className="rise relative overflow-hidden rounded-[2rem] bg-brand p-7 text-white">
        <div className="pointer-events-none absolute -end-16 -bottom-16 h-56 w-56 rounded-full bg-sun" aria-hidden="true" />
        <h1 className="relative m-0 text-4xl font-black">{t('contact.title')}</h1>
        <p className="relative mt-2 mb-6 text-white/90">{t('contact.subtitle')}</p>
        <ul className="relative m-0 flex list-none flex-col gap-4 p-0">
          {tips.map((tip) => (
            <li key={tip.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">{tip.icon}</span>
              <span>
                <span className="block font-bold">{tip.title}</span>
                <span className="block text-sm text-white/85">{tip.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rise rounded-3xl border border-line bg-card p-6" style={{ animationDelay: '80ms' }}>
        {sent ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <CheckCircleFilled className="text-6xl text-[#2E7D32]" />
            <h2 className="mt-4 mb-1 text-2xl font-black">{t('contact.sent')}</h2>
            <p className="m-0 max-w-sm text-muted">{t('contact.sentBody', sent)}</p>
            <Button className="!mt-6" onClick={() => setSent(null)}>
              {t('contact.another')}
            </Button>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            size="large"
            onFinish={onFinish}
            initialValues={{ name: user?.name ?? '', email: user?.email ?? '', subject: 'order' }}
          >
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Form.Item name="name" label={t('contact.name')} rules={[{ required: true, min: 2, message: t('auth.required') }]}>
                <Input autoComplete="name" />
              </Form.Item>
              <Form.Item name="email" label={t('contact.email')} rules={[{ required: true, type: 'email', message: t('auth.invalidEmail') }]}>
                <Input autoComplete="email" dir="ltr" />
              </Form.Item>
            </div>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Form.Item name="subject" label={t('contact.subject')}>
                <Select options={(['order', 'payment', 'restaurant', 'other'] as const).map((k) => ({ value: k, label: t(`contact.subjects.${k}`) }))} />
              </Form.Item>
              {(subject === 'order' || subject === 'payment') && (
                <Form.Item name="order_ref" label={t('contact.orderRef')}>
                  <Input placeholder="#EA07FA" dir="ltr" maxLength={30} />
                </Form.Item>
              )}
            </div>
            <Form.Item name="message" label={t('contact.message')} rules={[{ required: true, min: 10, message: t('contact.minMessage') }]}>
              <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} placeholder={t('contact.messagePh')} maxLength={2000} showCount />
            </Form.Item>
            {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
            <Button type="primary" htmlType="submit" block loading={busy} className="!h-12 !rounded-2xl">
              {t('contact.send')}
            </Button>
          </Form>
        )}
      </section>
    </div>
  )
}
