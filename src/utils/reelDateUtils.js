import {
  endOfDay,
  endOfISOWeek,
  format,
  isWithinInterval,
  parse,
  setISOWeek,
  startOfDay,
  startOfISOWeek
} from 'date-fns';

/**
 * Parse backend outDate string: "dd/MM/yy HH:mm" e.g. "13/02/26 13:30"
 */
export const parseOutDate = (outDateStr) => {
  if (!outDateStr || typeof outDateStr !== 'string') return null;
  const trimmed = outDateStr.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);
  year += year <= 50 ? 2000 : 1900;
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const d = new Date(year, month, day, hour, minute, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isSameCalendarDay = (date, dayYmd) => {
  if (!date || !dayYmd) return false;
  const d = typeof dayYmd === 'string' ? parse(dayYmd, 'yyyy-MM-dd', new Date()) : dayYmd;
  return format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
};

/** Financial year (India): April → March. fyValue e.g. "2025" = FY 2025-26 from 2025-04-01 to 2026-03-31 */
export const getFinancialYearRange = (startYear) => {
  const y = parseInt(String(startYear), 10);
  const start = new Date(y, 3, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, label: `FY ${y}-${String(y + 1).slice(-2)}` };
};

export const listFinancialYearOptions = (yearsBack = 6) => {
  const now = new Date();
  const currentStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const opts = [];
  for (let i = 0; i < yearsBack; i++) {
    const y = currentStart - i;
    const { label } = getFinancialYearRange(y);
    opts.push({ value: String(y), label });
  }
  return opts;
};

export const reelWasOutDuring = (reel, rangeStart, rangeEnd) => {
  const out = parseOutDate(reel.outDate);
  if (!out) return false;
  return isWithinInterval(out, {
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd)
  });
};

export const getWeekRangeFromIsoWeek = (weekValue) => {
  if (!weekValue) return null;
  const m = String(weekValue).match(/^(\d{4})-W(\d{1,2})$/i);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  if (!year || !week) return null;
  const jan4 = new Date(year, 0, 4);
  const inWeek = setISOWeek(jan4, week);
  return {
    start: startOfISOWeek(inWeek),
    end: endOfISOWeek(inWeek)
  };
};

export const parseYmd = (ymd) => {
  if (!ymd) return null;
  const d = parse(ymd, 'yyyy-MM-dd', new Date());
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Normalize reel "entry" date field to yyyy-MM-dd for comparisons.
 * Accepts yyyy-MM-dd (from date inputs) or dd/MM/yyyy, dd/MM/yy (legacy / manual).
 */
export const toEntryDateYmd = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = parse(s, 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? null : format(d, 'yyyy-MM-dd');
  }
  const slashFormats = ['dd/MM/yyyy', 'dd/MM/yy', 'd/M/yyyy', 'd/M/yy'];
  for (const fmt of slashFormats) {
    const d = parse(s, fmt, new Date());
    if (!Number.isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
  }
  return null;
};

/** True if reel entry date is the same calendar day as dayYmd (yyyy-MM-dd). */
export const isEntryDateSameCalendarDay = (reelDateStr, dayYmd) => {
  const ymd = toEntryDateYmd(reelDateStr);
  return Boolean(ymd && dayYmd && ymd === dayYmd);
};

/** True if reel entry `date` (normalized) falls within the inclusive calendar range. */
export const reelEntryReceivedDuring = (reel, rangeStart, rangeEnd) => {
  const ymd = toEntryDateYmd(reel.date);
  if (!ymd) return false;
  const d = parse(ymd, 'yyyy-MM-dd', new Date());
  if (Number.isNaN(d.getTime())) return false;
  return isWithinInterval(d, {
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd)
  });
};

export const formatDisplayDateTime = (date) => {
  if (!date) return '—';
  return format(date, 'dd/MM/yy HH:mm');
};
