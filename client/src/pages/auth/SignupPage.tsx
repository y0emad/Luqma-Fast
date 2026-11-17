import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AuthCard } from '../../components/AuthCard'
import { api, getErrorMessage } from '../../lib/api'

export function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFinish(values: { name: string; email: string; password: string }) {
    setBusy(true)
    setError(null)
    const email = values.email.trim().toLowerCase()
    try {
      await api.post('/users/signup', { name: values.name.trim(), email, password: values.password })
      navigate(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
        </>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item name="name" label={t('auth.name')} rules={[{ required: true, min: 2, message: t('auth.required') }]}>
          <Input prefix={<UserOutlined />} autoComplete="name" />
        </Form.Item>
        <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, message: t('auth.required') }, { type: 'email', message: t('auth.invalidEmail') }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item name="password" label={t('auth.password')} extra={t('auth.passwordHint')} rules={[{ required: true, min: 8, message: t('auth.shortPassword') }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" dir="ltr" />
        </Form.Item>
        <p className="-mt-2 mb-4 text-xs text-muted">
          {t('auth.agree')} <Link to="/terms">{t('legal.termsTitle')}</Link> · <Link to="/privacy">{t('legal.privacyTitle')}</Link>
        </p>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {t('auth.signupCta')}
        </Button>
      </Form>
    </AuthCard>
  )
}
