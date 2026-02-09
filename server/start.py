#!/usr/bin/env python3
"""
Central scheduler for Auburn Parking Analytics.

Manages all scheduled tasks:
- Crawl parking data every 5 minutes
- Generate heatmaps daily at 12:00 AM
- Export CSV and git commit daily at 12:00 AM
"""
import time
import subprocess
from datetime import datetime, timedelta
import pytz

from db import DB
from parking_crawl import crawl_once
from aggregate_heatmaps import generate_all_heatmaps

# Central Time zone
CENTRAL_TZ = pytz.timezone('US/Central')

# Configuration
CRAWL_INTERVAL_MINUTES = 5


def get_seconds_until_next_interval(interval_minutes):
    """Calculate seconds until the next interval mark."""
    now = datetime.now(CENTRAL_TZ)
    current_minute = now.minute
    minutes_past_interval = current_minute % interval_minutes
    
    if minutes_past_interval == 0 and now.second == 0:
        return 0
    
    minutes_to_next = interval_minutes - minutes_past_interval
    next_interval = now.replace(second=0, microsecond=0) + timedelta(minutes=minutes_to_next)
    seconds_until_next = (next_interval - now).total_seconds()
    
    return max(0, seconds_until_next)


def is_midnight(now, last_daily_date):
    """Check if it's midnight and we haven't run daily tasks today."""
    return now.hour == 0 and now.minute < 5 and now.date() != last_daily_date


def git_commit_and_push():
    """Commit and push data changes to git."""
    try:
        # Change to project root
        subprocess.run(["git", "add", "data/"], cwd="..", check=True)
        
        now = datetime.now(CENTRAL_TZ)
        commit_msg = f"Daily data export - {now.strftime('%Y-%m-%d')}"
        
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd="..",
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            subprocess.run(["git", "push"], cwd="..", check=True)
            print(f"✅ Git commit and push successful: {commit_msg}")
            return True
        else:
            # No changes to commit
            print("ℹ️ No changes to commit")
            return True
            
    except Exception as e:
        print(f"❌ Git operation failed: {e}")
        return False


def run_daily_tasks(db):
    """Run all daily tasks: heatmaps, CSV export, git commit."""
    print("\n" + "=" * 60)
    print("🌙 Running daily tasks at midnight...")
    print("=" * 60)
    
    # 1. Generate heatmaps
    print("\n[1/3] Generating heatmaps...")
    generate_all_heatmaps()
    
    # 2. Export CSV
    print("\n[2/3] Exporting CSV...")
    db.export_to_csv()  # Uses default week_{year}_{week}.csv naming
    
    # 3. Git commit and push
    print("\n[3/3] Committing to git...")
    git_commit_and_push()
    
    print("\n" + "=" * 60)
    print("✅ Daily tasks completed!")
    print("=" * 60 + "\n")


def main():
    """Main scheduler loop."""
    print("=" * 60)
    print("🚀 Auburn Parking Analytics - Central Scheduler")
    print("=" * 60)
    print(f"Crawl interval: every {CRAWL_INTERVAL_MINUTES} minutes")
    print("Daily tasks: 12:00 AM (heatmaps, CSV export, git commit)")
    print("-" * 60)
    
    # Connect to database
        db = DB()
        db.test_connection()
        print("-" * 60)
    
    # Track last daily run
    last_daily_date = None
    last_crawl_time = None
    
    print("Scheduler started. Press Ctrl+C to stop.\n")
    
    try:
        while True:
            now = datetime.now(CENTRAL_TZ)
            
            # Check for 5-minute crawl interval
            current_interval = (now.hour * 60 + now.minute) // CRAWL_INTERVAL_MINUTES
            if last_crawl_time is None or current_interval != last_crawl_time:
                crawl_once(db)
                last_crawl_time = current_interval
            
            # Check for midnight daily tasks
            if is_midnight(now, last_daily_date):
                run_daily_tasks(db)
                last_daily_date = now.date()
            
            # Sleep until next check (every 30 seconds)
            wait_seconds = get_seconds_until_next_interval(CRAWL_INTERVAL_MINUTES)
            if wait_seconds > 30:
                time.sleep(30)
            else:
                time.sleep(max(1, wait_seconds))
                
    except KeyboardInterrupt:
        print("\n\n👋 Scheduler stopped by user.")
        db.close_connection()


if __name__ == "__main__":
    main()