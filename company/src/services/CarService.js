import api from './api'

class CarService {
  async registerCar(companyId, carData) {
    try {
      const formData = new FormData()

      formData.append('modelId', carData.modelId)
      formData.append('plateNumber', carData.plateNumber)
      formData.append('dailyPrice', String(carData.dailyPrice))

      formData.append('frontImage', carData.frontImage)
      formData.append('rearImage', carData.rearImage)
      formData.append('leftImage', carData.leftImage)
      formData.append('rightImage', carData.rightImage)

      console.log('===== 차량 등록 요청 시작 =====')
      console.log('companyId:', companyId)
      console.log('request url:', `/api/companies/${companyId}/cars`)

      for (const [key, value] of formData.entries()) {
        console.log('formData:', key, value)
      }

      const response = await api.post(`/api/companies/${companyId}/cars`, formData)

      console.log('===== 차량 등록 성공 =====')
      console.log(response.data)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('===== 차량 등록 실패 =====')
      console.error('raw error:', error)
      console.error('message:', error?.message)
      console.error('status:', error?.response?.status)
      console.error('response data:', error?.response?.data)
      console.error('request url:', error?.config?.url)

      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          '차량 등록에 실패했습니다.'
      }
    }
  }

  async getCarDetail(carId) {
    try {
      console.log('===== 차량 상세 조회 요청 시작 =====')
      console.log('carId:', carId)
      console.log('request url:', `/api/cars/${carId}`)

      const response = await api.get(`/api/cars/${carId}`)

      console.log('===== 차량 상세 조회 성공 =====')
      console.log(response.data)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('===== 차량 상세 조회 실패 =====')
      console.error('raw error:', error)
      console.error('message:', error?.message)
      console.error('status:', error?.response?.status)
      console.error('response data:', error?.response?.data)
      console.error('request url:', error?.config?.url)

      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          '차량 정보를 불러오는데 실패했습니다.'
      }
    }
  }

  async getCompanyCars(companyId) {
    try {
      console.log('===== 업체 차량 목록 조회 요청 시작 =====')
      console.log('companyId:', companyId)
      console.log('request url:', `/api/companies/${companyId}/cars`)

      const response = await api.get(`/api/companies/${companyId}/cars`)

      console.log('===== 업체 차량 목록 조회 성공 =====')
      console.log('차량 개수:', response.data?.length || 0)
      console.log(response.data)

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('===== 업체 차량 목록 조회 실패 =====')
      console.error('raw error:', error)
      console.error('message:', error?.message)
      console.error('status:', error?.response?.status)
      console.error('response data:', error?.response?.data)
      console.error('request url:', error?.config?.url)

      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          '차량 목록을 불러오는데 실패했습니다.'
      }
    }
  }
}

export default new CarService()