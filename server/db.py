import psycopg2
import csv
import os
import glob
from datetime import datetime
from dotenv import load_dotenv
import pytz

# Central Time zone for CSV imports
CENTRAL_TZ = pytz.timezone('America/Chicago')

# Load environment variables from .env file
load_dotenv()

# PostgreSQL connection configuration
DB_CONFIG = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
}

LOT_INFO = {
    "1": "Stadium_Deck",
    "2": "Athletics_Deck",
    "3": "Haley_Deck"
}

# Reverse mapping: lot_name -> lot_id
LOT_NAME_TO_ID = {v: int(k) for k, v in LOT_INFO.items()}

class DB:
    def __init__(self):
        self.conn = self.get_connection()
    
    def get_connection(self):
        """Create and return a PostgreSQL database connection."""
        return psycopg2.connect(**DB_CONFIG)

    def close_connection(self):
        self.conn.close()

    def test_connection(self):
        """Test the database connection."""
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Connected to PostgreSQL!")
            print(f"   Version: {version[0]}")
            cursor.close()
            return True
        except psycopg2.Error as e:
            print(f"❌ Connection failed: {e}")
            return False

    def add_data(self, timestamp, lot_id, occupied_spots, available_spots):
        """Add a single parking data record."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """INSERT INTO parking_data 
                   (timestamp, lot_id, occupied_spots, available_spots) 
                   VALUES (%s, %s, %s, %s)""",
                (timestamp, lot_id, occupied_spots, available_spots)
            )
            self.conn.commit()
            cursor.close()
            return True
        except Exception as e:
            print(f"❌ Failed to add data: {e}")
            return False
        
    def create_table(self):
        """Create the parking_data table if it doesn't exist."""
        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parking_data (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ NOT NULL,
                    lot_id INT NOT NULL,
                    occupied_spots INT NOT NULL,
                    available_spots INT NOT NULL
                )
            """)
            # Create index for faster time-based queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_parking_timestamp 
                ON parking_data (timestamp)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_parking_lot_id 
                ON parking_data (lot_id)
            """)
            self.conn.commit()
            cursor.close()
            print("✅ Table 'parking_data' created/verified successfully!")
            return True
        except Exception as e:
            print(f"❌ Failed to create table: {e}")
            return False

    def import_csv(self, csv_path):
        """Import parking data from a single CSV file."""
        if not os.path.exists(csv_path):
            print(f"❌ File not found: {csv_path}")
            return False
        
        try:
            cursor = self.conn.cursor()
            rows_inserted = 0
            
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                # Batch insert for better performance
                batch = []
                batch_size = 100
                
                for row in reader:
                    # Parse timestamp and localize to Central Time
                    timestamp = datetime.strptime(row['timestamp'].strip(), '%Y-%m-%d %H:%M')
                    timestamp = CENTRAL_TZ.localize(timestamp)  # Make timezone-aware
                    lot_name = row['lot_name'].strip()
                    # Convert lot_name to lot_id using the mapping
                    lot_id = LOT_NAME_TO_ID.get(lot_name)
                    if lot_id is None:
                        print(f"⚠️  Unknown lot name: {lot_name}, skipping...")
                        continue
                    occupied = int(row['occupied_spots'])
                    available = int(row['available_spots'])
                    
                    batch.append((timestamp, lot_id, occupied, available))
                    
                    if len(batch) >= batch_size:
                        cursor.executemany(
                            """INSERT INTO parking_data 
                               (timestamp, lot_id, occupied_spots, available_spots)
                               VALUES (%s, %s, %s, %s)""",
                            batch
                        )
                        rows_inserted += len(batch)
                        batch = []
                
                # Insert remaining rows
                if batch:
                    cursor.executemany(
                        """INSERT INTO parking_data 
                           (timestamp, lot_id, occupied_spots, available_spots)
                           VALUES (%s, %s, %s, %s)""",
                        batch
                    )
                    rows_inserted += len(batch)
            
            self.conn.commit()
            cursor.close()
            print(f"✅ Imported {rows_inserted} rows from {os.path.basename(csv_path)}")
            return True
            
        except Exception as e:
            self.conn.rollback()
            print(f"❌ Failed to import {csv_path}: {e}")
            return False

    def import_all_csvs(self, directory="parking_data"):
        """Import all CSV files from a directory."""
        csv_pattern = os.path.join(directory, "*.csv")
        csv_files = glob.glob(csv_pattern)
        
        if not csv_files:
            print(f"❌ No CSV files found in {directory}")
            return False
        
        print(f"📁 Found {len(csv_files)} CSV file(s) to import...")
        
        success_count = 0
        for csv_file in sorted(csv_files):
            if self.import_csv(csv_file):
                success_count += 1
        
        print(f"\n✅ Successfully imported {success_count}/{len(csv_files)} files")
        return success_count == len(csv_files)

    def get_row_count(self):
        """Get the total number of rows in parking_data table."""
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM parking_data")
            count = cursor.fetchone()[0]
            cursor.close()
            return count
        except Exception as e:
            print(f"❌ Failed to get row count: {e}")
            return -1

    def get_data(self, where_clause=""):
        """Get data from parking_data table with optional WHERE clause."""
        try:
            cursor = self.conn.cursor()
            query = f"SELECT * FROM parking_data {where_clause}"
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            return rows
        except Exception as e:
            print(f"❌ Failed to get data: {e}")
            return []

    def export_to_csv(self, output_path=None):
        """
        Export all parking data to a CSV file.
        
        Args:
            output_path: Path to save CSV. If None, uses ../data/week_{year}_{week}.csv
        """
        try:
            # Generate default path with year and week number
            if output_path is None:
                now = datetime.now()
                year = now.year
                week = now.isocalendar()[1]
                output_path = f"../data/week_{year}_{week:02d}.csv"
            
            # Ensure directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
            
            cursor = self.conn.cursor()
            
            # Get all data ordered by timestamp
            cursor.execute("""
                SELECT 
                    timestamp AT TIME ZONE 'America/Chicago' as timestamp_cst,
                    lot_id,
                    occupied_spots,
                    available_spots,
                    (occupied_spots + available_spots) as total_capacity
                FROM parking_data 
                ORDER BY timestamp
            """)
            rows = cursor.fetchall()
            cursor.close()
            
            if not rows:
                print("❌ No data to export")
                return False
            
            # Write to CSV
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                # Header
                writer.writerow(['timestamp', 'lot_name', 'occupied_spots', 'available_spots', 'total_capacity'])
                
                # Data rows - convert lot_id to lot_name
                for row in rows:
                    timestamp, lot_id, occupied, available, total = row
                    lot_name = LOT_INFO.get(str(lot_id), f"Unknown_{lot_id}")
                    # Format timestamp as YYYY-MM-DD HH:MM
                    timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M')
                    writer.writerow([timestamp_str, lot_name, occupied, available, total])
            
            print(f"✅ Exported {len(rows)} rows to {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to export data: {e}")
            return False


    def get_heatmap_data(self, days=None):
        """
        Get aggregated heatmap data directly from PostgreSQL.
        
        Data is recorded every 5 minutes, so each 15-minute slot averages 3 readings.
        Uses PostgreSQL EXTRACT and FLOOR to compute time slots.
        
        PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
        We convert to Python weekday: 0=Monday, ..., 6=Sunday
        
        Args:
            days: Number of days to look back (None for all data)
        
        Returns:
            Tuple of (data_rows, from_date, to_date)
            data_rows: List of tuples (lot_id, day_of_week, time_slot, avg_occupancy, sample_count)
        """
        try:
            cursor = self.conn.cursor()
            
            # Build WHERE clause for date filtering
            if days is not None:
                where_clause = f"WHERE timestamp >= NOW() - INTERVAL '{days} days'"
            else:
                where_clause = ""
            
            # Get date range
            date_query = f"""
                SELECT MIN(timestamp::date), MAX(timestamp::date) 
                FROM parking_data {where_clause}
            """
            cursor.execute(date_query)
            date_range = cursor.fetchone()
            from_date = str(date_range[0]) if date_range[0] else ""
            to_date = str(date_range[1]) if date_range[1] else ""
            
            # Main aggregation query
            # PostgreSQL DOW: Sun=0, Mon=1, ..., Sat=6
            # time slot: 0 ~ 288 (5 mins)
            # Convert UTC timestamp to local timezone for correct day/time slot calculation
            query = f"""
                SELECT 
                    lot_id,
                    EXTRACT(DOW FROM timestamp AT TIME ZONE 'America/Chicago')::int AS day_of_week,
                    FLOOR((EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Chicago') * 60 + EXTRACT(MINUTE FROM timestamp AT TIME ZONE 'America/Chicago')) / 5)::int AS time_slot,
                    ROUND(AVG((occupied_spots::float / NULLIF(occupied_spots + available_spots, 0)) * 100)::numeric, 1) AS avg_occupancy,
                    COUNT(*) AS sample_count
                FROM parking_data
                {where_clause}
                GROUP BY lot_id, day_of_week, time_slot
                ORDER BY lot_id, day_of_week, time_slot
            """

            """
             lot_id | day_of_week | time_slot | avg_occupancy | sample_count 
            --------+-------------+-----------+---------------+--------------
                  1 |           1 |        90 |          75.0 |            1
                  2 |           1 |       221 |           0.0 |            1
                  2 |           2 |       193 |          75.0 |            1
                  3 |           1 |        90 |         100.0 |            1
            """

            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            
            print(f"  Aggregated {len(rows)} day/slot combinations from database")
            return rows, from_date, to_date
            
        except Exception as e:
            print(f"❌ Failed to get heatmap data: {e}")
            return [], "", ""

if __name__ == "__main__":
    db = DB()
    db.test_connection()
    # db.create_table()
    db.import_all_csvs()
    db.close_connection()
