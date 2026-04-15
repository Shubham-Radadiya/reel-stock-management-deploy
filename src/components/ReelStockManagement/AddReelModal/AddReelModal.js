import React, { useState } from 'react';
import './AddReelModal.css';
import { getCurrentDateYMD } from '../../../utils/dateFormat';

const AddReelModal = ({ show, onClose, onAddReel }) => {
  const [newReel, setNewReel] = useState({
    date: getCurrentDateYMD(),
    srNo: '',
    reelNo: '',
    shade: 'N',
    bf: '',
    gsm: '',
    size: '',
    weight: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddReel(newReel);
    // Reset form
    setNewReel({
      date: getCurrentDateYMD(),
      srNo: '',
      reelNo: '',
      shade: 'N',
      bf: '',
      gsm: '',
      size: '',
      weight: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewReel(prev => ({ ...prev, [name]: value }));
  };

  if (!show) return null;

  return (
    <div className="add-reel-modal-overlay backdrop-blur">
      <div className="add-reel-modal-container">
        <div className="add-reel-modal-content pro-modal border-0 shadow-lg">
          <div className="add-reel-modal-header border-bottom-0 p-4 pb-0">
            <div>
              <h5 className="modal-title fw-bold">Add New Reel</h5>
              <p className="text-muted small m-0">Enter the details of the incoming reel stock.</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="add-reel-modal-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="pro-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control pro-input" 
                    name="date"
                    value={newReel.date} 
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
                    value={newReel.srNo} 
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
                    value={newReel.reelNo} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="col-md-3">
                  <label className="pro-label">SHADE</label>
                  <select 
                    className="form-select pro-input" 
                    name="shade"
                    value={newReel.shade} 
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
                    value={newReel.bf} 
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
                    value={newReel.gsm} 
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
                    value={newReel.size} 
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
                      value={newReel.weight} 
                      onChange={handleChange} 
                      required 
                    />
                    <span className="input-group-text bg-light pro-input-append">kg</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="add-reel-modal-footer border-top-0 p-4 pt-0">
              <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm">Add Reel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReelModal;