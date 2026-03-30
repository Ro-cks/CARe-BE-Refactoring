import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { chargeToken } from '../../api/auth'
import { addTokenHistory } from '../../utils/careToken'
import './ChargePage.css'

const PRESET_AMOUNTS = [10, 100, 1000, 10000]

export default function ChargePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const returnTo = state?.returnTo || null
  const returnState = state?.returnState || null

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { balance, txHash }
  const [error, setError] = useState('')

  const handleCharge = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setError('올바른 금액을 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await chargeToken(parsed)
      addTokenHistory({ type: 'charge', amount: parsed, desc: 'CARE 토큰 충전' })
      setResult({ ...data, chargedAmount: parsed })
    } catch (e) {
      console.error('[Charge] 충전 실패:', e)
      setError(e.response?.data?.message || '충전에 실패했습니다.')
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
          <h1 className="charge-title">충전 완료</h1>
        </div>

        <div className="charge-success-card">
          <div className="charge-success-icon">✓</div>
          <p className="charge-success-label">충전 완료</p>
          <p className="charge-success-amount">{Number(result.chargedAmount).toLocaleString()} <span>CARE</span></p>
          <div className="charge-success-divider" />
          <div className="charge-success-row">
            <span>충전 금액</span>
            <strong>+{Number(result.chargedAmount).toLocaleString()} CARE</strong>
          </div>
          <div className="charge-success-row">
            <span>현재 잔액</span>
            <strong>{Number(result.balance).toLocaleString()} CARE</strong>
          </div>
        </div>

        {returnTo ? (
          <div className="charge-result-btns">
            <button className="charge-confirm-btn charge-confirm-btn--secondary" onClick={() => navigate('/wallet')}>
              내 지갑 보기
            </button>
            <button className="charge-confirm-btn" onClick={() => navigate(returnTo, { state: returnState })}>
              예약으로 돌아가기
            </button>
          </div>
        ) : (
          <button className="charge-confirm-btn" onClick={() => navigate('/wallet')}>
            확인
          </button>
        )}
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
        <h1 className="charge-title">CARE 충전</h1>
      </div>

      <div className="charge-body">
        <p className="charge-label">충전 금액</p>

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
          <p>• 환전 없이 CARE Token으로 즉시 결제</p>
          <p>• 충전된 토큰은 렌탈 결제에 바로 사용 가능</p>
        </div>
      </div>

      <button
        className="charge-confirm-btn"
        onClick={handleCharge}
        disabled={loading || !amount}
      >
        충전하기
      </button>

      {loading && (
        <div className="charge-loading-overlay">
          <div className="charge-loading-spinner" />
          <p className="charge-loading-text">충전 중입니다...</p>
          <p className="charge-loading-sub">잠시만 기다려주세요</p>
        </div>
      )}
    </div>
  )
}
