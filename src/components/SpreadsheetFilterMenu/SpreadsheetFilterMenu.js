import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import './SpreadsheetFilterMenu.css';

/**
 * Google-Sheets–style column filter panel: search, select all / clear, value checkboxes, OK / Cancel.
 */
const SpreadsheetFilterMenu = ({
  isOpen,
  title,
  values,
  resetKey,
  initialSelected,
  position,
  onApply,
  onClose,
  onSortAsc,
  onSortDesc
}) => {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(() => new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setDraft(new Set(initialSelected));
  }, [isOpen, resetKey, initialSelected]);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e) => {
      if (e.target.closest?.('.spreadsheet-filter-menu')) return;
      if (e.target.closest?.('.table-header-filter-btn')) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isOpen, onClose]);

  const filteredValues = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return values;
    return values.filter((v) => String(v).toLowerCase().includes(q));
  }, [values, search]);

  if (!isOpen || !position) return null;

  const allSelected = filteredValues.length > 0 && filteredValues.every((v) => draft.has(v));
  const toggleAllFiltered = () => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredValues.forEach((v) => next.delete(v));
      } else {
        filteredValues.forEach((v) => next.add(v));
      }
      return next;
    });
  };

  const toggleOne = (v) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      className="spreadsheet-filter-menu"
      role="dialog"
      aria-label={title || 'Column filter'}
      style={{ top: position.top, left: position.left }}
    >
      <div className="spreadsheet-filter-menu-inner">
        <div className="spreadsheet-filter-sort">
          <button type="button" className="spreadsheet-filter-sort-btn" onClick={onSortAsc}>
            Sort A → Z
          </button>
          <button type="button" className="spreadsheet-filter-sort-btn" onClick={onSortDesc}>
            Sort Z → A
          </button>
        </div>
        <div className="spreadsheet-filter-divider" />
        <div className="spreadsheet-filter-select-row">
          <button type="button" className="spreadsheet-filter-link" onClick={toggleAllFiltered}>
            {allSelected ? 'Clear filtered' : 'Select all (filtered)'}
          </button>
          <span className="spreadsheet-filter-meta">
            Showing {filteredValues.length} of {values.length}
          </span>
        </div>
        <div className="spreadsheet-filter-search">
          <Search size={14} className="spreadsheet-filter-search-icon" aria-hidden />
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search values…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="spreadsheet-filter-values">
          {filteredValues.length === 0 ? (
            <div className="spreadsheet-filter-empty text-muted small">No matching values</div>
          ) : (
            filteredValues.map((v, idx) => {
              const rowKey = `${idx}-${String(v)}`;
              const label = String(v);
              const checked = draft.has(v);
              return (
                <label key={rowKey} className="spreadsheet-filter-value-row">
                  <input type="checkbox" checked={checked} onChange={() => toggleOne(v)} />
                  <span className="spreadsheet-filter-value-text" title={label || '—'}>
                    {label || '—'}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="spreadsheet-filter-actions">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleApply}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetFilterMenu;
