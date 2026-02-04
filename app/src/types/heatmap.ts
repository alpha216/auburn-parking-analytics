/**
 * TypeScript interfaces for heatmap data
 */

export type RangeType = '7d' | '30d' | 'all';

export interface HeatmapMeta {
    yLabels: string[];        // ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    xLabels: string[];        // ["00:00~00:14", "00:15~00:29", ...]
    metric: string;           // "occupancy_rate"
    unit: string;             // "percent"
    generated_at: string;     // "2026-02-02 17:05:52"
}

export interface HeatmapRange {
    from: string;  // "2026-01-27"
    to: string;    // "2026-02-02"
}

// 7x96 matrix: [day][slot] = occupancy percentage or null
export type HeatmapMatrix = (number | null)[][];

// 7x96 matrix: [day][slot] = sample count
export type SampleCountMatrix = number[][];

export interface HeatmapData {
    range: HeatmapRange;
    lots: Record<string, HeatmapMatrix>;
    sample_counts: Record<string, SampleCountMatrix>;
    meta: HeatmapMeta;
}

export interface LotConfig {
    id: string;
    name: string;
    icon: string;
}

export interface LotStats {
    avg: number;
    peak: number;
    dataPoints: number;
}

export interface TooltipData {
    day: string;
    time: string;
    value: number | null;
    samples: number;
    x: number;
    y: number;
}
