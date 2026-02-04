/**
 * Color utilities for heatmap visualization
 */

interface ColorStop {
    pct: number;
    color: { r: number; g: number; b: number };
}

// Color gradient: Green (low occupancy) -> Yellow -> Red (high occupancy)
const COLOR_STOPS: ColorStop[] = [
    { pct: 0, color: { r: 16, g: 185, b: 129 } },    // #10b981 - Green
    { pct: 25, color: { r: 132, g: 204, b: 22 } },   // #84cc16 - Lime
    { pct: 50, color: { r: 234, g: 179, b: 8 } },    // #eab308 - Yellow
    { pct: 75, color: { r: 249, g: 115, b: 22 } },   // #f97316 - Orange
    { pct: 100, color: { r: 239, g: 68, b: 68 } },   // #ef4444 - Red
];

/**
 * Get interpolated color for a given occupancy percentage
 */
export function getColorForValue(value: number | null): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const pct = Math.max(0, Math.min(100, value));

    // Find the two color stops to interpolate between
    let lower = COLOR_STOPS[0];
    let upper = COLOR_STOPS[COLOR_STOPS.length - 1];

    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
        if (pct >= COLOR_STOPS[i].pct && pct <= COLOR_STOPS[i + 1].pct) {
            lower = COLOR_STOPS[i];
            upper = COLOR_STOPS[i + 1];
            break;
        }
    }

    // Calculate interpolation factor
    const range = upper.pct - lower.pct;
    const factor = range === 0 ? 0 : (pct - lower.pct) / range;

    // Interpolate RGB values
    const r = Math.round(lower.color.r + factor * (upper.color.r - lower.color.r));
    const g = Math.round(lower.color.g + factor * (upper.color.g - lower.color.g));
    const b = Math.round(lower.color.b + factor * (upper.color.b - lower.color.b));

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Format date range for display
 */
export function formatDateRange(from: string, to: string): string {
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    };
    const fromDate = new Date(from).toLocaleDateString('en-US', options);
    const toDate = new Date(to).toLocaleDateString('en-US', options);
    return `${fromDate} — ${toDate}`;
}
