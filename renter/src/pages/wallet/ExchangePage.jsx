import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeToken } from '../../api/auth'
import { addTokenHistory } from '../../utils/careToken'
import './ChargePage.css'

const PRESET_AMOUNTS = [10, 100, 1000, 10000]

export default function ExchangePage() {
  const navigate = useNavigate()

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleExchange = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setError('올바른 금액을 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await exchangeToken(parsed)
      addTokenHistory({ type: 'exchange', amount: parsed, desc: 'CARE 토큰 환전' })
      setResult({ ...data, exchangedAmount: parsed })
    } catch (e) {
      console.error('[Exchange] 환전 실패:', e)
      setError(e.response?.data?.message || '환전에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="charge-page">
        <div className="charge-header">
          <button className="charge-back-btn" onClick={() => navigate('/wallet')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
            </svg>
          </button>
          <h1 className="charge-title">환전 완료</h1>
        </div>

        <div className="charge-success-card">
          <div className="charge-success-icon">✓</div>
          <p className="charge-success-label">환전 완료</p>
          <p className="charge-success-amount">{Number(result.exchangedAmount).toLocaleString()} <span>CARE</span></p>
          <div className="charge-success-divider" />
          <div className="charge-success-row">
            <span>환전 금액</span>
            <strong>-{Number(result.exchangedAmount).toLocaleString()} CARE</strong>
          </div>
          <div className="charge-success-row">
            <span>현재 잔액</span>
            <strong>{Number(result.balance).toLocaleString()} CARE</strong>
          </div>
        </div>

        <button className="charge-confirm-btn" onClick={() => navigate('/wallet')}>
          확인
        </button>
      </div>
    )
  }

  return (
    <div className="charge-page">
      <div className="charge-header">
        <button className="charge-back-btn" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="charge-title">CARE 환전</h1>
      </div>

      <div className="charge-body">
        <p className="charge-label">환전 금액</p>

        <div className="charge-input-wrap">
          <input
            className="charge-input"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }}
          />
          <span className="charge-input-unit">CARE</span>
        </div>

        {error && <p className="charge-error">{error}</p>}

        <div className="charge-preset-row">
          {PRESET_AMOUNTS.map((v) => (
            <button
              key={v}
              className="charge-preset-btn"
              onClick={() => { setAmount(prev => String((parseFloat(prev) || 0) + v)); setError('') }}
            >
              +{v.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="charge-info-box">
          <p>• CARE 토큰을 현지 통화로 환전합니다</p>
          <p>• 환전된 금액은 연결된 지갑으로 출금됩니다</p>
        </div>
      </div>

      <button
        className="charge-confirm-btn"
        onClick={handleExchange}
        disabled={loading || !amount}
      >
        환전하기
      </button>

      {loading && (
        <div className="charge-loading-overlay">
          <div className="charge-loading-spinner" />
          <p className="charge-loading-text">환전 중입니다...</p>
          <p className="charge-loading-sub">잠시만 기다려주세요</p>
        </div>
      )}
    </div>
  )
}
