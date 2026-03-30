import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CarService from '../../services/CarService'
import AuthService from '../../services/AuthService'
import './CarRegisterPage.css'

const IMAGE_SLOTS = [
  { key: 'frontImage', label: '전면', icon: '⬆️' },
  { key: 'rearImage',  label: '후면', icon: '⬇️' },
  { key: 'leftImage',  label: '좌측', icon: '⬅️' },
  { key: 'rightImage', label: '우측', icon: '➡️' },
]

// 차량 모델 목록 폴백 데이터 (GET /car-models 엔드포인트 필요)
const CAR_MODELS = [
  { id: 'model-001', name: '현대 아이오닉5' },
  { id: 'model-002', name: '기아 EV6' },
  { id: 'model-003', name: '제네시스 GV60' },
  { id: 'model-004', name: '테슬라 Model 3' },
  { id: 'model-005', name: '테슬라 Model Y' },
]

export default function CarRegisterPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    modelId: '',
    plateNumber: '',
    dailyPrice: '',
    frontImage: null,
    rearImage: null,
    leftImage: null,
    rightImage: null,
  })

  const [previews, setPreviews] = useState({
    frontImage: null,
    rearImage: null,
    leftImage: null,
    rightImage: null,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleImageChange = (e, key) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    setFormData((prev) => ({ ...prev, [key]: file }))
    const reader = new FileReader()
    reader.onloadend = () =>
      setPreviews((prev) => ({ ...prev, [key]: reader.result }))
    reader.readAsDataURL(file)
    if (error) setError('')
  }

  const removeImage = (key) => {
    setFormData((prev) => ({ ...prev, [key]: null }))
    setPreviews((prev) => ({ ...prev, [key]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const companyId = AuthService.getCompanyId()
    if (!companyId)       return setError('companyId가 없습니다. 다시 로그인해주세요.')
    if (!formData.modelId)    return setError('차량 모델을 선택해주세요.')
    if (!formData.plateNumber)  return setError('차량 번호를 입력해주세요.')
    if (!formData.dailyPrice)   return setError('일일 요금을 입력해주세요.')
    if (!formData.frontImage || !formData.rearImage ||
        !formData.leftImage  || !formData.rightImage)
      return setError('전후좌우 이미지를 모두 업로드해주세요.')

    setLoading(true)
    try {
      const result = await CarService.registerCar(companyId, formData)
      if (result.success) {
        alert('차량이 성공적으로 등록되었습니다.')
        navigate('/cars')
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('차량 등록 예외:', err)
      setError('차량 등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="car-register-page">

      {/* ── 헤더 ── */}
      <div className="reg-header">
        <button className="reg-back-button" onClick={() => navigate('/cars')}>
          ← 돌아가기
        </button>
        <div className="reg-title-wrap">
          <h1 className="reg-title">차량 등록</h1>
          <p className="reg-subtitle">새 차량의 정보와 사진을 입력해주세요.</p>
        </div>
      </div>

      {/* ── 폼 ── */}
      <form onSubmit={handleSubmit} className="reg-form-body">

        {/* 기본 정보 카드 */}
        <div className="reg-card">
          <h2 className="reg-section-title">기본 정보</h2>
          <div className="reg-section-divider" />

          <div className="reg-form-grid">
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="modelId">
                차량 모델<span className="reg-label-required">*</span>
              </label>
              <select
                className="reg-select"
                id="modelId"
                name="modelId"
                value={formData.modelId}
                onChange={handleInputChange}
                required
              >
                <option value="">모델을 선택하세요</option>
                {CAR_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="reg-form-group">
              <label className="reg-label" htmlFor="plateNumber">
                차량 번호<span className="reg-label-required">*</span>
              </label>
              <input
                className="reg-input"
                type="text"
                id="plateNumber"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleInputChange}
                placeholder="예: 12가 3456"
                required
              />
            </div>

            <div className="reg-form-group">
              <label className="reg-label" htmlFor="dailyPrice">
                일일 요금 (CARE)<span className="reg-label-required">*</span>
              </label>
              <input
                className="reg-input"
                type="number"
                id="dailyPrice"
                name="dailyPrice"
                value={formData.dailyPrice}
                onChange={handleInputChange}
                placeholder="예: 80000"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* 차량 사진 카드 */}
        <div className="reg-card">
          <h2 className="reg-section-title">차량 사진</h2>
          <div className="reg-section-divider" />

          <div className="reg-image-grid">
            {IMAGE_SLOTS.map(({ key, label, icon }) => (
              <div className="reg-upload-item" key={key}>
                <div className="reg-upload-title">
                  <span className="reg-upload-title-icon">{icon}</span>
                  {label}
                </div>
                <label className="reg-upload-label">
                  {previews[key] ? (
                    <div className="reg-preview-container">
                      <img src={previews[key]} alt={label} />
                      <button
                        type="button"
                        className="reg-remove-image"
                        onClick={(e) => { e.preventDefault(); removeImage(key) }}
                      >✕</button>
                    </div>
                  ) : (
                    <div className="reg-upload-placeholder">
                      <span className="reg-upload-icon">📷</span>
                      <span className="reg-upload-text">클릭하여 업로드</span>
                      <span className="reg-upload-hint">최대 10MB · JPG, PNG</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, key)}
                    hidden
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="reg-error">
            <span className="reg-error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="reg-actions">
          <button
            type="button"
            className="reg-cancel-btn"
            onClick={() => navigate('/cars')}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="reg-submit-btn"
            disabled={loading}
          >
            {loading ? '등록 중...' : '🚗 차량 등록'}
          </button>
        </div>

      </form>
    </div>
  )
}