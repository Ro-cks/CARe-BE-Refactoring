import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyFace } from '../../api/faceVerify'
import './DIDSelfiePage.css'

export default function DIDSelfiePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const passportImage = state?.passportImage

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | fail

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch {
      setCameraError(true)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const captureSelfie = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const selfieData = canvas.toDataURL('image/jpeg', 0.92)

    stopCamera()
    setStatus('loading')

    try {
      const result = await verifyFace(passportImage, selfieData)
      if (result.verified) {
        navigate('/wallet', { state: { didVerified: true } })
      } else {
        setStatus('fail')
      }
    } catch {
      setStatus('fail')
    }
  }

  const retry = () => {
    setStatus('idle')
    startCamera()
  }

  if (status === 'loading') {
    return (
      <div className="selfie-status-page">
        <div className="selfie-spinner" />
        <p>얼굴을 확인하는 중...</p>
      </div>
    )
  }

  if (status === 'fail') {
    return (
      <div className="selfie-status-page">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="#FF4D4F" strokeWidth="3" />
          <path d="M20 20L44 44M44 20L20 44" stroke="#FF4D4F" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="selfie-fail-text">얼굴이 일치하지 않습니다</p>
        <p className="selfie-fail-sub">여권 사진과 동일인인지 확인해 주세요</p>
        <button className="selfie-retry-btn" onClick={retry}>다시 시도</button>
      </div>
    )
  }

  return (
    <div className="selfie-page">
      <div className="selfie-top">
        <p className="selfie-title">셀피를 촬영해 주세요</p>
        <p className="selfie-sub">얼굴이 원 안에 오도록 맞춰주세요</p>
      </div>

      <div className="selfie-camera-wrap">
        {cameraError ? (
          <div className="selfie-error">
            <p>카메라 접근 권한이 필요합니다</p>
            <button onClick={startCamera}>다시 시도</button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="selfie-video" />
        )}
        <div className="selfie-oval-guide" />
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="selfie-footer">
        <button
          className="selfie-shutter-btn"
          onClick={captureSelfie}
          disabled={!ready || cameraError}
        >
          <div className="selfie-shutter-ring">
            <div className="selfie-shutter-inner" />
          </div>
        </button>
      </div>
    </div>
  )
}
