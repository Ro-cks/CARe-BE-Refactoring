import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

// ── 요청 인터셉터: 액세스 토큰 자동 첨부 ──────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


// ── 응답 인터셉터: 401 → 토큰 갱신 후 재시도 ──────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if ((error.response?.status === 401 || error.response?.status === 403) && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return Promise.reject(error)

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch((e) => Promise.reject(e))
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `/api/auth/refresh`,
          { refreshToken },
        )
        const newAccess = data.accessToken || data.data?.accessToken
        localStorage.setItem('accessToken', newAccess)
        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
        processQueue(null, newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

// ── 임차인(renter) 회원가입 ───────────────────────────────────
export const registerRenter = (payload) =>
  api.post('/api/auth/renter/register', payload).then((r) => r.data)

// ── 임차인(renter) 로그인 ─────────────────────────────────────
export const loginRenter = (email, password) =>
  api.post('/api/auth/renter/login', { email, password }).then((r) => r.data)

// ── 로그아웃 ──────────────────────────────────────────────────
export const logoutApi = () =>
  api.post('/api/auth/logout').then((r) => r.data)

// ── 토큰 갱신 (수동 호출용) ───────────────────────────────────
export const refreshTokenApi = (refreshToken) =>
  api.post('/api/auth/refresh', { refreshToken }).then((r) => r.data)

// ── 임차인 프로필 조회 ────────────────────────────────────────
export const getRenterProfile = () =>
  api.get('/api/renters/me').then((r) => r.data)

// 임차인 면허증/여권 등록 및 검증
export const renterLicense = (payload) =>
  api.post('/api/renters/me/documents', payload).then((r) => r.data)

// 임차인 DID 등록 및 블록체인 신원 인증
export const renterDID = () =>
  api.post('/api/renters/me/did').then((r) => r.data)

// 임차인 언어 선택 설정
export const renterLanguage = () =>
  api.put('/api/renters/me/language').then((r) => r.data)

// ── CARE 토큰 충전 ────────────────────────────────────────────
export const chargeToken = (amount) =>
  api.post('/api/renters/me/token/charge', { amount }).then((r) => r.data)

// ── CARE 토큰 환전 ────────────────────────────────────────────
export const exchangeToken = (amount) =>
  api.post('/api/renters/me/token/exchange', { amount }).then((r) => r.data)

// ── CARE 토큰 잔액 조회 ───────────────────────────────────────
export const getTokenBalance = () =>
  api.get('/api/renters/me/token/balance').then((r) => r.data)

export default api
