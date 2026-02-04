/**
 * Application configuration
 */

import type { LotConfig } from '../types/heatmap';

// Data URL - uses environment variable in production, relative path in dev
export const DATA_URL = import.meta.env.VITE_DATA_URL || '/heatmaps';

// Parking lot configurations
export const LOTS: LotConfig[] = [
    { id: 'Stadium_Deck', name: 'Stadium Deck', icon: '🏟️' },
    { id: 'Athletics_Deck', name: 'Athletics Deck', icon: '🏋️' },
    { id: 'Haley_Deck', name: 'Haley Deck', icon: '🅿️' },
];

// Default time range
export const DEFAULT_RANGE = '7d' as const;
