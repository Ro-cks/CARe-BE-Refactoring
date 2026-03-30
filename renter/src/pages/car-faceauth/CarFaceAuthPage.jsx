import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import renterIcon from '../../assets/renter_icon.png'
import { verifyFace } from '../../api/faceVerify'
import { issueSmartKey } from '../../api/reservation'
import './CarFaceAuthPage.css'

// 라이브니스 단계 정의
const LIVENESS_STEPS = [
  { msg: '정면을 바라봐 주세요', dir: null, icon: null },
  { msg: '오른쪽으로\n돌려주세요', dir: 'right', icon: '→' },
  { msg: '왼쪽으로\n돌려주세요', dir: 'left', icon: '←' },
]
const STEP_DURATION = 2600 // ms per liveness step
const CIRCLE_R = 130
const CIRCLE_C = 2 * Math.PI * CIRCLE_R // ≈ 816.8

export default function CarFaceAuthPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation

  // 메인 플로우 단계: intro → license-cam → selfie-cam → processing → success | fail
  const [step, setStep] = useState('intro')
  const [licenseImage, setLicenseImage] = useState(null)
  const [failMsg, setFailMsg] = useState('')
  const [timeBlocked, setTimeBlocked] = useState(false)
  const [pickupDateTime, setPickupDateTime] = useState(null)

  // 카메라
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)

  // 라이브니스
  const [livenessStep, setLivenessStep] = useState(-1)
  const [livenessProgress, setLivenessProgress] = useState(0)
  const [livenessComplete, setLivenessComplete] = useState(false)
  const capturedRef = useRef(false)

  // ── 예약 시간 체크 ────────────────────────────────────────────
  useEffect(() => {
    if (!reservation) return
    const raw = reservation.pickupDate || reservation.startDate
    if (!raw) return
    let dt
    if (Array.isArray(raw)) {
      const [y, mo, d, h = 0, m = 0] = raw
      dt = new Date(y, mo - 1, d, h, m)
    } else {
      dt = new Date(raw)
    }
    if (isNaN(dt.getTime())) return
    setPickupDateTime(dt)
    if (new Date() < dt) setTimeBlocked(true)
  }, [reservation])

  // ── 카메라 제어 ──────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async (facing = 'environment') => {
    setCamReady(false)
    setCamError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
    if (step === 'license-cam') startCamera('environment')
    else if (step === 'selfie-cam') startCamera('user')
    else stopCamera()
    return stopCamera
  }, [step, startCamera, stopCamera])

  // ── 라이브니스 타이머 ──────────────────────────────────────
  useEffect(() => {
    if (step !== 'selfie-cam' || !camReady || livenessComplete) return

    setLivenessStep(0)
    setLivenessProgress(0)
    capturedRef.current = false

    const INTERVAL = 40
    const INCREMENT = (100 / STEP_DURATION) * INTERVAL
    let currentStep = 0
    let progress = 0

    const timer = setInterval(() => {
      progress += INCREMENT
      setLivenessProgress(Math.min(progress, 100))

      if (progress >= 100) {
        currentStep += 1
        if (currentStep >= LIVENESS_STEPS.length) {
          clearInterval(timer)
          setLivenessComplete(true)
        } else {
          progress = 0
          setLivenessStep(currentStep)
          setLivenessProgress(0)
        }
      }
    }, INTERVAL)

    return () => clearInterval(timer)
  }, [step, camReady]) // eslint-disable-line

  // ── 라이브니스 완료 → 자동 캡처 ─────────────────────────────
  useEffect(() => {
    if (!livenessComplete || capturedRef.current) return
    capturedRef.current = true

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const selfieData = canvas.toDataURL('image/jpeg', 0.92)
    stopCamera()
    setStep('processing')


    verifyFace(licenseImage, selfieData)
      .then((result) => {
        if (result.verified) setStep('success')
        else { setFailMsg('동일인이 아닌 것 같아요. 다시 시도해 주세요.'); setStep('fail') }
      })
      .catch((e) => {
        console.error('[FaceAuth] 인증 실패:', e)
        setFailMsg(e.message || '인증 중 오류가 발생했어요.')
        setStep('fail')
      })

  }, [livenessComplete]) // eslint-disable-line

  // ── 성공 후 localStorage 저장 ─────────────────────────────────
  useEffect(() => {
    if (step !== 'success') return
    if (reservation?.reservationId) {
      localStorage.setItem(`faceAuthDone_${reservation.reservationId}`, 'true')
    }
  }, [step, reservation])

  const handleIssueSmartKey = async () => {
    const rid = reservation?.reservationId
    try {
      if (rid) await issueSmartKey(rid)
    } catch (e) {
      console.error('스마트키 발급 오류:', e)
    }
    navigate('/car-smartkey', { state: { reservation } })
  }

  const handleLicenseCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const img = canvas.toDataURL('image/jpeg', 0.92)
    setLicenseImage(img)
    stopCamera()
    // 라이브니스 초기화 후 셀피 단계로
    setLivenessStep(-1)
    setLivenessProgress(0)
    setLivenessComplete(false)
    capturedRef.current = false
    setStep('selfie-cam')
  }

  // SVG arc offset (progress 0→100 : offset circumference→0)
  const arcOffset = CIRCLE_C - (CIRCLE_C * livenessProgress) / 100

  const formatPickupTime = (dt) => {
    if (!dt) return ''
    const m = dt.getMonth() + 1
    const d = dt.getDate()
    const hh = String(dt.getHours()).padStart(2, '0')
    const mm = String(dt.getMinutes()).padStart(2, '0')
    return `${m}월 ${d}일 ${hh}:${mm}`
  }

  // ─── 예약 시간 전 차단 ────────────────────────────────────────
  if (timeBlocked) return (
    <div className="cfa-page cfa-blocked-page">
      <div className="cfa-blocked-modal">
        <div className="cfa-blocked-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>
        <h2 className="cfa-blocked-title">아직 예약 시간이 아니에요</h2>
        <p className="cfa-blocked-desc">
          스마트키는 픽업 시작 시간부터<br/>사용할 수 있어요.
        </p>
        {pickupDateTime && (
          <div className="cfa-blocked-time">
            <span className="cfa-blocked-time-label">픽업 시작 시간</span>
            <span className="cfa-blocked-time-value">{formatPickupTime(pickupDateTime)}</span>
          </div>
        )}
        <button className="cfa-blocked-btn" onClick={() => navigate('/my-car')}>
          돌아가기
        </button>
      </div>
    </div>
  )

  // ─── 메인 안내 ───────────────────────────────────────────────
  if (step === 'intro') return (
    <div className="cfa-page">
      <button className="cfa-back-btn" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="cfa-intro-body">
        <h1 className="cfa-intro-title">본인 인증을<br/>시작할게요</h1>

        <div className="cfa-license-card">
          <img src={renterIcon} alt="국제운전면허증" className="cfa-license-img" />
        </div>

        <p className="cfa-intro-desc">국제운전면허증을 준비해 주세요</p>
        <p className="cfa-intro-highlight">
          대면 없이<br/><strong>3분 안에!</strong>
        </p>
      </div>

      <div className="cfa-footer">
        <button className="cfa-primary-btn" onClick={() => setStep('license-cam')}>
          스마트키 발급 받으러 가기
        </button>
      </div>
    </div>
  )

  // ─── 면허증 카메라 ───────────────────────────────────────────
  if (step === 'license-cam') return (
    <div className="cfa-cam-page">
      <div className="cfa-cam-top">
        <button className="cfa-cam-back" onClick={() => { stopCamera(); setStep('intro') }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <p className="cfa-cam-title">국제운전면허증을 사각형 안에 맞춰주세요</p>
        <p className="cfa-cam-sub">사진을 찍은 후 다음 단계로 넘어가요</p>
      </div>

      <div className="cfa-cam-area">
        {camError ? (
          <div className="cfa-cam-error">
            <p>카메라 접근 권한이 필요합니다</p>
            <button onClick={() => startCamera('environment')}>다시 시도</button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="cfa-cam-video" />
        )}
        <div className="cfa-cam-guide-rect" />
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="cfa-cam-footer">
        <button
          className="cfa-shutter-btn"
          onClick={handleLicenseCapture}
          disabled={!camReady && !camError}
        >
          <div className="cfa-shutter-ring">
            <div className="cfa-shutter-inner" />
          </div>
        </button>
      </div>
    </div>
  )

  // ─── 셀피 카메라 + 라이브니스 UI ────────────────────────────
  if (step === 'selfie-cam') {
    const currentLiveness = LIVENESS_STEPS[Math.max(livenessStep, 0)]

    return (
      <div className="cfa-selfie-page">
        {/* 배경 카메라 */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="cfa-selfie-video"
          style={{ transform: 'scaleX(-1)' }}
        />

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 오버레이 */}
        <div className="cfa-selfie-overlay">

          {/* 상단 단계 표시 */}
          <div className="cfa-selfie-header">
            <p className="cfa-selfie-header-text">얼굴 인증</p>
            <div className="cfa-liveness-steps">
              {LIVENESS_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`cfa-liveness-step-dot${i < livenessStep ? ' done' : i === livenessStep ? ' active' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* 원형 가이드 + 진행 아크 */}
          <div className="cfa-selfie-circle-wrap">
            <svg
              className="cfa-arc-svg"
              width={CIRCLE_R * 2 + 20}
              height={CIRCLE_R * 2 + 20}
              viewBox={`0 0 ${CIRCLE_R * 2 + 20} ${CIRCLE_R * 2 + 20}`}
            >
              {/* 배경 원 */}
              <circle
                cx={CIRCLE_R + 10}
                cy={CIRCLE_R + 10}
                r={CIRCLE_R}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
              />
              {/* 진행 아크 */}
              <circle
                cx={CIRCLE_R + 10}
                cy={CIRCLE_R + 10}
                r={CIRCLE_R}
                fill="none"
                stroke="#F7A633"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_C}
                strokeDashoffset={arcOffset}
                transform={`rotate(-90 ${CIRCLE_R + 10} ${CIRCLE_R + 10})`}
                className="cfa-arc-progress"
              />
            </svg>

            {/* 방향 화살표 */}
            {currentLiveness.dir && (
              <div className={`cfa-direction-arrow cfa-dir-${currentLiveness.dir}`}>
                {currentLiveness.dir === 'right' ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M13 6L19 12L13 18" stroke="#F7A633" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M11 6L5 12L11 18" stroke="#F7A633" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            )}

            {/* 스캔 라인 */}
            <div className="cfa-scan-line" />
          </div>

          {/* 하단 안내 텍스트 */}
          <div className="cfa-selfie-bottom">
            <p className="cfa-liveness-msg" key={livenessStep}>
              {livenessStep >= 0
                ? currentLiveness.msg.split('\n').map((line, i) => (
                    <span key={i}>{line}{i === 0 && <br/>}</span>
                  ))
                : '카메라를 준비하는 중...'}
            </p>

            {/* 라이브니스 진행 바 */}
            <div className="cfa-liveness-bar-wrap">
              <div
                className="cfa-liveness-bar-fill"
                style={{ width: `${livenessProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── 처리 중 ─────────────────────────────────────────────────
  if (step === 'processing') return (
    <div className="cfa-status-page">
      <div className="cfa-spinner" />
      <p className="cfa-status-text">얼굴을 확인하는 중...</p>
    </div>
  )

  // ─── 성공 ─────────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="cfa-page cfa-step-page">
      <div className="cfa-step-body">
        <div className="cfa-check-circle">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path d="M14 26L22 34L38 18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="cfa-step-title">얼굴 인증이<br/>완료되었습니다</h2>
        <p className="cfa-success-sub">본인 확인이 완료되었어요</p>
      </div>
      <div className="cfa-footer">
        <button className="cfa-primary-btn" onClick={handleIssueSmartKey}>
          스마트키 발급받기
        </button>
      </div>
    </div>
  )

  // ─── 실패 ────────────────────────────────────────────────────
  if (step === 'fail') return (
    <div className="cfa-status-page">
      <div className="cfa-fail-circle">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <path d="M16 16L36 36M36 16L16 36" stroke="white" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="cfa-fail-title">인증에 실패했어요</p>
      <p className="cfa-fail-desc">{failMsg}</p>
      <div className="cfa-fail-btns">
        <button className="cfa-retry-btn" onClick={() => {
          setLicenseImage(null)
          setLivenessStep(-1)
          setLivenessProgress(0)
          setLivenessComplete(false)
          capturedRef.current = false
          setStep('license-cam')
        }}>
          다시 시도
        </button>
        <button className="cfa-back-link" onClick={() => navigate('/my-car')}>
          돌아가기
        </button>
      </div>
    </div>
  )

  return null
}
