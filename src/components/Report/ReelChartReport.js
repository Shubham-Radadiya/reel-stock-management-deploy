import React, {
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useTransition
} from 'react';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  buildReelChartAnalytics,
  getReelChartPeriodRange,
  limitChartRows
} from '../../utils/reelChartUtils';
import ReelChartDimensionSection from './ReelChartDimensionSection';
import ReelChartToolbar from './ReelChartToolbar';
import './ReelChartReport.css';

const PERIOD_OPTIONS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' }
];

const VIEW_OPTIONS = [
  { id: 'combo', label: 'Size + GSM' },
  { id: 'size', label: 'Size' },
  { id: 'gsm', label: 'GSM' }
];

const TOP_PRESETS = ['25', '50', '100'];

const VIEW_CONFIG = {
  combo: {
    variant: 'combo',
    title: 'Size + GSM',
    pieAriaLabel: 'Check-outs by size and GSM pie chart',
    dataKey: 'comboData'
  },
  size: {
    variant: 'size',
    title: 'Size',
    pieAriaLabel: 'Check-outs by size pie chart',
    dataKey: 'sizeData'
  },
  gsm: {
    variant: 'gsm',
    title: 'GSM',
    pieAriaLabel: 'Check-outs by GSM pie chart',
    dataKey: 'gsmData'
  }
};

const ReelChartBody = memo(function ReelChartBody({
  periodRange,
  hasData,
  displayRows,
  activeConfig,
  totalOut,
  totalRows,
  effectiveTopN,
  groupedTotal
}) {
  if (!periodRange) {
    return <p className="text-danger mb-0">Invalid period. Check your date selection.</p>;
  }
  if (!hasData) {
    return <p className="text-muted mb-0">No check-outs in this period.</p>;
  }
  if (!displayRows.length) {
    return <p className="text-muted mb-0">No data for this view.</p>;
  }
  return (
    <ReelChartDimensionSection
      title={`By ${activeConfig.title}`}
      rows={displayRows}
      totalOut={totalOut}
      variant={activeConfig.variant}
      pieAriaLabel={activeConfig.pieAriaLabel}
      showingCount={displayRows.length}
      totalRows={totalRows}
      topN={effectiveTopN}
      groupedTotal={groupedTotal}
    />
  );
});

