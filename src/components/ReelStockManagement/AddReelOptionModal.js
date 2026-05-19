import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import './AddReelOptionModal.css';

const FIELD_LABELS = {
  shade: 'Shade',
  bf: 'BF'
};

const AddReelOptionModal = ({ isOpen, field, onClose, onSave }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValue('');
    setError('');
  }, [isOpen, field]);

  if (!isOpen || !field) return null;

  const label = FIELD_LABELS[field] || field;

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = onSave(field, value);
    if (result?.error) {
      setError(result.error);
      if (result.value) {
        onClose();
      }
      return;
    }
    onClose();
  };

  return (
    <>
      <div className="add-reel-option-overlay" onClick={onClose} />
      <div
        className="add-reel-option-modal"
        role="dialog"
        aria-labelledby="add-reel-option-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-reel-option-header">
          <div className="add-reel-option-header-left">
            <Plus size={18} />
            <h3 id="add-reel-option-title">Add {label}</h3>
          </div>
          <button type="button" className="add-reel-option-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form className="add-reel-option-body" onSubmit={handleSubmit}>
          <label htmlFor="add-reel-option-input">{label} value</label>
          <input
            id="add-reel-option-input"
            type="text"
            className="form-control"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            placeholder={field === 'shade' ? 'e.g. N or G' : 'e.g. 16 or 18'}
            autoFocus
          />
          {error ? <p className="add-reel-option-error">{error}</p> : null}
          <div className="add-reel-option-actions">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Add {label}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddReelOptionModal;
