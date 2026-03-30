import { useNavigate } from 'react-router-dom'
import careLogo from '../../assets/care_logo.png'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-container">
      <div className="landing-logo-section">
        <img src={careLogo} alt="CARe" className="landing-logo" />
      </div>

      <div className="landing-actions">
        <button
          className="btn btn-primary"
          onClick={() => navigate('/login')}
        >
          Sign In
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}