const ReelChartReport = ({ reels }) => {
  const now = new Date();
  const [, startTransition] = useTransition();

  const [periodType, setPeriodType] = useState('monthly');
  const [uiPeriodType, setUiPeriodType] = useState('monthly');
  const [weekValue, setWeekValue] = useState(
    () => `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`
  );
  const [monthValue, setMonthValue] = useState(() => format(now, 'yyyy-MM'));
  const [yearValue, setYearValue] = useState(() => String(now.getFullYear()));
  const [viewMode, setViewMode] = useState('combo');
  const [uiViewMode, setUiViewMode] = useState('combo');
  const [topPreset, setTopPreset] = useState('25');
  const [uiTopPreset, setUiTopPreset] = useState('25');
  const [topCustom, setTopCustom] = useState('25');

  const defer = useCallback(
    (apply) => {
      startTransition(apply);
    },
    [startTransition]
  );

  const handlePeriodType = useCallback(
    (id) => {
      setUiPeriodType(id);
      defer(() => setPeriodType(id));
    },
    [defer]
  );

  const handleViewMode = useCallback(
    (id) => {
      setUiViewMode(id);
      defer(() => setViewMode(id));
    },
    [defer]
  );

  const handleTopPreset = useCallback(
    (id) => {
      setUiTopPreset(id);
      defer(() => setTopPreset(id));
    },
    [defer]
  );

  const deferredPeriodType = useDeferredValue(periodType);
  const deferredWeekValue = useDeferredValue(weekValue);
  const deferredMonthValue = useDeferredValue(monthValue);
  const deferredYearValue = useDeferredValue(yearValue);
  const deferredViewMode = useDeferredValue(viewMode);
  const deferredTopPreset = useDeferredValue(topPreset);
  const deferredTopCustom = useDeferredValue(topCustom);

  const chartPickerValue =
    deferredPeriodType === 'weekly'
      ? deferredWeekValue
      : deferredPeriodType === 'monthly'
        ? deferredMonthValue
        : deferredYearValue;

  const periodRange = useMemo(
    () => getReelChartPeriodRange(deferredPeriodType, chartPickerValue),
    [deferredPeriodType, chartPickerValue]
  );

  const analytics = useMemo(() => {
    if (!periodRange) {
      return {
        sizeData: { rows: [], totalOut: 0 },
        gsmData: { rows: [], totalOut: 0 },
        comboData: { rows: [], totalOut: 0 },
        totalOut: 0
      };
    }
    return buildReelChartAnalytics(reels, periodRange.start, periodRange.end);
  }, [reels, periodRange]);

  const { totalOut } = analytics;
  const hasData = totalOut > 0;

  const effectiveTopN = useMemo(() => {
    if (deferredTopPreset === 'custom') {
      const n = parseInt(deferredTopCustom, 10);
      return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 25;
    }
    return parseInt(deferredTopPreset, 10);
  }, [deferredTopPreset, deferredTopCustom]);

  const activeConfig = VIEW_CONFIG[deferredViewMode] ?? VIEW_CONFIG.combo;
  const sourceRows = useMemo(
    () => analytics[activeConfig.dataKey]?.rows || [],
    [analytics, activeConfig.dataKey]
  );
  const displayRows = useMemo(
    () => limitChartRows(sourceRows, effectiveTopN),
    [sourceRows, effectiveTopN]
  );
  const totalRows = sourceRows.length;
  const groupedTotal = analytics[activeConfig.dataKey]?.totalOut ?? 0;

  const uiPickerValue =
    uiPeriodType === 'weekly'
      ? weekValue
      : uiPeriodType === 'monthly'
        ? monthValue
        : yearValue;
  const uiPeriodRange = useMemo(
    () => getReelChartPeriodRange(uiPeriodType, uiPickerValue),
    [uiPeriodType, uiPickerValue]
  );

  const uiSourceRows = useMemo(() => {
    const key = VIEW_CONFIG[uiViewMode]?.dataKey;
    return key ? analytics[key]?.rows || [] : [];
  }, [analytics, uiViewMode]);
  const uiDisplayCount = Math.min(
    uiSourceRows.length,
    uiTopPreset === 'custom'
      ? Math.min(500, Math.max(1, parseInt(topCustom, 10) || 25))
      : parseInt(uiTopPreset, 10) || 25
  );

  return (
    <section className="report-section reel-chart-section">
      <div className="reel-chart-card">
        <ReelChartToolbar
          title="Reel chart"
          periodOptions={PERIOD_OPTIONS}
          periodType={uiPeriodType}
          onPeriodType={handlePeriodType}
          weekValue={weekValue}
          onWeekValue={setWeekValue}
          monthValue={monthValue}
          onMonthValue={setMonthValue}
          yearValue={yearValue}
          onYearValue={setYearValue}
          periodRange={uiPeriodRange}
          totalOut={totalOut}
          viewOptions={VIEW_OPTIONS}
          viewMode={uiViewMode}
          onViewMode={handleViewMode}
          topPresets={TOP_PRESETS}
          topPreset={uiTopPreset}
          onTopPreset={handleTopPreset}
          topCustom={topCustom}
          onTopCustom={setTopCustom}
          rowHint={`${uiDisplayCount} / ${uiSourceRows.length}`}
        />

        <ReelChartBody
          periodRange={periodRange}
          hasData={hasData}
          displayRows={displayRows}
          activeConfig={activeConfig}
          totalOut={totalOut}
          totalRows={totalRows}
          effectiveTopN={effectiveTopN}
          groupedTotal={groupedTotal}
        />
      </div>
    </section>
  );
};

export default ReelChartReport;
