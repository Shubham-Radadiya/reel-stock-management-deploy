import * as XLSX from 'xlsx';
import { format, isValid } from 'date-fns';
import { toEntryDateYmd } from './reelDateUtils';

const FIELD_ALIASES = {
  date: ['date', 'entry date', 'entrydate', 'dt'],
  srNo: ['sr no', 'srno', 'sr', 'sr number'],
  reelNo: ['reel no', 'reelno', 'reel', 'reel number'],
  shade: ['shade', 'sh'],
  bf: ['bf'],
  gsm: ['gsm'],
  size: ['size', 'sz'],
  weight: ['weight', 'wt', 'wt kg', 'weight kg']
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

const rowToReelPayload = (row, colIndex, rowNum) => {
  const srNo = String(cellStr(row, colIndex.srNo)).trim();
  const reelNo = String(cellStr(row, colIndex.reelNo)).trim();
  const errors = [];

  if (!srNo) errors.push('SR No is required');
  if (!reelNo) errors.push('Reel No is required');

  const dateRaw = colIndex.date != null ? cellStr(row, colIndex.date) : '';
  const payload = {
    date: normalizeExcelDate(dateRaw),
    srNo,
    reelNo,
    shade: String(cellStr(row, colIndex.shade)).trim(),
    bf: String(cellStr(row, colIndex.bf)).trim(),
    gsm: String(cellStr(row, colIndex.gsm)).trim(),
    size: String(cellStr(row, colIndex.size)).trim(),
    weight: String(cellStr(row, colIndex.weight)).trim()
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
        'Missing required columns. Use headers: Date, SR No, Reel No, Shade, BF, GSM, Size, Weight.'
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
    ['Date', 'SR No', 'Reel No', 'Shade', 'BF', 'GSM', 'Size', 'Weight'],
    ['10/04/2026', '5', '22365', 'N', '16', '100', '46', '466']
  ]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 6 },
    { wch: 6 },
    { wch: 8 },
    { wch: 8 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reels');
  XLSX.writeFile(wb, 'reel-import-template.xlsx');
};
