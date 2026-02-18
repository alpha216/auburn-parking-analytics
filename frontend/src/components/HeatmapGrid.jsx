import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Map occupancy percentage (0–100) to an RGB color.
 * Green → Yellow → Orange → Red
 */
function occupancyColor(value) {
  if (value === null || value === undefined) return [30, 30, 46]; // --heat-null
  const v = Math.max(0, Math.min(100, value));
  // 5-stop gradient: green → light-green → yellow → orange → red
  const stops = [
    [27, 94, 32],    // 0%  — deep green
    [76, 175, 80],   // 25% — green
    [205, 220, 57],  // 50% — yellow-green
    [255, 152, 0],   // 75% — orange
    [183, 28, 28],   // 100% — dark red
  ];
  const t = v / 100 * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const f = t - i;
  return [
    Math.round(stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f),
    Math.round(stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f),
    Math.round(stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f),
  ];
}

export default function HeatmapGrid({ lotName, matrix, counts, xLabels, yLabels }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const cols = matrix[0]?.length || 0;
  const rows = matrix.length; // 7

  // Compute cell dimensions based on container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const cellW = Math.max(2, Math.floor(w / cols));
        const cellH = Math.max(12, Math.min(28, cellW));
        setDimensions({ width: cellW * cols, height: cellH * rows, cellW, cellH });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cols, rows]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.cellW) return;

    const { cellW, cellH } = dimensions;
    canvas.width = cellW * cols;
    canvas.height = cellH * rows;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let day = 0; day < rows; day++) {
      for (let slot = 0; slot < cols; slot++) {
        const val = matrix[day][slot];
        const [r, g, b] = occupancyColor(val);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(slot * cellW, day * cellH, cellW - 0.5, cellH - 0.5);
      }
    }
  }, [matrix, dimensions, cols, rows]);

  // Mouse move for tooltip
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.cellW) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / dimensions.cellW);
    const row = Math.floor(y / dimensions.cellH);

    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const val = matrix[row][col];
      const count = counts[row][col];
      setTooltip({
        x: e.clientX + 12,
        y: e.clientY - 8,
        day: yLabels[row],
        time: xLabels[col] || '',
        value: val,
        count,
      });
    } else {
      setTooltip(null);
    }
  }, [matrix, counts, xLabels, yLabels, dimensions, rows, cols]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Generate x-axis tick labels (show every Nth)
  const xTicks = [];
  const tickInterval = Math.max(1, Math.floor(cols / 12));
  for (let i = 0; i < cols; i += tickInterval) {
    const label = xLabels[i];
    if (label) {
      xTicks.push({ index: i, label: label.split('~')[0] });
    }
  }

  return (
    <div className="heatmap-card">
      <div className="heatmap-card__title">{lotName.replace(/_/g, ' ')}</div>
      <div className="heatmap-card__grid-wrapper">
        <div className="heatmap-card__y-labels">
          {yLabels.map(d => (
            <div key={d} className="heatmap-card__y-label" style={{ height: dimensions.cellH || 24 }}>{d}</div>
          ))}
        </div>
        <div className="heatmap-card__canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="heatmap-card__canvas"
            style={{ height: dimensions.height || 168 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </div>
      </div>
      <div className="heatmap-card__x-labels">
        {xTicks.map(t => (
          <span key={t.index} className="heatmap-card__x-label">{t.label}</span>
        ))}
      </div>
      {tooltip && <Tooltip {...tooltip} />}
    </div>
  );
}

function Tooltip({ x, y, day, time, value, count }) {
  return (
    <div className="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip__row">
        <span className="tooltip__label">Day</span>
        <span className="tooltip__value">{day}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__label">Time</span>
        <span className="tooltip__value">{time}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__label">Occupancy</span>
        <span className="tooltip__value">{value !== null ? `${value.toFixed(1)}%` : 'N/A'}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__label">Samples</span>
        <span className="tooltip__value">{count}</span>
      </div>
    </div>
  );
}
