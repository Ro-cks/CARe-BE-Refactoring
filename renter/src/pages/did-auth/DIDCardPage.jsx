import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getRenterProfile } from '../../api/auth'
import './DIDCardPage.css'

export default function DIDCardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const expiryDate = state?.expiryDate || localStorage.getItem('did_expiry') || ''

  const [userName, setUserName] = useState('')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 100)
    // 백엔드에서 실제 이름 조회
    getRenterProfile()
      .then((data) => setUserName(data?.name || localStorage.getItem('did_name') || ''))
      .catch(() => setUserName(localStorage.getItem('did_name') || ''))
    return () => clearTimeout(timer)
  }, [])

  const formattedExpiry = expiryDate.length === 8
    ? `${expiryDate.slice(0, 4)}.${expiryDate.slice(4, 6)}.${expiryDate.slice(6, 8)}`
    : expiryDate


  return (
    <div className="dcp-page">

      {/* 헤더 */}
      <div className="dcp-header">
        <button className="dcp-back-btn" onClick={() => navigate('/wallet')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <span className="dcp-header-title">{t('didCard.headerTitle')}</span>
      </div>

      {/* 카드 영역 */}
      <div className="dcp-body">
        <div className={`dcp-card ${revealed ? 'revealed' : ''}`}>

          {/* 브랜드 + 도트 */}
          <div className="dcp-card-top">
            <div className="dcp-brand">
              <span>CARe</span>
              <span>VERIFIED</span>
            </div>
            <div className="dcp-dots">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`dcp-dot${i === 4 ? ' accent' : ''}`} />
              ))}
            </div>
          </div>

          {/* 쉴드 */}
          <div className="dcp-shield-wrap">
            <div className="dcp-shield-bg">
              <div className="dcp-deco tr" />
              <div className="dcp-deco bl" />
              <svg width="72" height="72" viewBox="0 0 44 44" fill="none">
                <path d="M22 4L8 10V22C8 30.8 14 39 22 41C30 39 36 30.8 36 22V10L22 4Z"
                  fill="rgba(75,121,212,0.12)" />
                <path d="M22 4L8 10V22C8 30.8 14 39 22 41C30 39 36 30.8 36 22V10L22 4Z"
                  stroke="#4B79D4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 22L20 28L30 14"
                  stroke="#4B79D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* 이름 + 만료일 */}
          <div className="dcp-info">
            <p className="dcp-name">{userName || t('didCard.nameFallback')}</p>
            {formattedExpiry && (
              <div className="dcp-valid-row">
                <span className="dcp-valid-label">VALID UNTIL</span>
                <span className="dcp-valid-date">{formattedExpiry}</span>
              </div>
            )}
          </div>

          {/* 인증 정보 */}
          <div className="dcp-did-box">
            <div className="dcp-did-left">
              <span className="dcp-did-tag">✓</span>
              <span className="dcp-did-value">{t('didCard.verified')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="dcp-actions">
        <button className="dcp-share-btn" onClick={() => {
          if (navigator.share) navigator.share({ title: t('didCard.shareTitle'), text: t('didCard.shareText', { name: userName }) })
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

    </div>
  )
}
