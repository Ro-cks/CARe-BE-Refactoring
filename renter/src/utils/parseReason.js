export const parseReason = (reason) => {
  if (!reason) return '';

  let translated = reason;

  if (translated.includes('SYS_REASON:NEW_SCRATCH')) {
    translated = translated.replace('SYS_REASON:NEW_SCRATCH', '새 흠집 감지');
  }

  if (translated.includes('SYS_REASON:LOW_SIMILARITY:')) {
    const match = translated.match(/SYS_REASON:LOW_SIMILARITY:(\d+(\.\d+)?)/);
    if (match) {
      const percent = match[1];
      translated = translated.replace(match[0], `기존 이미지와 유사도 ${percent}% 다름`);
    }
  }

  return translated;
};
