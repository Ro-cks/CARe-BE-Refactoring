import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import passportIcon from '../../assets/passport_icon.png'
import { renterLicense } from '../../api/auth'
import './DIDConfirmPage.css'

export default function DIDConfirmPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const image = state?.image
  const docType = state?.docType || 'passport'
  const isPassport = docType === 'passport'
  const ocrData = state?.ocrData

  const [form, setForm] = useState(() => {
    const base = {
      name: '',
      passportNo: '',
      birthDate: '',
      issueDate: '',
      expiryDate: '',
      licenseNumber: '',
    }
    if (!ocrData) return base
    if (isPassport) {
      return {
        ...base,
        name: [ocrData.surname, ocrData.given_names].filter(Boolean).join(' '),
        passportNo: ocrData.passport_no || '',
        birthDate: ocrData.date_of_birth || '',
        issueDate: ocrData.date_of_issue || '',
        expiryDate: ocrData.date_of_expiry || '',
      }
    } else {
      return {
        ...base,
        name: ocrData.name || '',
        birthDate: ocrData.date_of_birth || '',
        issueDate: ocrData.date_of_issue || '',
        expiryDate: ocrData.date_of_expiry || '',
        licenseNumber: ocrData.license_number || '',
      }
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async () => {
    setError('')

    // 빈 칸 검증
    if (!form.name.trim() || !form.birthDate.trim() || !form.issueDate.trim()) {
      setError('모든 항목을 입력해 주세요.')
      return
    }
    if (isPassport) {
      if (!form.passportNo.trim() || !form.expiryDate.trim()) {
        setError('모든 항목을 입력해 주세요.')
        return
      }
    } else {
      if (!form.licenseNumber.trim()) {
        setError('면허증 번호를 입력해 주세요.')
        return
      }
      if (!form.expiryDate.trim()) {
        setError('만료일자를 입력해 주세요.')
        return
      }
    }

    setLoading(true)
    try {
      const payload = isPassport
        ? {
            docType: 'PASSPORT',
            passportName: form.name,
            passportNo: form.passportNo,
            birthDate: form.birthDate.replace(/-/g, ''),
            issueDate: form.issueDate.replace(/-/g, ''),
            expiryDate: form.expiryDate.replace(/-/g, ''),
          }
        : (() => {
            const parts = form.licenseNumber.split('-')
            return {
              docType: 'INT_LICENSE',
              name: form.name,
              birthY: form.birthDate.slice(0, 4),
              birthM: form.birthDate.slice(5, 7),
              birthD: form.birthDate.slice(8, 10),
              licenZero:   parts[0] || '',
              licenFirst:  parts[1] || '',
              licenSecond: parts[2] || '',
              licenThird:  parts[3] || '',
              issueDate: form.issueDate.replace(/-/g, ''),
              expiryDate: form.expiryDate.replace(/-/g, ''),
            }
          })()

      const res = await renterLicense(payload)

      if (res.verified) {
        // 인증 결과 저장
        localStorage.setItem(`${docType}_verified`, 'true')

        // 여권이면 DID 카드에 표시할 정보 저장
        if (isPassport) {
          localStorage.setItem('did_name', form.name)
          localStorage.setItem('did_docId', res.docId || '')
          localStorage.setItem('did_expiry', form.expiryDate.replace(/-/g, ''))
        }

        const bothDone =
          localStorage.getItem('passport_verified') === 'true' &&
          localStorage.getItem('license_verified') === 'true'

        if (bothDone) {
          // 둘 다 완료 → DID+VC는 백엔드에서 자동 처리 → 카드 페이지로
          navigate('/did-card', {
            state: {
              name: localStorage.getItem('did_name') || form.name,
              docId: localStorage.getItem('did_docId') || res.docId,
              expiryDate: localStorage.getItem('did_expiry') || '',
            },
          })
        } else {
          navigate('/did-auth')
        }
      } else {
        setError('인증에 실패했습니다. 입력 정보를 다시 확인해 주세요.')
      }
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="did-confirm-page">
      <div className="did-confirm-header">
        <h2 className="did-confirm-title">
          <span className="did-confirm-highlight">
            {isPassport ? '여권 정보를' : '국제운전면허증 정보를'}
          </span><br />확인해 주세요.
        </h2>
      </div>

      <div className="did-confirm-preview-wrap">
        {image ? (
          <img src={image} alt="촬영된 서류" className="did-confirm-preview-img" />
        ) : (
          <div className="did-confirm-preview-placeholder">
            <img src={passportIcon} alt="서류 아이콘" />
          </div>
        )}
      </div>

      <button className="did-retake-btn" onClick={() => navigate('/did-camera', { state: { docType } })}>
        다시 촬영하기
      </button>

      {ocrData && !ocrData.parse_error && (
        <p className="did-ocr-notice">정보가 자동으로 입력되었어요. 틀린 내용이 있으면 수정해 주세요.</p>
      )}

      <div className="did-confirm-form">
        <div className="did-input-group">
          <label className="did-input-label">이름 (영문)</label>
          <input
            type="text"
            className="did-input"
            placeholder="HONG GILDONG"
            value={form.name}
            onChange={setField('name')}
          />
        </div>
        <div className="did-input-group">
          <label className="did-input-label">{isPassport ? '여권번호' : '면허증 번호'}</label>
          <input
            type="text"
            className="did-input"
            placeholder={isPassport ? 'M12345678' : '21-21-174133-01'}
            value={isPassport ? form.passportNo : form.licenseNumber}
            onChange={setField(isPassport ? 'passportNo' : 'licenseNumber')}
          />
        </div>
        <div className="did-input-group">
          <label className="did-input-label">생년월일</label>
          <input
            type="text"
            className="did-input"
            placeholder="YYYY-MM-DD"
            value={form.birthDate}
            onChange={setField('birthDate')}
          />
        </div>
        <div className="did-input-group">
          <label className="did-input-label">발급일자</label>
          <input
            type="text"
            className="did-input"
            placeholder="YYYY-MM-DD"
            value={form.issueDate}
            onChange={setField('issueDate')}
          />
        </div>
        <div className="did-input-group">
          <label className="did-input-label">만료일자</label>
          <input
            type="text"
            className="did-input"
            placeholder="YYYY-MM-DD"
            value={form.expiryDate}
            onChange={setField('expiryDate')}
          />
        </div>
      </div>

      {error && <p className="did-confirm-error">{error}</p>}

      <div className="did-confirm-footer">
        <button
          className="did-confirm-primary-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '확인 중...' : isPassport ? '여권정보 등록하기' : '면허증 정보 등록하기'}
        </button>
      </div>
    </div>
  )
}
