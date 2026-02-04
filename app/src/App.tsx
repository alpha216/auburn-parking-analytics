import { useState } from 'react';
import { RangeSelector } from './components/RangeSelector';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { Legend } from './components/Legend';
import { HeatmapCard } from './components/HeatmapCard';
import { Tooltip } from './components/Tooltip';
import { useHeatmapData } from './hooks/useHeatmapData';
import { LOTS, DEFAULT_RANGE } from './utils/config';
import type { RangeType, TooltipData } from './types/heatmap';
import './App.css';

function App() {
  const [range, setRange] = useState<RangeType>(DEFAULT_RANGE);
  const [startHour, setStartHour] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(24);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const { data, loading, error } = useHeatmapData(range);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <h1>Auburn EV Parking</h1>
          </div>
          <p className="subtitle">Average occupancy heatmaps for EV charging spots</p>
        </div>
      </header>

      <div className="controls-row">
        <RangeSelector
          currentRange={range}
          onRangeChange={setRange}
          dateFrom={data?.range.from}
          dateTo={data?.range.to}
          lastUpdated={data?.meta.generated_at}
        />
        <TimeRangeSelector
          startHour={startHour}
          endHour={endHour}
          onStartHourChange={setStartHour}
          onEndHourChange={setEndHour}
        />
        <Legend />
      </div>

      <main className="heatmaps-container">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading heatmap data...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <h3>⚠️ Unable to Load Data</h3>
            <p>{error}</p>
            <button
              className="retry-btn"
              onClick={() => setRange(range)}
            >
              Try Again
            </button>
          </div>
        )}

        {data && !loading && !error && (
          <>
            {LOTS.map((lot) => {
              const matrix = data.lots[lot.id];
              const sampleCounts = data.sample_counts?.[lot.id] || null;

              if (!matrix) return null;

              return (
                <HeatmapCard
                  key={lot.id}
                  lot={lot}
                  matrix={matrix}
                  sampleCounts={sampleCounts}
                  meta={data.meta}
                  startHour={startHour}
                  endHour={endHour}
                  onCellHover={setTooltipData}
                />
              );
            })}
          </>
        )}
      </main>

      <Tooltip data={tooltipData} />
    </div>
  );
}

export default App;
