import { useState } from 'react'
import { Alert, App, Button, Form, Input } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AuthCard } from '../../components/AuthCard'
import { api, getErrorMessage } from '../../lib/api'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!email) return <Navigate to="/forgot-password" replace />

  async function onFinish(values: { otp: string; newPassword: string }) {
    setBusy(true)
    setError(null)
    try {
      await api.patch('/users/resetpassword', { email, otp: values.otp, newPassword: values.newPassword })
      message.success(t('auth.resetDone'))
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t('auth.resetTitle')} subtitle={t('auth.verifySubtitle', { email })}>
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item name="otp" label={t('auth.code')} rules={[{ required: true, pattern: /^\d{6}$/, message: t('auth.codeFormat') }]}>
          <Input.OTP length={6} />
        </Form.Item>
        <Form.Item name="newPassword" label={t('auth.newPassword')} rules={[{ required: true, min: 8, message: t('auth.shortPassword') }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" dir="ltr" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {t('auth.resetCta')}
        </Button>
      </Form>
    </AuthCard>
  )
}
