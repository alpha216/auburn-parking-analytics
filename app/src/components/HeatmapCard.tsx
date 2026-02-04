import type { HeatmapMatrix, SampleCountMatrix, LotConfig, HeatmapMeta, TooltipData } from '../types/heatmap';
import { HeatmapGrid } from './HeatmapGrid';
import './HeatmapCard.css';

interface HeatmapCardProps {
    lot: LotConfig;
    matrix: HeatmapMatrix;
    sampleCounts: SampleCountMatrix | null;
    meta: HeatmapMeta;
    startHour: number;
    endHour: number;
    onCellHover: (data: TooltipData | null) => void;
}

export function HeatmapCard({
    lot,
    matrix,
    sampleCounts,
    meta,
    startHour,
    endHour,
    onCellHover,
}: HeatmapCardProps) {
    return (
        <div className="heatmap-card" id={`heatmap-${lot.id}`}>
            <div className="heatmap-header">
                <div className="heatmap-title">
                    <span className="lot-icon">{lot.icon}</span>
                    <h2>{lot.name}</h2>
                </div>
                {/* <div className="heatmap-stats">
                    <div className="stat">
                        <span className="stat-value">{stats.avg}%</span>
                        <span className="stat-label">Avg Occupancy</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{stats.peak}%</span>
                        <span className="stat-label">Peak</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{stats.dataPoints}</span>
                        <span className="stat-label">Data Points</span>
                    </div>
                </div> */}
            </div>

            <HeatmapGrid
                matrix={matrix}
                sampleCounts={sampleCounts}
                yLabels={meta.yLabels}
                xLabels={meta.xLabels}
                startHour={startHour}
                endHour={endHour}
                onCellHover={onCellHover}
            />
        </div>
    );
}

