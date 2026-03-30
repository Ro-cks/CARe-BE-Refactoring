import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cuteIcon2 from '../../assets/cute_icon2.png'
import BottomNav from '../../components/BottomNav'
import { getTokenBalance } from '../../api/auth'
import './WalletPage.css'

export default function WalletPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const walletAddress = localStorage.getItem('embedded_wallet_address')
  const didVerified =
    localStorage.getItem('passport_verified') === 'true' &&
    localStorage.getItem('license_verified') === 'true'

  const [careBalance, setCareBalance] = useState(null)
  const [careLoading, setCareLoading] = useState(false)
  const [showFullAddr, setShowFullAddr] = useState(false)

  useEffect(() => {
    setCareLoading(true)
    getTokenBalance()
      .then((data) => setCareBalance(data.balance))
      .catch((e) => {
        console.error('[Wallet] 잔액 조회 실패:', e)
        setCareBalance(t('wallet.error'))
      })
      .finally(() => setCareLoading(false))
  }, [])

  const shortAddr = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '')

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <button className="wallet-back-btn" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="wallet-title">{t('wallet.title')}</h1>
      </div>

      <div className="wallet-stack-area">

        {/* DID card */}
        <div className="wallet-card wallet-did-card" onClick={() => navigate('/did-auth')}>
          <div className="wallet-card-row">
            <div className="wallet-card-left">
              <div className="did-badge">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11.5 4L5.5 10L2.5 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="wallet-card-name">{t('wallet.didAuth')}</span>
            </div>
            <button
              className={`wallet-pill-btn ${didVerified ? 'did-verified-pill' : ''}`}
              onClick={(e) => { e.stopPropagation(); if (!didVerified) navigate('/did-auth') }}
            >
              {didVerified ? t('wallet.didVerified') : t('wallet.didAction')}
            </button>
          </div>
          <div className="did-face-illust">
            <img src={cuteIcon2} alt="" className="did-cute-icon" />
          </div>
        </div>

        {/* Token card */}
        <div
          className="wallet-card wallet-token-card"
          onClick={() => navigate('/wallet/token')}
          style={{ cursor: 'pointer' }}
        >
          <div className="token-circle-bg" />

          <div className="wallet-card-row">
            <div className="wallet-card-left">
              <div className="token-badge">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5L8.6 5.4H12.7L9.5 7.7L10.9 11.6L7 9.3L3.1 11.6L4.5 7.7L1.3 5.4H5.4L7 1.5Z" fill="white" />
                </svg>
              </div>
              <span className="wallet-card-name token-name">{t('wallet.tokenBalance')}</span>
            </div>
          </div>

          <div className="token-balance-wrap">
            <p className="token-balance-label">{t('wallet.myCare')}</p>
            {careLoading ? (
              <p className="token-balance-value token-balance-loading">{t('wallet.loading')}</p>
            ) : (
              <p className="token-balance-value">
                {careBalance != null ? Number(careBalance).toLocaleString() : '--'} <span className="token-balance-unit">CARE</span>
              </p>
            )}
          </div>

          <div className="token-card-hint">{t('wallet.historyLink')}</div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
