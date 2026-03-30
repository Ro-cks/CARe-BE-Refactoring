// ─────────────────────────────────────────────────────────────
//  ScanPage.jsx  —  차량 흠집 스캔 메인 페이지
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Scanner }                      from './scanner.js'
import { ZONES }                        from './zones.js'
import styles                           from './ScanPage.module.css'
import { getScanResult }                from '../../api/scan'
import careLogo                         from '../../assets/care_logo.png'
import { clearOverlay, updateARBoxes, startARLoop, stopARLoop, showHistoryOverlay } from './overlay.js'

export default function ScanPage() {
  const { reservationId } = useParams()
  const location          = useLocation()
  const navigate          = useNavigate()
  const logType           = location.state?.logType || 'BEFORE'

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const scannerRef  = useRef(null)
  const wheelLRef   = useRef(null)
  const wheelRRef   = useRef(null)
  const arCanvasRef = useRef(null)
  const wsRef       = useRef(null)

  const [zoneIndex,       setZoneIndex]       = useState(0)
  const [captures,        setCaptures]        = useState({})
  const [isDone,          setIsDone]          = useState(false)
  const [matchStatus,     setMatchStatus]     = useState('detecting')
  const [matchValue,      setMatchValue]      = useState(0)
  const [showToast,       setShowToast]       = useState(false)
  const [canCapture,      setCanCapture]      = useState(false)
  const [isCapturing,     setIsCapturing]     = useState(false)
  const [allScratches,    setAllScratches]    = useState([])
  const [activeCard,      setActiveCard]      = useState(null)
  // ── 가이드 멘트 오버레이
  const [showGuideOverlay,  setShowGuideOverlay]  = useState(false)
  const [overlayHidden,     setOverlayHidden]     = useState(false)
  const [showScanStartToast, setShowScanStartToast] = useState(false)
  const [autoNextCountdown,  setAutoNextCountdown]  = useState(0)
  const autoNextTimerRef = useRef(null)
  const [modalImg, setModalImg] = useState(null)  // 확대 모달용

  const currentZone = ZONES[zoneIndex]
  const history     = allScratches.filter(s => s.carPart === currentZone?.id)

  const isWaitingRef    = useRef(false)
  const timeoutRef      = useRef(null)
  const matchStatusRef  = useRef(matchStatus)
  const isCapturingRef  = useRef(false)
  useEffect(() => { matchStatusRef.current = matchStatus }, [matchStatus])
  useEffect(() => { setActiveCard(null) }, [zoneIndex])

  // 구역 변경 시 가이드 오버레이 초기화
  const overlayVisibleRef = useRef(false)
  const overlayShownAtRef = useRef(0)          // 오버레이가 실제로 뜬 시각
  const OVERLAY_MIN_SHOW  = 3000               // 최소 3초는 유지

  useEffect(() => {
    if (currentZone?.type === 'wheel') {
      setOverlayHidden(false)
      setShowGuideOverlay(false)
      setShowScanStartToast(false)
      overlayVisibleRef.current = false
      overlayShownAtRef.current = 0
      const t = setTimeout(() => {
        setShowGuideOverlay(true)
        overlayVisibleRef.current = true
        overlayShownAtRef.current = Date.now()
      }, 150)
      return () => clearTimeout(t)
    } else {
      setShowGuideOverlay(false)
      overlayVisibleRef.current = false
    }
  }, [zoneIndex])

  // matchValue > 5 이면 오버레이 페이드아웃 — 단 최소 유지 시간 지난 후에만
  useEffect(() => {
    if (matchValue > 5 && overlayVisibleRef.current) {
      const elapsed = Date.now() - overlayShownAtRef.current
      const delay   = Math.max(0, OVERLAY_MIN_SHOW - elapsed)
      setTimeout(() => {
        if (!overlayVisibleRef.current) return
        overlayVisibleRef.current = false
        setOverlayHidden(true)
        setTimeout(() => setShowGuideOverlay(false), 650)
      }, delay)
    }
  }, [matchValue])

  // matched 되면 "흠집 탐지 시작!" 토스트
  useEffect(() => {
    if (matchStatus === 'matched') {
      setShowScanStartToast(true)
      setTimeout(() => setShowScanStartToast(false), 1800)
    }
  }, [matchStatus])

  // 마운트 시 전체 흠집 조회 (BEFORE + AFTER)
  useEffect(() => {
    if (!reservationId) return
    Promise.all([
      getScanResult(reservationId, 'BEFORE').catch(() => []),
      getScanResult(reservationId, 'AFTER').catch(() => []),
    ]).then(([before, after]) => {
      const merged = [
        ...(Array.isArray(before) ? before : []),
        ...(Array.isArray(after)  ? after  : []),
      ]
      setAllScratches(merged)
    })
  }, [])

  // 폰트 로드
  useEffect(() => {
    const link = document.createElement('link')
    link.href  = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pretendard:wght@300;400;500;600;700&display=swap'
    link.rel   = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  // WebSocket + rAF
  useEffect(() => {
    const protocol  = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const AI_WS_URL = import.meta.env.VITE_AI_WS_URL || `${protocol}//${window.location.hostname}:8000`
    const wsUrl     = `${AI_WS_URL}/api/v1/scratches/ws/detect`
    let destroyed   = false

    function connectWS() {
      if (destroyed) return
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🟢 [WS] 연결 성공!')
        isWaitingRef.current = false
      }

      ws.onmessage = (event) => {
        isWaitingRef.current = false
        clearTimeout(timeoutRef.current)
        if (matchStatusRef.current === 'captured') return
        const data = JSON.parse(event.data)

        if (data.boxes) {
          const video = videoRef.current
          const vw = video?.videoWidth  || 640
          const vh = video?.videoHeight || 360
          const isPortrait  = window.innerHeight > window.innerWidth
          const needsRotate = isPortrait && vw > vh
          let capW, capH
          if (needsRotate) {
            const scale = 640 / Math.max(vh, vw)
            capW = Math.round(vh * scale)
            capH = Math.round(vw * scale)
          } else if (isPortrait) {
            const scale = 640 / vw
            capW = 640
            capH = Math.round(vh * scale)
          } else {
            const scale = 640 / Math.max(vw, vh)
            capW = Math.round(vw * scale)
            capH = Math.round(vh * scale)
          }
          updateARBoxes(data.boxes, capW, capH)
        }
      }

      ws.onclose = (e) => {
        console.log(`🟡 WS 끊김 (code: ${e.code}) — 2초 후 재연결`)
        isWaitingRef.current = false
        if (!destroyed) setTimeout(connectWS, 2000)
      }

      ws.onerror = () => {
        isWaitingRef.current = false
      }
    }

    connectWS()

    const interval = setInterval(() => {
      if (matchStatusRef.current === 'captured') return
      if (isCapturingRef.current) return
      if (isWaitingRef.current) return

      const video = videoRef.current, ws = wsRef.current
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return

      const vw = video.videoWidth  || 640
      const vh = video.videoHeight || 360
      const isPortrait   = window.innerHeight > window.innerWidth
      const needsRotate  = isPortrait && vw > vh

      // 세로 모드: width를 640 기준으로 → AI가 가로 비율로 받도록
      // 가로 모드: 긴 쪽을 640 기준으로
      let capW, capH
      if (needsRotate) {
        const scale = 640 / Math.max(vh, vw)
        capW = Math.round(vh * scale)
        capH = Math.round(vw * scale)
      } else if (isPortrait) {
        // 세로 모드 — width 기준 640으로 키워서 가로 비율처럼 전송
        const scale = 640 / vw
        capW = 640
        capH = Math.round(vh * scale)
      } else {
        const scale = 640 / Math.max(vw, vh)
        capW = Math.round(vw * scale)
        capH = Math.round(vh * scale)
      }

      const c = document.createElement('canvas')
      c.width  = capW
      c.height = capH
      const ctx = c.getContext('2d')

      if (needsRotate) {
        // 중심 기준 -90도 회전
        ctx.translate(capW / 2, capH / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.drawImage(video, -capH / 2, -capW / 2, capH, capW)
      } else {
        ctx.drawImage(video, 0, 0, capW, capH)
      }

      c.toBlob(blob => {
        if (blob && ws.readyState === WebSocket.OPEN) {
          isWaitingRef.current = true
          ws.send(blob)
          timeoutRef.current = setTimeout(() => {
            isWaitingRef.current = false
          }, 2000)
        }
      }, 'image/jpeg', 0.6)
    }, 200)
    return () => { destroyed = true; clearInterval(interval); stopARLoop(); if (wsRef.current) wsRef.current.close() }
  }, [])

  // 카메라
  useEffect(() => {
    let stream = null, cancelled = false
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
      .then(s => {
        stream = s
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return }
        const video = videoRef.current
        if (!video) return
        video.srcObject = s

        video.onloadedmetadata = () => {
          console.log('📱', `meta:${video.videoWidth}x${video.videoHeight}`)
          if (!cancelled) video.play().catch(() => {})
        }

        video.onloadeddata = () => {
          console.log('📱', `data:${video.videoWidth}x${video.videoHeight}`)
          if (!cancelled) startARLoop(arCanvasRef.current, video)
        }
      })
      .catch(err => {
        console.error('[ScanPage] 카메라 실패', err)
      })
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Scanner
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setMatchStatus('detecting'); setMatchValue(0); setCanCapture(false); setIsCapturing(false)
    clearOverlay(canvasRef.current); clearOverlay(arCanvasRef.current)

    const scanner = new Scanner(video, reservationId, logType)
    scannerRef.current = scanner

    scanner.onMatching = (progress) => {
      setMatchValue(progress)
      const dash = (progress / 100) * 2 * Math.PI * 44
      ;[wheelLRef, wheelRRef].forEach(ref => {
        const c = ref.current?.querySelector('circle')
        if (c) c.style.strokeDasharray = `${dash} 999`
      })
    }
    scanner.onMatched = () => { setMatchStatus('matched'); setCanCapture(true) }
    scanner.onCapture = (zoneId, dataUrl, boxes, saveError) => {
      setCaptures(prev => ({ ...prev, [zoneId]: { dataUrl, boxes } }))
      setMatchStatus('captured'); setCanCapture(false); setIsCapturing(false)
      if (boxes.length > 0 && navigator.vibrate) navigator.vibrate(200)
      stopARLoop()
      clearOverlay(arCanvasRef.current)
      if (saveError) { setShowToast(true); setTimeout(() => setShowToast(false), 3000) }
      else if (boxes.length > 0) { setShowToast(true); setTimeout(() => setShowToast(false), 2000) }

      // 1.5초 후 자동으로 다음 구역 이동
      setAutoNextCountdown(2)
      let count = 1
      const tick = setInterval(() => {
        count--
        setAutoNextCountdown(count)
        if (count <= 0) {
          clearInterval(tick)
          setAutoNextCountdown(0)
          if (zoneIndex < ZONES.length - 1) setZoneIndex(zi => zi + 1)
          else setIsDone(true)
        }
      }, 750)
      autoNextTimerRef.current = tick
    }
    scanner.setZone(currentZone)
    scanner.startMatching()
    return () => { scannerRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneIndex])

  // 구역 넘어갈 때 rAF 재시작
  useEffect(() => {
    if (zoneIndex === 0) return
    const video = videoRef.current
    if (video && video.readyState >= 2) startARLoop(arCanvasRef.current, video)
  }, [zoneIndex])

  async function handleCapture() {
    if (!scannerRef.current || !canCapture || isCapturing) return
    setIsCapturing(true); setCanCapture(false)
    isCapturingRef.current = true
    try {
      await scannerRef.current.capture()
    } finally {
      isCapturingRef.current = false
    }
  }
  function handleNext() {
    if (autoNextTimerRef.current) { clearInterval(autoNextTimerRef.current); autoNextTimerRef.current = null }
    setAutoNextCountdown(0)
    if (zoneIndex < ZONES.length - 1) setZoneIndex(zoneIndex + 1)
    else setIsDone(true)
  }
  function handleSkip() {
    if (autoNextTimerRef.current) { clearInterval(autoNextTimerRef.current); autoNextTimerRef.current = null }
    setAutoNextCountdown(0)
    setCaptures(prev => ({ ...prev, [currentZone.id]: { dataUrl: null, boxes: [] } }))
    if (zoneIndex < ZONES.length - 1) setZoneIndex(zoneIndex + 1)
    else setIsDone(true)
  }
  function handleCardClick(i) {
    const newActive = activeCard === i ? null : i
    setActiveCard(newActive)
    if (newActive !== null)
      showHistoryOverlay(history[newActive], videoRef.current, arCanvasRef.current)
    else
      showHistoryOverlay(null, videoRef.current, arCanvasRef.current)
  }

  const totalDefects = Object.values(captures).reduce((a, c) => a + (c.boxes?.length || 0), 0)

  function getInstructionHtml() {
    if (matchStatus === 'captured') {
      const cap   = captures[currentZone?.id]
      const count = cap?.boxes?.length || 0
      return count > 0
        ? `<strong style="color:#ef4444">흠집 ${count}개</strong>가 감지되어 저장되었습니다.`
        : `<strong style="color:#10b981">이상 없음</strong> — 깨끗한 상태입니다.`
    }
    if (matchStatus === 'matched')
      return `<strong style="color:#F7A633">촬영 버튼</strong>을 눌러 흠집을 저장하세요.`
    return currentZone.instruction
  }

  // wheelPosition 기반 위치 클래스 결정
  function getWheelPositionClass() {
    const pos = currentZone.wheelPosition
    if (pos === 'bottom-left')  return styles.wheelBottomLeft
    if (pos === 'bottom-right') return styles.wheelBottomRight
    // 폴백 — wheelSide
    return currentZone.wheelSide === 'left' ? styles.left : styles.right
  }

  // 화살표 방향 (가이드 오버레이에서 바퀴 위치 가리킴)
  function getArrowDirection() {
    const pos = currentZone.wheelPosition || (currentZone.wheelSide === 'left' ? 'bottom-right' : 'bottom-left')
    return pos === 'bottom-left' ? 'Left' : 'Right'
  }

  // ── 완료 화면
  if (isDone) return (
    <div className={styles.page} style={{ overflowY: 'auto' }}>

      {/* 이미지 확대 모달 */}
      {modalImg && (
        <div className={styles.imgModal} onClick={() => setModalImg(null)}>
          <div className={styles.imgModalBox} onClick={e => e.stopPropagation()}>
            <button className={styles.imgModalClose} onClick={() => setModalImg(null)}>✕</button>
            <img src={modalImg} alt="원본" className={styles.imgModalImg} />
          </div>
        </div>
      )}

      <div className={styles.summary}>
        <div className={styles.summaryHero}>
          <div className={styles.summaryCheck}>✓</div>
          <div className={styles.summaryHeroTitle}>스캔 완료</div>
          <div className={styles.summaryHeroSub}>모든 구역이 안전하게 기록되었습니다</div>
        </div>

        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>감지된 흠집</div>
            <div className={`${styles.statValue} ${styles.statValueDefect}`}>{totalDefects}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>스캔 구역</div>
            <div className={`${styles.statValue} ${styles.statValueSafe}`}>{ZONES.length}</div>
          </div>
        </div>

        {ZONES.map(z => {
          const cap       = captures[z.id]
          const boxes     = cap?.boxes || []
          const hasDefect = boxes.length > 0
          if (!hasDefect) return null
          return (
            <div key={z.id} className={styles.summaryZoneCard}>
              <div className={styles.summaryZoneHeader}>
                <span className={styles.summaryZoneName}>{z.label}</span>
                <span className={styles.summaryZoneCount}>흠집 {boxes.length}개</span>
              </div>
              <div className={styles.summaryZoneScroll}>
                {boxes.map((box, i) => {
                  const src     = box.cropS3Url || cap?.dataUrl || null
                  const fullSrc = box.originalS3Url || cap?.dataUrl || src
                  return src
                    ? <img
                        key={i} src={src} alt={`흠집 ${i + 1}`}
                        className={styles.summaryCropImg}
                        onClick={() => setModalImg(fullSrc)}
                      />
                    : <div key={i} className={styles.summaryCropImgEmpty}>
                        <span style={{fontSize:11,color:'#bbb'}}>이미지 없음</span>
                      </div>
                })}
              </div>
            </div>
          )
        })}

        {totalDefects === 0 && (
          <div className={styles.summaryAllClear}>
            <span style={{ fontSize: 32 }}>🎉</span>
            <p>모든 구역에서 흠집이 발견되지 않았어요!</p>
          </div>
        )}

        <button className={styles.btnDone} onClick={() => {
          const cracks = ZONES
            .filter(z => captures[z.id]?.boxes?.length > 0)
            .map(z => ({
              side: z.id,
              label: z.label,
              count: captures[z.id].boxes.length,
              crops: captures[z.id].boxes.map(b => b.cropS3Url).filter(Boolean),
            }))
          navigate('/car-report', {
            state: { reservation: location.state?.reservation, scanResult: { cracks, totalDefects }, logType }
          })
        }}>
          리포트 확인
        </button>
      </div>
    </div>
  )

  const arrowDir = getArrowDirection()

  // ── 스캔 화면
  return (
    <div className={styles.page}>

      <div className={styles.cameraWrap}>
        <video ref={videoRef} className={styles.video} playsInline muted />
        <canvas ref={arCanvasRef} className={styles.overlay} style={{ zIndex: 1 }} />
        <canvas ref={canvasRef}   className={styles.overlay} style={{ zIndex: 2 }} />
        <div className={styles.scanLine} />

        <div className={styles.header}>
          <img src={careLogo} alt="CAre" className={styles.headerLogo} />
          <span className={styles.headerStep}>{zoneIndex + 1} / {ZONES.length}</span>
        </div>

        <div className={`${styles.saveToast} ${showToast ? styles.visible : ''}`}>
          ✓ 흠집이 저장되었습니다
        </div>

        {/* ── 바퀴 가이드 멘트 오버레이 */}
        {currentZone.type === 'wheel' && showGuideOverlay && (
          <div className={`${styles.guideOverlay} ${overlayHidden ? styles.hidden : ''}`}>
            <div className={styles.guideOverlayInner}>

              {/* 바퀴 아이콘 */}
              <div className={styles.guideOverlayIcon}>
                <svg className={styles.guideOverlayIconSvg} viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="17" stroke="rgba(247,166,51,0.9)" strokeWidth="2"/>
                  <circle cx="20" cy="20" r="6"  stroke="rgba(247,166,51,0.9)" strokeWidth="1.5"/>
                  <line x1="20" y1="3"  x2="20" y2="37" stroke="rgba(247,166,51,0.5)" strokeWidth="1"/>
                  <line x1="3"  y1="20" x2="37" y2="20" stroke="rgba(247,166,51,0.5)" strokeWidth="1"/>
                  <line x1="7"  y1="7"  x2="33" y2="33" stroke="rgba(247,166,51,0.3)" strokeWidth="1"/>
                  <line x1="33" y1="7"  x2="7"  y2="33" stroke="rgba(247,166,51,0.3)" strokeWidth="1"/>
                </svg>
              </div>

              <div className={styles.guideOverlayTitle}>{currentZone.label}를<br/>가이드에 맞춰주세요</div>
              <div className={styles.guideOverlaySubtitle}>원형 가이드 안에 바퀴를 위치시키면<br/>자동으로 흠집 탐지가 시작됩니다</div>

              {/* 방향 화살표 */}
              <div className={`${styles.guideOverlayArrow} ${styles[`guideOverlayArrow${arrowDir}`]}`}>
                <div className={styles.guideOverlayArrowLine} />
                <div className={styles.guideOverlayArrowHead} />
              </div>

            </div>
          </div>
        )}

        {/* 흠집 탐지 시작 토스트 */}
        <div className={`${styles.scanStartToast} ${showScanStartToast ? styles.visible : ''}`}>
          🔍 흠집 탐지 시작
        </div>

        {currentZone.type === 'plate' && matchStatus !== 'captured' && (
          <div className={`${styles.guidePlate} ${styles[matchStatus] || styles.detecting}`}>
            <div className={styles.guidePlateInner}>
              <div className={`${styles.plateCorner} ${styles.tl}`} />
              <div className={`${styles.plateCorner} ${styles.tr}`} />
              <div className={`${styles.plateCorner} ${styles.bl}`} />
              <div className={`${styles.plateCorner} ${styles.br}`} />
              <span className={styles.plateHint}>번호판</span>
            </div>
          </div>
        )}

        {currentZone.type === 'hood' && matchStatus !== 'captured' && (
          <div className={`${styles.guideHood} ${matchStatus === 'matched' ? styles.matched : styles.detecting}`}>
            <div className={styles.hoodBorder} />
            <div className={`${styles.hoodCorner} ${styles.tl}`} />
            <div className={`${styles.hoodCorner} ${styles.tr}`} />
            <div className={`${styles.hoodCorner} ${styles.bl}`} />
            <div className={`${styles.hoodCorner} ${styles.br}`} />
            <span className={styles.hoodHint}>{currentZone.label}</span>
          </div>
        )}

        {currentZone.type === 'wheel' && matchStatus !== 'captured' && (
          <div className={`${styles.guideWheel} ${getWheelPositionClass()} ${styles[matchStatus] || styles.detecting}`}>
            <div className={styles.wheelCircle}>
              <div className={styles.wheelSpokes} />
              <div className={styles.wheelHub} />
            </div>
            <div
              className={styles.wheelProgress}
              ref={currentZone.wheelSide === 'left' ? wheelLRef : wheelRRef}
            >
              <svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" /></svg>
            </div>
          </div>
        )}

        <div className={styles.stepbar}>
          {ZONES.map((z, i) => {
            const cap = captures[z.id]
            let cls = ''
            if (i < zoneIndex && cap) cls = (cap.boxes?.length > 0) ? styles.defect : styles.done
            else if (i === zoneIndex) cls = styles.active
            return (
              <div key={z.id} className={`${styles.step} ${cls}`}>
                <div className={styles.stepTrack} />
              </div>
            )
          })}
        </div>

        <div className={styles.zoneNameBar}>
          <span className={styles.zoneName}>{currentZone.name}</span>
        </div>
      </div>

      <div className={styles.matchProgress}>
        <div className={styles.matchFill} style={{ width: `${matchValue}%` }} />
      </div>

      <div className={styles.instruction}>
        <div className={styles.instructionIcon}>{currentZone.icon}</div>
        <div className={styles.instructionText} dangerouslySetInnerHTML={{ __html: getInstructionHtml() }} />
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSkip} onClick={handleSkip}>건너뛰기</button>
        {matchStatus !== 'captured' ? (
          <button className={styles.btnCapture} onClick={handleCapture} disabled={!canCapture || isCapturing}>
            {isCapturing ? '분석 중...' : canCapture ? '📷 촬영' : '인식 중...'}
          </button>
        ) : (
          <button className={styles.btnNext} onClick={handleNext}>
            {autoNextCountdown > 0
              ? `${autoNextCountdown}초 후 자동 이동...`
              : (zoneIndex < ZONES.length - 1 ? '다음 구역 →' : '스캔 완료 →')
            }
          </button>
        )}
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <span className={styles.historyTitle}>이 구역의 흠집 기록</span>
          {history.length > 0
            ? <span className={styles.historyCount}>{history.length}건</span>
            : <span className={styles.historyCountNone}>기록 없음</span>
          }
        </div>
        <div className={styles.historyScroll}>
          {history.length === 0
            ? <div className={styles.historyEmpty}>이 구역의 이전 흠집 기록이 없어요</div>
            : history.map((h, i) => (
                <div
                  key={i}
                  className={`${styles.historyCard} ${activeCard === i ? styles.active : ''}`}
                  onClick={() => handleCardClick(i)}
                >
                  <img src={h.cropS3Url} className={styles.historyCardImg} alt="흠집" />
                  <div className={styles.historyCardInfo}>
                    <div className={styles.historyCardDate}>
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </div>
                    <div className={styles.historyCardCount}>흠집 감지됨</div>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}