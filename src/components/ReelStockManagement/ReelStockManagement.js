import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Package, Clock, Edit2, Trash2, X, Check, ListFilter, FileSpreadsheet, Scale, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import './ReelStockManagement.css';
import { displayDate } from '../../utils/dateFormat';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import ExcelImportModal from '../ExcelImportModal/ExcelImportModal';
import SpreadsheetFilterMenu from '../SpreadsheetFilterMenu/SpreadsheetFilterMenu';
import { showError, showSuccess, showWarning } from '../../utils/toastUtils';
import { getLowStockItems } from '../../utils/stockMinimumUtils';
import {
  dismissMinStockRuleIds,
  getDismissedMinStockIds,
  markMinStockToastShown,
  syncDismissedWithLowRules,
  wasMinStockToastShown
} from '../../utils/minStockNotificationStorage';
import {
  addReelFieldOption,
  isShadeOptionExcluded,
  loadReelFieldOptions,
  normalizeBfValue,
  normalizeShadeValue
} from '../../utils/reelFieldOptions';
import ReelOptionSelect from './ReelOptionSelect';
import AddReelOptionModal from './AddReelOptionModal';

const FILTER_COLUMN_KEYS = ['date', 'srNo', 'reelNo', 'shade', 'bf', 'gsm', 'size', 'weight', 'status', 'outDetails'];

const REEL_TABLE_COLGROUP = (
  <colgroup>
    <col className="reel-col-date" />
    <col className="reel-col-srno" />
    <col className="reel-col-reelno" />
    <col className="reel-col-shade" />
    <col className="reel-col-bf" />
    <col className="reel-col-gsm" />
    <col className="reel-col-size" />
    <col className="reel-col-weight" />
    <col className="reel-col-status" />
    <col className="reel-col-out" />
    <col className="reel-col-actions" />
  </colgroup>
);

const mergeOptionWithValue = (options, value, field) => {
  const normalized =
    field === 'shade' ? normalizeShadeValue(value) : normalizeBfValue(value);
  if (!normalized || (field === 'shade' && isShadeOptionExcluded(normalized))) return options;
  if (options.some((opt) => opt.toLowerCase() === normalized.toLowerCase())) return options;
  return [...options, normalized];
};

/** OUT DETAILS filter: AVAILABLE first, then other values (dates, —) sorted. */
const sortOutDetailsFilterValues = (values) =>
  [...values].sort((a, b) => {
    const av = String(a);
    const bv = String(b);
    if (av === 'AVAILABLE' && bv !== 'AVAILABLE') return -1;
    if (bv === 'AVAILABLE' && av !== 'AVAILABLE') return 1;
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
  });

