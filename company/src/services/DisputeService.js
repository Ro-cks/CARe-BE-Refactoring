import api from './api'

class DisputeService {
  /**
   * 분쟁 목록 조회
   */
  async getDisputes(params = {}) {
    try {
      const { status } = params

      let url = '/api/companies/me/disputes'
      if (status) {
        url += `?status=${status}`
      }

      const response = await api.get(url)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 목록 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '분쟁 목록을 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 분쟁 상세 조회
   */
  async getDisputeDetail(disputeId) {
    try {
      const response = await api.get(`/api/disputes/${disputeId}`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 상세 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '분쟁 정보를 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 분쟁 AI 분석 조회
   */
  async getAiAnalysis(disputeId) {
    try {
      const response = await api.get(`/api/disputes/${disputeId}/ai-analysis`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 AI 분석 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || 'AI 분석 정보를 불러오지 못했습니다.'
      }
    }
  }

  /**
   * 분쟁 생성 (업체가 분쟁 제기)
   */
  async createDispute(reservationId, data) {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/disputes`, {
        targetLogId: data.targetLogId,
        reason: data.reason,
        claimAmount: data.claimAmount
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 생성 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '분쟁 제기에 실패했습니다.'
      }
    }
  }

  /**
   * 분쟁 해결 (업체가 분쟁 처리)
   */
  async resolveDispute(disputeId, data) {
    try {
      const response = await api.post(`/api/disputes/${disputeId}/settle`, {
        finalAmount: data.finalAmount,
        status: data.status
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 해결 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '분쟁 처리에 실패했습니다.'
      }
    }
  }

  /**
   * 분쟁 반려 (업체가 분쟁 거부)
   */
  async rejectDispute(disputeId, reason) {
    try {
      const response = await api.post(`/api/disputes/${disputeId}/settle`, {
        finalAmount: 0,
        status: 'REFUNDED'
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('분쟁 반려 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '분쟁 반려에 실패했습니다.'
      }
    }
  }

  /**
   * 분쟁 방어 자료 제출 (업체가 반박)
   */
  async submitDefense(disputeId, data) {
    try {
      const response = await api.post(`/api/disputes/${disputeId}/defense`, {
        defenseReason: data.defenseReason,
        evidenceImages: data.evidenceImages || []
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('방어 자료 제출 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '방어 자료 제출에 실패했습니다.'
      }
    }
  }

  /**
   * 스크래치 로그 조회 (예약별 분쟁 스크래치 로그)
   */
  async getScratchLogs(reservationId) {
    try {
      const response = await api.get(`/api/reservations/${reservationId}/disputes/scratch-logs`)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('스크래치 로그 조회 실패:', error)
      return {
        success: false,
        message: error?.response?.data?.message || '스크래치 로그를 불러오지 못했습니다.'
      }
    }
  }
}

export default new DisputeService()
