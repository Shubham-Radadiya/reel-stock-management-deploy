export const normStockKey = (value) => String(value ?? '').trim();

export const stockKey = (size, gsm) => `${normStockKey(size)}|${normStockKey(gsm)}`;

/** Count in-stock reels (not checked out) grouped by size + GSM. */
export const countInStockBySizeGsm = (reels) => {
  const map = new Map();
  reels
    .filter((r) => !r.isCheckedOut)
    .forEach((r) => {
      const key = stockKey(r.size, r.gsm);
      if (!key || key === '|') return;
      map.set(key, (map.get(key) || 0) + 1);
    });
  return map;
};

export const buildStockMinimumStatus = (reels, minimums) => {
  const counts = countInStockBySizeGsm(reels);
  return (minimums || [])
    .map((rule) => {
      const size = normStockKey(rule.size);
      const gsm = normStockKey(rule.gsm);
      const key = stockKey(size, gsm);
      const current = counts.get(key) || 0;
      const minReels = Number(rule.minReels) || 0;
      return {
        id: rule.id,
        size,
        gsm,
        minReels,
        current,
        shortfall: Math.max(0, minReels - current),
        isLow: current < minReels
      };
    })
    .sort((a, b) => {
      if (a.isLow !== b.isLow) return a.isLow ? -1 : 1;
      return (
        a.size.localeCompare(b.size, undefined, { numeric: true }) ||
        a.gsm.localeCompare(b.gsm, undefined, { numeric: true })
      );
    });
};

export const getLowStockItems = (reels, minimums) =>
  buildStockMinimumStatus(reels, minimums).filter((item) => item.isLow);

/** In-stock reels matching a Size + GSM rule (for report detail). */
export const getInStockReelsForRule = (reels, size, gsm) =>
  reels.filter(
    (r) =>
      !r.isCheckedOut &&
      normStockKey(r.size) === normStockKey(size) &&
      normStockKey(r.gsm) === normStockKey(gsm)
  );
