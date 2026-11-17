import { useState } from 'react'
import { Alert, App, Button, Form, Input } from 'antd'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AuthCard } from '../../components/AuthCard'
import { api, getErrorMessage } from '../../lib/api'
import { homeFor, useAuth } from '../../auth/useAuth'
import type { User } from '../../types'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { loginWithTokens } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

  if (!email) return <Navigate to="/signup" replace />

  async function onFinish(values: { otp: string }) {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ token: string; refreshToken: string; user: User }>('/users/verifyEmail', { email, otp: values.otp })
      loginWithTokens(res.data.token, res.data.refreshToken, res.data.user)
      message.success(t('auth.verified'))
      navigate(homeFor(res.data.user), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setResending(true)
    try {
      await api.post('/users/resendVerifyEmail', { email })
      message.success(t('auth.resent'))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email })}>
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item name="otp" label={t('auth.code')} rules={[{ required: true, pattern: /^\d{6}$/, message: t('auth.codeFormat') }]}>
          <Input.OTP length={6} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {t('auth.verifyCta')}
        </Button>
        <Button type="link" block onClick={resend} loading={resending} className="!mt-2">
          {t('auth.resend')}
        </Button>
      </Form>
    </AuthCard>
  )
}
