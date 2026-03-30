import api from './api'

class CompanyService {
  async getCompanyInfo() {
    try {
      const response = await api.get('/companies/me')

      return {
        success: true,
        data: response.data?.data || response.data,
      }
    } catch (error) {
      console.error('회사 정보 조회 실패:', error)

      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          '회사 정보를 불러오는데 실패했습니다.',
      }
    }
  }
}

export default new CompanyService()