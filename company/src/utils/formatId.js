import i18n from '../i18n'

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
  // 면/구역 (AI Report Zones)
  'front-left':       '좌측 전방',
  'front_left':       '좌측 전방',
  'front-right':      '우측 전방',
  'front_right':      '우측 전방',
  'rear-left':        '좌측 후방',
  'rear_left':        '좌측 후방',
  'rear-right':       '우측 후방',
  'rear_right':       '우측 후방',
  // 기본 면 단위
  front:              '전면',
  rear:               '후면',
  back:               '후면',
  left:               '좌측',
  right:              '우측',
  left_side:          '좌측면',
  right_side:         '우측면',
  bottom:             '하부',
  interior:           '내부',
}

const CAR_PART_MAP_JA = {
  // 도어
  front_left_door:    '左側前方ドア',
  front_right_door:   '右側前方ドア',
  rear_left_door:     '左側後方ドア',
  rear_right_door:    '右側後方ドア',
  left_door:          '左側ドア',
  right_door:         '右側ドア',
  // 범퍼
  front_bumper:       '前方バンパー',
  rear_bumper:        '後方バンパー',
  // 외장 패널
  hood:               'ボンネット',
  trunk:              'トランク',
  roof:               'ルーフ',
  // 펜더
  front_left_fender:  '左側前方フェンダー',
  front_right_fender: '右側前方フェンダー',
  rear_left_fender:   '左側後方フェンダー',
  rear_right_fender:  '右側後方フェンダー',
  left_front_fender:  '左側前方フェンダー',
  right_front_fender: '右側前方フェンダー',
  left_rear_fender:   '左側後方フェンダー',
  right_rear_fender:  '右側後方フェンダー',
  // 유리
  windshield:         '前面ガラス',
  front_windshield:   '前面ガラス',
  rear_windshield:    '後面ガラス',
  // 사이드 미러
  left_mirror:        '左側サイドミラー',
  right_mirror:       '右側サイドミラー',
  // 휠·타이어
  front_left_wheel:   '左側前方ホイール',
  front_right_wheel:  '右側前方ホイール',
  rear_left_wheel:    '左側後方ホイール',
  rear_right_wheel:   '右側後方ホイール',
  // 면/구역 (AI Report Zones)
  'front-left':       '左側前方',
  'front_left':       '左側前方',
  'front-right':      '右側前方',
  'front_right':      '右側前方',
  'rear-left':        '左側後方',
  'rear_left':        '左側後方',
  'rear-right':       '右側後方',
  'rear_right':       '右側後方',
  // 기본 면 단위
  front:              '前面',
  rear:               '後面',
  back:               '後面',
  left:               '左側',
  right:              '右側',
  left_side:          '左側面',
  right_side:         '右側面',
  bottom:             '下部',
  interior:           '内部',
}

/**
 * 차량 부위 영문명을 한글로 변환합니다.
 * 매핑에 없으면 원본 값을 그대로 반환합니다.
 */
export const carPartLabel = (part) => {
  if (!part) return null
  const isJa = i18n?.language?.startsWith('ja')
  const map = isJa ? CAR_PART_MAP_JA : CAR_PART_MAP
  return map[part.toLowerCase()] ?? part
}
