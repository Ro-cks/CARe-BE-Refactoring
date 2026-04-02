import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthService from '../../services/AuthService'
import './SignUpPage.css'

export default function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    businessNumber: '',
    companyName: '',
    airportcode: '',
    languageCode: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError(t('signup.errorPasswordMismatch'))
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError(t('signup.errorPasswordLength'))
      return
    }

    setLoading(true)

    try {
      const result = await AuthService.register({
        name: formData.companyName,
        airportCode: formData.airportCode,
        languageCode: formData.languageCode,
        email: formData.email,
        password: formData.password,
        bizNumber: formData.businessNumber
      })

      if (result.success) {
        alert(t('signup.successAlert'))
        navigate('/login')
      } else {
        setError(result.message || t('signup.errorFailed'))
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(t('signup.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-container">
      <div
        className="signup-image-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/main.jpg')`
,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="signup-logo">CARe</div>
      </div>

      <div className="signup-form-section">
        <div className="signup-form-wrapper">
          <h1 className="signup-title">
            {t('signup.title')}
          </h1>
          <p className="signup-subtitle">
            {t('signup.subtitle1')}
            {t('signup.subtitle2')}
          </p>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="businessNumber">{t('signup.bizNumberLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="businessNumber"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  placeholder="123-45-67890"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="airportCode">{t('signup.airportCodeLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="airportCode"
                  name="airportCode"
                  value={formData.airportCode}
                  onChange={handleChange}
                  placeholder="ICN"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="languageCode">{t('signup.languageLabel')}</label>
              <div className="input-wrapper">
                <select
                  id="languageCode"
                  name="languageCode"
                  value={formData.languageCode}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('signup.languagePlaceholder')}</option>
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ru">Русский</option>
                  <option value="pt">Português</option>
                  <option value="ar">العربية</option>
                  <option value="it">Italiano</option>
                  <option value="hi">हिन्दी</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="companyName">{t('signup.companyNameLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="CARe Inc."
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('signup.emailLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="company@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('signup.passwordLabel')}</label>
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

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('signup.confirmPasswordLabel')}</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? t('signup.signupLoading') : t('signup.signupButton')}
            </button>
          </form>

          <p className="login-link">
            {t('signup.hasAccount')} <Link to="/login">{t('signup.loginLink')}</Link>
          </p>

          <p className="copyright">
            {t('signup.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
}
