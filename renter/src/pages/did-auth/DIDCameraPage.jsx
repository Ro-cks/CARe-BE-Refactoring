import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ocrPassport, ocrLicense } from '../../api/ocr'
import './DIDCameraPage.css'

export default function DIDCameraPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const docType = state?.docType || 'passport'
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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

  const capturePhoto = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.92)

    stopCamera()
    setOcrLoading(true)

    let ocrData = null
    try {
      ocrData = docType === 'license'
        ? await ocrLicense(imageData)
        : await ocrPassport(imageData)
    } catch {
      // OCR 실패해도 confirm 페이지로 이동 (수동 입력)
    } finally {
      setOcrLoading(false)
    }

    navigate('/did-confirm', { state: { image: imageData, docType, ocrData } })
  }

  return (
    <div className="did-camera-page">
      <div className="did-camera-top">
        <p className="did-camera-title">
          {docType === 'license' ? '국제운전면허증을' : '여권을'} 사각형 안에 맞춰주세요
        </p>
        <p className="did-camera-sub">자동으로 촬영돼요.</p>
      </div>

      {/* Camera view */}
      <div className="did-camera-area">
        {cameraError ? (
          <div className="did-camera-error">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#888" strokeWidth="2"/>
              <path d="M14 14L26 26M26 14L14 26" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>카메라 접근 권한이 필요합니다</p>
            <button onClick={startCamera}>다시 시도</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="did-camera-video"
          />
        )}

        {/* Guide box */}
        {!cameraError && (
          <div className="did-camera-guide" />
        )}
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* OCR 로딩 오버레이 */}
      {ocrLoading && (
        <div className="did-ocr-loading">
          <div className="did-ocr-spinner" />
          <p>정보 인식 중...</p>
        </div>
      )}

      {/* Shutter button */}
      <div className="did-camera-footer">
        <button
          className="did-shutter-btn"
          onClick={capturePhoto}
          disabled={(!ready && !cameraError) || ocrLoading}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M12 4L10.17 6H6C4.9 6 4 6.9 4 8V24C4 25.1 4.9 26 6 26H26C27.1 26 28 25.1 28 24V8C28 6.9 27.1 6 26 6H21.83L20 4H12Z" fill="#F7A633"/>
            <circle cx="16" cy="15" r="5" fill="white"/>
            <path d="M26 10C27.5 8.5 29 7.5 30 8C31 8.5 30.5 10.5 29.5 12" stroke="#F7A633" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 10C4.5 8.5 3 7.5 2 8C1 8.5 1.5 10.5 2.5 12" stroke="#F7A633" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
