import React, { useRef, useState } from 'react';
import { FileSpreadsheet, X, Download, Upload } from 'lucide-react';
import { displayDate } from '../../utils/dateFormat';
import {
  downloadReelImportTemplate,
  importOutDetailsLabel,
  importStatusLabel,
  parseReelExcelFile
} from '../../utils/excelReelImport';
import './ExcelImportModal.css';

const ExcelImportModal = ({ isOpen, onClose, onImport, isImporting }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');

  if (!isOpen) return null;

  const resetFileState = () => {
    setFileName('');
    setParseResult(null);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isImporting) return;
    resetFileState();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setParseResult(null);
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setParseError('Please choose an Excel file (.xlsx, .xls) or .csv');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const result = parseReelExcelFile(buffer);
      if (result.sheetError) {
        setParseError(result.sheetError);
        return;
      }
      if (result.valid.length === 0 && result.invalid.length === 0) {
        setParseError('No data rows found in the file.');
        return;
      }
      setParseResult(result);
    } catch (err) {
      setParseError(err.message || 'Could not read the file.');
    }
  };

  const handleImport = () => {
    if (!parseResult?.valid?.length || isImporting) return;
    onImport(parseResult.valid.map((r) => r.payload));
  };

  const previewRows = parseResult?.valid?.slice(0, 8) || [];

  return (
    <>
      <div className="excel-import-overlay" onClick={handleClose} role="presentation" />
      <div className="excel-import-modal" role="dialog" aria-labelledby="excel-import-title">
        <div className="excel-import-header">
          <div className="excel-import-title-row">
            <FileSpreadsheet size={22} aria-hidden />
            <h4 id="excel-import-title">Import from Excel</h4>
          </div>
          <button
            type="button"
            className="excel-import-close"
            onClick={handleClose}
            disabled={isImporting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="excel-import-body">
          <p className="excel-import-hint">
            First row must be headers:{' '}
            <strong>
              Date, SR No, Reel No, Shade, BF, GSM, Size, Weight, Status, Out Details
            </strong>
            . SR No and Reel No are required. Status: <strong>TRUE</strong> / <strong>FALSE</strong>{' '}
            (any capitals: true, TRUE, False, etc.) — TRUE = checked out, FALSE = in stock. Out
            Details: <strong>AVAILABLE</strong> (any capitals) when FALSE, or checkout date/time when
            TRUE.
          </p>
          <div className="excel-import-actions-row">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
              onClick={downloadReelImportTemplate}
              disabled={isImporting}
            >
              <Download size={16} />
              Download template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="d-none"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload size={16} />
              Choose file
            </button>
            {fileName ? <span className="excel-import-filename">{fileName}</span> : null}
          </div>
          {parseError ? <p className="excel-import-error">{parseError}</p> : null}
          {parseResult ? (
            <div className="excel-import-summary">
              <span className="text-success fw-semibold">{parseResult.valid.length} ready to import</span>
              {parseResult.invalid.length > 0 ? (
                <span className="text-danger ms-2">
                  {parseResult.invalid.length} row(s) skipped (missing SR No / Reel No)
                </span>
              ) : null}
            </div>
          ) : null}
          {previewRows.length > 0 ? (
            <div className="excel-import-preview-wrap">
              <p className="small text-muted mb-2">Preview (first rows)</p>
              <table className="table table-sm table-bordered excel-import-preview-table mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>SR No</th>
                    <th>Reel No</th>
                    <th>Shade</th>
                    <th>BF</th>
                    <th>GSM</th>
                    <th>Size</th>
                    <th>Weight</th>
                    <th>Status</th>
                    <th>Out Details</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNum}>
                      <td>{displayDate(row.payload.date)}</td>
                      <td>{row.payload.srNo}</td>
                      <td>{row.payload.reelNo}</td>
                      <td>{row.payload.shade}</td>
                      <td>{row.payload.bf}</td>
                      <td>{row.payload.gsm}</td>
                      <td>{row.payload.size}</td>
                      <td>{row.payload.weight}</td>
                      <td>{importStatusLabel(row.payload.isCheckedOut)}</td>
                      <td>
                        {importOutDetailsLabel(row.payload.isCheckedOut, row.payload.outDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.valid.length > previewRows.length ? (
                <p className="small text-muted mt-2 mb-0">
                  + {parseResult.valid.length - previewRows.length} more row(s)
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="excel-import-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isImporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!parseResult?.valid?.length || isImporting}
          >
            {isImporting ? 'Importing…' : `Import ${parseResult?.valid?.length || 0} reel(s)`}
          </button>
        </div>
      </div>
    </>
  );
};

export default ExcelImportModal;
