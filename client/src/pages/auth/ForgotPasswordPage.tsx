import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AuthCard } from '../../components/AuthCard'
import { api, getErrorMessage } from '../../lib/api'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFinish(values: { email: string }) {
    setBusy(true)
    setError(null)
    const email = values.email.trim().toLowerCase()
    try {
      await api.post('/users/sendOtpResetPass', { email })
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={<Link to="/login">{t('common.back')}</Link>}>
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, message: t('auth.required') }, { type: 'email', message: t('auth.invalidEmail') }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" dir="ltr" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {t('auth.sendCode')}
        </Button>
      </Form>
    </AuthCard>
  )
}
