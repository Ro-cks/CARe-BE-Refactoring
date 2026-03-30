import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import './LanguageSelectPage.css'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English (영어)' },
  { code: 'zh', label: '中文 (중국어)' },
  { code: 'ja', label: '日本語 (일본어)' },
  { code: 'fr', label: 'Français (프랑스어)' },
]

export default function LanguageSelectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const isSettings = location.state?.from === 'profile'

  const [selected, setSelected] = useState(i18n.language || localStorage.getItem('language') || 'ko')

  const handleConfirm = () => {
    i18n.changeLanguage(selected)
    localStorage.setItem('language', selected)
    navigate(-1)
  }

  const currentLabel = LANGUAGES.find((l) => l.code === selected)?.label || ''

  return (
    <div className="lang-container">
      <div className="lang-header">
        {isSettings ? (
          <div className="lang-settings-header">
            <button className="lang-back-btn" onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#222" />
              </svg>
            </button>
            <h2 className="lang-settings-title">{t('language.settingsTitle')}</h2>
          </div>
        ) : (
          <>
            <img src={careLogo} alt="CARe" className="lang-logo" />
            <div className="lang-steps">
              <span className="step active" />
              <span className="step active" />
              <span className="step" />
            </div>
          </>
        )}
      </div>

      {!isSettings && (
        <h2 className="lang-title">{t('language.pageTitle')}</h2>
      )}

      <div className="lang-card">
        <div className="lang-current">
          <span className="lang-current-label">{t('language.current')}</span>
          <span className="lang-current-value">{currentLabel}</span>
          <hr className="lang-divider" />
        </div>

        <ul className="lang-list">
          {LANGUAGES.filter((l) => l.code !== selected).map((lang) => (
            <li
              key={lang.code}
              className="lang-option"
              onClick={() => setSelected(lang.code)}
            >
              {lang.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="lang-footer">
        <button className="btn btn-primary" onClick={handleConfirm}>
          {isSettings ? t('language.save') : t('language.confirm')}
        </button>
      </div>
    </div>
  )
}
