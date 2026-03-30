// ─────────────────────────────────────────────────────────────
//  overlay.js  —  canvas bbox 드로잉
//  개선: lerp 보간 + 페이드아웃 + rAF + 히스토리 AR 오버레이
// ─────────────────────────────────────────────────────────────

// ── 촬영 완료 후 고정 박스
export function drawBoxes(canvasEl, videoEl, boxes) {
  const ctx = canvasEl.getContext('2d')
  canvasEl.width  = videoEl.videoWidth  || 1280
  canvasEl.height = videoEl.videoHeight || 720
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)

  for (const box of boxes) {
    const { x, y, w, h, label, score } = box

    // ✅ drawBoxes는 촬영 후 고정 박스 — 스케일 변환 적용
    const scaleX = canvasEl.width  / 640
    const scaleY = canvasEl.height / 360
    const sx = x * scaleX, sy = y * scaleY
    const sw = w * scaleX, sh = h * scaleY

    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth   = 2
    ctx.strokeRect(sx, sy, sw, sh)

    const tag   = `${label} ${Math.round((score || 1) * 100)}%`
    ctx.font    = 'bold 12px Pretendard, sans-serif'
    const textW = ctx.measureText(tag).width
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(sx, sy - 22, textW + 10, 22)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(tag, sx + 5, sy - 6)

    const cSize = 10
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = 2
    ;[[sx, sy, 1, 1], [sx+sw, sy, -1, 1], [sx, sy+sh, 1, -1], [sx+sw, sy+sh, -1, -1]]
      .forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath()
        ctx.moveTo(cx + dx * cSize, cy)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx, cy + dy * cSize)
        ctx.stroke()
      })
  }
}

export function clearOverlay(canvasEl) {
  if (!canvasEl) return
  const ctx = canvasEl.getContext('2d')
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
}


// ─────────────────────────────────────────────────────────────
//  AR 실시간 박스 — lerp 보간 + 페이드아웃 + rAF
// ─────────────────────────────────────────────────────────────

let targetBoxes   = []
let currentBoxes  = []
let boxOpacity    = 1
let fadeStartTime = null        // ✅ setInterval 제거 → timestamp 기반
let rafId         = null
let isRunning     = false
let canvasSize    = { w: 1280, h: 720 }  // ✅ 선언 + 기본값

// ── 히스토리 AR 오버레이 상태
let historyOverlay = null
let historyFadeDir = 0   // 1: 페이드인, -1: 페이드아웃, 0: 정지

const FADE_DELAY_MS    = 1200
const FADE_DURATION_MS = 400

function lerp(a, b, t) { return a + (b - a) * t }

// ✅ 박스 받을 때 스케일 변환 (640×360 → 캔버스 실제 크기)
export function updateARBoxes(boxes, sourceW = 640, sourceH = 360) {
  if (!boxes || boxes.length === 0) return

  const scaleX = canvasSize.w / sourceW
  const scaleY = canvasSize.h / sourceH

  const scaled = boxes.map(b => ({
    ...b,
    x: b.x * scaleX,
    y: b.y * scaleY,
    w: b.w * scaleX,
    h: b.h * scaleY,
  }))

  targetBoxes   = scaled
  boxOpacity    = 1
  fadeStartTime = null
}

// ✅ 거리 기반 매칭 — label 중복 문제 해결
function centerDist(a, b) {
  return Math.hypot(
    (a.x + a.w / 2) - (b.x + b.w / 2),
    (a.y + a.h / 2) - (b.y + b.h / 2)
  )
}

function interpolateBoxes() {
  if (targetBoxes.length === 0) return
  if (currentBoxes.length !== targetBoxes.length) {
    currentBoxes = targetBoxes.map(b => ({ ...b }))
    return
  }

  const used = new Set()
  currentBoxes = currentBoxes.map(cur => {
    let best = null, bestDist = Infinity
    targetBoxes.forEach((tgt, i) => {
      if (used.has(i)) return
      const d = centerDist(cur, tgt)
      if (d < bestDist) { bestDist = d; best = i }
    })
    if (best === null) return cur
    used.add(best)
    const tgt = targetBoxes[best]
    return {
      ...tgt,
      x: lerp(cur.x, tgt.x, 0.25),
      y: lerp(cur.y, tgt.y, 0.25),
      w: lerp(cur.w, tgt.w, 0.25),
      h: lerp(cur.h, tgt.h, 0.25),
    }
  })
}

// ✅ rAF timestamp 기반 페이드
function updateFade(timestamp) {
  if (targetBoxes.length === 0) return
  if (fadeStartTime === null) fadeStartTime = timestamp
  const elapsed = timestamp - fadeStartTime

  if (elapsed < FADE_DELAY_MS) {
    boxOpacity = 1
  } else {
    const t = Math.min(1, (elapsed - FADE_DELAY_MS) / FADE_DURATION_MS)
    boxOpacity = 1 - t
    if (boxOpacity <= 0) {
      boxOpacity    = 0
      targetBoxes   = []
      currentBoxes  = []
      fadeStartTime = null
    }
  }
}

