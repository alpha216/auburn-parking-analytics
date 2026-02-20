import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Aggregate 5-minute slots into wider buckets.
 * factor = 1 (5M), 3 (15M), 6 (30M), 12 (1H)
 */
function aggregateRow(row, factor) {
    if (factor === 1) return row;
    const out = [];
    for (let i = 0; i < row.length; i += factor) {
        const chunk = row.slice(i, i + factor);
        const valid = chunk.filter(v => v !== null);
        out.push(valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null);
    }
    return out;
}

function aggregateCountRow(row, factor) {
    if (factor === 1) return row;
    const out = [];
    for (let i = 0; i < row.length; i += factor) {
        const chunk = row.slice(i, i + factor);
        out.push(chunk.reduce((a, b) => a + b, 0));
    }
    return out;
}

const CELL_FACTORS = { '5M': 1, '15M': 3, '30M': 6, '1H': 12 };

export default function useHeatmapData() {
    const [meta, setMeta] = useState(null);
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI state
    const [selectedLots, setSelectedLots] = useState([]);
    const [dayRange, setDayRange] = useState('all');
    const [cellSize, setCellSize] = useState('15M');
    const [startHour, setStartHour] = useState(0);
    const [endHour, setEndHour] = useState(24);

    // Fetch meta on mount
    useEffect(() => {
        fetch('https://api.alphacar.dev/parking-stat/meta.json')
            .then(r => r.json())
            .then(m => {
                setMeta(m);
                setSelectedLots(m.lots); // all lots selected by default
            })
            .catch(e => setError(e.message));
    }, []);

    // Fetch range data when dayRange changes
    useEffect(() => {
        if (!meta) return;
        setLoading(true);
        const file = dayRange === 'all' ? 'all.json' : `${dayRange}.json`;
        fetch(`https://api.alphacar.dev/parking-stat/${file}`)
            .then(r => r.json())
            .then(d => {
                setRawData(d);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [meta, dayRange]);

    // Compute processed data
    const processed = useMemo(() => {
        if (!rawData) return null;

        const factor = CELL_FACTORS[cellSize] || 1;
        const startSlot = startHour * 12; // 12 slots per hour at 5-min granularity
        const endSlot = endHour * 12;

        const xLabels = rawData.meta.xLabels;

        // Generate aggregated x labels
        const aggLabels = [];
        for (let i = startSlot; i < endSlot; i += factor) {
            if (i < xLabels.length) {
                aggLabels.push(xLabels[i]);
            }
        }

        const result = {};
        for (const lot of Object.keys(rawData.lots)) {
            const matrix = rawData.lots[lot];
            const counts = rawData.sample_counts[lot];
            const aggMatrix = [];
            const aggCounts = [];

            for (let day = 0; day < 7; day++) {
                // Slice to time window first, then aggregate
                const sliced = matrix[day].slice(startSlot, endSlot);
                const slicedCounts = counts[day].slice(startSlot, endSlot);
                aggMatrix.push(aggregateRow(sliced, factor));
                aggCounts.push(aggregateCountRow(slicedCounts, factor));
            }

            result[lot] = { matrix: aggMatrix, counts: aggCounts };
        }

        return {
            lots: result,
            xLabels: aggLabels,
            yLabels: rawData.meta.yLabels,
            range: rawData.range,
        };
    }, [rawData, cellSize, startHour, endHour]);

    const toggleLot = useCallback((lot) => {
        setSelectedLots(prev =>
            prev.includes(lot)
                ? prev.filter(l => l !== lot)
                : [...prev, lot]
        );
    }, []);

    return {
        meta,
        processed,
        loading,
        error,
        selectedLots,
        dayRange,
        cellSize,
        startHour,
        endHour,
        setDayRange,
        setCellSize,
        setStartHour,
        setEndHour,
        toggleLot,
        setSelectedLots,
    };
}
