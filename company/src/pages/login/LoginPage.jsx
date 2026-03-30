import React, { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import AuthService from '../../services/AuthService'
import './LoginPage.css'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await AuthService.login(formData.email, formData.password)

      if (result.success) {
        navigate(from, { replace: true })
      } else {
        setError(result.message || '로그인에 실패했습니다.')
      }
    } catch (err) {
      console.error('로그인 예외:', err)
      setError('서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-image-section">
        <div className="login-logo">CARe</div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrapper">
          <h1 className="login-title">환영합니다</h1>
          <p className="login-subtitle">
            No.1 글로벌 렌터카 서비스 CARe입니다.
            고객에게 투명하고 신뢰성 높은 렌터카를 제공해보세요.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Id</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="auntoux@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••••••"
                  required
                />
              </div>
            </div>

            <div className="form-footer">
              <a href="#" className="forgot-password">비밀번호를 잊으셨나요?</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? '로그인 중...' : 'LOGIN'}
            </button>
          </form>

          <p className="register-link">
            회원이 아니신가요? <Link to="/register">회원가입</Link>
          </p>

          <p className="copyright">
            ©CARe 2026 ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </div>
  )
}
