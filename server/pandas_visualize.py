#!/usr/bin/env python3
"""
Visualize heatmap JSON files as pandas DataFrames.
"""
import json
import pandas as pd
import sys

# Display settings
pd.set_option('display.max_columns', 20)  # Show more columns
pd.set_option('display.width', 200)       # Wider display
pd.set_option('display.float_format', '{:.1f}'.format)  # 1 decimal place

def load_heatmap(json_path):
    """Load heatmap JSON file."""
    with open(json_path, 'r') as f:
        return json.load(f)

def matrix_to_df(matrix, lot_name):
    """Convert 7×288 matrix to pandas DataFrame with labels."""
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    # Generate time labels (00:00, 00:05, 00:10, ...)
    time_labels = [f"{i*5//60:02d}:{i*5%60:02d}" for i in range(len(matrix[0]))]
    
    df = pd.DataFrame(matrix, index=days, columns=time_labels)
    return df

def print_heatmap_summary(data, lot_name):
    """Print a summary of the heatmap data."""
    matrix = data['lots'][lot_name]
    df = matrix_to_df(matrix, lot_name)
    
    print(f"\n{'='*60}")
    print(f"📊 {lot_name}")
    print(f"{'='*60}")
    print(f"Date range: {data['range']['from']} to {data['range']['to']}")
    print(f"Matrix shape: {len(matrix)} days × {len(matrix[0])} time slots")
    
    # Count non-null values per day
    non_null_counts = df.notna().sum(axis=1)
    print(f"\nData points per day:")
    for day, count in non_null_counts.items():
        print(f"  {day}: {count} slots with data")
    
    # Show a time slice (e.g., 8 AM to 6 PM business hours)
    # Time slots: 8:00 = slot 96, 18:00 = slot 216
    business_hours = df.iloc[:, 96:216]  # 8 AM to 6 PM
    
    print(f"\n📈 Business Hours (8 AM - 6 PM) Sample:")
    print(f"   First 10 slots shown:\n")
    print(business_hours.iloc[:, :10].to_string())
    
    # Statistics
    print(f"\n📉 Statistics:")
    flat_values = [v for row in matrix for v in row if v is not None]
    if flat_values:
        print(f"  Min occupancy: {min(flat_values):.1f}%")
        print(f"  Max occupancy: {max(flat_values):.1f}%")
        print(f"  Avg occupancy: {sum(flat_values)/len(flat_values):.1f}%")
    else:
        print("  No data available")

def main():
    # Default to 7d.json, or take argument
    json_file = sys.argv[1] if len(sys.argv) > 1 else "./heatmaps/7d.json"
    
    print(f"Loading: {json_file}")
    data = load_heatmap(json_file)
    
    # Print info for each lot
    for lot_name in data['lots'].keys():
        print_heatmap_summary(data, lot_name)
    
    print(f"\n{'='*60}")
    print("Done!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
