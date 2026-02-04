import requests
from datetime import datetime, timedelta
import time
import pytz
from db import DB, LOT_NAME_TO_ID

# Central Time zone
CENTRAL_TZ = pytz.timezone('US/Central')

# URLs to fetch parking data from
URLS = {
    "stadium": "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-stdm-grg-lvl1",
    "athletics": "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-athletic-grg-lvl1",
    "haley": "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-west2"
}

# Fetch interval in minutes (aligned to clock: :00, :05, :10, etc.)
FETCH_INTERVAL_MINUTES = 5

def get_seconds_until_next_interval():
    """Calculate seconds until the next 5-minute clock mark."""
    now = datetime.now(CENTRAL_TZ)
    current_minute = now.minute
    minutes_past_interval = current_minute % FETCH_INTERVAL_MINUTES
    
    if minutes_past_interval == 0 and now.second == 0:
        return 0
    
    minutes_to_next = FETCH_INTERVAL_MINUTES - minutes_past_interval
    next_interval = now.replace(second=0, microsecond=0) + timedelta(minutes=minutes_to_next)
    seconds_until_next = (next_interval - now).total_seconds()
    
    return max(0, seconds_until_next)

def fetch_stadium_data():
    try:
        stadiumResponse = requests.get(URLS['stadium'])
        if not stadiumResponse.ok:
            return None
        
        stadiumJson = stadiumResponse.json()
        stadiumData = stadiumJson['lot_status']

        evSpotCoords = [
            "32.600559201904154,-85.48814522453688",  # Stall 33
            "32.60053102304166,-85.48814664785039",   # Stall 34
            "32.600503882656454,-85.48814530674588",  # Stall 35
            "32.600475642272514,-85.48814396564137"   # Stall 134
        ]
        electricStatuses = [item['status'] for item in stadiumData if item['coords'] in evSpotCoords]

        occAndAva = [0, 0]
        for status in electricStatuses:
            if status == 1: occAndAva[0] += 1
            if status == 0: occAndAva[1] += 1
        
        return occAndAva

    except Exception as error:
        print("Error fetching Stadium Deck data:", error)

def fetch_athletics_data():
    try:
        athleticsResponse = requests.get(URLS['athletics'])
        if not athleticsResponse.ok:
            return None
        
        athleticsJson = athleticsResponse.json()
        athleticsData = athleticsJson['lot_status']

        txt = ''
        for item in athleticsData:
            txt += str(item['status'])
        
        slicedTxt = txt[121:125]

        occAndAva = [0, 0]
        for status in slicedTxt:
            if status == str(1): occAndAva[0] += 1
            if status == str(0): occAndAva[1] += 1
        
        return occAndAva

    except Exception as error:
        print("Error fetching Athletics Deck data:", error)

def fetch_haley_data():
    try:
        haleyResponse = requests.get(URLS['haley'])
        if not haleyResponse.ok:
            return None
        
        haleyJson = haleyResponse.json()
        haleyData = haleyJson['lot_status']

        haleyEvSpotCoords = [
            "32.60308136711112,-85.50106216197128",
            "32.60305318310657,-85.50106213252354"
        ]
        
        haleyEvSpotStatuses = [item['status'] for item in haleyData if item['coords'] in haleyEvSpotCoords]

        occAndAva = [0, 0]
        for status in haleyEvSpotStatuses:
            if status == 1: occAndAva[0] += 1
            if status == 0: occAndAva[1] += 1
        
        return occAndAva

    except Exception as error:
        print("Error fetching Haley Deck data:", error)


def main():
    """Main function that crawls data every 5 minutes and saves to PostgreSQL."""
    print("Starting parking data crawler...")
    print(f"Crawl interval: every {FETCH_INTERVAL_MINUTES} minutes")
    print("-" * 50)
    
    # Connect to database
    db = DB()
    db.test_connection()
    print("-" * 50)
    
    # Wait for first aligned interval
    initial_wait = get_seconds_until_next_interval()
    if initial_wait > 0:
        next_run = datetime.now(CENTRAL_TZ) + timedelta(seconds=initial_wait)
        print(f"Waiting {initial_wait:.0f} seconds until next interval at {next_run.strftime('%H:%M')}...")
        time.sleep(initial_wait)
    
    while True:
        try:
            # Get current timestamp (truncate to minute for clean DB entries)
            now = datetime.now(CENTRAL_TZ)
            now = now.replace(second=0, microsecond=0)  # Clean timestamp
            timestamp_str = now.strftime("%Y-%m-%d %H:%M")
            
            # Fetch data from all lots
            stadiumData = fetch_stadium_data()
            athleticsData = fetch_athletics_data()
            haleyData = fetch_haley_data()
            
            # Save to PostgreSQL
            if stadiumData:
                lot_id = LOT_NAME_TO_ID.get("Stadium_Deck")
                db.add_data(now, lot_id, stadiumData[0], stadiumData[1])
                print(f"[{timestamp_str}] Stadium Deck: {stadiumData[0]} occupied, {stadiumData[1]} available")
            
            if athleticsData:
                lot_id = LOT_NAME_TO_ID.get("Athletics_Deck")
                db.add_data(now, lot_id, athleticsData[0], athleticsData[1])
                print(f"[{timestamp_str}] Athletics Deck: {athleticsData[0]} occupied, {athleticsData[1]} available")
            
            if haleyData:
                lot_id = LOT_NAME_TO_ID.get("Haley_Deck")
                db.add_data(now, lot_id, haleyData[0], haleyData[1])
                print(f"[{timestamp_str}] Haley Deck: {haleyData[0]} occupied, {haleyData[1]} available")
            
            if stadiumData or athleticsData or haleyData:
                print(f"[{timestamp_str}] ✅ Data saved to PostgreSQL")
            
            # Calculate wait time until next interval
            wait_seconds = get_seconds_until_next_interval()
            if wait_seconds < 5:
                wait_seconds = FETCH_INTERVAL_MINUTES * 60
            
            next_run = datetime.now(CENTRAL_TZ) + timedelta(seconds=wait_seconds)
            print(f"[{timestamp_str}] Next crawl at {next_run.strftime('%H:%M')} ({wait_seconds:.0f} seconds)...")
            print("-" * 50)
            
            time.sleep(wait_seconds)
            
        # Error handlings
        except KeyboardInterrupt:
            print("\nCrawler stopped by user.")
            db.close_connection()
            break
        except Exception as e:
            print(f"Error during crawl: {e}")
            wait_seconds = get_seconds_until_next_interval()
            if wait_seconds < 60:
                wait_seconds = FETCH_INTERVAL_MINUTES * 60
            print(f"Retrying in {wait_seconds:.0f} seconds...")
            time.sleep(wait_seconds)


if __name__ == "__main__":
    main()
