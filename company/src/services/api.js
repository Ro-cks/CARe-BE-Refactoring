import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (!config.headers) {
      config.headers = {}
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    } else {
      config.headers['Content-Type'] = 'application/json'
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API ERROR:', error)
    console.error('API ERROR STATUS:', error?.response?.status)
    console.error('API ERROR DATA:', error?.response?.data)
    console.error('API ERROR URL:', error?.config?.url)

    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('companyId')
      window.location.href = '/company/login'
    }

    return Promise.reject(error)
  }
)

export default api