import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Database,
  X,
  LayoutGrid,
  TrendingUp,
  ListFilter,
  Gauge,
  AlertTriangle,
  PieChart,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import {
  format,
  endOfMonth,
  startOfMonth,
  startOfDay,
  parse,
  getISOWeek,
  getISOWeekYear
} from 'date-fns';
import './Report.css';
import {
  parseOutDate,
  getFinancialYearRange,
  listFinancialYearOptions,
  reelWasOutDuring,
  reelEntryReceivedDuring,
  getWeekRangeFromIsoWeek,
  parseYmd,
  formatDisplayDateTime,
  toEntryDateYmd
} from '../../utils/reelDateUtils';
import {
  buildStockMinimumStatus,
  getLowStockItems,
  getInStockReelsForRule
} from '../../utils/stockMinimumUtils';
import { fetchStockMinimums } from '../../api/reelsApi';
import MinimumStockManagement from '../MinimumStockManagement/MinimumStockManagement';
import ReelChartReport from './ReelChartReport';
import {
  exportMatrixToExcel,
  exportMatrixToPdf,
  matchesMatrixNumberFilter
} from '../../utils/matrixExportUtils';
import { showError, showSuccess } from '../../utils/toastUtils';
import { getAllowedReportTabs } from '../../utils/userAccessUtils';

const MATRIX_TAB = { id: 'matrix', label: 'Matrix', icon: LayoutGrid };
const ANALYTICS_TAB = { id: 'analytics', label: 'Analytics', icon: TrendingUp };
const REEL_CHART_TAB = { id: 'reelchart', label: 'Reel Chart', icon: PieChart };
const MIN_STOCK_TAB = { id: 'minimum', label: 'Minimum stock', icon: Gauge };

const ALL_REPORT_TABS = [MATRIX_TAB, ANALYTICS_TAB, REEL_CHART_TAB, MIN_STOCK_TAB];
const TAB_BY_ID = Object.fromEntries(ALL_REPORT_TABS.map((t) => [t.id, t]));

