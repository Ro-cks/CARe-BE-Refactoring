import { createContext, useContext, useState } from 'react'
import { logoutApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'))

  // 로그인 성공 시 호출 — accessToken, refreshToken, userData 저장
  const login = (accessToken, refreshToken, userData) => {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    if (userData)     localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData ?? null)
  }

  // 로그아웃 — API 호출 후 로컬 정리
  const logout = async () => {
    try { await logoutApi() } catch { /* 서버 오류여도 로컬은 초기화 */ }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
