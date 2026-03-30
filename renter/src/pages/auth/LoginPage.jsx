import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import { loginRenter, getRenterProfile } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import i18n from '../../i18n'
import './AuthForm.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useTranslation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError(t('auth.emailPasswordRequired'))
      return
    }
    setLoading(true)
    try {
      const data = await loginRenter(form.email, form.password)
      const accessToken  = data.accessToken  || data.data?.accessToken
      const refreshToken = data.refreshToken || data.data?.refreshToken
      const userData     = data.user         || data.data?.user || null
      const userInfo = userData || { email: form.email }

      // 이전 계정 서류 인증 상태 초기화
      localStorage.removeItem('passport_verified')
      localStorage.removeItem('license_verified')
      localStorage.removeItem('did_name')
      localStorage.removeItem('did_docId')
      localStorage.removeItem('did_expiry')

      localStorage.setItem('userEmail', form.email)
      login(accessToken, refreshToken, userInfo)

      // 백엔드에서 언어 설정 + 서류 인증 상태 로드
      try {
        const profile = await getRenterProfile()
        const lang = profile?.languageCode || profile?.data?.languageCode
        if (lang) {
          localStorage.setItem('language', lang)
          i18n.changeLanguage(lang)
        }
        // 실제 인증 상태로 localStorage 업데이트
        const docs = profile?.documents ?? []
        const passportDone = docs.some(d => d.docType === 'PASSPORT' && d.verified)
        const licenseDone = docs.some(d => d.docType === 'INT_LICENSE' && d.verified)
        localStorage.setItem('passport_verified', passportDone ? 'true' : 'false')
        localStorage.setItem('license_verified', licenseDone ? 'true' : 'false')
      } catch {
        // 프로필 로드 실패 시 무시
      }

      navigate('/home')
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.loginFailed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-logo-section">
        <img src={careLogo} alt="CARe" className="auth-logo" />
      </div>

      <div className="auth-card">
        <form onSubmit={handleSubmit} noValidate>
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
            <label className="form-label">{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary form-submit"
            disabled={loading}
          >
            {loading ? t('auth.signingIn') : t('common.signIn')}
          </button>
        </form>

        <Link to="/forgot-password" className="auth-link">
          {t('auth.forgotPassword')}
        </Link>
      </div>
    </div>
  )
}
