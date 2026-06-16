/** Parse SR No as integer for sequencing (non-numeric values treated as 0). */
export const parseSrNoNumber = (srNo) => {
  const n = parseInt(String(srNo ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Next SR No = max(existing numeric SR Nos) + 1. */
export const getNextSrNo = (reels) => {
  const max = (reels || []).reduce((m, r) => Math.max(m, parseSrNoNumber(r.srNo)), 0);
  return String(max + 1);
};
