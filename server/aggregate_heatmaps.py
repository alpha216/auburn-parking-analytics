#!/usr/bin/env python3
"""
Aggregate parking data from PostgreSQL into heatmap JSON files for dashboard consumption.

Produces:
  - heatmaps/7d.json   (last 7 days)
  - heatmaps/30d.json  (last 30 days)
  - heatmaps/all.json  (all available data)

Each JSON file contains a 7×96 matrix per parking lot:
  - 7 days (Mon-Sun)
  - 96 time slots (15-minute intervals: 00:00-00:14, 00:15-00:29, ..., 23:45-23:59)
"""
import os
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import numpy as np
from server.db import DB, LOT_INFO

# Configuration
OUTPUT_DIR = "./heatmaps"
LOTS = list(LOT_INFO.values())  # ["Stadium_Deck", "Athletics_Deck", "Haley_Deck"]
LOT_ID_TO_NAME = {int(k): v for k, v in LOT_INFO.items()}
TIME_SLOTS = 96  # 24 hours × 4 (15-minute intervals)
DAYS_OF_WEEK = 7

def generate_time_labels() -> List[str]:
    """Generate 96 time slot labels like '00:00~00:14', '00:15~00:29', etc."""
    labels = []
    for slot in range(TIME_SLOTS):
        start_minutes = slot * 15
        end_minutes = start_minutes + 14
        start_h, start_m = divmod(start_minutes, 60)
        end_h, end_m = divmod(end_minutes, 60)
        labels.append(f"{start_h:02d}:{start_m:02d}~{end_h:02d}:{end_m:02d}")
    return labels


def compute_heatmap_from_db(db: DB, days: Optional[int]) -> Tuple[Dict[str, Dict], str, str]:
    """
    Compute heatmap matrices using pre-aggregated data from PostgreSQL.
    
    Args:
        db: Database connection
        days: Number of days to look back (None for all data)
    
    Returns:
        Tuple of (results_dict, from_date, to_date)
        results_dict contains matrix and sample_counts for each lot
    """
    # Get aggregated data from database
    rows, from_date, to_date = db.get_heatmap_data(days)
    
    # Initialize numpy arrays for each lot
    # Using object dtype to allow None values
    matrices = {}
    counts = {}
    for lot_id, lot_name in LOT_ID_TO_NAME.items():
        matrices[lot_id] = np.full((DAYS_OF_WEEK, TIME_SLOTS), None, dtype=object)
        counts[lot_id] = np.zeros((DAYS_OF_WEEK, TIME_SLOTS), dtype=int)
    
    # Fill matrices from query results
    # Each row: (lot_id, day_of_week, time_slot, avg_occupancy, sample_count)
    for row in rows:
        lot_id, day, slot, avg_occ, count = row
        if lot_id in matrices and 0 <= day < DAYS_OF_WEEK and 0 <= slot < TIME_SLOTS:
            matrices[lot_id][day][slot] = float(avg_occ) if avg_occ is not None else None
            counts[lot_id][day][slot] = int(count)
    
    # Convert numpy arrays to nested lists for JSON serialization
    results = {}
    for lot_id, lot_name in LOT_ID_TO_NAME.items():
        # Convert numpy array to list, handling None values
        matrix_list = []
        counts_list = []
        for day in range(DAYS_OF_WEEK):
            day_values = []
            day_counts = []
            for slot in range(TIME_SLOTS):
                val = matrices[lot_id][day][slot]
                day_values.append(float(val) if val is not None else None)
                day_counts.append(int(counts[lot_id][day][slot]))
            matrix_list.append(day_values)
            counts_list.append(day_counts)
        
        results[lot_name] = {
            "matrix": matrix_list,
            "sample_counts": counts_list
        }
    
    return results, from_date, to_date


def generate_heatmap_json(db: DB, days: Optional[int], reference_date: datetime) -> Dict:
    """Generate complete heatmap JSON structure for a date range."""
    lot_data, from_date, to_date = compute_heatmap_from_db(db, days)
    
    print(f"  Range: {from_date} to {to_date}")
    
    # Flatten to just the matrices for the main "lots" object
    lots_matrices = {lot: lot_data[lot]["matrix"] for lot in LOTS}
    
    # Include sample counts separately
    sample_counts = {lot: lot_data[lot]["sample_counts"] for lot in LOTS}
    
    return {
        "range": {
            "from": from_date,
            "to": to_date
        },
        "lots": lots_matrices,
        "sample_counts": sample_counts,
        "meta": {
            "yLabels": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "xLabels": generate_time_labels(),
            "metric": "occupancy_rate",
            "unit": "percent",
            "generated_at": reference_date.strftime("%Y-%m-%d %H:%M:%S")
        }
    }


def main():
    """Main entry point for heatmap generation."""
    print("=" * 60)
    print("Parking Heatmap Aggregator (PostgreSQL + NumPy)")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Connect to database
    db = DB()
    db.test_connection()
    
    row_count = db.get_row_count()
    if row_count == 0:
        print("No data found in database. Exiting.")
        db.close_connection()
        return
    
    print(f"\n📊 Total rows in database: {row_count}")
    
    # Use current time as reference
    reference_date = datetime.now()
    
    # Generate heatmaps for each range
    ranges = [
        (7, "7d.json"),
        (30, "30d.json"),
        (None, "all.json"),
    ]
    
    for days, filename in ranges:
        range_name = f"{days}d" if days else "all"
        print(f"\nGenerating {range_name} heatmap...")
        
        heatmap_json = generate_heatmap_json(db, days, reference_date)
        
        output_path = os.path.join(OUTPUT_DIR, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(heatmap_json, f, indent=2)
        
        print(f"  ✅ Saved to: {output_path}")
    
    # Generate meta file with last update time
    meta = {
        "last_updated": reference_date.strftime("%Y-%m-%d %H:%M:%S"),
        "files": ["7d.json", "30d.json", "all.json"],
        "lots": LOTS
    }
    meta_path = os.path.join(OUTPUT_DIR, "meta.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f"\n✅ Meta file saved to: {meta_path}")
    
    db.close_connection()
    
    print("\n" + "=" * 60)
    print("Done! Heatmap JSON files are ready.")
    print("=" * 60)


if __name__ == "__main__":
    main()