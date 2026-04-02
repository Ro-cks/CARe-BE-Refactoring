import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../context/NotificationContext'
import { parseReason } from '../utils/parseReason'
import './NotificationToast.css'

export default function NotificationToast() {
  const { toast, dismissToast } = useNotification()
  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, 5000)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  const handleClick = () => {
    navigate('/dispute-history')
    dismissToast()
  }

  return (
    <div className="notification-toast" onClick={handleClick}>
      <div className="notification-toast-title">🔔 {parseReason(toast.title)}</div>
      <div className="notification-toast-message">{parseReason(toast.message)}</div>
      <button
        className="notification-toast-close"
        onClick={(e) => { e.stopPropagation(); dismissToast() }}
      >
        ✕
      </button>
    </div>
  )
}
