import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AuthForm.css'
import './ForgotPasswordPage.css'
import './ResetPasswordPage.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.password || !form.confirmPassword) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      // TODO: 비밀번호 변경 API 연결
      navigate('/login')
    } catch (err) {
      setError('비밀번호 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <span className="back-arrow">&#8592;</span>
      </button>

      <div className="forgot-card reset-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">새로운 비밀번호</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="Value"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>


          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary form-submit"
            disabled={loading}
          >
            {loading ? '처리 중...' : '변경하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