const parseWeightKg = (value) => {
  const n = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const formatWeightKg = (kg) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(kg);

const formatWeightTon = (kg) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(kg / 1000);

const getCellValue = (reel, colKey) => {
  switch (colKey) {
    case 'date':
      return reel.date || '';
    case 'srNo':
      return String(reel.srNo ?? '');
    case 'reelNo':
      return String(reel.reelNo ?? '');
    case 'shade':
      return String(reel.shade ?? '');
    case 'bf':
      return String(reel.bf ?? '');
    case 'gsm':
      return String(reel.gsm ?? '');
    case 'size':
      return String(reel.size ?? '');
    case 'weight':
      return reel.weight != null && reel.weight !== '' ? String(reel.weight) : '';
    case 'status':
      return reel.isCheckedOut ? 'Out' : 'In';
    case 'outDetails':
      return reel.isCheckedOut ? reel.outDate || '—' : 'AVAILABLE';
    default:
      return '';
  }
};

const ReelStockManagement = ({
  reels,
  stockMinimums = [],
  userRole,
  userName,
  onAddReel,
  onBulkAddReels,
  onUpdateReel,
  onDeleteReel,
  onToggleReel,
  isLoading
}) => {
  const [editingReelId, setEditingReelId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);
  const [newReelData, setNewReelData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    srNo: '',
    reelNo: '',
    shade: '',
    bf: '',
    gsm: '',
    size: '',
    weight: ''
  });
  const [columnValueFilters, setColumnValueFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(null);
  const [filterMenu, setFilterMenu] = useState(null);
  /** Table-only slice: all | in stock | out stock (stats use column-filter scope only). */
  const [stockListFilter, setStockListFilter] = useState('all');
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [isExcelImporting, setIsExcelImporting] = useState(false);
  const [minStockDismissTick, setMinStockDismissTick] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  const [shadeOptions, setShadeOptions] = useState(() => loadReelFieldOptions('shade'));
  const [bfOptions, setBfOptions] = useState(() => loadReelFieldOptions('bf'));
  const [addOptionField, setAddOptionField] = useState(null);
  const tableBodyRef = useRef(null);
  const firstAddInputRef = useRef(null);

  const applyReelFieldValue = (field, value) => {
    if (isAddingInline) {
      setNewReelData((prev) => ({ ...prev, [field]: value }));
    }
    if (editingReelId && editFormData) {
      setEditFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const openAddOptionModal = (field) => {
    setAddOptionField(field);
  };

  const handleSaveReelOption = (field, rawValue) => {
    const current = field === 'shade' ? shadeOptions : bfOptions;
    const { options, value, error } = addReelFieldOption(field, rawValue, current);

    if (field === 'shade') {
      setShadeOptions(options);
    } else {
      setBfOptions(options);
    }

    if (value) {
      applyReelFieldValue(field, value);
    }

    if (error === 'This option already exists') {
      showWarning('That option already exists — it has been selected.');
      return { value, error: null };
    }
    if (error) {
      return { value, error };
    }

    showSuccess(`${field === 'shade' ? 'Shade' : 'BF'} "${value}" added.`);
    return { value, error: null };
  };

  const buildBlankReel = () => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    srNo: '',
    reelNo: '',
    shade: '',
    bf: '',
    gsm: '',
    size: '',
    weight: ''
  });

  // Show confirmation modal
  const showConfirmation = (title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setConfirmConfig({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setShowConfirmModal(false);
      },
      confirmText,
      cancelText
    });
    setShowConfirmModal(true);
  };

  const handleToggleReel = async (id) => {
    const reel = reels.find(r => r.id === id);
    
    if (reel.isCheckedOut) {
      showConfirmation(
        'Confirm Check In',
        'Are you sure you want to check in this reel?',
        async () => {
          try {
            await onToggleReel(id);
            showSuccess('Reel has been checked in successfully!');
          } catch (error) {
            showError(error.message || 'Failed to check in reel.');
          }
        },
        'Yes, Check In',
        'Cancel'
      );
    } else {
      try {
        await onToggleReel(id);
        showSuccess(`Reel ${reel.reelNo} has been checked out!`);
      } catch (error) {
        showError(error.message || 'Failed to check out reel.');
      }
    }
  };

  const handleExcelImport = async (rows) => {
    if (!onBulkAddReels || !rows.length) return;
    setIsExcelImporting(true);
    try {
      const result = await onBulkAddReels(rows);
      const imported = result.imported ?? result.created?.length ?? 0;
      const failed = result.failed ?? result.errors?.length ?? 0;
      if (imported > 0) {
        showSuccess(
          failed > 0
            ? `Imported ${imported} reel(s). ${failed} row(s) failed.`
            : `Imported ${imported} reel(s) from Excel.`
        );
        setShowExcelImport(false);
      } else {
        showError('No reels were imported. Check SR No and Reel No on each row.');
      }
    } catch (error) {
      showError(error.message || 'Excel import failed.');
    } finally {
      setIsExcelImporting(false);
    }
  };

  const handleAddReel = async (newReel) => {
    if (!newReel.srNo.trim() || !newReel.reelNo.trim()) {
      return;
    }

    try {
      await onAddReel({
        ...newReel,
        shade: normalizeShadeValue(newReel.shade),
        bf: normalizeBfValue(newReel.bf)
      });
      if (isBulkAddMode) {
        setNewReelData((prev) => ({
          ...buildBlankReel(),
          shade: prev.shade,
          bf: prev.bf
        }));
      } else {
        setIsAddingInline(false);
        setNewReelData(buildBlankReel());
      }
      showSuccess(`Reel ${newReel.reelNo} added successfully!`);
    } catch (error) {
      showError(error.message || 'Failed to add reel.');
    }
  };

  const startInlineAdd = () => {
    setEditingReelId(null);
    setEditFormData(null);
    setIsAddingInline(true);
  };

  const handleEditReel = (reel) => {
    setEditingReelId(reel.id);
    setEditFormData({
      date: reel.date || '',
      srNo: reel.srNo || '',
      reelNo: reel.reelNo || '',
      shade: reel.shade || '',
      bf: reel.bf || '',
      gsm: reel.gsm || '',
      size: reel.size || '',
      weight: reel.weight || ''
    });
  };

  const handleUpdateReel = async (updatedReel) => {
    if (!updatedReel.srNo.trim() || !updatedReel.reelNo.trim()) {
      return;
    }

    try {
      await onUpdateReel({
        ...updatedReel,
        shade: normalizeShadeValue(updatedReel.shade),
        bf: normalizeBfValue(updatedReel.bf)
      });
      setEditingReelId(null);
      setEditFormData(null);
      showSuccess(`Reel ${updatedReel.reelNo} updated successfully!`);
    } catch (error) {
      showError(error.message || 'Failed to update reel.');
    }
  };

  const cancelInlineAdd = () => {
    setIsAddingInline(false);
    setNewReelData(buildBlankReel());
  };

  const cancelInlineEdit = () => {
    setEditingReelId(null);
    setEditFormData(null);
  };

  const handleDeleteReel = (id) => {
    const reelToDelete = reels.find(r => r.id === id);
    showConfirmation(
      'Confirm Delete',
      `Are you sure you want to delete reel ${reelToDelete?.reelNo}? This action cannot be undone.`,
      async () => {
        try {
          await onDeleteReel(id);
          showSuccess(`Reel ${reelToDelete?.reelNo} deleted successfully!`);
        } catch (error) {
          showError(error.message || 'Failed to delete reel.');
        }
      },
      'Yes, Delete',
      'Cancel'
    );
  };

  const clearFilters = () => {
    setColumnValueFilters({});
    setSortConfig(null);
    setStockListFilter('all');
    setFilterMenu(null);
    showSuccess('All filters cleared!');
  };

  const hasActiveFilters =
    stockListFilter !== 'all' ||
    sortConfig !== null ||
    Object.keys(columnValueFilters).length > 0;

  const uniqueByColumn = useMemo(() => {
    const out = {};
    FILTER_COLUMN_KEYS.forEach((k) => {
      const s = new Set(reels.map((r) => getCellValue(r, k)));
      const arr = Array.from(s);
      out[k] =
        k === 'outDetails'
          ? sortOutDetailsFilterValues(arr)
          : arr.sort((a, b) =>
              String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
            );
    });
    return out;
  }, [reels]);

  const applyColumnFilterDraft = (colKey, draftSet) => {
    const allVals = new Set(uniqueByColumn[colKey] || []);
    setColumnValueFilters((prev) => {
      const next = { ...prev };
      if (draftSet.size === 0) {
        next[colKey] = new Set();
      } else if (draftSet.size === allVals.size) {
        delete next[colKey];
      } else {
        next[colKey] = new Set(draftSet);
      }
      return next;
    });
  };

  const hasColumnFilter = (key) => Object.prototype.hasOwnProperty.call(columnValueFilters, key);

  const openFilterMenu = (colKey, el) => {
    if (filterMenu?.column === colKey) {
      setFilterMenu(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const values = uniqueByColumn[colKey] || [];
    const selected = columnValueFilters[colKey] ? Array.from(columnValueFilters[colKey]) : [...values];
    setFilterMenu({
      column: colKey,
      nonce: Date.now(),
      position: {
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 288))
      },
      values,
      initialSelected: selected
    });
  };

  const handleStockFilterClick = (next) => {
    setStockListFilter((prev) => {
      if (next === 'all') return 'all';
      return prev === next ? 'all' : next;
    });
  };

  // Column value filters (Sheets-style) + optional sort, then stock tab slice
  const scopeFilteredReels = useMemo(() => {
    let list = reels.filter((r) => {
      for (const col of Object.keys(columnValueFilters)) {
        const allowed = columnValueFilters[col];
        if (!allowed) continue;
        if (allowed.size === 0) return false;
        if (!allowed.has(getCellValue(r, col))) return false;
      }
      return true;
    });
    if (sortConfig) {
      const { key, dir } = sortConfig;
      list = [...list].sort((a, b) => {
        const cmp = String(getCellValue(a, key)).localeCompare(String(getCellValue(b, key)), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [reels, columnValueFilters, sortConfig]);

  const tableReels = useMemo(() => {
    if (stockListFilter === 'in') {
      return scopeFilteredReels.filter((r) => !r.isCheckedOut);
    }
    if (stockListFilter === 'out') {
      return scopeFilteredReels.filter((r) => r.isCheckedOut);
    }
    return scopeFilteredReels;
  }, [scopeFilteredReels, stockListFilter]);

  // Statistics for the three boxes (same scope as column filters, not sliced by stock tab)
  const stats = useMemo(() => {
    const totalReels = scopeFilteredReels.length;
    const inStock = scopeFilteredReels.filter((r) => !r.isCheckedOut);
    const reelsIn = inStock.length;
    const reelsOut = scopeFilteredReels.filter((r) => r.isCheckedOut).length;
    const totalWeightKg = inStock.reduce((sum, r) => sum + parseWeightKg(r.weight), 0);

    return { totalReels, reelsIn, reelsOut, totalWeightKg };
  }, [scopeFilteredReels]);

  const lowStockAlerts = useMemo(
    () => getLowStockItems(reels, stockMinimums),
    [reels, stockMinimums]
  );

  const isAdmin = userRole === 'admin';

  const undismissedLowAlerts = useMemo(() => {
    if (!isAdmin) return [];
    const dismissed = getDismissedMinStockIds(userName);
    return lowStockAlerts.filter((item) => !dismissed.has(item.id));
  }, [isAdmin, lowStockAlerts, userName, minStockDismissTick]);

  useEffect(() => {
    if (!isAdmin || !userName) return;
    const lowIds = lowStockAlerts.map((item) => item.id);
    syncDismissedWithLowRules(userName, lowIds);
  }, [isAdmin, userName, lowStockAlerts]);

  useEffect(() => {
    if (!isAdmin || undismissedLowAlerts.length === 0) return;
    const signature = undismissedLowAlerts
      .map((item) => item.id)
      .sort()
      .join(',');
    if (wasMinStockToastShown(userName, signature)) return;
    showWarning(
      `${undismissedLowAlerts.length} Size + GSM combo(s) are below minimum stock. Check Reports → Minimum stock.`
    );
    markMinStockToastShown(userName, signature);
  }, [isAdmin, userName, undismissedLowAlerts]);

  const handleDismissMinStockAlert = () => {
    dismissMinStockRuleIds(
      userName,
      undismissedLowAlerts.map((item) => item.id)
    );
    setMinStockDismissTick((n) => n + 1);
    showSuccess('Minimum stock alert dismissed. View the full list under Reports → Minimum stock.');
  };

  useEffect(() => {
    if (!isAddingInline) {
      return;
    }

    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = 0;
    }

    const timer = setTimeout(() => {
      firstAddInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [isAddingInline, reels.length]);

  if (isLoading) {
    return (
      <div className="stock-management-container">
        <div className="main-card shadow-sm border-0 p-4 text-center">
          Loading reels...
        </div>
      </div>
    );
  }

  return (
    <div className="stock-management-container">
      {isAdmin && undismissedLowAlerts.length > 0 && (
        <div className="stock-minimum-alert mb-2" role="alert">
          <div className="stock-minimum-alert-head">
            <div className="stock-minimum-alert-head-left">
              <AlertTriangle size={20} aria-hidden />
              <strong>Below minimum stock</strong>
              <span className="stock-minimum-alert-count">
                {undismissedLowAlerts.length} Size + GSM{' '}
                {undismissedLowAlerts.length === 1 ? 'combo' : 'combos'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light stock-minimum-alert-dismiss"
              onClick={handleDismissMinStockAlert}
            >
              Dismiss
            </button>
          </div>
          <ul className="stock-minimum-alert-list">
            {undismissedLowAlerts.map((item) => (
              <li key={item.id}>
                Size <strong>{item.size}</strong> · GSM <strong>{item.gsm}</strong> —{' '}
                <span className="text-danger fw-semibold">{item.current}</span> in stock, minimum{' '}
                <strong>{item.minReels}</strong>
                {item.shortfall > 0 ? (
                  <span className="ms-1">(short by {item.shortfall})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Cards & Actions Bar - All in One Row */}
      <div className="header-stats-row mb-2">
        {/* Stats Cards */}
        <div className="stats-cards-inline">
          <button
            type="button"
            className={`stat-card-inline stat-card-total stat-card-filter${stockListFilter === 'all' ? ' stat-card-active' : ''}`}
            onClick={() => handleStockFilterClick('all')}
            aria-pressed={stockListFilter === 'all'}
            title="Show all reels in the list (for current column filters)"
          >
            <div className="stat-card-icon-inline">
              <Package size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">Total Reels</span>
              <span className="stat-value-inline">{stats.totalReels}</span>
            </div>
          </button>
          
          <button
            type="button"
            className={`stat-card-inline stat-card-in stat-card-filter${stockListFilter === 'in' ? ' stat-card-active' : ''}`}
            onClick={() => handleStockFilterClick('in')}
            aria-pressed={stockListFilter === 'in'}
            title="Show only in-stock reels (not checked out). Click again to show all."
          >
            <div className="stat-card-icon-inline">
              <Package size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">In Stock Reels</span>
              <span className="stat-value-inline">{stats.reelsIn}</span>
            </div>
          </button>
          
          <button
            type="button"
            className={`stat-card-inline stat-card-out stat-card-filter${stockListFilter === 'out' ? ' stat-card-active' : ''}`}
            onClick={() => handleStockFilterClick('out')}
            aria-pressed={stockListFilter === 'out'}
            title="Show only out-stock reels (checked out). Click again to show all."
          >
            <div className="stat-card-icon-inline">
              <Clock size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">Out Stock Reels</span>
              <span className="stat-value-inline">{stats.reelsOut}</span>
            </div>
          </button>

          <div
            className="stat-card-inline stat-card-weight"
            title="Sum of weight for in-stock reels (not checked out)"
          >
            <div className="stat-card-icon-inline">
              <Scale size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">Available Weight</span>
              <span className="stat-value-inline stat-value-weight">
                {formatWeightKg(stats.totalWeightKg)} <span className="stat-weight-unit">KG</span>
              </span>
              <span className="stat-value-weight-ton">
                {formatWeightTon(stats.totalWeightKg)} <span className="stat-weight-unit">Ton</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="action-section">
          <button  
            className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" 
            onClick={startInlineAdd}
            disabled={isAddingInline}
          >
            <Plus size={18} /> {isAddingInline ? 'Adding Row...' : 'Add New Reel'}
          </button>
          <button
            type="button"
            className="btn btn-outline-success d-flex align-items-center gap-2 px-3 shadow-sm"
            onClick={() => setShowExcelImport(true)}
            disabled={isAddingInline || isExcelImporting}
          >
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="bulkEntryMode"
              checked={isBulkAddMode}
              onChange={(e) => setIsBulkAddMode(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="bulkEntryMode">
              Bulk entry mode
            </label>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="main-card shadow-sm border-0">
        {/* Fixed Table Header with Scrollable Body */}
        <div className="table-wrapper">
          <div className="table-scroll" ref={tableBodyRef}>
            <table className="table table-hover table-align-middle reel-stock-table mb-0">
              {REEL_TABLE_COLGROUP}
              <thead className="table-light-header reel-stock-table-head">
                <tr>
                  <th className="table-th-filter reel-col-first">
                    <div className="table-header-filter-inner">
                      <span>DATE</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('date') ? ' active' : ''}${
                          sortConfig?.key === 'date' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('date', e.currentTarget)}
                        aria-label="Filter date column"
                        aria-expanded={filterMenu?.column === 'date'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>SR NO.</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('srNo') ? ' active' : ''}${
                          sortConfig?.key === 'srNo' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('srNo', e.currentTarget)}
                        aria-label="Filter SR No column"
                        aria-expanded={filterMenu?.column === 'srNo'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>REEL NO.</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('reelNo') ? ' active' : ''}${
                          sortConfig?.key === 'reelNo' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('reelNo', e.currentTarget)}
                        aria-label="Filter Reel No column"
                        aria-expanded={filterMenu?.column === 'reelNo'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>SHADE</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('shade') ? ' active' : ''}${
                          sortConfig?.key === 'shade' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('shade', e.currentTarget)}
                        aria-label="Filter shade column"
                        aria-expanded={filterMenu?.column === 'shade'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>BF</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('bf') ? ' active' : ''}${
                          sortConfig?.key === 'bf' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('bf', e.currentTarget)}
                        aria-label="Filter BF column"
                        aria-expanded={filterMenu?.column === 'bf'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>GSM</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('gsm') ? ' active' : ''}${
                          sortConfig?.key === 'gsm' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('gsm', e.currentTarget)}
                        aria-label="Filter GSM column"
                        aria-expanded={filterMenu?.column === 'gsm'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>SIZE</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('size') ? ' active' : ''}${
                          sortConfig?.key === 'size' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('size', e.currentTarget)}
                        aria-label="Filter size column"
                        aria-expanded={filterMenu?.column === 'size'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="table-th-filter">
                    <div className="table-header-filter-inner">
                      <span>WEIGHT</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('weight') ? ' active' : ''}${
                          sortConfig?.key === 'weight' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('weight', e.currentTarget)}
                        aria-label="Filter weight column"
                        aria-expanded={filterMenu?.column === 'weight'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="text-center table-th-filter">
                    <div className="table-header-filter-inner table-header-filter-inner-center">
                      <span>STATUS</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('status') ? ' active' : ''}${
                          sortConfig?.key === 'status' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('status', e.currentTarget)}
                        aria-label="Filter status column"
                        aria-expanded={filterMenu?.column === 'status'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="text-center table-th-filter">
                    <div className="table-header-filter-inner table-header-filter-inner-center">
                      <span>OUT DETAILS</span>
                      <button
                        type="button"
                        className={`table-header-filter-btn${hasColumnFilter('outDetails') ? ' active' : ''}${
                          sortConfig?.key === 'outDetails' ? ' sorted' : ''
                        }`}
                        onClick={(e) => openFilterMenu('outDetails', e.currentTarget)}
                        aria-label="Filter out details column"
                        aria-expanded={filterMenu?.column === 'outDetails'}
                      >
                        <ListFilter size={14} aria-hidden />
                      </button>
                    </div>
                  </th>
                  <th className="text-center reel-col-last">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary table-filter-clear-btn"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      title="Clear all filters and sorting"
                    >
                      <X size={14} className="me-1" aria-hidden />
                      Clear
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
              <>
                {isAddingInline && (
                  <tr className="table-warning">
                    <td className="reel-col-first">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={newReelData.date}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        ref={firstAddInputRef}
                        type="text"
                        className="form-control form-control-sm"
                        value={newReelData.srNo}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, srNo: e.target.value }))}
                        placeholder="SR No"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newReelData.reelNo}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, reelNo: e.target.value }))}
                        placeholder="Reel No"
                      />
                    </td>
                    <td>
                      <ReelOptionSelect
                        options={mergeOptionWithValue(shadeOptions, newReelData.shade, 'shade')}
                        value={newReelData.shade}
                        onChange={(shade) =>
                          setNewReelData((prev) => ({ ...prev, shade: normalizeShadeValue(shade) }))
                        }
                        onAddClick={() => openAddOptionModal('shade')}
                        ariaLabel="Shade"
                      />
                    </td>
                    <td>
                      <ReelOptionSelect
                        options={mergeOptionWithValue(bfOptions, newReelData.bf, 'bf')}
                        value={newReelData.bf}
                        onChange={(bf) =>
                          setNewReelData((prev) => ({ ...prev, bf: normalizeBfValue(bf) }))
                        }
                        onAddClick={() => openAddOptionModal('bf')}
                        ariaLabel="BF"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newReelData.gsm}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, gsm: e.target.value }))}
                        placeholder="GSM"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newReelData.size}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, size: e.target.value }))}
                        placeholder="Size"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        value={newReelData.weight}
                        onChange={(e) => setNewReelData(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="Weight"
                      />
                    </td>
                    <td className="text-center">
                      <span className="badge bg-success-subtle text-success">IN</span>
                    </td>
                    <td className="text-center">
                      <span className="badge-in">AVAILABLE</span>
                    </td>
                    <td className="text-center reel-col-last">
                      <div className="action-buttons">
                        <button
                          className="action-btn edit-btn me-2"
                          onClick={() => handleAddReel(newReelData)}
                          title="Save Reel"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={cancelInlineAdd}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {tableReels.length === 0 && !isAddingInline ? (
                  <tr style={{ height: '410px' }}>
                    <td colSpan="11" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div className="empty-state">
                        <Package size={48} className="text-muted opacity-25 mb-3" />
                        <p className="text-muted m-0">
                          {scopeFilteredReels.length > 0 && tableReels.length === 0
                            ? 'No reels in this category. Try another stock filter or clear filters.'
                            : 'No reels found matching your criteria.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tableReels.map((reel) => (
                  <tr key={reel.id} className={reel.isCheckedOut ? 'table-row-out' : ''}>
                    <td className="reel-col-first fw-medium">
                      {editingReelId === reel.id ? (
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editFormData.date}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                      ) : (
                        displayDate(reel.date)
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editFormData.srNo}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, srNo: e.target.value }))}
                        />
                      ) : (
                        reel.srNo
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editFormData.reelNo}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, reelNo: e.target.value }))}
                        />
                      ) : (
                        <span className="fw-bold text-dark">{reel.reelNo}</span>
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <ReelOptionSelect
                          options={mergeOptionWithValue(shadeOptions, editFormData.shade, 'shade')}
                          value={editFormData.shade}
                          onChange={(shade) =>
                            setEditFormData((prev) => ({ ...prev, shade: normalizeShadeValue(shade) }))
                          }
                          onAddClick={() => openAddOptionModal('shade')}
                          ariaLabel="Shade"
                        />
                      ) : (
                        <span className="reel-shade-display">{reel.shade || '—'}</span>
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <ReelOptionSelect
                          options={mergeOptionWithValue(bfOptions, editFormData.bf, 'bf')}
                          value={editFormData.bf}
                          onChange={(bf) =>
                            setEditFormData((prev) => ({ ...prev, bf: normalizeBfValue(bf) }))
                          }
                          onAddClick={() => openAddOptionModal('bf')}
                          ariaLabel="BF"
                        />
                      ) : (
                        reel.bf
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editFormData.gsm}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, gsm: e.target.value }))}
                        />
                      ) : (
                        reel.gsm
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editFormData.size}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, size: e.target.value }))}
                        />
                      ) : (
                        reel.size
                      )}
                    </td>
                    <td>
                      {editingReelId === reel.id ? (
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={editFormData.weight}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, weight: e.target.value }))}
                        />
                      ) : (
                        <span className="fw-bold text-primary">{reel.weight} <small>kg</small></span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="form-check d-flex justify-content-center">
                        <input 
                          className="form-check-input cursor-pointer shadow-none" 
                          type="checkbox" 
                          checked={reel.isCheckedOut}
                          onChange={() => handleToggleReel(reel.id)}
                          disabled={editingReelId === reel.id}
                          style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                        />
                      </div>
                    </td>
                    <td className="text-center">
                      {reel.isCheckedOut ? (
                        <div className="badge-out">
                          <Clock size={12} className="me-1" /> {reel.outDate}
                        </div>
                      ) : (
                        <span className="badge-in">AVAILABLE</span>
                      )}
                    </td>
                    <td className="text-center reel-col-last">
                      <div className="action-buttons">
                        {editingReelId === reel.id ? (
                          <>
                            <button
                              className="action-btn edit-btn me-2"
                              onClick={() => handleUpdateReel({ ...reel, ...editFormData })}
                              title="Save Reel"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={cancelInlineEdit}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="action-btn edit-btn me-2" 
                              onClick={() => handleEditReel(reel)}
                              title="Edit Reel"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="action-btn delete-btn" 
                              onClick={() => handleDeleteReel(reel.id)}
                              title="Delete Reel"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table summary (no pagination) */}
        <div className="card-footer bg-white border-top p-2">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-muted small fw-medium">
              <span className="text-dark fw-bold">{tableReels.length}</span>
              {' '}
              reel{tableReels.length !== 1 ? 's' : ''} in view
            </span>
            {stockListFilter !== 'all' && (
              <span className="badge bg-soft-primary text-primary rounded-pill px-2 py-1">
                {stockListFilter === 'in' ? 'In stock only' : 'Out stock only'}
              </span>
            )}
          </div>
        </div>
      </div>

      <SpreadsheetFilterMenu
        isOpen={Boolean(filterMenu)}
        resetKey={filterMenu?.nonce ?? 0}
        title={filterMenu ? `Filter ${filterMenu.column}` : 'Filter'}
        values={filterMenu?.values ?? []}
        initialSelected={filterMenu?.initialSelected ?? []}
        position={filterMenu?.position}
        onClose={() => setFilterMenu(null)}
        onApply={(draft) => {
          if (filterMenu) applyColumnFilterDraft(filterMenu.column, draft);
        }}
        onSortAsc={() => {
          if (filterMenu) setSortConfig({ key: filterMenu.column, dir: 'asc' });
          setFilterMenu(null);
        }}
        onSortDesc={() => {
          if (filterMenu) setSortConfig({ key: filterMenu.column, dir: 'desc' });
          setFilterMenu(null);
        }}
      />

      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImport={handleExcelImport}
        isImporting={isExcelImporting}
      />

      <AddReelOptionModal
        isOpen={Boolean(addOptionField)}
        field={addOptionField}
        onClose={() => setAddOptionField(null)}
        onSave={handleSaveReelOption}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
      />
    </div>
  );
};

export default ReelStockManagement;