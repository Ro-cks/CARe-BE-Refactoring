import React, { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthService from '../../services/AuthService'
import './LoginPage.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await AuthService.login(formData.email, formData.password)

      if (result.success) {
        navigate(from, { replace: true })
      } else {
        setError(result.message || t('login.errorFailed'))
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(t('login.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-image-section">
        <div className="login-logo">CARe</div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrapper">
          <h1 className="login-title">{t('login.welcome')}</h1>
          <p className="login-subtitle">
            {t('login.subtitle1')}
            {t('login.subtitle2')}
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{t('login.emailLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="auntoux@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('login.passwordLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••••••"
                  required
                />
              </div>
            </div>

            <div className="form-footer">
              <a href="#" className="forgot-password">{t('login.forgotPassword')}</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? t('login.loginLoading') : t('login.loginButton')}
            </button>
          </form>

          <p className="register-link">
            {t('login.noAccount')} <Link to="/register">{t('login.signupLink')}</Link>
          </p>

          <p className="copyright">
            {t('login.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
}
