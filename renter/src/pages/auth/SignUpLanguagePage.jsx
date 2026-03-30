import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import careLogo from '../../assets/care_logo.png'
import { registerRenter } from '../../api/auth'
import './AuthForm.css'

const PRIVY_SERVER_URL = import.meta.env.VITE_PRIVY_SERVER_URL || 'http://localhost:3001'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English (영어)' },
  { code: 'zh', label: '中文 (중국어)' },
  { code: 'ja', label: '日本語 (일본어)' },
  { code: 'fr', label: 'Français (프랑스어)' },
]

export default function SignUpLanguagePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { t } = useTranslation()
  const [selected, setSelected] = useState('ko')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!state?.email) {
    navigate('/signup')
    return null
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: privyData } = await axios.post(`${PRIVY_SERVER_URL}/privy/wallet`, {
        email: state.email,
      })
      const { walletAddress, walletId } = privyData
      localStorage.setItem('embedded_wallet_address', walletAddress)

      await registerRenter({
        email: state.email,
        name: state.name,
        password: state.password,
        languageCode: selected,
        walletAddress,
        privyWalletId: walletId,
      })

      navigate('/login')
    } catch (err) {
      console.error('[SignUp] 오류:', err.response?.data || err.message)
      const msg = err.response?.data?.message || err.response?.data?.error || t('auth.signUpFailed')
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

      {/* 스텝 인디케이터 */}
      <div className="signup-steps">
        <div className="signup-step done" onClick={() => navigate('/signup')}>
          <span className="step-num">✓</span>
          <span className="step-label">{t('auth.step1')}</span>
        </div>
        <div className="signup-step-line active" />
        <div className="signup-step active">
          <span className="step-num">2</span>
          <span className="step-label">{t('auth.step2')}</span>
        </div>
      </div>

      <p className="signup-lang-title">{t('auth.selectLanguage')}</p>

      <div className="auth-card signup-lang-card">
        <ul className="signup-lang-list">
          {LANGUAGES.map((lang) => (
            <li
              key={lang.code}
              className={`signup-lang-item ${selected === lang.code ? 'selected' : ''}`}
              onClick={() => setSelected(lang.code)}
            >
              <span>{lang.label}</span>
              {selected === lang.code && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12L10 17L19 7" stroke="#F7A633" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="form-error" style={{ textAlign: 'center', marginTop: 8 }}>{error}</p>}

      <div style={{ width: '100%', maxWidth: 400, padding: '20px 0 0' }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t('auth.signingUp') : t('auth.signUpComplete')}
        </button>
      </div>
    </div>
  )
}
