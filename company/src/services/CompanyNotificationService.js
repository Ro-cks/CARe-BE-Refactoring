import { fetchEventSource } from '@microsoft/fetch-event-source'
import api from './api'

class CompanyNotificationService {
  async getNotifications() {
    try {
      const response = await api.get('/api/companies/me/notifications')
      return { success: true, data: response.data || [] }
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || '알림 목록을 불러오지 못했습니다.',
      }
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/api/companies/me/notifications/${notificationId}/read`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || '알림 읽음 처리에 실패했습니다.',
      }
    }
  }

  subscribeNotifications({ token, signal, onNotification, onError }) {
    if (!token) {
      return Promise.resolve()
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
    const url = `${baseUrl}/api/companies/me/notifications/subscribe`

    return fetchEventSource(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal,
      openWhenHidden: true,
      async onopen(response) {
        if (!response.ok) {
          throw new Error(`SSE 연결 실패: ${response.status}`)
        }
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/event-stream')) {
          throw new Error('SSE 스트림 응답이 아닙니다.')
        }
      },
      onmessage(event) {
        if (event.event !== 'NOTIFICATION' || !event.data) {
          return
        }
        try {
          const payload = JSON.parse(event.data)
          onNotification?.(payload)
        } catch {
          // ignore parse error
        }
      },
      onerror(error) {
        onError?.(error)
        throw error
      },
    })
  }
}

export default new CompanyNotificationService()
