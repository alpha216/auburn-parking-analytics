/**
 * Custom hook for fetching heatmap data
 */

import { useState, useEffect } from 'react';
import type { HeatmapData, RangeType } from '../types/heatmap';
import { DATA_URL } from '../utils/config';

interface UseHeatmapDataResult {
    data: HeatmapData | null;
    loading: boolean;
    error: string | null;
}

export function useHeatmapData(range: RangeType): UseHeatmapDataResult {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const url = `${DATA_URL}/${range}.json`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to fetch data`);
                }

                const json: HeatmapData = await response.json();

                if (!cancelled) {
                    setData(json);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setData(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [range]);

    return { data, loading, error };
}
