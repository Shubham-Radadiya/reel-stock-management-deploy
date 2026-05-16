import React, { memo } from 'react';
import { BarChart3 } from 'lucide-react';

const ReelChartToolbar = memo(function ReelChartToolbar({
  title = 'Reel chart',
  periodOptions,
  periodType,
  onPeriodType,
  weekValue,
  onWeekValue,
  monthValue,
  onMonthValue,
  yearValue,
  onYearValue,
  periodRange,
  totalOut,
  viewOptions,
  viewMode,
  onViewMode,
  topPresets,
  topPreset,
  onTopPreset,
  topCustom,
  onTopCustom,
  rowHint
}) {
  return (
    <div className="reel-chart-toolbar-unified">
      <h2 className="report-section-title reel-chart-toolbar-title">{title}</h2>

      <span className="reel-chart-toolbar-vrule" aria-hidden />

      <div className="reel-chart-toolbar-segment reel-chart-toolbar-period">
        <div className="analytics-period-pills reel-chart-period-pills">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`analytics-period-pill${periodType === opt.id ? ' active' : ''}`}
              onClick={() => onPeriodType(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {periodType === 'weekly' && (
          <input
            type="week"
            className="form-control form-control-sm reel-chart-picker"
            value={weekValue}
            onChange={(e) => onWeekValue(e.target.value)}
          />
        )}
        {periodType === 'monthly' && (
          <input
            type="month"
            className="form-control form-control-sm reel-chart-picker"
            value={monthValue}
            onChange={(e) => onMonthValue(e.target.value)}
          />
        )}
        {periodType === 'yearly' && (
          <input
            type="number"
            min="2000"
            max="2100"
            className="form-control form-control-sm reel-chart-picker"
            value={yearValue}
            onChange={(e) => onYearValue(e.target.value)}
          />
        )}
        {periodRange && (
          <span className="reel-chart-period-label">
            <BarChart3 size={16} aria-hidden />
            <strong>{periodRange.label}</strong>
            <span className="text-muted">({totalOut})</span>
          </span>
        )}
      </div>

      <span className="reel-chart-toolbar-vrule" aria-hidden />

      <div className="reel-chart-toolbar-segment">
        <span className="reel-chart-controls-label">View</span>
        <div className="analytics-period-pills reel-chart-period-pills">
          {viewOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`analytics-period-pill${viewMode === opt.id ? ' active' : ''}`}
              onClick={() => onViewMode(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <span className="reel-chart-toolbar-vrule" aria-hidden />

      <div className="reel-chart-toolbar-segment">
        <span className="reel-chart-controls-label">Top</span>
        <div className="analytics-period-pills reel-chart-period-pills">
          {topPresets.map((n) => (
            <button
              key={n}
              type="button"
              className={`analytics-period-pill${topPreset === n ? ' active' : ''}`}
              onClick={() => onTopPreset(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={`analytics-period-pill${topPreset === 'custom' ? ' active' : ''}`}
            onClick={() => onTopPreset('custom')}
          >
            Custom
          </button>
        </div>
        {topPreset === 'custom' && (
          <input
            type="number"
            min="1"
            max="500"
            className="form-control form-control-sm reel-chart-top-input"
            value={topCustom}
            onChange={(e) => onTopCustom(e.target.value)}
            aria-label="Custom top N rows"
          />
        )}
      </div>

      <span className="reel-chart-controls-hint text-muted">{rowHint}</span>
    </div>
  );
});

export default ReelChartToolbar;
