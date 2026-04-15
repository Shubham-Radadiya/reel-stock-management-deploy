import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="confirm-modal-overlay" onClick={onClose} />
      <div className="confirm-modal-container">
      <div className="confirm-modal-header">
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <AlertTriangle size={24}  color="#ffffff"/>
    <h4 className="confirm-modal-title">{title}</h4>
  </div>
  <button className="confirm-modal-close" onClick={onClose}>
    <X size={18} />
  </button>
</div>
        
        <div className="confirm-modal-body">
          
          <p className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="confirm-modal-btn confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmationModal;