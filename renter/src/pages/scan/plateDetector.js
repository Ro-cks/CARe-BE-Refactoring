// ─────────────────────────────────────────────────────────────
//  plateDetector.js  —  번호판 탐지 + 가이드박스 overlap 계산
// ─────────────────────────────────────────────────────────────

import { pipeline } from '@huggingface/transformers'

let detector = null
let isLoading = false

/**
 * 모델 로드 (최초 1회만)
 */
export async function loadPlateDetector() {
  if (detector)  return detector
  if (isLoading) return null
  isLoading = true
  try {
    detector = await pipeline(
      'object-detection',
      'Xenova/yolos-small',
      { dtype: 'q8' }
    )
    console.log('[PlateDetector] 모델 로드 완료')
  } catch (err) {
    console.warn('[PlateDetector] 모델 로드 실패:', err)
    detector = null
  }
  isLoading = false
  return detector
}

/**
 * 프레임에서 번호판 탐지
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<Array<{x, y, w, h, score}>>}
 */
export async function detectPlate(videoEl) {
  if (!detector) return []

  try {
    // 320x240 으로 줄여서 빠르게
    const snap = document.createElement('canvas')
    snap.width  = 320
    snap.height = 240
    snap.getContext('2d').drawImage(videoEl, 0, 0, 320, 240)
    const dataUrl = snap.toDataURL('image/jpeg', 0.6)

    const results = await detector(dataUrl, { threshold: 0.5 })

    // 원본 video 크기로 스케일 보정
    const scaleX = videoEl.videoWidth  / 320
    const scaleY = videoEl.videoHeight / 240

    return results.map(r => ({
      x:     r.box.xmin * scaleX,
      y:     r.box.ymin * scaleY,
      w:     (r.box.xmax - r.box.xmin) * scaleX,
      h:     (r.box.ymax - r.box.ymin) * scaleY,
      score: r.score,
    }))
  } catch (err) {
    console.warn('[PlateDetector] 탐지 실패:', err)
    return []
  }
}

/**
 * 번호판 bbox가 가이드박스 안에 충분히 들어왔는지 판단
 * @param {Object} plate   - { x, y, w, h } 번호판 (video 픽셀 기준)
 * @param {Object} guide   - { x, y, w, h } 가이드박스 (video 픽셀 기준)
 * @param {number} threshold - overlap 비율 기준 (0~1, 기본 0.6)
 */
export function isPlateInGuide(plate, guide, threshold = 0.6) {
  // 교차 영역 계산
  const ix1 = Math.max(plate.x, guide.x)
  const iy1 = Math.max(plate.y, guide.y)
  const ix2 = Math.min(plate.x + plate.w, guide.x + guide.w)
  const iy2 = Math.min(plate.y + plate.h, guide.y + guide.h)

  if (ix2 <= ix1 || iy2 <= iy1) return false

  const intersection = (ix2 - ix1) * (iy2 - iy1)
  const plateArea    = plate.w * plate.h

  // 번호판 면적 대비 교차 비율
  return (intersection / plateArea) >= threshold
}

/**
 * 가이드박스를 video 픽셀 좌표로 변환
 * (CSS % 기준 → video 픽셀 기준)
 * @param {HTMLVideoElement} videoEl
 */
export function getGuideBoxInVideoCoords(videoEl) {
  const vw = videoEl.videoWidth  || 1280
  const vh = videoEl.videoHeight || 720

  // 가이드박스: 화면 중앙, 번호판 비율(4.7:1) 기준
  // ScanPage에서 guidePlate는 left:50% top:55% width:200px height:43px (CSS 기준)
  // video 좌표로 환산 (카메라 뷰 440px 기준)
  const viewW = 440
  const viewH = viewW * (3 / 4)  // aspect-ratio 4:3

  const guideW = 200
  const guideH = 43
  const guideX = (viewW - guideW) / 2
  const guideY = viewH * 0.55 - guideH / 2

  return {
    x: (guideX / viewW) * vw,
    y: (guideY / viewH) * vh,
    w: (guideW / viewW) * vw,
    h: (guideH / viewH) * vh,
  }
}