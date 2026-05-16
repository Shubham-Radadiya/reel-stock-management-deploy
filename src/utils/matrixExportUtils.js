import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Match reel/matrix field to a numeric filter input (empty filter = no restriction). */
export const matchesMatrixNumberFilter = (fieldValue, filterInput) => {
  const raw = String(filterInput ?? '').trim();
  if (!raw) return true;
  const field = String(fieldValue ?? '').trim();
  if (field === raw) return true;
  const fNum = parseFloat(raw);
  const vNum = parseFloat(field);
  if (Number.isFinite(fNum) && Number.isFinite(vNum)) return fNum === vNum;
  return false;
};

const comboHeader = (combo) => `${combo.shade} | ${combo.bf} | ${combo.gsm}`;

/** Empty cells for zero counts in exports (no dash placeholder). */
const exportCell = (n) => (n > 0 ? n : '');

const buildMatrixSheetData = ({ sizes, combinations, getCount, getComboTotal, grandTotal }) => {
  const header = ['Size', ...combinations.map(comboHeader), 'Total'];
  const body = sizes.map((size) => {
    const cells = combinations.map((combo) => exportCell(getCount(size, combo.key)));
    const rowTotal = combinations.reduce((sum, combo) => sum + getCount(size, combo.key), 0);
    return [size, ...cells, exportCell(rowTotal)];
  });
  const footer = [
    'TOTAL',
    ...combinations.map((combo) => exportCell(getComboTotal(combo.key))),
    exportCell(grandTotal)
  ];
  return { header, body, footer };
};

const exportStamp = () => format(new Date(), 'yyyy-MM-dd_HHmm');

export const exportMatrixToExcel = (matrixData) => {
  const { header, body, footer } = buildMatrixSheetData(matrixData);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body, footer]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Matrix');
  XLSX.writeFile(wb, `stock-matrix_${exportStamp()}.xlsx`);
};

export const exportMatrixToPdf = (matrixData) => {
  const { header, body, footer } = buildMatrixSheetData(matrixData);
  const { combinations } = matrixData;
  const landscape = combinations.length > 6;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  doc.setFontSize(14);
  doc.text('Stock availability matrix', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 40, 52);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 64,
    head: [header],
    body: [...body, footer],
    styles: {
      fontSize: landscape ? 7 : 8,
      cellPadding: 3,
      halign: 'center'
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === body.length && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    }
  });

  doc.save(`stock-matrix_${exportStamp()}.pdf`);
};
