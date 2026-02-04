import type { RangeType } from '../types/heatmap';
import { formatDateRange } from '../utils/colors';
import './RangeSelector.css';

interface RangeSelectorProps {
    currentRange: RangeType;
    onRangeChange: (range: RangeType) => void;
    dateFrom?: string;
    dateTo?: string;
    lastUpdated?: string;
}

const RANGES: { value: RangeType; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
];

export function RangeSelector({
    currentRange,
    onRangeChange,
    dateFrom,
    dateTo,
    lastUpdated,
}: RangeSelectorProps) {
    return (
        <div className="controls">
            <div className="range-selector">
                <span className="range-label">Time Range:</span>
                <div className="range-buttons">
                    {RANGES.map(({ value, label }) => (
                        <button
                            key={value}
                            className={`range-btn ${currentRange === value ? 'active' : ''}`}
                            onClick={() => onRangeChange(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="meta-info">
                {dateFrom && dateTo && (
                    <span className="date-range">{formatDateRange(dateFrom, dateTo)}</span>
                )}
                {lastUpdated && (
                    <span className="last-updated">Updated: {lastUpdated}</span>
                )}
            </div>
        </div>
    );
}
