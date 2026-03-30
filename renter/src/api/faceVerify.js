/**
 * 여권 이미지와 셀피를 비교해 동일인 여부 확인
 * @param {string} passportDataUrl - base64 data URL
 * @param {string} selfieDataUrl - base64 data URL
 * @returns {Promise<{verified: boolean, distance: number}>}
 */
export async function verifyFace(passportDataUrl, selfieDataUrl) {
  const formData = new FormData()
  formData.append('id_photo', dataUrlToBlob(passportDataUrl), 'passport.jpg')
  formData.append('selfie', dataUrlToBlob(selfieDataUrl), 'selfie.jpg')

  const res = await fetch('/ai/api/v1/face/verify', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '얼굴 인증 요청 실패')
  }

  return res.json()
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
