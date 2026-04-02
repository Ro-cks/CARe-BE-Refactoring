export const parseReason = (reason, t) => {
  if (!reason) return '';
  
  if (reason === 'SYS_REASON:NEW_SCRATCH') {
    return t('dispute.reasonNewScratch');
  }
  
  if (reason.startsWith('SYS_REASON:LOW_SIMILARITY:')) {
    const parts = reason.split(':');
    const percent = parts[2] || '0';
    return t('dispute.reasonLowSimilarity', { percent });
  }
  
  return reason;
};
