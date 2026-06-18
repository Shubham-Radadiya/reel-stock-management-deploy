import * as XLSX from 'xlsx';
import { format, isValid, parse } from 'date-fns';
import { formatDisplayDateTime, parseOutDate, toEntryDateYmd } from './reelDateUtils';

const FIELD_ALIASES = {
  date: ['date', 'entry date', 'entrydate', 'dt'],
  srNo: ['sr no', 'srno', 'sr no.', 'sr', 'sr number', 's no', 'serial no', 'sno'],
  reelNo: ['reel no', 'reelno', 'reel no.', 'reel', 'reel number', 'reel #', 'reel#'],
  shade: ['shade', 'sh'],
  bf: ['bf'],
  gsm: ['gsm'],
  size: ['size', 'sz'],
  weight: ['weight', 'wt', 'wt kg', 'weight kg'],
  status: ['status', 'staus', 'stock status', 'in out', 'in/out'],
  outDetails: ['out details', 'outdetails', 'out detail', 'out date', 'outdetails date']
};

const REQUIRED_FIELDS = ['srNo', 'reelNo'];

const HEADER_LABELS = {
  date: 'Date',
  srNo: 'SR No',
  reelNo: 'Reel No',
  shade: 'Shade',
  bf: 'BF',
  gsm: 'GSM',
  size: 'Size',
  weight: 'Weight',
  status: 'Status',
  outDetails: 'Out Details'
};

const normalizeHeader = (h) => {
  if (h == null) return '';
  const raw = typeof h === 'object' && h !== null && 'w' in h ? h.w : h;
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/^\uFEFF/, '')
    .replace(/[\u00A0\u2000-\u200D\uFEFF]/g, ' ')
    .replace(/\r\n?/g, '')
    .trim()
    .toLowerCase()
    .replace(/[._#/-]/g, ' ')
    .replace(/\s+/g, ' ');
};

const headerMatchesAlias = (cell, aliases) => {
  const normalized = normalizeHeader(cell);
  if (!normalized) return false;
  const compact = normalized.replace(/\s/g, '');
  return aliases.some((alias) => {
    const aliasCompact = alias.replace(/\s/g, '');
    return normalized === alias || compact === aliasCompact;
  });
};

const mapHeaderRow = (headerCells) => {
  const indices = {};
  const cells = Array.isArray(headerCells) ? headerCells : [];
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const idx = cells.findIndex((cell) => headerMatchesAlias(cell, aliases));
    if (idx >= 0) indices[field] = idx;
  });
  return indices;
};

/** Map columns by keyword when exact alias match fails (e.g. "SR  No", "Reel  No"). */
const mapHeaderRowLoose = (headerCells) => {
  const indices = {};
  const cells = Array.isArray(headerCells) ? headerCells : [];
  cells.forEach((cell, idx) => {
    const t = normalizeHeader(cell);
    if (!t) return;
    if (indices.date == null && (t === 'date' || t.includes('entry date'))) indices.date = idx;
    else if (indices.srNo == null && t.includes('sr')) indices.srNo = idx;
    else if (indices.reelNo == null && t.includes('reel')) indices.reelNo = idx;
    else if (indices.shade == null && (t === 'shade' || t === 'sh')) indices.shade = idx;
    else if (indices.bf == null && t === 'bf') indices.bf = idx;
    else if (indices.gsm == null && t === 'gsm') indices.gsm = idx;
    else if (indices.size == null && (t === 'size' || t === 'sz')) indices.size = idx;
    else if (indices.weight == null && t.includes('weight')) indices.weight = idx;
    else if (indices.status == null && (t === 'status' || t === 'staus')) indices.status = idx;
    else if (
      indices.outDetails == null &&
      t.includes('out') &&
      (t.includes('detail') || t.includes('date'))
    ) {
      indices.outDetails = idx;
    }
  });
  return indices;
};

const rowLooksLikeReelHeader = (cells) => {
  const texts = (cells || []).map((c) => normalizeHeader(c)).filter(Boolean);
  if (!texts.length) return false;
  const hasSr = texts.some((t) => t.includes('sr'));
  const hasReel = texts.some((t) => t.includes('reel'));
  return hasSr && hasReel;
};

const rowLooksLikeReelData = (row) => {
  if (!row || row.length < 3) return false;
  const srNo = String(row[1] ?? '').trim();
  const reelNo = String(row[2] ?? '').trim().replace(/\s/g, '');
  if (!srNo || !reelNo) return false;
  return /^\d{3,7}$/.test(reelNo);
};

const POSITIONAL_COL_INDEX = {
  date: 0,
  srNo: 1,
  reelNo: 2,
  shade: 3,
  bf: 4,
  gsm: 5,
  size: 6,
  weight: 7,
  status: 8,
  outDetails: 9
};