const Report = ({ reels, stockMinimums = [], setStockMinimums, userRole, userAccess }) => {
  const isAdmin = userRole === 'admin';
  const allowedTabIds = useMemo(
    () => (isAdmin ? ALL_REPORT_TABS.map((t) => t.id) : getAllowedReportTabs(userAccess)),
    [isAdmin, userAccess]
  );
  const subTabs = useMemo(
    () => allowedTabIds.map((id) => TAB_BY_ID[id]).filter(Boolean),
    [allowedTabIds]
  );

  const [reportSubTab, setReportSubTab] = useState(() => allowedTabIds[0] || 'matrix');

  useEffect(() => {
    if (!allowedTabIds.includes(reportSubTab)) {
      setReportSubTab(allowedTabIds[0] || 'matrix');
    }
  }, [allowedTabIds, reportSubTab]);

  const minStockStatus = useMemo(
    () => buildStockMinimumStatus(reels, stockMinimums),
    [reels, stockMinimums]
  );
  const lowMinStock = useMemo(
    () => getLowStockItems(reels, stockMinimums),
    [reels, stockMinimums]
  );

  useEffect(() => {
    if (reportSubTab !== 'minimum' || !allowedTabIds.includes('minimum')) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchStockMinimums();
        if (!cancelled) setStockMinimums(data);
      } catch (error) {
        if (!cancelled) {
          showError(error.message || 'Failed to load minimum stock rules');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportSubTab, allowedTabIds, setStockMinimums]);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

  const [matrixColPickerOpen, setMatrixColPickerOpen] = useState(false);
  const [matrixSizeFilter, setMatrixSizeFilter] = useState('');
  const [matrixGsmFilter, setMatrixGsmFilter] = useState('');
  const [matrixBfFilter, setMatrixBfFilter] = useState('');

  const [analyticsPeriod, setAnalyticsPeriod] = useState('day');
  const [analyticsDayInput, setAnalyticsDayInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [analyticsDayApplied, setAnalyticsDayApplied] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [analyticsWeekMode, setAnalyticsWeekMode] = useState('iso');
  const [analyticsWeekIso, setAnalyticsWeekIso] = useState(() => {
    const d = new Date();
    return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
  });
  const [analyticsWeekStart, setAnalyticsWeekStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [analyticsWeekEnd, setAnalyticsWeekEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [analyticsMonth, setAnalyticsMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [analyticsFY, setAnalyticsFY] = useState(() => {
    const opts = listFinancialYearOptions(8);
    return opts[0]?.value || String(new Date().getFullYear());
  });

  const availableReels = reels.filter((r) => !r.isCheckedOut);

  const matrix = useMemo(() => {
    const sizes = [...new Set(availableReels.map((r) => r.size))].sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );
    const combinations = [];
    availableReels.forEach((r) => {
      const key = `${r.shade}_${r.bf}_${r.gsm}`;
      if (!combinations.find((c) => c.key === key)) {
        combinations.push({ shade: r.shade, bf: r.bf, gsm: r.gsm, key });
      }
    });
    combinations.sort((a, b) => {
      if (a.shade !== b.shade) return a.shade.localeCompare(b.shade);
      if (a.bf !== b.bf) return parseFloat(a.bf) - parseFloat(b.bf);
      return parseFloat(a.gsm) - parseFloat(b.gsm);
    });
    return { sizes, combinations };
  }, [availableReels]);

  const comboKeySignature = useMemo(
    () => matrix.combinations.map((c) => c.key).join('\x1e'),
    [matrix.combinations]
  );

  const [matrixVisibleKeys, setMatrixVisibleKeys] = useState(() => new Set());

  useEffect(() => {
    setMatrixVisibleKeys(new Set(matrix.combinations.map((c) => c.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when combo set changes
  }, [comboKeySignature]);

  const visibleCombinations = useMemo(
    () => matrix.combinations.filter((c) => matrixVisibleKeys.has(c.key)),
    [matrix.combinations, matrixVisibleKeys]
  );

  const matrixHasHiddenColumns =
    visibleCombinations.length > 0 && visibleCombinations.length < matrix.combinations.length;

  const matrixHasActiveFilters =
    isAdmin &&
    (matrixSizeFilter.trim() !== '' ||
      matrixGsmFilter.trim() !== '' ||
      matrixBfFilter.trim() !== '');

  const matrixDisplaySizes = useMemo(() => {
    if (!isAdmin || !matrixSizeFilter.trim()) return matrix.sizes;
    return matrix.sizes.filter((s) => matchesMatrixNumberFilter(s, matrixSizeFilter));
  }, [matrix.sizes, matrixSizeFilter, isAdmin]);

  const matrixDisplayCombinations = useMemo(() => {
    if (!isAdmin) return visibleCombinations;
    let combos = visibleCombinations;
    if (matrixGsmFilter.trim()) {
      combos = combos.filter((c) => matchesMatrixNumberFilter(c.gsm, matrixGsmFilter));
    }
    if (matrixBfFilter.trim()) {
      combos = combos.filter((c) => matchesMatrixNumberFilter(c.bf, matrixBfFilter));
    }
    return combos;
  }, [visibleCombinations, matrixGsmFilter, matrixBfFilter, isAdmin]);

  const clearMatrixFilters = () => {
    setMatrixSizeFilter('');
    setMatrixGsmFilter('');
    setMatrixBfFilter('');
  };

  const toggleMatrixColumn = (key) => {
    setMatrixVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const showAllMatrixColumns = () => {
    setMatrixVisibleKeys(new Set(matrix.combinations.map((c) => c.key)));
  };

  const getCount = (size, comboKey) =>
    availableReels.filter(
      (r) => r.size === size && `${r.shade}_${r.bf}_${r.gsm}` === comboKey
    ).length;

  const getMatrixViewGrandTotal = () =>
    matrixDisplaySizes.reduce(
      (sum, size) =>
        sum +
        matrixDisplayCombinations.reduce((rowSum, combo) => rowSum + getCount(size, combo.key), 0),
      0
    );

  const getReelsByCombo = (size, comboKey) =>
    availableReels.filter(
      (r) => r.size === size && `${r.shade}_${r.bf}_${r.gsm}` === comboKey
    );

  const handleCellClick = (size, combo, count) => {
    if (count === 0) return;
    const reelsData = getReelsByCombo(size, combo.key);
    setModalTitle(`${combo.shade} | ${combo.bf} | ${combo.gsm} | Size: ${size} (${count} Reels)`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleTotalClick = (combo, total) => {
    if (total === 0) return;
    const reelsData = availableReels.filter((r) => `${r.shade}_${r.bf}_${r.gsm}` === combo.key);
    setModalTitle(`${combo.shade} | ${combo.bf} | ${combo.gsm} - Total: ${total} Reels`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleRowTotalClick = (size, rowTotal) => {
    if (rowTotal === 0) return;
    const reelsData = availableReels.filter((r) => r.size === size);
    setModalTitle(`Size: ${size} - Total: ${rowTotal} Reels`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleGrandTotalClick = () => {
    setModalTitle(`All Available Stock - Total: ${availableReels.length} Reels`);
    setModalData(availableReels);
    setShowDetailsModal(true);
  };

  const getMatrixExportPayload = () => ({
    sizes: matrixDisplaySizes,
    combinations: matrixDisplayCombinations,
    getCount,
    getComboTotal: (comboKey) =>
      matrixDisplaySizes.reduce((sum, size) => sum + getCount(size, comboKey), 0),
    grandTotal: getMatrixViewGrandTotal()
  });

  const canExportMatrix =
    availableReels.length > 0 &&
    matrixDisplayCombinations.length > 0 &&
    matrixDisplaySizes.length > 0;

  const handleMatrixExportExcel = () => {
    if (!canExportMatrix) {
      showError('Nothing to export. Ensure stock is available and columns are visible.');
      return;
    }
    try {
      exportMatrixToExcel(getMatrixExportPayload());
      showSuccess('Matrix exported to Excel');
    } catch {
      showError('Could not export to Excel');
    }
  };

  const handleMatrixExportPdf = () => {
    if (!canExportMatrix) {
      showError('Nothing to export. Ensure stock is available and columns are visible.');
      return;
    }
    try {
      exportMatrixToPdf(getMatrixExportPayload());
      showSuccess('Matrix exported to PDF');
    } catch {
      showError('Could not export to PDF');
    }
  };

  const analyticsRange = useMemo(() => {
    if (analyticsPeriod === 'day') {
      const d = parseYmd(analyticsDayApplied);
      if (!d) return null;
      return { start: d, end: d, label: format(d, 'dd MMM yyyy') };
    }
    if (analyticsPeriod === 'week') {
      if (analyticsWeekMode === 'iso') {
        const r = getWeekRangeFromIsoWeek(analyticsWeekIso);
        if (!r) return null;
        return {
          start: r.start,
          end: r.end,
          label: `${format(r.start, 'dd MMM')} – ${format(r.end, 'dd MMM yyyy')}`
        };
      }
      const a = parseYmd(analyticsWeekStart);
      const b = parseYmd(analyticsWeekEnd);
      if (!a || !b) return null;
      const start = a <= b ? a : b;
      const end = a <= b ? b : a;
      return {
        start,
        end,
        label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`
      };
    }
    if (analyticsPeriod === 'month') {
      const d = parse(`${analyticsMonth}-01`, 'yyyy-MM-dd', new Date());
      if (Number.isNaN(d.getTime())) return null;
      return {
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, 'MMMM yyyy')
      };
    }
    if (analyticsPeriod === 'fyear') {
      const { start, end, label } = getFinancialYearRange(analyticsFY);
      return { start, end, label };
    }
    return null;
  }, [
    analyticsPeriod,
    analyticsDayApplied,
    analyticsWeekMode,
    analyticsWeekIso,
    analyticsWeekStart,
    analyticsWeekEnd,
    analyticsMonth,
    analyticsFY
  ]);

  const analyticsDetailRows = useMemo(() => {
    if (!analyticsRange) return [];
    const { start, end } = analyticsRange;
    const list = [];
    const seen = new Set();

    reels.forEach((r) => {
      const received = reelEntryReceivedDuring(r, start, end);
      const checkedOutInPeriod = reelWasOutDuring(r, start, end);
      if (!received && !checkedOutInPeriod) return;
      if (seen.has(r.id)) return;
      seen.add(r.id);

      const outAt = parseOutDate(r.outDate);
      const entryYmd = toEntryDateYmd(r.date);
      const entryDate = entryYmd ? parse(entryYmd, 'yyyy-MM-dd', new Date()) : null;
      const entryValid = entryDate && !Number.isNaN(entryDate.getTime());

      let displayTime = '—';
      let sortTime = new Date(0);
      /* Time = record entry date (reel.date), not checkout — Out Date column shows checkout. */
      if (entryValid) {
        const dayStart = startOfDay(entryDate);
        displayTime = formatDisplayDateTime(dayStart);
        sortTime = dayStart;
      } else if (checkedOutInPeriod && outAt) {
        displayTime = formatDisplayDateTime(outAt);
        sortTime = outAt;
      }

      list.push({
        reel: r,
        displayTime,
        sortTime,
        reelOut: Boolean(checkedOutInPeriod),
        outDateCell: checkedOutInPeriod ? r.outDate || '—' : '—'
      });
    });

    list.sort((a, b) => a.sortTime - b.sortTime);
    return list;
  }, [reels, analyticsRange]);

  const analyticsStats = useMemo(() => {
    const total = analyticsDetailRows.length;
    const out = analyticsDetailRows.filter((x) => x.reelOut).length;
    return { total, out, inn: total - out };
  }, [analyticsDetailRows]);

  const fyOptions = useMemo(() => listFinancialYearOptions(8), []);

  const renderAnalyticsPeriodPills = () => (
    <div className="analytics-period-pills">
      {[
        { id: 'day', label: 'Day' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'fyear', label: 'Financial year' }
      ].map((p) => (
        <button
          key={p.id}
          type="button"
          className={`analytics-period-pill ${analyticsPeriod === p.id ? 'active' : ''}`}
          onClick={() => {
            setAnalyticsPeriod(p.id);
            if (p.id === 'day') setAnalyticsDayInput(analyticsDayApplied);
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const analyticsStatsBoxes = (
    <div className="analytics-stats-inline">
      <div className="daily-stat-card daily-stat-total">
        <span className="daily-stat-label">Total Reels</span>
        <span className="daily-stat-value">{analyticsStats.total}</span>
      </div>
      <div className="daily-stat-card daily-stat-out">
        <span className="daily-stat-label">Reels Out</span>
        <span className="daily-stat-value">{analyticsStats.out}</span>
      </div>
      <div className="daily-stat-card daily-stat-in">
        <span className="daily-stat-label">Reels In</span>
        <span className="daily-stat-value">{analyticsStats.inn}</span>
      </div>
    </div>
  );

  return (
    <div className="report-page">
      <header className="report-page-header">
        <div className="report-page-header-bg" aria-hidden />
        <div className="report-page-header-inner">
          <div className="report-page-header-left">
            <div className="report-page-icon-wrap">
              <BarChart3 size={18} />
            </div>
            <span className="report-page-eyebrow">Insights</span>
            <span className="report-page-title-inline">Reports</span>
          </div>
          <nav className="report-subnav" aria-label="Report types">
            {subTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`report-subnav-btn ${reportSubTab === id ? 'active' : ''}`}
                onClick={() => setReportSubTab(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="report-page-body">
        {reportSubTab === 'matrix' && (
          <section className="report-section">
            <div className="matrix-toolbar-unified">
              <h2 className="report-section-title matrix-toolbar-title">Stock availability matrix</h2>

              {isAdmin && availableReels.length > 0 && (
                <>
                  <span className="matrix-toolbar-vrule" aria-hidden />
                  <div className="matrix-toolbar-filters" role="search">
                <div className="matrix-filter-field">
                  <label className="matrix-filter-label" htmlFor="matrix-filter-size">
                    Size
                  </label>
                  <input
                    id="matrix-filter-size"
                    type="number"
                    className="form-control form-control-sm matrix-filter-input"
                    placeholder="All"
                    value={matrixSizeFilter}
                    onChange={(e) => setMatrixSizeFilter(e.target.value)}
                    aria-label="Filter matrix by size"
                  />
                </div>
                <div className="matrix-filter-field">
                  <label className="matrix-filter-label" htmlFor="matrix-filter-gsm">
                    GSM
                  </label>
                  <input
                    id="matrix-filter-gsm"
                    type="number"
                    className="form-control form-control-sm matrix-filter-input"
                    placeholder="All"
                    value={matrixGsmFilter}
                    onChange={(e) => setMatrixGsmFilter(e.target.value)}
                    aria-label="Filter matrix by GSM"
                  />
                </div>
                <div className="matrix-filter-field">
                  <label className="matrix-filter-label" htmlFor="matrix-filter-bf">
                    BF
                  </label>
                  <input
                    id="matrix-filter-bf"
                    type="number"
                    className="form-control form-control-sm matrix-filter-input"
                    placeholder="All"
                    value={matrixBfFilter}
                    onChange={(e) => setMatrixBfFilter(e.target.value)}
                    aria-label="Filter matrix by BF"
                  />
                </div>
                {matrixHasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary matrix-filter-clear"
                    onClick={clearMatrixFilters}
                  >
                    Clear
                  </button>
                )}
                  </div>
                </>
              )}

              <div className="matrix-toolbar-actions">
                <button
                  type="button"
                  className="matrix-export-btn matrix-export-btn-excel"
                  onClick={handleMatrixExportExcel}
                  disabled={!canExportMatrix}
                  title="Export matrix to Excel"
                >
                  <FileSpreadsheet size={16} aria-hidden />
                  Excel
                </button>
                <button
                  type="button"
                  className="matrix-export-btn matrix-export-btn-pdf"
                  onClick={handleMatrixExportPdf}
                  disabled={!canExportMatrix}
                  title="Export matrix to PDF"
                >
                  <FileText size={16} aria-hidden />
                  PDF
                </button>
                <button
                  type="button"
                  className={`matrix-columns-btn${matrixHasHiddenColumns ? ' has-hidden' : ''}`}
                  onClick={() => setMatrixColPickerOpen((o) => !o)}
                  aria-expanded={matrixColPickerOpen}
                  aria-controls="matrix-col-picker"
                  title="Show or hide BF|GSM columns"
                >
                  <ListFilter size={16} aria-hidden />
                  Columns
                </button>
              </div>
            </div>
            {availableReels.length === 0 ? (
              <div className="report-empty text-center py-5">
                <Database size={48} className="text-muted opacity-25 mb-3" />
                <p className="text-muted mb-0">No stock available in the inventory.</p>
              </div>
            ) : (
              <>
              {visibleCombinations.length === 0 ? (
                <div className="alert alert-warning mb-0" role="status">
                  Select at least one BF|GSM column using <strong>Columns</strong>.
                </div>
              ) : matrixDisplaySizes.length === 0 || matrixDisplayCombinations.length === 0 ? (
                <div className="alert alert-info mb-0" role="status">
                  No rows or columns match the current filters. Adjust Size, GSM, or BF, or{' '}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 align-baseline"
                    onClick={clearMatrixFilters}
                  >
                    clear filters
                  </button>
                  .
                </div>
              ) : (
              <div className="matrix-wrapper">
                <div className="matrix-scroll-container">
                  <div className="matrix-table-inner">
                  <table className="matrix-table">
                    <thead>
                      <tr className="matrix-header-main">
                        <th className="size-col header-corner">SIZE ↓ / BF|GSM →</th>
                        {matrixDisplayCombinations.map((c) => (
                          <th key={c.key} className="combo-col">
                            <div className="combo-info">
                              <span className="combo-shade">{c.shade}</span>
                              <span className="combo-specs">
                                {c.bf} | {c.gsm}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="total-col header-total">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixDisplaySizes.map((size) => {
                        const rowTotal = matrixDisplayCombinations.reduce(
                          (sum, combo) => sum + getCount(size, combo.key),
                          0
                        );
                        return (
                          <tr key={size}>
                            <td
                              className="size-cell clickable"
                              onClick={() => handleRowTotalClick(size, rowTotal)}
                              style={{ cursor: 'pointer' }}
                            >
                              {size}
                            </td>
                            {matrixDisplayCombinations.map((combo) => {
                              const count = getCount(size, combo.key);
                              return (
                                <td
                                  key={combo.key}
                                  className={
                                    count > 0
                                      ? 'count-cell has-value clickable'
                                      : 'count-cell empty'
                                  }
                                  onClick={() => handleCellClick(size, combo, count)}
                                  style={{ cursor: count > 0 ? 'pointer' : 'default' }}
                                >
                                  {count > 0 ? count : '-'}
                                </td>
                              );
                            })}
                            <td
                              className="total-cell clickable"
                              onClick={() => handleRowTotalClick(size, rowTotal)}
                              style={{ cursor: 'pointer' }}
                            >
                              {rowTotal}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="footer-row">
                        <td
                          className="size-cell footer footer-corner clickable"
                          onClick={handleGrandTotalClick}
                          style={{ cursor: 'pointer' }}
                        >
                          TOTAL
                        </td>
                        {matrixDisplayCombinations.map((combo) => {
                          const total = matrixDisplaySizes.reduce(
                            (sum, size) => sum + getCount(size, combo.key),
                            0
                          );
                          return (
                            <td
                              key={combo.key}
                              className="count-cell footer-value clickable"
                              onClick={() => handleTotalClick(combo, total)}
                              style={{ cursor: total > 0 ? 'pointer' : 'default' }}
                            >
                              {total > 0 ? total : '-'}
                            </td>
                          );
                        })}
                        <td
                          className="total-cell footer grand-total clickable"
                          onClick={handleGrandTotalClick}
                          style={{ cursor: 'pointer' }}
                        >
                          {getMatrixViewGrandTotal()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
              )}
              {matrixColPickerOpen && (
                <>
                  <div
                    className="matrix-col-picker-backdrop"
                    onClick={() => setMatrixColPickerOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="matrix-col-picker"
                    id="matrix-col-picker"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="matrix-col-picker-title"
                  >
                    <h3 id="matrix-col-picker-title" className="matrix-col-picker-title">
                      Column visibility
                    </h3>
                    <p className="matrix-col-picker-hint">
                      Uncheck BF|GSM columns to hide them from the matrix (like Excel column filters).
                    </p>
                    <div className="matrix-col-picker-list">
                      {matrix.combinations.map((c) => (
                        <label key={c.key} className="matrix-col-picker-row">
                          <input
                            type="checkbox"
                            checked={matrixVisibleKeys.has(c.key)}
                            onChange={() => toggleMatrixColumn(c.key)}
                          />
                          <span>
                            <strong>{c.shade}</strong> · {c.bf} | {c.gsm}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="matrix-col-picker-actions">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={showAllMatrixColumns}>
                        Show all
                      </button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setMatrixColPickerOpen(false)}>
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
              </>
            )}
          </section>
        )}

        {reportSubTab === 'analytics' && (
          <section className="report-section">
            <div className="report-section-head">
              <h2 className="report-section-title">Analytics</h2>
            </div>
            <div className="analytics-card">
              <div className="analytics-top-full-row">
                {renderAnalyticsPeriodPills()}
                {analyticsPeriod === 'day' && (
                  <>
                    <input
                      type="date"
                      className="form-control daily-date-input"
                      value={analyticsDayInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAnalyticsDayInput(v);
                        setAnalyticsDayApplied(v);
                      }}
                    />
                  </>
                )}
                {analyticsPeriod === 'week' && (
                  <div className="analytics-inline-period-controls">
                    <div className="analytics-week-mode analytics-week-mode--inline">
                      <label className="form-check form-check-inline mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="weekMode"
                          checked={analyticsWeekMode === 'iso'}
                          onChange={() => setAnalyticsWeekMode('iso')}
                        />
                        <span className="form-check-label">Calendar week</span>
                      </label>
                      <label className="form-check form-check-inline mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="weekMode"
                          checked={analyticsWeekMode === 'range'}
                          onChange={() => setAnalyticsWeekMode('range')}
                        />
                        <span className="form-check-label">Date range</span>
                      </label>
                    </div>
                    {analyticsWeekMode === 'iso' ? (
                      <input
                        type="week"
                        className="form-control form-control-sm analytics-control-tight"
                        value={analyticsWeekIso}
                        onChange={(e) => setAnalyticsWeekIso(e.target.value)}
                      />
                    ) : (
                      <div className="analytics-range-row analytics-range-row--inline">
                        <input
                          type="date"
                          className="form-control form-control-sm analytics-control-tight"
                          value={analyticsWeekStart}
                          onChange={(e) => setAnalyticsWeekStart(e.target.value)}
                        />
                        <span className="analytics-range-to">to</span>
                        <input
                          type="date"
                          className="form-control form-control-sm analytics-control-tight"
                          value={analyticsWeekEnd}
                          onChange={(e) => setAnalyticsWeekEnd(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
                {analyticsPeriod === 'month' && (
                  <div className="analytics-inline-period-controls">
                    <input
                      type="month"
                      className="form-control form-control-sm analytics-control-tight"
                      value={analyticsMonth}
                      onChange={(e) => setAnalyticsMonth(e.target.value)}
                    />
                  </div>
                )}
                {analyticsPeriod === 'fyear' && (
                  <div className="analytics-inline-period-controls">
                    <select
                      className="form-select form-select-sm analytics-fy-select analytics-control-tight"
                      value={analyticsFY}
                      onChange={(e) => setAnalyticsFY(e.target.value)}
                    >
                      {fyOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} (Apr–Mar)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {analyticsStatsBoxes}
                {analyticsRange && (
                  <span className="analytics-range-inline analytics-range-inline-trailing">
                    <strong>Selected period:</strong> {analyticsRange.label}
                  </span>
                )}
                {!analyticsRange && (
                  <span className="analytics-invalid-inline text-danger small analytics-range-inline-trailing">
                    Invalid period — check your inputs.
                  </span>
                )}
              </div>
              <div className="daily-table-wrap">
                <table className="daily-entries-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Time</th>
                      <th>SR. NO.</th>
                      <th>REEL NO.</th>
                      <th>SHADE</th>
                      <th>BF</th>
                      <th>GSM</th>
                      <th>SIZE</th>
                      <th>WEIGHT</th>
                      <th>Reel Out</th>
                      <th>Out Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsDetailRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="daily-table-empty">
                          No entries in this period.
                        </td>
                      </tr>
                    ) : (
                      analyticsDetailRows.map((row, idx) => (
                        <tr key={row.reel.id}>
                          <td>{idx + 1}</td>
                          <td>{row.displayTime}</td>
                          <td>{row.reel.srNo}</td>
                          <td className="fw-semibold">{row.reel.reelNo}</td>
                          <td>{row.reel.shade}</td>
                          <td>{row.reel.bf}</td>
                          <td>{row.reel.gsm}</td>
                          <td>{row.reel.size}</td>
                          <td>{row.reel.weight}</td>
                          <td>
                            <span
                              className={
                                row.reelOut ? 'daily-badge daily-badge-out' : 'daily-badge daily-badge-in'
                              }
                            >
                              {row.reelOut ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>{row.outDateCell}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {reportSubTab === 'reelchart' && isAdmin && <ReelChartReport reels={reels} />}

        {reportSubTab === 'minimum' && isAdmin && (
          <section className="report-section report-section-minimum">
            <MinimumStockManagement
              embedded
              reels={reels}
              stockMinimums={stockMinimums}
              setStockMinimums={setStockMinimums}
            />
            <div className="report-section-head mt-4">
              <h2 className="report-section-title">Below minimum stock</h2>
            </div>
            <div className="min-stock-report-card">
              {stockMinimums.length === 0 ? (
                <p className="text-muted mb-0">
                  No minimum rules yet. Add rules in the section above, then this area will list any
                  Size + GSM groups that fall below their minimum in-stock count.
                </p>
              ) : lowMinStock.length === 0 ? (
                <div className="min-stock-report-banner min-stock-report-banner-ok" role="status">
                  <Gauge size={22} aria-hidden />
                  <div>
                    <strong>All groups meet minimum stock</strong>
                    <p className="mb-0">
                      Every Size + GSM rule you configured has enough reels marked in stock in the
                      system. This report is for checking only — it does not change reel data.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-stock-report-banner" role="alert">
                    <AlertTriangle size={22} aria-hidden />
                    <div>
                      <strong>Reels not maintaining minimum stock</strong>
                      <p className="mb-0">
                        The groups below have fewer in-stock reels than the minimum you configured
                        (Size + GSM). This report is for checking only — it does not change any reel
                        data. Please check physical stock and update entries in Reel Stock Management.
                      </p>
                    </div>
                  </div>
                  <div className="table-responsive">
                  <table className="table table-bordered min-stock-report-table mb-0">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>GSM</th>
                        <th>Min required</th>
                        <th>In stock now</th>
                        <th>Short by</th>
                        <th>In-stock reel nos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowMinStock.map((row) => {
                        const inStock = getInStockReelsForRule(reels, row.size, row.gsm);
                        return (
                          <tr key={row.id} className="min-stock-report-row-low">
                            <td>{row.size}</td>
                            <td>{row.gsm}</td>
                            <td>{row.minReels}</td>
                            <td className="text-danger fw-bold">{row.current}</td>
                            <td className="fw-semibold">{row.shortfall}</td>
                            <td className="min-stock-reel-nos">
                              {inStock.length
                                ? inStock.map((r) => r.reelNo).join(', ')
                                : '— none in system —'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
              {minStockStatus.length > 0 && (
                <details className="min-stock-report-all mt-3">
                  <summary className="small text-muted">View all Size + GSM rules</summary>
                  <div className="table-responsive mt-2">
                    <table className="table table-sm table-striped mb-0">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>GSM</th>
                          <th>Min</th>
                          <th>In stock</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {minStockStatus.map((row) => (
                          <tr key={row.id}>
                            <td>{row.size}</td>
                            <td>{row.gsm}</td>
                            <td>{row.minReels}</td>
                            <td>{row.current}</td>
                            <td>{row.isLow ? 'Below minimum' : 'OK'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          </section>
        )}
      </div>

      {showDetailsModal && (
        <div className="reel-details-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="reel-details-container" onClick={(e) => e.stopPropagation()}>
            <div className="reel-details-header">
              <h3 className="reel-details-title">{modalTitle}</h3>
              <button className="reel-details-close" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="reel-details-body">
              <div className="reel-details-table-container">
                <table className="reel-details-table">
                  <thead>
                    <tr>
                      <th>#Count</th>
                      <th>SR. NO.</th>
                      <th>REEL NO.</th>
                      <th>SHADE</th>
                      <th>BF</th>
                      <th>GSM</th>
                      <th>SIZE</th>
                      <th>WEIGHT (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((reel, index) => (
                      <tr key={reel.id}>
                        <td className="count-column">{index + 1}</td>
                        <td>{reel.srNo}</td>
                        <td className="fw-bold">{reel.reelNo}</td>
                        <td>{reel.shade}</td>
                        <td>{reel.bf}</td>
                        <td>{reel.gsm}</td>
                        <td>{reel.size}</td>
                        <td className="fw-bold text-primary">{reel.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="reel-details-footer">
                <span>Total Reels: {modalData.length}</span>
                <span>
                  Total Weight:{' '}
                  {modalData.reduce((sum, reel) => sum + parseFloat(reel.weight || 0), 0).toFixed(2)}{' '}
                  kg
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
