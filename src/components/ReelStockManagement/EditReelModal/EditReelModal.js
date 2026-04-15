import React, { useState, useEffect } from 'react';
import './EditReelModal.css';

const EditReelModal = ({ show, onClose, onUpdateReel, reelData }) => {
  const [editingReel, setEditingReel] = useState(null);

  useEffect(() => {
    if (reelData) {
      setEditingReel({ ...reelData });
    }
  }, [reelData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingReel) {
      onUpdateReel(editingReel);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingReel(prev => ({ ...prev, [name]: value }));
  };

  if (!show || !editingReel) return null;

  return (
    <div className="edit-reel-modal-overlay backdrop-blur">
      <div className="edit-reel-modal-container">
        <div className="edit-reel-modal-content pro-modal border-0 shadow-lg">
          <div className="edit-reel-modal-header border-bottom-0 p-4 pb-0">
            <div>
              <h5 className="modal-title fw-bold">Edit Reel Details</h5>
              <p className="text-muted small m-0">Update the reel stock information.</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="edit-reel-modal-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="pro-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control pro-input" 
                    name="date"
                    value={editingReel.date} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-6">
                  <label className="pro-label">SR. NO.</label>
                  <input 
                    type="text" 
                    className="form-control pro-input" 
                    name="srNo"
                    placeholder="e.g. 101"
                    value={editingReel.srNo} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-6">
                  <label className="pro-label">REEL NO.</label>
                  <input 
                    type="text" 
                    className="form-control pro-input" 
                    name="reelNo"
                    placeholder="e.g. ABC-123"
                    value={editingReel.reelNo} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-3">
                  <label className="pro-label">SHADE</label>
                  <select 
                    className="form-select pro-input" 
                    name="shade"
                    value={editingReel.shade} 
                    onChange={handleChange}
                  >
                    <option value="N">N</option>
                    <option value="G">G</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="pro-label">BF</label>
                  <input 
                    type="text" 
                    className="form-control pro-input" 
                    name="bf"
                    placeholder="e.g. 45"
                    value={editingReel.bf} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-3">
                  <label className="pro-label">GSM</label>
                  <input 
                    type="text" 
                    className="form-control pro-input" 
                    name="gsm"
                    placeholder="e.g. 150"
                    value={editingReel.gsm} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-3">
                  <label className="pro-label">SIZE</label>
                  <input 
                    type="text" 
                    className="form-control pro-input" 
                    name="size"
                    placeholder="e.g. 40x50"
                    value={editingReel.size} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-6">
                  <label className="pro-label">WEIGHT</label>
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="form-control pro-input" 
                      name="weight"
                      placeholder="e.g. 250"
                      value={editingReel.weight} 
                      onChange={handleChange} 
                      required 
                    />
                    <span className="input-group-text bg-light pro-input-append">kg</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="edit-reel-modal-footer border-top-0 p-4 pt-0">
              <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm">Update Reel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditReelModal;