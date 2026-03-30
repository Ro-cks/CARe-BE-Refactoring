/**
 * UUID를 짧은 표시 형식으로 변환합니다.
 * UUID (예: "550e8400-e29b-41d4-a716-446655440000") → "#550E8400"
 * 짧은 ID (예: "RES-2603-01") → 그대로 반환
 */
export const shortId = (id) => {
  if (!id || id === '-') return '-'
  if (id.length === 36 && id.charAt(8) === '-') {
    return '#' + id.slice(0, 8).toUpperCase()
  }
  return id
}

/** 차량 부위 영문 키 → 한글 레이블 */
const CAR_PART_MAP = {
  // 도어
  front_left_door:    '좌측 전방 도어',
  front_right_door:   '우측 전방 도어',
  rear_left_door:     '좌측 후방 도어',
  rear_right_door:    '우측 후방 도어',
  left_door:          '좌측 도어',
  right_door:         '우측 도어',
  // 범퍼
  front_bumper:       '전방 범퍼',
  rear_bumper:        '후방 범퍼',
  // 외장 패널
  hood:               '보닛',
  trunk:              '트렁크',
  roof:               '루프',
  // 펜더
  front_left_fender:  '좌측 전방 펜더',
  front_right_fender: '우측 전방 펜더',
  rear_left_fender:   '좌측 후방 펜더',
  rear_right_fender:  '우측 후방 펜더',
  left_front_fender:  '좌측 전방 펜더',
  right_front_fender: '우측 전방 펜더',
  left_rear_fender:   '좌측 후방 펜더',
  right_rear_fender:  '우측 후방 펜더',
  // 유리
  windshield:         '전면 유리',
  front_windshield:   '전면 유리',
  rear_windshield:    '후면 유리',
  // 사이드 미러
  left_mirror:        '좌측 사이드 미러',
  right_mirror:       '우측 사이드 미러',
  // 휠·타이어
  front_left_wheel:   '좌측 전방 휠',
  front_right_wheel:  '우측 전방 휠',
  rear_left_wheel:    '좌측 후방 휠',
  rear_right_wheel:   '우측 후방 휠',
  // 면 단위
  front:              '전면',
  rear:               '후면',
  left_side:          '좌측면',
  right_side:         '우측면',
  bottom:             '하부',
}

/**
 * 차량 부위 영문명을 한글로 변환합니다.
 * 매핑에 없으면 원본 값을 그대로 반환합니다.
 */
export const carPartLabel = (part) => {
  if (!part) return null
  return CAR_PART_MAP[part.toLowerCase()] ?? part
}
