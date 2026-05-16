import React, { useEffect, useState } from 'react';
import { X, Shield } from 'lucide-react';
import { REPORT_TAB_IDS, REPORT_TAB_LABELS } from '../../utils/userAccessUtils';
import './UserAccessModal.css';

const UserAccessModal = ({ user, isOpen, onClose, onSave, isSaving }) => {
  const [access, setAccess] = useState({
    reports: false,
    matrix: false,
    analytics: false,
    reelchart: false,
    minimum: false
  });

  useEffect(() => {
    if (!user) return;
    const a = user.access || {};
    setAccess({
      reports: Boolean(a.reports),
      matrix: Boolean(a.matrix),
      analytics: Boolean(a.analytics),
      reelchart: Boolean(a.reelchart),
      minimum: Boolean(a.minimum)
    });
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const toggle = (key) => {
    setAccess((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'reports' && !next.reports) {
        next.matrix = false;
        next.analytics = false;
        next.reelchart = false;
        next.minimum = false;
      }
      return next;
    });
  };

  const toggleReportSection = (key) => {
    setAccess((prev) => ({
      ...prev,
      reports: true,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, access);
  };

  return (
    <>
      <div className="user-access-overlay" onClick={onClose} />
      <div className="user-access-modal" role="dialog" aria-labelledby="user-access-title">
        <div className="user-access-header">
          <div className="user-access-header-left">
            <Shield size={18} />
            <div>
              <h3 id="user-access-title">Report access</h3>
              <p>{user.username}</p>
            </div>
          </div>
          <button type="button" className="user-access-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-access-body">
          <p className="user-access-hint">
            Without Reports access, this user can only work in Reel Stock Management (entries).
          </p>

          <label className="user-access-row user-access-row-main">
            <input
              type="checkbox"
              checked={access.reports}
              onChange={() => toggle('reports')}
            />
            <span>
              <strong>Reports</strong>
              <small>Show the Reports menu and allow selected sections below</small>
            </span>
          </label>

          <div className={`user-access-sections${access.reports ? '' : ' is-disabled'}`}>
            <p className="user-access-sections-label">Report sections</p>
            {REPORT_TAB_IDS.map((id) => (
              <label key={id} className="user-access-row">
                <input
                  type="checkbox"
                  checked={access[id]}
                  disabled={!access.reports}
                  onChange={() => toggleReportSection(id)}
                />
                <span>{REPORT_TAB_LABELS[id]}</span>
              </label>
            ))}
          </div>

          <div className="user-access-actions">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save access'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UserAccessModal;
