import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CarService from '../../services/CarService'
import AuthService from '../../services/AuthService'
import './CarRegisterPage.css'

// 차량 모델 목록 폴백 데이터
const CAR_MODELS = [
  { id: 'model-001', name: '현대 아이오닉5' },
  { id: 'model-002', name: '기아 EV6' },
  { id: 'model-003', name: '제네시스 GV60' },
  { id: 'model-004', name: '테슬라 Model 3' },
  { id: 'model-005', name: '테슬라 Model Y' },
]

export default function CarRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const IMAGE_SLOTS = [
    { key: 'frontImage', label: t('carRegister.dirFront'), icon: '\u2b06\ufe0f' },
    { key: 'rearImage',  label: t('carRegister.dirRear'),  icon: '\u2b07\ufe0f' },
    { key: 'leftImage',  label: t('carRegister.dirLeft'),  icon: '\u2b05\ufe0f' },
    { key: 'rightImage', label: t('carRegister.dirRight'), icon: '\u27a1\ufe0f' },
  ]

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
      setError(t('carRegister.errorFileSize'))
      return
    }
    if (!file.type.startsWith('image/')) {
      setError(t('carRegister.errorFileType'))
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
    if (!companyId)       return setError(t('carRegister.errorNoCompany'))
    if (!formData.modelId)    return setError(t('carRegister.errorNoModel'))
    if (!formData.plateNumber)  return setError(t('carRegister.errorNoPlate'))
    if (!formData.dailyPrice)   return setError(t('carRegister.errorNoPrice'))
    if (!formData.frontImage || !formData.rearImage ||
        !formData.leftImage  || !formData.rightImage)
      return setError(t('carRegister.errorNoImages'))

    setLoading(true)
    try {
      const result = await CarService.registerCar(companyId, formData)
      if (result.success) {
        alert(t('carRegister.successAlert'))
        navigate('/cars')
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('Car register error:', err)
      setError(t('carRegister.errorRegister'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="car-register-page">

      {/* 헤더 */}
      <div className="reg-header">
        <button className="reg-back-button" onClick={() => navigate('/cars')}>
          {t('carRegister.back')}
        </button>
        <div className="reg-title-wrap">
          <h1 className="reg-title">{t('carRegister.title')}</h1>
          <p className="reg-subtitle">{t('carRegister.subtitle')}</p>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="reg-form-body">

        {/* 기본 정보 카드 */}
        <div className="reg-card">
          <h2 className="reg-section-title">{t('carRegister.sectionBasic')}</h2>
          <div className="reg-section-divider" />

          <div className="reg-form-grid">
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="modelId">
                {t('carRegister.modelLabel')}<span className="reg-label-required">*</span>
              </label>
              <select
                className="reg-select"
                id="modelId"
                name="modelId"
                value={formData.modelId}
                onChange={handleInputChange}
                required
              >
                <option value="">{t('carRegister.modelPlaceholder')}</option>
                {CAR_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="reg-form-group">
              <label className="reg-label" htmlFor="plateNumber">
                {t('carRegister.plateLabel')}<span className="reg-label-required">*</span>
              </label>
              <input
                className="reg-input"
                type="text"
                id="plateNumber"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleInputChange}
                placeholder={t('carRegister.platePlaceholder')}
                required
              />
            </div>

            <div className="reg-form-group">
              <label className="reg-label" htmlFor="dailyPrice">
                {t('carRegister.priceLabel')}<span className="reg-label-required">*</span>
              </label>
              <input
                className="reg-input"
                type="number"
                id="dailyPrice"
                name="dailyPrice"
                value={formData.dailyPrice}
                onChange={handleInputChange}
                placeholder={t('carRegister.pricePlaceholder')}
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* 차량 사진 카드 */}
        <div className="reg-card">
          <h2 className="reg-section-title">{t('carRegister.sectionPhoto')}</h2>
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
                      >{'\u2715'}</button>
                    </div>
                  ) : (
                    <div className="reg-upload-placeholder">
                      <span className="reg-upload-icon">{'\ud83d\udcf7'}</span>
                      <span className="reg-upload-text">{t('carRegister.uploadText')}</span>
                      <span className="reg-upload-hint">{t('carRegister.uploadHint')}</span>
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
            <span className="reg-error-icon">{'\u26a0\ufe0f'}</span>
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
            {t('carRegister.cancelBtn')}
          </button>
          <button
            type="submit"
            className="reg-submit-btn"
            disabled={loading}
          >
            {loading ? t('carRegister.registerLoading') : t('carRegister.registerBtn')}
          </button>
        </div>

      </form>
    </div>
  )
}
