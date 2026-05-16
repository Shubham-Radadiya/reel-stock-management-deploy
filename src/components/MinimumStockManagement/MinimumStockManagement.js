import React, { useMemo, useState } from 'react';
import { AlertTriangle, Trash2, Pencil, Check, X, Plus } from 'lucide-react';
import {
  createStockMinimum,
  deleteStockMinimum,
  updateStockMinimum
} from '../../api/reelsApi';
import { buildStockMinimumStatus } from '../../utils/stockMinimumUtils';
import { showError, showSuccess } from '../../utils/toastUtils';
import './MinimumStockManagement.css';

const MinimumStockManagement = ({ reels, stockMinimums, setStockMinimums, embedded = false }) => {
  const [form, setForm] = useState({ size: '', gsm: '', minReels: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ size: '', gsm: '', minReels: '' });

  const statusRows = useMemo(
    () => buildStockMinimumStatus(reels, stockMinimums),
    [reels, stockMinimums]
  );

  const lowCount = statusRows.filter((r) => r.isLow).length;

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const minReels = parseInt(form.minReels, 10);
    if (!form.size.trim() || !form.gsm.trim()) {
      showError('Size and GSM are required');
      return;
    }
    if (!Number.isFinite(minReels) || minReels < 0) {
      showError('Minimum reels must be 0 or greater');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createStockMinimum({
        size: form.size.trim(),
        gsm: form.gsm.trim(),
        minReels
      });
      setStockMinimums((prev) =>
        [...prev, created].sort(
          (a, b) =>
            String(a.size).localeCompare(String(b.size), undefined, { numeric: true }) ||
            String(a.gsm).localeCompare(String(b.gsm), undefined, { numeric: true })
        )
      );
      setForm({ size: '', gsm: '', minReels: '' });
      setShowAddModal(false);
      showSuccess('Minimum stock rule added');
    } catch (error) {
      showError(error.message || 'Failed to add rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      size: row.size,
      gsm: row.gsm,
      minReels: String(row.minReels)
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ size: '', gsm: '', minReels: '' });
  };

  const saveEdit = async () => {
    const minReels = parseInt(editForm.minReels, 10);
    if (!editForm.size.trim() || !editForm.gsm.trim()) {
      showError('Size and GSM are required');
      return;
    }
    if (!Number.isFinite(minReels) || minReels < 0) {
      showError('Minimum reels must be 0 or greater');
      return;
    }

    try {
      const updated = await updateStockMinimum(editingId, {
        size: editForm.size.trim(),
        gsm: editForm.gsm.trim(),
        minReels
      });
      setStockMinimums((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      cancelEdit();
      showSuccess('Rule updated');
    } catch (error) {
      showError(error.message || 'Failed to update rule');
    }
  };

  const openAddModal = () => {
    setForm({ size: '', gsm: '', minReels: '' });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (isSubmitting) return;
    setShowAddModal(false);
    setForm({ size: '', gsm: '', minReels: '' });
  };

  const handleDelete = async (id) => {
    try {
      await deleteStockMinimum(id);
      setStockMinimums((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) cancelEdit();
      showSuccess('Rule removed');
    } catch (error) {
      showError(error.message || 'Failed to delete rule');
    }
  };

  return (
    <div
      className={
        embedded
          ? 'min-stock-page min-stock-page-embedded mb-0'
          : 'min-stock-page main-card shadow-sm border-0 p-3'
      }
    >
      <div className="min-stock-page-head">
        <div>
          <h5 className="mb-0">Minimum stock (Size + GSM)</h5>
        </div>
                <div className="min-stock-head-actions">
          {lowCount > 0 ? (
            <span className="min-stock-summary-badge">
              <AlertTriangle size={16} aria-hidden />
              {lowCount} below minimum
            </span>
          ) : (
            <span className="min-stock-summary-badge min-stock-summary-ok">All OK</span>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
            <Plus size={16} aria-hidden />
            Add rule
          </button>
        </div>
      </div>


      {showAddModal && (
        <>
          <div className="min-stock-modal-overlay" onClick={closeAddModal} role="presentation" />
          <div
            className="min-stock-modal"
            role="dialog"
            aria-labelledby="min-stock-add-title"
            aria-modal="true"
          >
            <div className="min-stock-modal-header">
              <h4 id="min-stock-add-title">Add minimum stock rule</h4>
              <button
                type="button"
                className="min-stock-modal-close"
                onClick={closeAddModal}
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form className="min-stock-modal-body" onSubmit={handleAdd}>
              <div className="mb-3">
                <label className="form-label" htmlFor="min-stock-size">Size</label>
                <input
                  id="min-stock-size"
                  type="text"
                  className="form-control"
                  name="size"
                  placeholder="e.g. 46"
                  value={form.size}
                  onChange={onFormChange}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="min-stock-gsm">GSM</label>
                <input
                  id="min-stock-gsm"
                  type="text"
                  className="form-control"
                  name="gsm"
                  placeholder="e.g. 100"
                  value={form.gsm}
                  onChange={onFormChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="min-stock-min">Minimum reels in stock</label>
                <input
                  id="min-stock-min"
                  type="number"
                  min="0"
                  className="form-control"
                  name="minReels"
                  placeholder="e.g. 5"
                  value={form.minReels}
                  onChange={onFormChange}
                  required
                />
              </div>
              <div className="min-stock-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeAddModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding…' : 'Add rule'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

<div className="table-responsive">
        <table className="table table-striped align-middle min-stock-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>GSM</th>
              <th>Min reels</th>
              <th>In stock now</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statusRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted text-center py-4">
                  No rules yet. Click Add rule to create one.
                </td>
              </tr>
            ) : (
              statusRows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className={row.isLow ? 'min-stock-row-low' : ''}>
                    <td>
                      {isEditing ? (
                        <input
                          className="form-control form-control-sm"
                          value={editForm.size}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, size: e.target.value }))
                          }
                        />
                      ) : (
                        row.size
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="form-control form-control-sm"
                          value={editForm.gsm}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, gsm: e.target.value }))
                          }
                        />
                      ) : (
                        row.gsm
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={editForm.minReels}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, minReels: e.target.value }))
                          }
                        />
                      ) : (
                        row.minReels
                      )}
                    </td>
                    <td className="fw-semibold">{row.current}</td>
                    <td>
                      {row.isLow ? (
                        <span className="min-stock-pill min-stock-pill-low">
                          Short by {row.shortfall}
                        </span>
                      ) : (
                        <span className="min-stock-pill min-stock-pill-ok">OK</span>
                      )}
                    </td>
                    <td className="text-end">
                      {isEditing ? (
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={saveEdit}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={cancelEdit}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(row)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(row.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MinimumStockManagement;
