import type { TooltipData } from '../types/heatmap';
import './Tooltip.css';

interface TooltipProps {
    data: TooltipData | null;
}

export function Tooltip({ data }: TooltipProps) {
    if (!data) return null;

    const displayValue = data.value === null ? 'No data' : `${data.value}%`;
    const samplesText = data.samples > 0
        ? `Based on ${data.samples} sample${data.samples !== 1 ? 's' : ''}`
        : '';

    return (
        <div
            className="tooltip visible"
            style={{
                left: data.x + 15,
                top: data.y + 15
            }}
        >
            <div className="tooltip-day">{data.day}</div>
            <div className="tooltip-time">{data.time}</div>
            <div className="tooltip-value">{displayValue}</div>
            {samplesText && <div className="tooltip-samples">{samplesText}</div>}
        </div>
    );
}
