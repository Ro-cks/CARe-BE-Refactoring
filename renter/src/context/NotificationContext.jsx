import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeNotifications, markNotificationAsRead } from '../api/reservation'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !token) return

    const ac = new AbortController()
    abortRef.current = ac

    subscribeNotifications({
      token,
      signal: ac.signal,
      onNotification: (n) => {
        setNotifications(prev => [n, ...prev])
        setToast({ title: n.title, message: n.message, disputeId: n.disputeId, reservationId: n.reservationId })
      },
      onError: (e) => { if (!ac.signal.aborted) console.error('SSE error:', e) },
    }).catch((e) => { if (!ac.signal.aborted) console.error('SSE 구독 실패:', e) })

    return () => ac.abort()
  }, [isAuthenticated, token])

  const dismissToast = () => setToast(null)

  const markAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.notificationId === notificationId ? { ...n, read: true } : n)
      )
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, toast, dismissToast, markAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => useContext(NotificationContext)
