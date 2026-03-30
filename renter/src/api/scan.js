import api from './auth'

// 전체 스캔 결과 조회
export const getScanResult = (reservationId, logType) =>
  api.get(`/api/scan/${reservationId}?logType=${logType}`).then(r => r.data)

// 구역별 스캔 결과 조회
export const getScanResultByZone = (reservationId, logType, zone) =>
  api.get(`/api/scan/${reservationId}?logType=${logType}&zone=${zone}`).then(r => r.data)

// 픽업 전 스캔
export const scanBefore = (reservationId, zone, imageBlob) => {
  const formData = new FormData()
  formData.append('image', imageBlob, 'capture.jpg')
  formData.append('zone', zone)
  return api.post(`/api/scan/${reservationId}/before`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

// 반납 후 스캔
export const scanAfter = (reservationId, zone, imageBlob) => {
  const formData = new FormData()
  formData.append('image', imageBlob, 'capture.jpg')
  formData.append('zone', zone)
  return api.post(`/api/scan/${reservationId}/after`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}