// ✅ 히스토리 페이드도 rAF 루프 안에서 처리
function updateHistoryFade() {
  if (!historyOverlay || historyFadeDir === 0) return
  const STEP = 0.06
  if (historyFadeDir === 1) {
    historyOverlay.opacity = Math.min(1, historyOverlay.opacity + STEP)
    if (historyOverlay.opacity >= 1) historyFadeDir = 0
  } else {
    historyOverlay.opacity = Math.max(0, historyOverlay.opacity - STEP)
    if (historyOverlay.opacity <= 0) {
      historyOverlay = null
      historyFadeDir = 0
    }
  }
}

// ✅ ctx를 파라미터로 받음 — getContext 매 프레임 호출 제거
function renderARFrame(ctx) {
  ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)  // ✅ width 재할당 없이 clearRect만

  // ── 히스토리 AR 오버레이 그리기
  if (historyOverlay && historyOverlay.opacity > 0) {
    const { x, y, w, h, img, opacity } = historyOverlay
    const padding = 20
    const rx = Math.max(0, x - padding)
    const ry = Math.max(0, y - padding)
    const rw = w + padding * 2
    const rh = h + padding * 2

    ctx.save()
    ctx.globalAlpha = opacity * 0.55
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, rx, ry, rw, rh)
    }
    ctx.globalAlpha = opacity
    ctx.strokeStyle = '#F7A633'
    ctx.lineWidth   = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.setLineDash([])

    const cSize = 14
    ctx.strokeStyle = '#F7A633'
    ctx.lineWidth   = 3
    ;[[rx, ry, 1, 1], [rx+rw, ry, -1, 1], [rx, ry+rh, 1, -1], [rx+rw, ry+rh, -1, -1]]
      .forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath()
        ctx.moveTo(cx + dx * cSize, cy)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx, cy + dy * cSize)
        ctx.stroke()
      })

    ctx.font      = 'bold 11px Pretendard, sans-serif'
    ctx.fillStyle = '#F7A633'
    ctx.fillRect(rx, ry - 20, 60, 20)
    ctx.fillStyle = '#fff'
    ctx.fillText('이전 흠집', rx + 5, ry - 5)
    ctx.restore()
  }

  // ── 실시간 AR 박스
  if (currentBoxes.length === 0) return
  ctx.globalAlpha = boxOpacity

  for (const box of currentBoxes) {
    const { x, y, w, h, label } = box
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)'
    ctx.lineWidth   = 2.5
    ctx.strokeRect(x, y, w, h)

    const cSize = 12
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth   = 3
    ;[[x, y, 1, 1], [x+w, y, -1, 1], [x, y+h, 1, -1], [x+w, y+h, -1, -1]]
      .forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath()
        ctx.moveTo(cx + dx * cSize, cy)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx, cy + dy * cSize)
        ctx.stroke()
      })

    const tag   = label || '흠집'
    ctx.font    = 'bold 11px Pretendard, sans-serif'
    const textW = ctx.measureText(tag).width
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)'
    ctx.fillRect(x, y - 20, textW + 10, 20)
    ctx.fillStyle = '#000'
    ctx.fillText(tag, x + 5, y - 5)
  }

  ctx.globalAlpha = 1
}

export function startARLoop(canvasEl, videoEl) {
  if (isRunning) return
  isRunning = true

  const ctx = canvasEl.getContext('2d')

  // ✅ 모바일은 onloadedmetadata 시점에 videoWidth가 0일 수 있음
  // → videoWidth가 실제로 잡힐 때까지 rAF로 재시도
  function initAndStart() {
    if (!isRunning) return

    const w = videoEl.videoWidth
    const h = videoEl.videoHeight

    if (!w || !h) {
      requestAnimationFrame(initAndStart)  // 아직 준비 안 됨 → 다음 프레임 재시도
      return
    }

    canvasEl.width  = w
    canvasEl.height = h
    canvasSize = { w, h }

    function loop(timestamp) {
      if (!isRunning) return
      updateFade(timestamp)
      updateHistoryFade()
      interpolateBoxes()
      renderARFrame(ctx)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  initAndStart()
}

export function stopARLoop() {
  isRunning = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  targetBoxes   = []
  currentBoxes  = []
  boxOpacity    = 1
  fadeStartTime = null
  historyOverlay = null
  historyFadeDir = 0
}

export function drawARBoxes(canvasEl, videoEl, boxes) {
  updateARBoxes(boxes)
}


// ─────────────────────────────────────────────────────────────
//  히스토리 AR 오버레이 — 카드 클릭 시 호출
// ─────────────────────────────────────────────────────────────

export function showHistoryOverlay(scratch, videoEl, canvasEl) {
  if (!scratch) {
    if (historyOverlay) historyFadeDir = -1  // ✅ setInterval 제거 → 플래그만
    return
  }

  const { coordX, coordY, cropS3Url } = scratch

  // ✅ canvasSize 기준으로 스케일링
  const scaleX = canvasSize.w / 1280
  const scaleY = canvasSize.h / 720

  const w = 80 * scaleX
  const h = 60 * scaleY
  const x = (coordX * scaleX) - w / 2
  const y = (coordY * scaleY) - h / 2

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = cropS3Url

  historyOverlay = { x, y, w, h, img, opacity: 0 }
  historyFadeDir = 1  // ✅ rAF 루프가 알아서 페이드인
}