import type { HeatmapMatrix, SampleCountMatrix, TooltipData } from '../types/heatmap';
import { getColorForValue } from '../utils/colors';
import './HeatmapGrid.css';

interface HeatmapGridProps {
    matrix: HeatmapMatrix;
    sampleCounts: SampleCountMatrix | null;
    yLabels: string[];
    xLabels: string[];
    startHour: number;
    endHour: number;
    onCellHover: (data: TooltipData | null) => void;
}

export function HeatmapGrid({
    matrix,
    sampleCounts,
    yLabels,
    xLabels,
    startHour,
    endHour,
    onCellHover,
}: HeatmapGridProps) {
    // Calculate slot indices from hours (each hour = 4 slots of 15 minutes)
    const startSlot = startHour * 4;
    const endSlot = endHour * 4;

    // Filter xLabels to only show the selected range
    const filteredXLabels = xLabels.slice(startSlot, endSlot);

    const handleMouseEnter = (
        e: React.MouseEvent,
        dayIndex: number,
        slotIndex: number
    ) => {
        // slotIndex is relative to filtered array, convert back to original index
        const originalSlotIndex = slotIndex + startSlot;
        const value = matrix[dayIndex][originalSlotIndex];
        const samples = sampleCounts ? sampleCounts[dayIndex][originalSlotIndex] : 0;

        onCellHover({
            day: yLabels[dayIndex],
            time: xLabels[originalSlotIndex],
            value,
            samples,
            x: e.clientX,
            y: e.clientY,
        });
    };

    const handleMouseMove = (e: React.MouseEvent, dayIndex: number, slotIndex: number) => {
        const originalSlotIndex = slotIndex + startSlot;
        const value = matrix[dayIndex][originalSlotIndex];
        const samples = sampleCounts ? sampleCounts[dayIndex][originalSlotIndex] : 0;

        onCellHover({
            day: yLabels[dayIndex],
            time: xLabels[originalSlotIndex],
            value,
            samples,
            x: e.clientX,
            y: e.clientY,
        });
    };

    const handleMouseLeave = () => {
        onCellHover(null);
    };

    return (
        <div className="heatmap-wrapper">
            <div className="heatmap-grid">
                {/* Time labels */}
                <div className="time-labels">
                    {filteredXLabels.map((label, index) => {
                        const originalIndex = index + startSlot;
                        return (
                            <span
                                key={originalIndex}
                                className={`time-label ${originalIndex % 4 === 0 ? 'highlight' : ''}`}
                            >
                                {originalIndex % 4 === 0 ? label.split('~')[0] : ''}
                            </span>
                        );
                    })}
                </div>

                {/* Rows for each day */}
                {yLabels.map((dayLabel, dayIndex) => (
                    <div key={dayIndex} className="heatmap-row">
                        <span className="day-label">{dayLabel}</span>
                        <div className="cells-container">
                            {matrix[dayIndex].slice(startSlot, endSlot).map((value, slotIndex) => {
                                const color = getColorForValue(value);
                                return (
                                    <div
                                        key={slotIndex}
                                        className={`heatmap-cell ${value === null ? 'no-data' : ''}`}
                                        style={color ? { backgroundColor: color } : undefined}
                                        onMouseEnter={(e) => handleMouseEnter(e, dayIndex, slotIndex)}
                                        onMouseMove={(e) => handleMouseMove(e, dayIndex, slotIndex)}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

