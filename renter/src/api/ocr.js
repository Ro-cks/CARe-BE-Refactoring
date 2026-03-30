const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL ?? 'http://localhost:8000'

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * 여권 이미지 OCR 추출
 * @param {string} imageDataUrl - base64 data URL
 * @returns {Promise<{passport_no, surname, given_names, nationality, date_of_birth, sex, place_of_birth, date_of_issue, date_of_expiry, mrz}>}
 */
export async function ocrPassport(imageDataUrl) {
  const formData = new FormData()
  formData.append('image', dataUrlToBlob(imageDataUrl), 'passport.jpg')

  const res = await fetch(`${AI_BASE_URL}/api/v1/ocr/passport`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '여권 OCR 요청 실패')
  }

  return res.json()
}

/**
 * 국제운전면허증 이미지 OCR 추출
 * @param {string} imageDataUrl - base64 data URL
 * @returns {Promise<{license_number, name, date_of_birth, address, date_of_expiry, date_of_issue, sex}>}
 */
export async function ocrLicense(imageDataUrl) {
  const formData = new FormData()
  formData.append('image', dataUrlToBlob(imageDataUrl), 'license.jpg')

  const res = await fetch(`${AI_BASE_URL}/api/v1/ocr/license`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '면허증 OCR 요청 실패')
  }

  return res.json()
}
