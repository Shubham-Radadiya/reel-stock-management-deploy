import React, { useMemo, useState } from 'react';
import { BarChart3, Database, X,Info  } from 'lucide-react';
import './Report.css';

const Report = ({ reels }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

  // 1. Get only available reels (not checked out)
  const availableReels = reels.filter(r => !r.isCheckedOut);
  
  // 2. Pivot Logic for Matrix (Available Reels Only)
  const matrix = useMemo(() => {
    const sizes = [...new Set(availableReels.map(r => r.size))].sort((a, b) => parseFloat(a) - parseFloat(b));
    const combinations = []; // Array of { shade, bf, gsm, key }
    
    availableReels.forEach(r => {
      const key = `${r.shade}_${r.bf}_${r.gsm}`;
      if (!combinations.find(c => c.key === key)) {
        combinations.push({ shade: r.shade, bf: r.bf, gsm: r.gsm, key });
      }
    });

    // Sort combinations by Shade, then BF, then GSM
    combinations.sort((a, b) => {
      if (a.shade !== b.shade) return a.shade.localeCompare(b.shade);
      if (a.bf !== b.bf) return parseFloat(a.bf) - parseFloat(b.bf);
      return parseFloat(a.gsm) - parseFloat(b.gsm);
    });

    return { sizes, combinations };
  }, [availableReels]);

  const getCount = (size, comboKey) => {
    return availableReels.filter(r => r.size === size && `${r.shade}_${r.bf}_${r.gsm}` === comboKey).length;
  };

  const getReelsByCombo = (size, comboKey) => {
    return availableReels.filter(r => r.size === size && `${r.shade}_${r.bf}_${r.gsm}` === comboKey);
  };

  const handleCellClick = (size, combo, count) => {
    if (count === 0) return;
    
    const reelsData = getReelsByCombo(size, combo.key);
    setModalTitle(`${combo.shade} | ${combo.bf} | ${combo.gsm} | Size: ${size} (${count} Reels)`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleTotalClick = (combo, total) => {
    if (total === 0) return;
    
    const reelsData = availableReels.filter(r => `${r.shade}_${r.bf}_${r.gsm}` === combo.key);
    setModalTitle(`${combo.shade} | ${combo.bf} | ${combo.gsm} - Total: ${total} Reels`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleRowTotalClick = (size, rowTotal) => {
    if (rowTotal === 0) return;
    
    const reelsData = availableReels.filter(r => r.size === size);
    setModalTitle(`Size: ${size} - Total: ${rowTotal} Reels`);
    setModalData(reelsData);
    setShowDetailsModal(true);
  };

  const handleGrandTotalClick = () => {
    setModalTitle(`All Available Stock - Total: ${availableReels.length} Reels`);
    setModalData(availableReels);
    setShowDetailsModal(true);
  };

  return (
    <div className="report-container">
     <div className="d-flex align-items-center gap-2 mb-2">
  <BarChart3 className="text-primary" size={24} />
  <h2 className="fw-bold m-0">Stock Availability Matrix</h2>
</div>

<div className="info-section mb-2">
  <div className="info-card">
    <Info size={16} className="info-icon" />
    <div className="info-content">
      <span className="info-text">
        <strong>How to use:</strong> Click on any <strong className="highlight-count">number</strong> in the matrix to view detailed reel information. 
        Click on <strong className="highlight-total">TOTAL cells</strong> to see all reels for that row/column.
      </span>
    </div>
  </div>
  <div className="info-stats">
    <span className="stat-badge">📊 Total Available: <strong>{availableReels.length}</strong> Reels</span>
    <span className="stat-badge">🎯 Click any count → View detailed table</span>
  </div>
</div>

      {availableReels.length === 0 ? (
        <div className="text-center py-5">
          <Database size={48} className="text-muted opacity-25 mb-3" />
          <p className="text-muted">No stock available in the inventory.</p>
        </div>
      ) : (
        <div className="matrix-wrapper">
          <div className="matrix-scroll-container">
            <table className="matrix-table">
              <thead>
                <tr className="matrix-header-main">
                  <th className="size-col header-corner">SIZE ↓ / BF|GSM →</th>
                  {matrix.combinations.map(c => (
                    <th key={c.key} className="combo-col">
                      <div className="combo-info">
                        <span className="combo-shade">{c.shade}</span>
                        <span className="combo-specs">{c.bf} | {c.gsm}</span>
                      </div>
                    </th>
                  ))}
                  <th className="total-col header-total">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {matrix.sizes.map(size => {
                  let rowTotal = 0;
                  return (
                    <tr key={size}>
                      <td 
                        className="size-cell clickable" 
                        onClick={() => handleRowTotalClick(size, rowTotal)}
                        style={{ cursor: 'pointer' }}
                      >
                        {size}
                       </td>
                      {matrix.combinations.map(combo => {
                        const count = getCount(size, combo.key);
                        rowTotal += count;
                        return (
                          <td 
                            key={combo.key} 
                            className={count > 0 ? 'count-cell has-value clickable' : 'count-cell empty'}
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
                  <td className="size-cell footer footer-corner clickable" onClick={handleGrandTotalClick} style={{ cursor: 'pointer' }}>
                    TOTAL
                  </td>
                  {matrix.combinations.map(combo => {
                    const total = availableReels.filter(r => `${r.shade}_${r.bf}_${r.gsm}` === combo.key).length;
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
                  <td className="total-cell footer grand-total clickable" onClick={handleGrandTotalClick} style={{ cursor: 'pointer' }}>
                    {availableReels.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
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
                <span>Total Weight: {modalData.reduce((sum, reel) => sum + parseFloat(reel.weight || 0), 0).toFixed(2)} kg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;