const findLooseHeaderRowIndex = (sheet, rows) => {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i++) {
    const fromSheet = readSheetRow(sheet, i);
    const fromJson = rows[i];
    for (const headerCells of [fromSheet, fromJson].filter((r) => Array.isArray(r) && r.length)) {
      if (!rowLooksLikeReelHeader(headerCells)) continue;
      const colIndex =
        mapHeaderRow(headerCells).srNo != null
          ? mapHeaderRow(headerCells)
          : mapHeaderRowLoose(headerCells);
      if (colIndex.srNo != null && colIndex.reelNo != null) {
        return { headerRowIndex: i, headerCells, colIndex, dataStartIndex: i + 1 };
      }
    }
  }
  return null;
};

const rowLooksLikeBillHeader = (cells) => {
  const texts = (cells || []).map((c) => normalizeHeader(c)).filter(Boolean);
  if (!texts.length) return false;
  return texts.some(
    (t) =>
      t.includes('productid') ||
      t === 'product id' ||
      t === 'qty' ||
      t === 'quantity' ||
      t === 'rate' ||
      t === 'amount'
  );
};

/** Standard 10-column layout when headers are missing but data rows match reel pattern. */
const findPositionalLayout = (sheet, rows) => {
  const limit = Math.min(rows.length, 50);
  for (let i = 0; i < limit; i++) {
    const fromSheet = readSheetRow(sheet, i);
    const dataRow = fromSheet.length >= 3 ? fromSheet : rows[i];
    if (!rowLooksLikeReelData(dataRow)) continue;

    if (i > 0) {
      const prev = readSheetRow(sheet, i - 1).length ? readSheetRow(sheet, i - 1) : rows[i - 1];
      if (rowLooksLikeBillHeader(prev)) continue;
      if (rowLooksLikeReelHeader(prev)) {
        const colIndex =
          mapHeaderRow(prev).srNo != null ? mapHeaderRow(prev) : mapHeaderRowLoose(prev);
        if (colIndex.srNo != null && colIndex.reelNo != null) {
          return { headerRowIndex: i - 1, colIndex, dataStartIndex: i };
        }
      }
    }

    return {
      headerRowIndex: Math.max(0, i - 1),
      colIndex: { ...POSITIONAL_COL_INDEX },
      dataStartIndex: i
    };
  }
  return null;
};

const resolveSheetLayout = (sheet, rows) => {
  return (
    findHeaderRowIndex(sheet, rows) ||
    findLooseHeaderRowIndex(sheet, rows) ||
    findPositionalLayout(sheet, rows)
  );
};

/** Read one sheet row using displayed text (w) when available — matches Excel UI labels. */
const readSheetRow = (sheet, rowIndex0) => {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const cells = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex0, c });
    const cell = sheet[addr];
    if (!cell) {
      cells.push('');
      continue;
    }
    if (cell.w != null && String(cell.w).trim() !== '') {
      cells.push(String(cell.w));
    } else if (cell.v != null) {
      cells.push(cell.v);
    } else {
      cells.push('');
    }
  }
  return cells;
};

const findHeaderRowIndex = (sheet, rows) => {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i++) {
    const fromSheet = readSheetRow(sheet, i);
    const fromJson = rows[i];
    const candidates = [
      fromSheet.length ? fromSheet : null,
      Array.isArray(fromJson) ? fromJson : null
    ].filter(Boolean);

    for (const headerCells of candidates) {
      const colIndex = mapHeaderRow(headerCells);
      if (colIndex.srNo != null && colIndex.reelNo != null) {
        return { headerRowIndex: i, headerCells, colIndex, dataStartIndex: i + 1 };
      }
    }
  }
  return null;
};

const formatDetectedHeaders = (row) => {
  if (!Array.isArray(row) || !row.length) return '(empty row)';
  return row
    .map((cell, i) => {
      const label = String(cell ?? '').trim();
      return label ? `"${label}"` : `(col ${i + 1} empty)`;
    })
    .join(', ');
};

