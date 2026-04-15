import React, { useState, useMemo } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Package, Clock, Edit2, Trash2, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import './ReelStockManagement.css';
import { displayDate } from '../../utils/dateFormat';
import AddReelModal from './AddReelModal/AddReelModal';
import EditReelModal from './EditReelModal/EditReelModal';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { showSuccess } from '../../utils/toastUtils';

const ReelStockManagement = ({ reels, setReels }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingReel, setEditingReel] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  const itemsPerPage = 100;

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

  const handleToggleReel = (id) => {
    const reel = reels.find(r => r.id === id);
    
    if (reel.isCheckedOut) {
      showConfirmation(
        'Confirm Check In',
        'Are you sure you want to check in this reel?',
        () => {
          setReels(reels.map(r => 
            r.id === id ? { ...r, isCheckedOut: false, outDate: '' } : r
          ));
          showSuccess('Reel has been checked in successfully!');
        },
        'Yes, Check In',
        'Cancel'
      );
    } else {
      const istDate = format(new Date(), 'dd/MM/yy HH:mm');
      setReels(reels.map(r => 
        r.id === id ? { ...r, isCheckedOut: true, outDate: istDate } : r
      ));
      showSuccess(`Reel ${reel.reelNo} has been checked out!`);
    }
  };

  const handleAddReel = (newReel) => {
    const id = Date.now().toString();
    const reelToAdd = {
      ...newReel,
      id,
      isCheckedOut: false,
      outDate: '',
      date: newReel.date
    };
    setReels([...reels, reelToAdd]);
    setShowAddModal(false);
    showSuccess(`Reel ${newReel.reelNo} added successfully!`);
  };

  const handleEditReel = (reel) => {
    setEditingReel({ ...reel });
    setShowEditModal(true);
  };

  const handleUpdateReel = (updatedReel) => {
    setReels(reels.map(r => 
      r.id === updatedReel.id ? updatedReel : r
    ));
    setShowEditModal(false);
    setEditingReel(null);
    showSuccess(`Reel ${updatedReel.reelNo} updated successfully!`);
  };

  const handleDeleteReel = (id) => {
    const reelToDelete = reels.find(r => r.id === id);
    showConfirmation(
      'Confirm Delete',
      `Are you sure you want to delete reel ${reelToDelete?.reelNo}? This action cannot be undone.`,
      () => {
        setReels(reels.filter(r => r.id !== id));
        showSuccess(`Reel ${reelToDelete?.reelNo} deleted successfully!`);
      },
      'Yes, Delete',
      'Cancel'
    );
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterMonth('');
    setSearchTerm('');
    setCurrentPage(1);
    showSuccess('All filters cleared!');
  };

  // Apply all filters
  const filteredReels = useMemo(() => {
    let filtered = reels;

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.reelNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.srNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterDate) {
      filtered = filtered.filter(r => r.date === filterDate);
    }

    if (filterMonth) {
      filtered = filtered.filter(r => r.date.startsWith(filterMonth));
    }

    return filtered;
  }, [reels, searchTerm, filterDate, filterMonth]);

  // Statistics based on filtered data
  const stats = useMemo(() => {
    const totalReels = filteredReels.length;
    const reelsIn = filteredReels.filter(r => !r.isCheckedOut).length;
    const reelsOut = filteredReels.filter(r => r.isCheckedOut).length;
    
    return { totalReels, reelsIn, reelsOut };
  }, [filteredReels]);

  // Get unique months from reels for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set();
    reels.forEach(reel => {
      if (reel.date) {
        months.add(reel.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [reels]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReels.length / itemsPerPage);
  const currentReels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReels.slice(start, start + itemsPerPage);
  }, [filteredReels, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="stock-management-container">
      {/* Stats Cards & Actions Bar - All in One Row */}
      <div className="header-stats-row mb-2">
        {/* Stats Cards */}
        <div className="stats-cards-inline">
          <div className="stat-card-inline stat-card-total">
            <div className="stat-card-icon-inline">
              <Package size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">Total Reels</span>
              <span className="stat-value-inline">{stats.totalReels}</span>
            </div>
          </div>
          
          <div className="stat-card-inline stat-card-in">
            <div className="stat-card-icon-inline">
              <Package size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">In Stock Reels</span>
              <span className="stat-value-inline">{stats.reelsIn}</span>
            </div>
          </div>
          
          <div className="stat-card-inline stat-card-out">
            <div className="stat-card-icon-inline">
              <Clock size={20} />
            </div>
            <div className="stat-card-content-inline">
              <span className="stat-label-inline">Out Stock Reels</span>
              <span className="stat-value-inline">{stats.reelsOut}</span>
            </div>
          </div>
        </div>
        
        <div className="action-section">
          <button  
            className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} /> Add New Reel
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="main-card shadow-sm border-0">
        {/* Filter Bar - All in One Row */}
        <div className="filter-header p-2 border-bottom bg-white">
          <div className="filter-row">
            {/* Search */}
            <div className="filter-item filter-search">
              <div className="input-group input-group-merge">
                <span className="input-group-text bg-transparent border-end-0 text-muted">
                  <Search size={16} />
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-0" 
                  placeholder="Search Reel No or SR No..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="filter-item filter-date">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Calendar size={16} />
                </span>
                <input 
                  type="date" 
                  className="form-control"
                  placeholder="Filter by Date"
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Month Filter */}
            <div className="filter-item filter-month">
              <select 
                className="form-select"
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Months</option>
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
                  return (
                    <option key={month} value={month}>
                      {monthName} {year}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(filterDate || filterMonth || searchTerm) && (
              <div className="filter-item filter-clear">
                <button 
                  className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={clearFilters}
                >
                  <X size={16} /> Clear Filters
                </button>
              </div>
            )}

            {/* Showing Reels Count */}
            <div className="filter-item filter-count">
              <span className="badge bg-soft-primary text-primary px-3 py-2 rounded-pill">
                Showing: {filteredReels.length} Reels
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Table Header with Scrollable Body */}
        <div className="table-wrapper">
          <div className="table-header">
            <table className="table table-align-middle mb-0">
              <thead className="table-light-header">
                <tr>
                  <th className="ps-4" style={{ width: '100px' }}>DATE</th>
                  <th style={{ width: '100px' }}>SR NO.</th>
                  <th style={{ width: '120px' }}>REEL NO.</th>
                  <th style={{ width: '80px' }}>SHADE</th>
                  <th style={{ width: '80px' }}>BF</th>
                  <th style={{ width: '80px' }}>GSM</th>
                  <th style={{ width: '80px' }}>SIZE</th>
                  <th style={{ width: '100px' }}>WEIGHT</th>
                  <th className="text-center" style={{ width: '100px' }}>STATUS</th>
                  <th className="text-center" style={{ width: '140px' }}>OUT DETAILS</th>
                  <th className="text-center pe-4" style={{ width: '100px' }}>ACTIONS</th>
                </tr>
              </thead>
            </table>
          </div>
          
          <div className="table-body">
            <table className="table table-hover align-middle mb-0">
              <tbody>
              {currentReels.length === 0 ? (
                <tr style={{ height: '410px' }}>
                  <td colSpan="11" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div className="empty-state">
                      <Package size={48} className="text-muted opacity-25 mb-3" />
                      <p className="text-muted m-0">No reels found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentReels.map((reel) => (
                  <tr key={reel.id} className={reel.isCheckedOut ? 'table-row-out' : ''}>
                    <td className="ps-4 fw-medium" style={{ width: '100px' }}>
                      {displayDate(reel.date)}
                    </td>
                    <td style={{ width: '100px' }}>{reel.srNo}</td>
                    <td style={{ width: '120px' }}><span className="fw-bold text-dark">{reel.reelNo}</span></td>
                    <td style={{ width: '80px' }}>{reel.shade}</td>
                    <td style={{ width: '80px' }}>{reel.bf}</td>
                    <td style={{ width: '80px' }}>{reel.gsm}</td>
                    <td style={{ width: '80px' }}>{reel.size}</td>
                    <td style={{ width: '100px' }}><span className="fw-bold text-primary">{reel.weight} <small>kg</small></span></td>
                    <td className="text-center" style={{ width: '100px' }}>
                      <div className="form-check d-flex justify-content-center">
                        <input 
                          className="form-check-input cursor-pointer shadow-none" 
                          type="checkbox" 
                          checked={reel.isCheckedOut}
                          onChange={() => handleToggleReel(reel.id)}
                          style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                        />
                      </div>
                    </td>
                    <td className="text-center" style={{ width: '140px' }}>
                      {reel.isCheckedOut ? (
                        <div className="badge-out">
                          <Clock size={12} className="me-1" /> {reel.outDate}
                        </div>
                      ) : (
                        <span className="badge-in">AVAILABLE</span>
                      )}
                    </td>
                    <td className="text-center pe-4" style={{ width: '100px' }}>
                      <div className="action-buttons">
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixed Footer with Pagination */}
        <div className="card-footer bg-white border-top p-2">
          <div className="row align-items-center">
            <div className="col text-muted small fw-medium">
              Showing <span className="text-dark fw-bold">{filteredReels.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-dark fw-bold">{Math.min(currentPage * itemsPerPage, filteredReels.length)}</span> of <span className="text-dark fw-bold">{filteredReels.length}</span> entries
            </div>
            <div className="col-auto">
              <nav aria-label="Page navigation">
                <ul className="pagination-premium m-0">
                  <li className={`page-item-custom ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link-custom" onClick={() => handlePageChange(currentPage - 1)} aria-label="Previous">
                      <ChevronLeft size={18} />
                    </button>
                  </li>
                  {[...Array(Math.max(1, totalPages))].map((_, i) => (
                    <li key={i + 1} className={`page-item-custom ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button type="button" className="page-link-custom" onClick={() => handlePageChange(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item-custom ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link-custom" onClick={() => handlePageChange(currentPage + 1)} aria-label="Next">
                      <ChevronRight size={18} />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddReelModal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAddReel={handleAddReel} 
      />

      <EditReelModal 
        show={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        onUpdateReel={handleUpdateReel}
        reelData={editingReel}
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