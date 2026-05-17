import React, { memo, useMemo } from 'react';
import ReelChartPie from './ReelChartPie';

const sharePct = (count, total) =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '\u2014';

const formatReelNos = (reelNos) => {
  if (!reelNos?.length) return '\u2014';
  if (reelNos.length <= 10) return reelNos.join(', ');
  return `${reelNos.slice(0, 10).join(', ')} +${reelNos.length - 10} more`;
};

const ReelChartDimensionSection = memo(({
  title,
  description,
  rows,
  totalOut,
  variant,
  pieAriaLabel,
  showingCount,
  totalRows,
  topN,
  groupedTotal = 0
}) => {
  const reelNosDisplay = useMemo(
    () => rows.map((row) => formatReelNos(row.reelNos)),
    [rows]
  );

  if (!rows.length) return null;

  const groupedSum = groupedTotal || rows.reduce((s, r) => s + r.count, 0);
  const ungrouped = Math.max(0, totalOut - groupedSum);

  return (
    <section className="reel-chart-dimension-section">
      <div className="reel-chart-dimension-head">
        <h3 className="reel-chart-report-heading">{title}</h3>
        {description ? <p className="reel-chart-dimension-desc mb-0">{description}</p> : null}
        {ungrouped > 0 ? (
          <p className="reel-chart-dimension-warn mb-0">
            {ungrouped} check-out{ungrouped !== 1 ? 's' : ''} in this period had no{' '}
            {variant === 'size' ? 'size' : variant === 'gsm' ? 'GSM' : 'size or GSM'} recorded
            and are not included in the table below.
          </p>
        ) : null}
        {totalRows > showingCount ? (
          <p className="reel-chart-dimension-limit-note mb-0">
            Pie shows top {showingCount} of {totalRows} (limit: {topN}). Share % is of all{' '}
            {totalOut} check-outs in the period.
          </p>
        ) : null}
      </div>

      <div className="reel-chart-report-block reel-chart-report-block-pie">
        <h4 className="reel-chart-subheading">Pie chart</h4>
        <ReelChartPie rows={rows} totalOut={totalOut} ariaLabel={pieAriaLabel} />
      </div>

      <div className="reel-chart-report-block reel-chart-report-block-table">
        <h4 className="reel-chart-subheading">Table</h4>
        <div className="table-responsive reel-chart-table-wrap">
          <table className="table table-bordered reel-chart-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                {variant === 'combo' ? (
                  <>
                    <th>Size</th>
                    <th>GSM</th>
                  </>
                ) : (
                  <th>{variant === 'size' ? 'Size' : 'GSM'}</th>
                )}
                <th>Check-outs</th>
                <th>Share</th>
                <th>Reel nos.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.key}>
                  <td>{idx + 1}</td>
                  {variant === 'combo' ? (
                    <>
                      <td>{row.size}</td>
                      <td>{row.gsm}</td>
                    </>
                  ) : (
                    <td className="fw-semibold">{row.value}</td>
                  )}
                  <td className="fw-semibold">{row.count}</td>
                  <td>{sharePct(row.count, totalOut)}</td>
                  <td className="reel-chart-reel-nos" title={row.reelNos?.join(', ')}>
                    {reelNosDisplay[idx]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});

export default ReelChartDimensionSection;