const missingRequiredMessage = (colIndex, detectedRow) => {
  const missing = REQUIRED_FIELDS.filter((f) => colIndex[f] == null).map((f) => HEADER_LABELS[f]);
  const found = formatDetectedHeaders(detectedRow);
  return `Missing required column(s): ${missing.join(', ')}. Headers found: ${found}. Expected: Date, SR No, Reel No, Shade, BF, GSM, Size, Weight, Status, Out Details.`;
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

const PREFERRED_SHEET_NAMES = ['reels', 'reel', 'reel stock', 'reel import', 'import'];

const findReelImportSheet = (wb) => {
  const trySheet = (name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return null;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const layout = resolveSheetLayout(sheet, rows);
    if (!layout) return null;

    const ref = sheet['!ref'];
    if (!ref) return null;
    const range = XLSX.utils.decode_range(ref);
    const dataStart = layout.dataStartIndex ?? layout.headerRowIndex + 1;
    const dataRowCount = Math.max(0, range.e.r - dataStart + 1);

    return { sheetName: name, sheet, rows, dataRowCount, ...layout };
  };

  let best = null;
  for (const name of wb.SheetNames) {
    const hit = trySheet(name);
    if (!hit) continue;
    if (!best || hit.dataRowCount > best.dataRowCount) {
      best = hit;
      continue;
    }
    if (hit.dataRowCount === best.dataRowCount) {
      const hitPreferred = PREFERRED_SHEET_NAMES.includes(String(name).trim().toLowerCase());
      const bestPreferred = PREFERRED_SHEET_NAMES.includes(
        String(best.sheetName).trim().toLowerCase()
      );
      if (hitPreferred && !bestPreferred) best = hit;
    }
  }

  return best;
};

const isRowEmpty = (row) =>
  !row ||
  row.every((c) => c == null || String(c).trim() === '');

/**
 * Parse workbook: finds the sheet with SR No + Reel No headers (prefers sheet named "Reels").
 */
export const parseReelExcelFile = (arrayBuffer) => {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  if (!wb.SheetNames?.length) {
    return { valid: [], invalid: [], sheetError: 'Workbook has no sheets.' };
  }

  const found = findReelImportSheet(wb);
  if (!found) {
    const firstName = wb.SheetNames[0];
    const firstSheet = wb.Sheets[firstName];
    const firstRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });
    const probe = readSheetRow(firstSheet, 0).length ? readSheetRow(firstSheet, 0) : firstRows[0];
    const sheetList = wb.SheetNames.join(', ');
    const probeText = (probe || []).map((c) => normalizeHeader(c)).join(' ');
    const billHint = probeText.includes('productid')
      ? ' This file looks like a Bill/invoice export (BillLines), not reel stock data. ' +
        'Click Download template in this dialog, paste your reel rows, save as a new .xlsx, then import that saved file.'
      : ' Save your Excel file after editing, then import the saved .xlsx (not a BillLines export).';
    return {
      valid: [],
      invalid: [],
      sheetError:
        `No reel import sheet found. Workbook sheets: ${sheetList}. ` +
        `First sheet "${firstName}" headers: ${formatDetectedHeaders(probe)}.` +
        billHint
    };
  }

  const { sheetName, sheet, headerRowIndex, colIndex, dataStartIndex } = found;
  const dataStart = dataStartIndex ?? headerRowIndex + 1;

  const ref = sheet['!ref'];
  if (!ref) {
    return {
      valid: [],
      invalid: [],
      sheetError: `Sheet "${sheetName}" is empty.`
    };
  }

  const range = XLSX.utils.decode_range(ref);
  const totalRowsScanned = Math.max(0, range.e.r - dataStart + 1);

  if (totalRowsScanned < 1) {
    return {
      valid: [],
      invalid: [],
      sheetError: `Sheet "${sheetName}" needs a header row and at least one data row.`
    };
  }

  const valid = [];
  const invalid = [];
  let srEmptySample = 0;
  const sampleSize = Math.min(50, totalRowsScanned);

  for (let i = dataStart; i <= range.e.r; i++) {
    const row = readSheetRow(sheet, i);
    if (isRowEmpty(row)) continue;

    if (i < dataStart + sampleSize && !cellStr(row, colIndex.srNo)) {
      srEmptySample++;
    }

    const rowNum = i + 1;
    const { payload, errors } = rowToReelPayload(row, colIndex, rowNum);
    if (errors.length) {
      invalid.push({ rowNum, errors, preview: payload });
    } else {
      valid.push({ rowNum, payload });
    }
  }

  let warning = '';
  if (
    totalRowsScanned > 10 &&
    valid.length < totalRowsScanned * 0.1 &&
    srEmptySample > sampleSize * 0.6
  ) {
    warning =
      'Most rows have an empty SR No column. Your data may still be in bill columns (productId, Qty, Rate) instead of under Date, SR No, Reel No. Use Download template, paste each column in the matching column, then Save As a new file.';
  } else if (totalRowsScanned > 100 && valid.length < 10 && invalid.length > 100) {
    warning =
      'This file has many rows but almost none have both SR No and Reel No filled. Check that you are not importing a BillLines / invoice export, and that data sits under the correct header columns.';
  }

  return { valid, invalid, sheetError: null, sheetName, totalRowsScanned, warning };
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
