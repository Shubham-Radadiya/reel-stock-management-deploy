import React, { memo, useMemo } from 'react';
import './ReelChartPie.css';

const PIE_COLORS = [
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#6366f1', '#818cf8',
  '#0ea5e9', '#0284c7', '#0369a1', '#4f46e5', '#7c3aed', '#9333ea',
  '#0891b2', '#0d9488', '#059669', '#65a30d', '#ca8a04', '#ea580c',
  '#dc2626', '#e11d48', '#db2777', '#c026d3', '#7e22ce', '#4338ca'
];

const CX = 120;
const CY = 120;
const R = 100;

const polar = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (startAngle, endAngle) => {
  if (endAngle - startAngle >= 359.99) {
    return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`;
  }
  const start = polar(CX, CY, R, endAngle);
  const end = polar(CX, CY, R, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${large} 0 ${end.x} ${end.y} Z`;
};

const rowLabel = (row) => row.label || row.value || row.key;

const ReelChartPie = memo(({ rows, totalOut, ariaLabel = 'Check-outs distribution pie chart' }) => {
  const displayedTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.count, 0),
    [rows]
  );

  const slices = useMemo(() => {
    if (!rows.length || !displayedTotal) return [];
    let angle = 0;
    return rows.map((row, i) => {
      const sweep = (row.count / displayedTotal) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const pctOfAll =
        totalOut > 0 ? ((row.count / totalOut) * 100).toFixed(1) : '0.0';
      return {
        row,
        start,
        end,
        color: PIE_COLORS[i % PIE_COLORS.length],
        pctOfAll
      };
    });
  }, [rows, displayedTotal, totalOut]);

  if (!slices.length) return null;

  return (
    <div className="reel-chart-pie-layout">
      <div className="reel-chart-pie-svg-wrap">
        <svg
          className="reel-chart-pie-svg"
          viewBox="0 0 240 240"
          role="img"
          aria-label={ariaLabel}
        >
          {slices.map((slice) => (
            <path
              key={slice.row.key}
              d={arcPath(slice.start, slice.end)}
              fill={slice.color}
              stroke="#fff"
              strokeWidth="1.5"
            >
              <title>
                {rowLabel(slice.row)}: {slice.row.count} ({slice.pctOfAll}% of all check-outs)
              </title>
            </path>
          ))}
          <circle cx={CX} cy={CY} r="42" fill="#fff" />
          <text x={CX} y={CY - 6} textAnchor="middle" className="reel-chart-pie-center-n">
            {displayedTotal}
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle" className="reel-chart-pie-center-l">
            in chart
          </text>
        </svg>
      </div>
      <ul className="reel-chart-pie-legend">
        {slices.map((slice) => (
          <li key={slice.row.key} className="reel-chart-pie-legend-item">
            <span
              className="reel-chart-pie-swatch"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="reel-chart-pie-legend-text">
              <span className="reel-chart-pie-legend-label">{rowLabel(slice.row)}</span>
              <span className="reel-chart-pie-legend-meta">
                {slice.row.count} · {slice.pctOfAll}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReelChartPie;
