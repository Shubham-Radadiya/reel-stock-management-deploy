import {
  endOfMonth,
  endOfYear,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfMonth,
  startOfYear
} from 'date-fns';
import { getWeekRangeFromIsoWeek, reelWasOutDuring } from './reelDateUtils';

export const normChartKey = (value) => String(value ?? '').trim();

export const comboLabel = (size, gsm) => `Size ${size} · GSM ${gsm}`;

const sortByCountThenLabel = (a, b) => {
  if (b.count !== a.count) return b.count - a.count;
  return a.label.localeCompare(b.label, undefined, { numeric: true });
};

const finalizeChartRows = (map) => {
  const rows = [...map.values()].sort(sortByCountThenLabel);
  const totalOut = rows.reduce((s, r) => s + r.count, 0);
  const maxCount = rows.length ? rows[0].count : 0;
  return { rows, maxCount, totalOut };
};

/**
 * Check-outs in range grouped by a single field (size or gsm).
 * Each reel is counted once under its size or GSM value.
 */
export const buildReelChartByDimension = (reels, rangeStart, rangeEnd, field) => {
  const map = new Map();

  reels.forEach((reel) => {
    if (!reelWasOutDuring(reel, rangeStart, rangeEnd)) return;
    const value = normChartKey(reel[field]);
    if (!value) return;

    const key = value;
    const label = field === 'size' ? `Size ${value}` : `GSM ${value}`;
    const prev = map.get(key) || { key, label, value, count: 0, reelNos: [] };
    prev.count += 1;
    if (reel.reelNo) prev.reelNos.push(String(reel.reelNo));
    map.set(key, prev);
  });

  return finalizeChartRows(map);
};

/** All check-outs in period (denominator for share % on every view). */
export const countCheckoutsInPeriod = (reels, rangeStart, rangeEnd) =>
  reels.filter((reel) => reelWasOutDuring(reel, rangeStart, rangeEnd)).length;

/** Take top N rows (already sorted by count). No "Other" bucket. */
export const limitChartRows = (rows, topN) => {
  const n = Math.max(1, Math.min(500, parseInt(topN, 10) || 25));
  return rows.slice(0, n);
};

/** Size, GSM, and Size+GSM analytics for one period (single pass over reels). */
export const buildReelChartAnalytics = (reels, rangeStart, rangeEnd) => {
  const sizeMap = new Map();
  const gsmMap = new Map();
  const comboMap = new Map();
  let totalOut = 0;

  reels.forEach((reel) => {
    if (!reelWasOutDuring(reel, rangeStart, rangeEnd)) return;
    totalOut += 1;

    const size = normChartKey(reel.size);
    const gsm = normChartKey(reel.gsm);
    const reelNo = reel.reelNo ? String(reel.reelNo) : '';

    if (size) {
      const prevSize = sizeMap.get(size) || {
        key: size,
        label: `Size ${size}`,
        value: size,
        count: 0,
        reelNos: []
      };
      prevSize.count += 1;
      if (reelNo) prevSize.reelNos.push(reelNo);
      sizeMap.set(size, prevSize);
    }

    if (gsm) {
      const prevGsm = gsmMap.get(gsm) || {
        key: gsm,
        label: `GSM ${gsm}`,
        value: gsm,
        count: 0,
        reelNos: []
      };
      prevGsm.count += 1;
      if (reelNo) prevGsm.reelNos.push(reelNo);
      gsmMap.set(gsm, prevGsm);
    }

    if (size && gsm) {
      const comboKey = `${size}|${gsm}`;
      const prevCombo = comboMap.get(comboKey) || {
        key: comboKey,
        label: comboLabel(size, gsm),
        size,
        gsm,
        count: 0,
        reelNos: []
      };
      prevCombo.count += 1;
      if (reelNo) prevCombo.reelNos.push(reelNo);
      comboMap.set(comboKey, prevCombo);
    }
  });

  return {
    sizeData: finalizeChartRows(sizeMap),
    gsmData: finalizeChartRows(gsmMap),
    comboData: finalizeChartRows(comboMap),
    totalOut
  };
};

/** Resolve { start, end, label } for weekly / monthly / yearly + picker value. */
export const getReelChartPeriodRange = (periodType, pickerValue) => {
  const now = new Date();

  if (periodType === 'weekly') {
    const weekVal =
      pickerValue ||
      `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
    const r = getWeekRangeFromIsoWeek(weekVal);
    if (!r) return null;
    return {
      start: r.start,
      end: r.end,
      label: `${format(r.start, 'dd MMM')} – ${format(r.end, 'dd MMM yyyy')}`
    };
  }

  if (periodType === 'monthly') {
    const monthVal = pickerValue || format(now, 'yyyy-MM');
    const d = startOfMonth(new Date(`${monthVal}-01T12:00:00`));
    if (Number.isNaN(d.getTime())) return null;
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    return {
      start,
      end,
      label: format(d, 'MMMM yyyy')
    };
  }

  if (periodType === 'yearly') {
    const y = parseInt(pickerValue || String(now.getFullYear()), 10);
    if (!Number.isFinite(y)) return null;
    const start = startOfYear(new Date(y, 0, 1));
    const end = endOfYear(new Date(y, 0, 1));
    return {
      start,
      end,
      label: String(y)
    };
  }

  return null;
};

/**
 * Count reels checked out (outDate) within range, grouped by Size + GSM.
 * Returns rows sorted by count descending.
 */
export const buildReelChartData = (reels, rangeStart, rangeEnd) => {
  const map = new Map();

  reels.forEach((reel) => {
    if (!reelWasOutDuring(reel, rangeStart, rangeEnd)) return;
    const size = normChartKey(reel.size);
    const gsm = normChartKey(reel.gsm);
    if (!size || !gsm) return;
    const key = `${size}|${gsm}`;
    const prev = map.get(key) || {
      key,
      label: comboLabel(size, gsm),
      size,
      gsm,
      count: 0,
      reelNos: []
    };
    prev.count += 1;
    if (reel.reelNo) prev.reelNos.push(String(reel.reelNo));
    map.set(key, prev);
  });

  return finalizeChartRows(map);
};
