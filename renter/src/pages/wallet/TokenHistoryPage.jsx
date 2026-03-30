import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getTokenBalance } from '../../api/auth'
import { getTokenHistory } from '../../utils/careToken'
import './TokenHistoryPage.css'

export default function TokenHistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    setLoading(true)
    getTokenBalance()
      .then((data) => setBalance(data.balance))
      .catch(() => setBalance(t('tokenHistory.error')))
      .finally(() => setLoading(false))

    setHistory(getTokenHistory())
  }, [])

  const formatDate = (iso) => {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${d.getFullYear()}.${mm}.${dd} ${hh}:${min}`
  }

  return (
    <div className="token-history-page">
      <div className="token-history-header">
        <button className="token-history-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="token-history-title">{t('tokenHistory.title')}</h1>
      </div>

      {/* 잔액 카드 */}
      <div className="token-history-balance-card">
        <p className="token-history-balance-label">{t('tokenHistory.balanceLabel')}</p>
        {loading ? (
          <p className="token-history-balance-value loading">{t('tokenHistory.loading')}</p>
        ) : (
          <p className="token-history-balance-value">
            {balance != null ? Number(balance).toLocaleString() : '--'} <span>CARE</span>
          </p>
        )}
        <div className="token-history-action-row">
          <button
            className="token-history-btn charge"
            onClick={() => navigate('/wallet/charge')}
          >
            {t('tokenHistory.charge')}
          </button>
          <button
            className="token-history-btn exchange"
            onClick={() => navigate('/wallet/exchange')}
          >
            {t('tokenHistory.exchange')}
          </button>
        </div>
      </div>

      {/* 사용 내역 */}
      <div className="token-history-list-card">
        <p className="token-history-list-title">{t('tokenHistory.listTitle')}</p>

        {history.length === 0 ? (
          <div className="token-history-empty">
            <div className="token-history-empty-icon">🪙</div>
            <p>{t('tokenHistory.empty')}</p>
          </div>
        ) : (
          <ul className="token-history-list">
            {history.map((item, i) => (
              <li key={i} className="token-history-item">
                <div className="token-history-item-left">
                  <span className={`token-history-item-badge ${item.type}`}>
                    {item.type === 'charge' ? t('tokenHistory.chargeLabel') : t('tokenHistory.paymentLabel')}
                  </span>
                  <div>
                    <p className="token-history-item-desc">{item.desc}</p>
                    <p className="token-history-item-date">{formatDate(item.date)}</p>
                  </div>
                </div>
                <p className={`token-history-item-amount ${item.type}`}>
                  {item.type === 'charge' ? '+' : '-'}{Number(item.amount).toLocaleString()} CARE
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
