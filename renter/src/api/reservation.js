import api from './auth'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// 차량 목록 조회
export const getCarList = async ({ brand, airportCode, carSize } = {}) => {
  const params = new URLSearchParams()
  if (brand) params.append('brand', brand)
  if (airportCode) params.append('airportCode', airportCode)
  if (carSize) params.append('carSize', carSize)
  const response = await api.get(`/api/cars${params.toString() ? '?' + params : ''}`)
  return response.data
}

// 차량 상세 조회
export const getCarDetail = async (carId) => {
  const response = await api.get(`/api/cars/${carId}`)
  return response.data
}

// 차량 리뷰 조회
export const getCarReviews = async (carId) => {
  const response = await api.get(`/api/cars/${carId}/reviews`)
  return response.data
}

// 차량 반납 리포트 조회
export const getReturnReport = async (carId, reservationId) => {
  if (reservationId) {
    const response = await api.get(`/api/reservations/${reservationId}/return-report`)
    return response.data
  }
  const params = ''
  const response = await api.get(`/api/cars/${carId}/return-report${params}`)
  return response.data
}

// 내 예약 목록 조회
export const getMyReservations = async () => {
  const response = await api.get('/api/renters/me/reservations')
  return response.data
}

// 예약 상세 조회
export const getReservationDetail = async (reservationId) => {
  const response = await api.get(`/api/reservations/${reservationId}`)
  return response.data
}

// 차량 흠집 내역 조회
export const getCarScratches = async (reservationId) => {
  // const response = await api.get(`/api/scratch/reservation/${reservationId}`)
  const response = await api.get(`/api/reservations/${reservationId}/disputes/scratch-logs`)
  // /reservations/{reservationId}/disputes//scratch-logs
  return response.data
}

// 흠집 상세 조회
export const getScratchDetail = async (scratchId) => {
  const response = await api.get(`/api/scratch/${scratchId}`)
  return response.data
}

// 차량 전체 흠집 이력 조회 (해당 차량의 모든 예약 기록)
export const getCarScratchHistory = async (carId) => {
  const response = await api.get(`/api/cars/${carId}/scratches`)
  return response.data
}

// 스마트키 발급
export const issueSmartKey = async (reservationId) => {
  const response = await api.post(`/api/reservations/${reservationId}/smart-key`)
  return response.data
}

// 스마트키 잠금해제
export const unlockSmartKey = async (reservationId) => {
  const response = await api.post(`/api/reservations/${reservationId}/smart-key/unlock`)
  return response.data
}

// 반납 완료 (예약 상태 COMPLETED로 변경)
export const completeReservation = async (reservationId) => {
  const response = await api.post(`/api/reservations/${reservationId}/return`)
  return response.data
}

// 반납 후 스캔 (zone: front | rear | left | right, imageDataUrl: base64)
export const scanAfter = async (reservationId, zone, imageDataUrl) => {
  const formData = new FormData()
  formData.append('zone', zone)
  const blob = await fetch(imageDataUrl).then(r => r.blob())
  formData.append('image', blob, `${zone}.jpg`)
  const response = await api.post(`/api/scan/${reservationId}/after`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// 분쟁 상세 조회
export const getDisputeDetail = async (reservationId, disputeId) => {
  const response = await api.get(`/api/reservations/${reservationId}/disputes/${disputeId}`)
  return response.data
}

// 예약 생성
export const createReservation = async (carId, insuranceId, pickupDate, pickupTime, returnDate, returnTime, totalPrice) => {
  const toDateTime = (date, time) => {
    if (!date) return null
    const t = time || '10:00'
    return `${date}T${t}:00`
  }
  const response = await api.post('/api/reservations', {
    carId,
    insuranceId,
    pickupDate: toDateTime(pickupDate, pickupTime),
    returnDate: toDateTime(returnDate, returnTime),
    totalPrice,
  })
  return response.data
}

// 분쟁 이의 신청
export const submitDefense = async (reservationId, disputeId, defenseLogId) => {
  const response = await api.post(
    `/api/reservations/${reservationId}/disputes/${disputeId}/defense`,
    { defenseLogId }
  )
  return response.data
}

// 내 알림 목록 조회
export const getMyNotifications = async () => {
  const response = await api.get('/api/renters/me/notifications')
  return response.data
}

// 알림 읽음 처리
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.patch(`/api/renters/me/notifications/${notificationId}/read`)
  return response.data
}

// SSE 실시간 알림 구독
export const subscribeNotifications = ({ token, signal, onNotification, onError }) => {
  if (!token) {
    return Promise.resolve()
  }

  return fetchEventSource('/api/renters/me/notifications/subscribe', {
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
        // 파싱 실패는 무시
      }
    },
    onerror(error) {
      if (error?.name === 'AbortError') throw error
      onError?.(error)
    },
  })
}

export const lockSmartKey = async (reservationId) => {
  const response = await api.post(`/api/reservations/${reservationId}/smart-key/lock`)
  return response.data
}

export const getSmartKeyStatus = async (reservationId) => {
  const response = await api.get(`/api/reservations/${reservationId}/smart-key/status`)
  return response.data
}

export const revokeSmartKey = async (reservationId) => {
  const response = await api.post(`/api/reservations/${reservationId}/smart-key/revoke`)
  return response.data
}

export const settleDispute = async (disputeId, finalAmount, status) => {
  const response = await api.post(`/api/disputes/${disputeId}/settle`, { finalAmount, status })
  return response.data
}
