import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import carIconCute from '../../assets/car_icon_cute.png'
import carIconFront from '../../assets/car_icon_front.png'
import { scanAfter, completeReservation, lockSmartKey } from '../../api/reservation'
import './CarReturnPage.css'

const PANELS = [
  { id: 'front', label: '전면부', icon: 'front' },
  { id: 'rear',  label: '후면부', icon: 'rear'  },
  { id: 'left',  label: '좌측면', icon: 'left'  },
  { id: 'right', label: '우측면', icon: 'right' },
]

function PanelIcon({ icon }) {
  if (icon === 'front') return <img src={carIconFront} alt="전면" className="cr-panel-icon" />
  if (icon === 'rear')  return <img src={carIconFront} alt="후면" className="cr-panel-icon cr-rotate-180" />
  if (icon === 'left')  return <img src={carIconCute}  alt="좌측" className="cr-panel-icon cr-side" />
  if (icon === 'right') return <img src={carIconCute}  alt="우측" className="cr-panel-icon cr-side cr-flip" />
  return null
}

export default function CarReturnPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation
  const fromScan = state?.fromScan || false
  const showDone = state?.done || false

  // intro → select → camera → submitting → done
  // fromScan=true 일 때는 바로 confirm 단계로 진입
  // done=true 일 때는 바로 완료 화면으로 진입
  const [step, setStep] = useState(showDone ? 'done' : fromScan ? 'confirm' : 'intro')
  const [currentPanel, setCurrentPanel] = useState(null)
  const [photos, setPhotos] = useState({})

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setCamReady(false)
    setCamError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setCamReady(true)
      }
    } catch {
      setCamError(true)
    }
  }, [])

  useEffect(() => {
    if (step === 'camera') startCamera()
    else stopCamera()
    return stopCamera
  }, [step, startCamera, stopCamera])

  const allCaptured = PANELS.every(p => photos[p.id])

  const openCamera = (panelId) => {
    setCurrentPanel(panelId)
    setStep('camera')
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    stopCamera()
    setPhotos(prev => ({ ...prev, [currentPanel]: dataUrl }))
    setCurrentPanel(null)
    setStep('select')
  }

  const submitReturn = () => {
    const rid = reservation?.reservationId
    if (rid) {
      localStorage.setItem(`disputePending_${rid}`, 'true')
      localStorage.setItem(`disputeDate_${rid}`, reservation.endDate || '')
    }

    // 스캔 업로드 + 반납 처리는 백그라운드에서 실행 (AI 리포트 생성 포함)
    if (rid) {
      ;(async () => {
        try {
          if (!fromScan) {
            await Promise.all(PANELS.filter(p => photos[p.id]).map(p => scanAfter(rid, p.id, photos[p.id])))
          }
          await Promise.all([
            lockSmartKey(rid).catch(e => console.error('[Return] 스마트키 반납 실패:', e)),
            completeReservation(rid),
          ])
        } catch (e) {
          console.error('[Return] 반납 처리 실패:', e)
        }
      })()
    }

    // API 완료를 기다리지 않고 즉시 완료 화면으로
    setStep('done')
  }

  // ─── 스캔 완료 후 반납 확인 (fromScan) ──────────────────────
  if (step === 'confirm') return (
    <div className="cr-page">
      <div className="cr-intro-body">
        <div className="cr-icon-ring">
          <img src={carIconCute} alt="차량" className="cr-car-icon" />
        </div>
        <div className="cr-intro-text">
          <h1 className="cr-intro-title">{t('carReturn.confirmTitle')}</h1>
          <p className="cr-intro-desc">
            {t('carReturn.confirmDesc').split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
          </p>
        </div>
      </div>
      <div className="cr-footer">
        <button className="cr-primary-btn" onClick={submitReturn}>
          {t('carReturn.completeBtn')}
        </button>
      </div>
    </div>
  )

  // ─── 인트로 ───────────────────────────────────────────────────
  if (step === 'intro') return (
    <div className="cr-page">
      <button className="cr-back" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#222" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="cr-intro-body">
        <div className="cr-icon-ring">
          <img src={carIconCute} alt="차량" className="cr-car-icon" />
        </div>
        <div className="cr-intro-text">
          <h1 className="cr-intro-title">{t('carReturn.introTitle').split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</h1>
          <p className="cr-intro-desc">
            {t('carReturn.introDesc').split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}
          </p>
        </div>
        <div className="cr-intro-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
              stroke="#F7A633" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="#F7A633" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{t('carReturn.introNotice')}</span>
        </div>
      </div>

      <div className="cr-footer">
        <button className="cr-primary-btn" onClick={() => setStep('select')}>
          {t('carReturn.goCamera')}
        </button>
      </div>
    </div>
  )

  // ─── 4방향 촬영 선택 ────────────────────────────────────────
  if (step === 'select') return (
    <div className="cr-page">
      <div className="cr-select-header">
        <button className="cr-back-inline" onClick={() => setStep('intro')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#222" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className="cr-select-title">{t('carReturn.selectTitle')}</h2>
      </div>

      <div className="cr-progress-row">
        {PANELS.map(p => (
          <div key={p.id} className={`cr-progress-dot${photos[p.id] ? ' done' : ''}`} />
        ))}
        <span className="cr-progress-text">
          {Object.keys(photos).length} / {PANELS.length}
        </span>
      </div>

      <div className="cr-panels-grid">
        {PANELS.map(panel => {
          const taken = !!photos[panel.id]
          return (
            <button
              key={panel.id}
              className={`cr-panel${taken ? ' done' : ''}`}
              onClick={() => openCamera(panel.id)}
            >
              <div className="cr-panel-icon-wrap">
                <PanelIcon icon={panel.icon} />
                {taken && (
                  <div className="cr-panel-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <p className="cr-panel-label">{panel.label}</p>
              <span className={`cr-panel-badge${taken ? ' done' : ''}`}>
                {taken ? t('carReturn.taken') : t('carReturn.notTaken')}
              </span>
            </button>
          )
        })}
      </div>

      <div className="cr-footer">
        <button
          className={`cr-primary-btn${allCaptured ? '' : ' disabled'}`}
          onClick={allCaptured ? submitReturn : undefined}
          disabled={!allCaptured}
        >
          {t('carReturn.completeBtn')}
        </button>
        {!allCaptured && (
          <p className="cr-hint">{t('carReturn.shootHint')}</p>
        )}
      </div>
    </div>
  )

  // ─── 카메라 ──────────────────────────────────────────────────
  if (step === 'camera') {
    const panel = PANELS.find(p => p.id === currentPanel)
    return (
      <div className="cr-cam-page">
        <div className="cr-cam-header">
          <button className="cr-cam-back" onClick={() => { stopCamera(); setStep('select') }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p className="cr-cam-title">{t('carReturn.cameraTitle', { panel: panel?.label })}</p>
            <p className="cr-cam-sub">{t('carReturn.cameraGuide')}</p>
          </div>
        </div>

        <div className="cr-cam-area">
          {camError ? (
            <div className="cr-cam-error">
              <p>{t('carReturn.cameraPermission')}</p>
              <button onClick={startCamera}>{t('carReturn.retry')}</button>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="cr-cam-video" />
          )}
          <div className="cr-cam-guide" />
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="cr-cam-footer">
          <button
            className="cr-shutter-btn"
            onClick={capturePhoto}
            disabled={!camReady && !camError}
          >
            <div className="cr-shutter-ring">
              <div className="cr-shutter-inner" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ─── 전송 중 ─────────────────────────────────────────────────
  if (step === 'submitting') return (
    <div className="cr-loading-page">
      <div className="cr-loading-spinner" />
      <p className="cr-loading-title">{t('carReturn.submittingTitle')}</p>
      <p className="cr-loading-desc">{t('carReturn.submittingDesc').split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</p>
    </div>
  )

  // ─── 완료 ────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="cr-done-page">
      <div className="cr-done-icon cr-done-icon--animate">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="cr-done-text-group">
        <h1 className="cr-done-title">반납이 완료되었습니다</h1>
        <p className="cr-done-desc">
          사진이 블록체인에 안전하게 저장됐어요.<br/>
          이용해 주셔서 감사합니다.
        </p>
      </div>
        <button className="cr-done-btn" onClick={() => {
          const completedReservation = { ...reservation, status: 'COMPLETED' }
          if (reservation?.reservationId) {
            navigate(`/reservations/${reservation.reservationId}`, { state: { reservation: completedReservation } })
          } else {
            navigate('/home')
          }
        }}>{t('carReturn.goHome')}</button>
    </div>
  )

  return null
}
