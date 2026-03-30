import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import './AuthForm.css'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', name: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleNext = (e) => {
    e.preventDefault()
    if (!form.email || !form.name || !form.password || !form.confirmPassword) {
      setError(t('auth.fillAllFields'))
      return
    }
    if (form.password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    navigate('/signup/language', {
      state: { email: form.email, name: form.name, password: form.password },
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-logo-section">
        <img src={careLogo} alt="CARe" className="auth-logo" />
      </div>

      {/* 스텝 인디케이터 */}
      <div className="signup-steps">
        <div className="signup-step active">
          <span className="step-num">1</span>
          <span className="step-label">{t('auth.step1')}</span>
        </div>
        <div className="signup-step-line" />
        <div className="signup-step">
          <span className="step-num">2</span>
          <span className="step-label">{t('auth.step2')}</span>
        </div>
      </div>

      <div className="auth-card">
        <form onSubmit={handleNext} noValidate>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder={t('auth.emailPlaceholder')}
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.name')}</label>
            <input
              className="form-input"
              type="text"
              name="name"
              placeholder={t('auth.namePlaceholder')}
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <input
              className="form-input"
              type="password"
              name="confirmPassword"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary form-submit">
            {t('auth.next')}
          </button>
        </form>
      </div>

      <p className="auth-link" onClick={() => navigate('/login')}>
        {t('auth.alreadyHaveAccount')}
      </p>
    </div>
  )
}
