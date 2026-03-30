import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthService from '../../services/AuthService'
import './SignUpPage.css'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    businessNumber: '',
    companyName: '',
    airportcode: '',
    languageCode: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      const result = await AuthService.register({
        name: formData.companyName,
        airportCode: formData.airportCode,
        languageCode: formData.languageCode,
        email: formData.email,
        password: formData.password,
        bizNumber: formData.businessNumber
      })

      if (result.success) {
        alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
        navigate('/login')
      } else {
        setError(result.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (err) {
      console.error('회원가입 예외:', err)
      setError('서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // const handleSocialSignUp = (provider) => {
  //   console.log('Social sign up:', provider)
  //   // TODO: 소셜 회원가입 구현
  // }

  return (
    <div className="signup-container">
      {/* Left Side - Image */}
      {/* <div className="signup-image-section"> */}
      <div
        className="signup-image-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/main.jpg')`
,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="signup-logo">CARe</div>
      </div>

      {/* Right Side - Form */}
      <div className="signup-form-section">
        <div className="signup-form-wrapper">
          <h1 className="signup-title">
            회원가입
          </h1>
          <p className="signup-subtitle">
            CARe와 함께 렌터카 사업을 시작해보세요.
            빠르고 간편한 회원가입으로 시작하세요.
          </p>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="businessNumber">사업자 등록번호</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="businessNumber"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  placeholder="123-45-67890"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="airportCode">공항 코드</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="airportCode"
                  name="airportCode"
                  value={formData.airportCode}
                  onChange={handleChange}
                  placeholder="ICN (인천국제공항)"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="languageCode">언어</label>
              <div className="input-wrapper">
                <select
                  id="languageCode"
                  name="languageCode"
                  value={formData.languageCode}
                  onChange={handleChange}
                  required
                >
                  <option value="">언어를 선택하세요</option>
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ru">Русский</option>
                  <option value="pt">Português</option>
                  <option value="ar">العربية</option>
                  <option value="it">Italiano</option>
                  <option value="hi">हिन्दी</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="companyName">회사명</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="주식회사 CARe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Id</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="company@example.com"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Password 확인</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? '회원가입 중...' : 'SIGN UP'}
            </button>
          </form>

          <p className="login-link">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>

          <p className="copyright">
            ©CARe 2026 ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </div>
  )
}
