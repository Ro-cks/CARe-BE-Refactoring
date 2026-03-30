import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import careLogo from '../../assets/care_logo.png'
import './SplashPage.css'

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/landing')
    }, 2500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="splash-container">
      <div className="splash-content">
        <img src={careLogo} alt="CARe" className="splash-logo" />
        <p className="splash-tagline">당신의 No.1 해외 렌터카</p>
      </div>
      <p className="splash-version">version 1.0</p>
    </div>
  )
}
