import api from './api'

class ReservationService {
  /**
   * 예약 목록 조회 (현재 로그인한 업체)
   */
  async getReservations(params = {}) {
    try {
      const { status } = params

      let url = '/api/companies/me/reservations'
      if (status) {
        url += `?status=${status}`
      }

      const response = await api.get(url)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('예약 목록 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '예약 목록을 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 예약 상세 조회
   */
  async getReservationDetail(reservationId) {
    try {
      const response = await api.get(`/api/reservations/${reservationId}`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('예약 상세 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '예약 정보를 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 예약 승인
   */
  async approveReservation(reservationId) {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/approve`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('예약 승인 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '예약 승인에 실패했습니다.'
      }
    }
  }

  /**
   * 예약 거부
   */
  async rejectReservation(reservationId, reason) {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/reject`, {
        reason
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('예약 거부 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '예약 거부에 실패했습니다.'
      }
    }
  }

  /**
   * 차량 픽업 확인
   */
  async confirmPickup(reservationId, data) {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/pickup`, {
        scratchImages: data.scratchImages || [],
        odometerReading: data.odometerReading,
        fuelLevel: data.fuelLevel
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('픽업 확인 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '픽업 확인에 실패했습니다.'
      }
    }
  }

  /**
   * 차량 반납 확인
   */
  async confirmReturn(reservationId, data) {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/return`, {
        scratchImages: data.scratchImages || [],
        odometerReading: data.odometerReading,
        fuelLevel: data.fuelLevel,
        inspectionNotes: data.inspectionNotes
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('반납 확인 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '반납 확인에 실패했습니다.'
      }
    }
  }

  /**
   * AI 스크래치 비교 결과 조회
   */
  async getScratchComparison(reservationId) {
    try {
      const response = await api.get(`/api/reservations/${reservationId}/scratch-comparison`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('스크래치 비교 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '스크래치 비교 결과를 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 차량 반납 리포트 조회
   */
  async getReturnReport(carId, reservationId) {
    try {
      let response
      if (reservationId) {
        response = await api.get(`/api/reservations/${reservationId}/return-report`)
      } else {
        const query = ''
        response = await api.get(`/api/cars/${carId}/return-report${query}`)
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('반납 리포트 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '반납 리포트를 불러오지 못했습니다.'
      }
    }
  }
}

export default new ReservationService()
