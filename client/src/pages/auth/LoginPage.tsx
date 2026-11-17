import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { AuthCard } from '../../components/AuthCard'
import { homeFor, useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFinish(values: { email: string; password: string }) {
    setBusy(true)
    setError(null)
    try {
      const user = await login(values.email.trim().toLowerCase(), values.password)
      navigate(from && user.type === 'user' ? from : homeFor(user), { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message === 'Please verify your email first') {
        navigate(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`)
        return
      }
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')} <Link to="/signup">{t('nav.signup')}</Link>
        </>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, message: t('auth.required') }, { type: 'email', message: t('auth.invalidEmail') }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, message: t('auth.required') }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" dir="ltr" />
        </Form.Item>
        <div className="-mt-2 mb-4 text-end text-sm">
          <Link to="/forgot-password">{t('auth.forgot')}</Link>
        </div>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {t('auth.loginCta')}
        </Button>
      </Form>
    </AuthCard>
  )
}
