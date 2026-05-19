import * as XLSX from 'xlsx';
import { format, isValid, parse } from 'date-fns';
import { formatDisplayDateTime, parseOutDate, toEntryDateYmd } from './reelDateUtils';

const FIELD_ALIASES = {
  date: ['date', 'entry date', 'entrydate', 'dt'],
  srNo: ['sr no', 'srno', 'sr', 'sr number'],
  reelNo: ['reel no', 'reelno', 'reel', 'reel number'],
  shade: ['shade', 'sh'],
  bf: ['bf'],
  gsm: ['gsm'],
  size: ['size', 'sz'],
  weight: ['weight', 'wt', 'wt kg', 'weight kg'],
  status: ['status', 'staus', 'stock status', 'in out', 'in/out'],
  outDetails: ['out details', 'outdetails', 'out detail', 'out date', 'outdetails date']
};

const normalizeHeader = (h) =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ');

const mapHeaderRow = (headerCells) => {
  const indices = {};
  const normalized = headerCells.map(normalizeHeader);
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const idx = normalized.findIndex((cell) => aliases.includes(cell));
    if (idx >= 0) indices[field] = idx;
  });
  return indices;
};

const cellStr = (row, idx) => {
  if (idx == null || idx < 0) return '';
  const v = row[idx];
  if (v == null) return '';
  if (v instanceof Date) return v;
  return String(v).trim();
};

export const normalizeExcelDate = (value) => {
  if (value == null || value === '') {
    return format(new Date(), 'yyyy-MM-dd');
  }
  if (value instanceof Date && isValid(value)) {
    return format(value, 'yyyy-MM-dd');
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const d = new Date(parsed.y, parsed.m - 1, parsed.d);
      if (isValid(d)) return format(d, 'yyyy-MM-dd');
    }
  }
  const ymd = toEntryDateYmd(String(value).trim());
  if (ymd) return ymd;
  return format(new Date(), 'yyyy-MM-dd');
};

const parseFlexibleOutDateTime = (value) => {
  if (value == null || value === '') return null;
  if (value instanceof Date && isValid(value)) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const d = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0);
      if (isValid(d)) return d;
    }
  }
  const s = String(value).trim();
  if (!s || /^available$/i.test(s)) return null;
  if (parseOutDate(s)) return parseOutDate(s);
  const patterns = [
    'dd/MM/yy HH:mm',
    'dd/MM/yyyy HH:mm',
    'd/M/yy HH:mm',
    'd/M/yyyy HH:mm',
    'dd/MM/yy',
    'dd/MM/yyyy',
    'd/M/yy',
    'd/M/yyyy'
  ];
  for (const fmt of patterns) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }
  const ymd = toEntryDateYmd(s);
  if (ymd) {
    const d = parse(ymd, 'yyyy-MM-dd', new Date());
    if (isValid(d)) return d;
  }
  return null;
};

const trimCell = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim();

/** TRUE = checked out (tick). FALSE = in stock (unchecked). Case-insensitive (TRUE, true, True, etc.). */
export const normalizeImportStatus = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const s = trimCell(value);
  if (!s) return null;

  if (/^(true|t|yes|y|1|checked|tick|out)$/i.test(s)) {
    return true;
  }
  if (/^(false|f|no|n|0|unchecked|uncheck|in|available|avail)$/i.test(s)) {
    return false;
  }
  return null;
};

export const normalizeImportStatusAndOutDetails = (statusRaw, outDetailsRaw) => {
  const outStr = trimCell(outDetailsRaw);
  const statusParsed = normalizeImportStatus(statusRaw);

  let isCheckedOut;
  if (statusParsed != null) {
    isCheckedOut = statusParsed;
  } else if (outStr && !/^available$/i.test(outStr) && outStr !== '—' && outStr !== '-') {
    isCheckedOut = true;
  } else {
    isCheckedOut = false;
  }

  let outDate = '';
  if (isCheckedOut) {
    const parsed = parseFlexibleOutDateTime(outDetailsRaw);
    if (parsed) {
      outDate = formatDisplayDateTime(parsed);
    } else if (outStr && !/^available$/i.test(outStr)) {
      outDate = outStr;
    } else {
      outDate = formatDisplayDateTime(new Date());
    }
  }

  return { isCheckedOut, outDate };
};

export const importStatusLabel = (isCheckedOut) => (isCheckedOut ? 'TRUE (checked)' : 'FALSE (unchecked)');

export const importOutDetailsLabel = (isCheckedOut, outDate) =>
  isCheckedOut ? outDate || '—' : 'AVAILABLE';

const rowToReelPayload = (row, colIndex, rowNum) => {
  const srNo = String(cellStr(row, colIndex.srNo)).trim();
  const reelNo = String(cellStr(row, colIndex.reelNo)).trim();
  const errors = [];

  if (!srNo) errors.push('SR No is required');
  if (!reelNo) errors.push('Reel No is required');

  const dateRaw = colIndex.date != null ? cellStr(row, colIndex.date) : '';
  const statusRaw =
    colIndex.status != null && colIndex.status >= 0 ? row[colIndex.status] : '';
  const outDetailsRaw = colIndex.outDetails != null ? cellStr(row, colIndex.outDetails) : '';
  const { isCheckedOut, outDate } = normalizeImportStatusAndOutDetails(statusRaw, outDetailsRaw);

  const payload = {
    date: normalizeExcelDate(dateRaw),
    srNo,
    reelNo,
    shade: String(cellStr(row, colIndex.shade)).trim(),
    bf: String(cellStr(row, colIndex.bf)).trim(),
    gsm: String(cellStr(row, colIndex.gsm)).trim(),
    size: String(cellStr(row, colIndex.size)).trim(),
    weight: String(cellStr(row, colIndex.weight)).trim(),
    isCheckedOut,
    outDate
  };

  return { rowNum, payload, errors };
};

const isRowEmpty = (row) =>
  !row ||
  row.every((c) => c == null || String(c).trim() === '');

/**
 * Parse first worksheet. Row 1 = headers. Requires SR No + Reel No columns.
 */
export const parseReelExcelFile = (arrayBuffer) => {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { valid: [], invalid: [], sheetError: 'Workbook has no sheets.' };
  }
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return { valid: [], invalid: [], sheetError: 'Add a header row and at least one data row.' };
  }

  const colIndex = mapHeaderRow(rows[0]);
  if (colIndex.srNo == null || colIndex.reelNo == null) {
    return {
      valid: [],
      invalid: [],
      sheetError:
        'Missing required columns. Use headers: Date, SR No, Reel No, Shade, BF, GSM, Size, Weight, Status, Out Details.'
    };
  }

  const valid = [];
  const invalid = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) continue;
    const rowNum = i + 1;
    const { payload, errors } = rowToReelPayload(row, colIndex, rowNum);
    if (errors.length) {
      invalid.push({ rowNum, errors, preview: payload });
    } else {
      valid.push({ rowNum, payload });
    }
  }

  return { valid, invalid, sheetError: null };
};

export const downloadReelImportTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    [
      'Date',
      'SR No',
      'Reel No',
      'Shade',
      'BF',
      'GSM',
      'Size',
      'Weight',
      'Status',
      'Out Details'
    ],
    ['10/04/2026', '5', '22365', 'N', '16', '100', '46', '466', false, 'AVAILABLE'],
    ['10/04/2026', '6', '22366', 'G', '18', '100', '46', '450', true, '10/04/26 13:14']
  ]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 6 },
    { wch: 6 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 16 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reels');
  XLSX.writeFile(wb, 'reel-import-template.xlsx');
};
