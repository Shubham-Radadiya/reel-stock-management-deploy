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

/** Empty cells for zero counts in exports (no dash placeholder). */
const exportCell = (n) => (n > 0 ? n : '');

const buildMatrixHeaders = (combinations) => {
  const shadeRow = ['Size', ...combinations.map((c) => String(c.shade ?? '')), 'Total'];
  const bfRow = ['', ...combinations.map((c) => String(c.bf ?? '')), ''];
  const gsmRow = ['', ...combinations.map((c) => String(c.gsm ?? '')), ''];
  return { shadeRow, bfRow, gsmRow };
};

const buildMatrixPdfHead = (combinations) => {
  const center = { halign: 'center', valign: 'middle' };
  return [
    [
      { content: 'Size', rowSpan: 3, styles: { halign: 'left', valign: 'middle' } },
      ...combinations.map((c) => ({ content: String(c.shade ?? ''), styles: center })),
      { content: 'Total', rowSpan: 3, styles: center }
    ],
    combinations.map((c) => ({ content: String(c.bf ?? ''), styles: center })),
    combinations.map((c) => ({ content: String(c.gsm ?? ''), styles: center }))
  ];
};

const buildMatrixSheetData = ({ sizes, combinations, getCount, getComboTotal, grandTotal }) => {
  const { shadeRow, bfRow, gsmRow } = buildMatrixHeaders(combinations);
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
  return { shadeRow, bfRow, gsmRow, body, footer };
};

const exportStamp = () => format(new Date(), 'yyyy-MM-dd_HHmm');

export const exportMatrixToExcel = (matrixData) => {
  const { shadeRow, bfRow, gsmRow, body, footer } = buildMatrixSheetData(matrixData);
  const ws = XLSX.utils.aoa_to_sheet([shadeRow, bfRow, gsmRow, ...body, footer]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Matrix');
  XLSX.writeFile(wb, `stock-matrix_${exportStamp()}.xlsx`);
};

export const exportMatrixToPdf = (matrixData) => {
  const { body, footer } = buildMatrixSheetData(matrixData);
  const { combinations } = matrixData;
  const colCount = combinations.length + 2;
  const rowCount = body.length + 1;
  const useLandscape = colCount > 4 || rowCount > 10;

  const borderColor = [30, 41, 59];
  const borderWidth = 1;
  const margin = 12;

  const buildDoc = (fontSize, cellPadding) => {
    const doc = new jsPDF({
      orientation: useLandscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    autoTable(doc, {
      startY: margin,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      tableWidth: pageWidth - margin * 2,
      head: buildMatrixPdfHead(combinations),
      body: [...body, footer],
      theme: 'grid',
      tableLineColor: borderColor,
      tableLineWidth: borderWidth,
      rowPageBreak: 'avoid',
      styles: {
        fontSize,
        cellPadding,
        halign: 'center',
        valign: 'middle',
        lineColor: borderColor,
        lineWidth: borderWidth,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        minCellHeight: fontSize + cellPadding * 2,
        lineColor: borderColor,
        lineWidth: borderWidth
      },
      bodyStyles: {
        lineColor: borderColor,
        lineWidth: borderWidth,
        minCellHeight: fontSize + cellPadding * 2
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        data.cell.styles.lineColor = borderColor;
        data.cell.styles.lineWidth = borderWidth;

        if (data.section === 'head') {
          data.cell.styles.fillColor = [30, 64, 175];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = 'bold';
        }

        if (data.row.index === body.length && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      },
      didDrawCell: (data) => {
        const { cell, doc: pdf } = data;
        pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.setLineWidth(borderWidth);
        pdf.rect(cell.x, cell.y, cell.width, cell.height, 'S');
      }
    });

    return doc;
  };

  const fontSizes = [7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5];
  let doc = buildDoc(6, 2);

  for (const fontSize of fontSizes) {
    const cellPadding = Math.max(1, fontSize * 0.3);
    const candidate = buildDoc(fontSize, cellPadding);
    doc = candidate;
    if (candidate.getNumberOfPages() === 1) {
      break;
    }
  }

  doc.save(`stock-matrix_${exportStamp()}.pdf`);
};
