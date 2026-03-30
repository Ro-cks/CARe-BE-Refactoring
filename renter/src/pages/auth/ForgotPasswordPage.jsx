import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AuthForm.css'
import './ForgotPasswordPage.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      // TODO: 비밀번호 재설정 이메일 발송 API 연결
      navigate('/reset-password')
    } catch (err) {
      setError('이메일 전송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <span className="back-arrow">&#8592;</span>
      </button>

      <div className="forgot-card">
        <h2 className="forgot-title">비밀번호를 잊어버리셨나요?</h2>
        <p className="forgot-desc">이메일을 입력해주세요.</p>

        <form onSubmit={handleSubmit} noValidate>
          <input
            className="form-input"
            type="email"
            placeholder="Value"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            autoComplete="email"
          />

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary form-submit"
            disabled={loading}
          >
            {loading ? '전송 중...' : '제출하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
