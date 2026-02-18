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
import os
from datetime import datetime, timedelta
from typing import List
import pytz
from dotenv import load_dotenv
import boto3

from db import DB
from parking_crawl import crawl_once
from aggregate_heatmaps import generate_all_heatmaps

# Load environment variables (R2 credentials, DB creds, etc.)
load_dotenv()

# Central Time zone
CENTRAL_TZ = pytz.timezone('US/Central')

# Configuration
CRAWL_INTERVAL_MINUTES = 5
DEFAULT_HEATMAP_FILES = ["7d.json", "30d.json", "90d.json", "120d.json", "all.json", "meta.json"]


def _normalized_prefix(prefix: str) -> str:
    if not prefix:
        return ""
    prefix = prefix.lstrip("/")
    return prefix if prefix.endswith("/") else f"{prefix}/"


def upload_heatmaps_to_r2(output_dir: str, filenames: List[str]) -> bool:
    """Upload heatmap JSON files to Cloudflare R2, replacing existing objects."""

    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    endpoint = os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET")
    prefix = _normalized_prefix(os.getenv("R2_PREFIX", ""))

    if not all([access_key, secret_key, endpoint, bucket]):
        print("❌ Missing R2 configuration. Required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET")
        return False

    session = boto3.session.Session()
    client = session.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=os.getenv("R2_REGION", "auto"),
    )

    # Build list of existing local files to upload
    local_files = []
    for name in filenames:
        path = os.path.join(output_dir, name)
        if os.path.isfile(path):
            local_files.append((name, path))
        else:
            print(f"⚠️  Heatmap file missing, skipping: {path}")

    if not local_files:
        print("❌ No heatmap files found to upload.")
        return False

    # Delete previous objects (same keys) from R2
    keys_to_delete = [{"Key": f"{prefix}{name}"} for name, _ in local_files]
    try:
        client.delete_objects(Bucket=bucket, Delete={"Objects": keys_to_delete, "Quiet": True})
        print(f"🧹 Deleted {len(keys_to_delete)} previous heatmap objects from R2.")
    except Exception as e:
        print(f"❌ Failed to delete previous heatmap objects: {e}")
        return False

    # Upload updated files
    for name, path in local_files:
        key = f"{prefix}{name}"
        try:
            client.upload_file(
                path,
                bucket,
                key,
                ExtraArgs={"ContentType": "application/json"},
            )
            print(f"☁️  Uploaded: {key}")
        except Exception as e:
            print(f"❌ Failed to upload {path}: {e}")
            return False

    print("✅ R2 upload complete.")
    return True


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
    heatmaps_ok = generate_all_heatmaps()
    if heatmaps_ok:
        output_dir = os.path.join(os.getcwd(), "heatmaps")
        print("\n[1b/3] Uploading heatmaps to R2...")
        upload_heatmaps_to_r2(output_dir, DEFAULT_HEATMAP_FILES)
    
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