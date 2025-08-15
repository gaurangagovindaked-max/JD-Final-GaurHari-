from flask import Flask, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import threading
import time
import requests
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Google Sheets CSV URLs
LED_TV_CSV_URL = "https://docs.google.com/spreadsheets/d/1-CnYZapqRr7NS2kJgt48vk9XfFFp5IO2Fphp5MNuh-8/export?format=csv&gid=636068897"
EQUIPMENT_CSV_URL = "https://docs.google.com/spreadsheets/d/1FAZx008XFihdOWz7rDFqTpOcVwn16YXRtYBkI6TFZQs/export?format=csv&gid=1255715346"
PA_CSV_URL = "https://docs.google.com/spreadsheets/d/1d0gLnq4C5OfjsAGFYnL0CfWFUDjpes_RifySeMY8Px8/export?format=csv&gid=802546674"
CCTV_LIVE_CSV_URL = "https://docs.google.com/spreadsheets/d/1KPKr-GZLa2G9twirroyx_atLUsmX9-Xx5-sjK6Co5TU/export?format=csv&gid=1561700426"
CCTV_RESOLVED_CSV_URL = "https://docs.google.com/spreadsheets/d/1KPKr-GZLa2G9twirroyx_atLUsmX9-Xx5-sjK6Co5TU/export?format=csv&gid=1099893588"

# Global data cache
data_cache = {
    'led_tv_data': [],
    'equipment_data': [],
    'pa_data': [],
    'cctv_data': [],
    'statistics': {
        'led_tv': {'total': 0, 'working': 0, 'issues': 0},
        'equipment': {'total': 0, 'working': 0, 'issues': 0},
        'pa': {'total': 0, 'working': 0, 'issues': 0},
        'cctv': {'total': 0, 'working': 0, 'issues': 0}
    },
    'last_updated': None
}

def fetch_csv_data(url, rename_columns=None):
    """Fetch CSV data from Google Sheets URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Read CSV data using pandas
        from io import StringIO
        csv_data = StringIO(response.text)
        df = pd.read_csv(csv_data)
        
        # Clean and process data
        df = df.dropna(how='all')  # Remove completely empty rows
        df = df.fillna('')  # Fill NaN values with empty strings
        
        # Clean column names by stripping extra spaces
        df.columns = df.columns.str.strip()
        
        # Rename columns if specified
        if rename_columns:
            df = df.rename(columns=rename_columns)
        
        return df.to_dict('records')
    except Exception as e:
        logger.error(f"Error fetching CSV data from {url}: {str(e)}")
        return []

def calculate_statistics(data, status_column='STATUS'):
    """Calculate statistics for a dataset"""
    if not data:
        return {'total': 0, 'working': 0, 'issues': 0}
    
    total = len(data)
    working = 0
    issues = 0
    
    for record in data:
        # Try both STATUS and ISSUE columns
        status = str(record.get(status_column, '') or record.get('ISSUE', '')).lower()
        if any(word in status for word in ['working', 'fine', 'ok']):
            working += 1
        elif any(word in status for word in ['issue', 'reporting', 'problem', 'not working', 'broken', 'fault', 'test', 'error']):
            issues += 1
    
    return {
        'total': total,
        'working': working,
        'issues': issues
    }

def calculate_alert_states(data, timestamp_column='TIME STAMP', status_column='STATUS'):
    """Calculate alert states based on time thresholds"""
    if not data:
        return data
    
    current_time = datetime.now()
    
    for item in data:
        status = str(item.get(status_column, '') or item.get('ISSUE', '')).lower()
        timestamp_str = str(item.get(timestamp_column, '')).strip()
        
        # Parse timestamp
        timestamp = None
        if timestamp_str and timestamp_str != 'nan' and timestamp_str != '':
            try:
                formats_to_try = [
                    '%m/%d/%Y %H:%M:%S',
                    '%m/%d/%Y %I:%M:%S %p',
                    '%Y-%m-%d %H:%M:%S',
                    '%Y-%m-%d %I:%M:%S %p',
                    '%d/%m/%Y %H:%M:%S',
                    '%d-%m-%Y %H:%M:%S',
                    '%m/%d/%Y %H:%M',
                    '%Y-%m-%d %H:%M',
                    '%m/%d/%Y',
                    '%Y-%m-%d',
                ]
                
                for fmt in formats_to_try:
                    try:
                        timestamp = datetime.strptime(timestamp_str, fmt)
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
        
        # Calculate alert state
        alert_state = 'normal'
        if timestamp:
            time_diff = (current_time - timestamp).total_seconds()
            
            # Check if it's an issue status
            is_issue = any(word in status for word in ['issue', 'reporting', 'problem', 'not working', 'broken', 'fault', 'error'])
            
            if is_issue and time_diff > 15:  # 15 seconds for testing (will be 25 minutes in production)
                alert_state = 'overdue-issue'
                logger.info(f"Overdue issue detected: {item.get('NAME', 'Unknown')} - Status: {status} - Time diff: {time_diff}s")
            elif not is_issue and time_diff > 20:  # 20 seconds for testing (will be longer in production)
                alert_state = 'stale-update'
                logger.info(f"Stale update detected: {item.get('NAME', 'Unknown')} - Status: {status} - Time diff: {time_diff}s")
        
        item['ALERT_STATE'] = alert_state
    
    return data

def sort_data_by_priority(data, timestamp_column='TIME STAMP', status_column='STATUS'):
    """Sort data with latest issues first, then by timestamp descending"""
    if not data:
        return data
    
    def get_sort_key(item):
        # Get status and timestamp
        status = str(item.get(status_column, '') or item.get('ISSUE', '')).lower()
        timestamp_str = str(item.get(timestamp_column, '')).strip()
        
        # Determine if it's an issue
        is_issue = any(word in status for word in ['issue', 'reporting', 'problem', 'not working', 'broken', 'fault', 'error'])
        
        # Parse timestamp for sorting (handle various formats)
        timestamp = datetime.now()  # Default fallback
        
        if timestamp_str and timestamp_str != 'nan' and timestamp_str != '':
            try:
                # Try multiple timestamp formats
                formats_to_try = [
                    '%m/%d/%Y %H:%M:%S',     # 8/14/2025 6:05:56
                    '%m/%d/%Y %I:%M:%S %p',  # 8/14/2025 6:05:56 PM
                    '%Y-%m-%d %H:%M:%S',     # 2025-08-14 06:05:56
                    '%Y-%m-%d %I:%M:%S %p',  # 2025-08-14 6:05:56 PM
                    '%d/%m/%Y %H:%M:%S',     # 14/08/2025 6:05:56
                    '%d-%m-%Y %H:%M:%S',     # 14-08-2025 6:05:56
                    '%m/%d/%Y %H:%M',        # 8/14/2025 6:05
                    '%Y-%m-%d %H:%M',        # 2025-08-14 06:05
                    '%m/%d/%Y',              # 8/14/2025
                    '%Y-%m-%d',              # 2025-08-14
                ]
                
                for fmt in formats_to_try:
                    try:
                        timestamp = datetime.strptime(timestamp_str, fmt)
                        break
                    except ValueError:
                        continue
                        
            except Exception as e:
                # If all parsing fails, use current time
                logger.warning(f"Failed to parse timestamp '{timestamp_str}': {e}")
                timestamp = datetime.now()
        
        # Return tuple: (is_issue_priority, timestamp_descending)
        # Issues get priority (0), working items get lower priority (1)
        # Timestamp is negated for descending order (latest first)
        return (0 if is_issue else 1, -timestamp.timestamp())
    
    return sorted(data, key=get_sort_key)

def fetch_cctv_statistics():
    """Fetch CCTV data and calculate statistics"""
    try:
        # Fetch live issues
        live_response = requests.get(CCTV_LIVE_CSV_URL, timeout=10)
        live_count = 0
        if live_response.status_code == 200:
            live_lines = live_response.text.strip().split('\n')
            # Count non-header lines
            live_count = max(0, len(live_lines) - 1) if len(live_lines) > 1 else 0
        
        # Fetch resolved issues
        resolved_response = requests.get(CCTV_RESOLVED_CSV_URL, timeout=10)
        resolved_count = 0
        if resolved_response.status_code == 200:
            resolved_lines = resolved_response.text.strip().split('\n')
            # Count non-header lines
            resolved_count = max(0, len(resolved_lines) - 1) if len(resolved_lines) > 1 else 0
        
        total_count = live_count + resolved_count
        
        return {
            'total': total_count,
            'working': resolved_count,  # Resolved issues are "working" (fixed)
            'issues': live_count        # Live issues are current problems
        }
    except Exception as e:
        logger.error(f"Error fetching CCTV statistics: {str(e)}")
        return {'total': 0, 'working': 0, 'issues': 0}

def update_data_cache():
    """Update the global data cache with fresh data from Google Sheets"""
    global data_cache
    
    try:
        # Fetch LED/TV data
        led_tv_data = fetch_csv_data(LED_TV_CSV_URL)
        led_tv_data = calculate_alert_states(led_tv_data)
        led_tv_data = sort_data_by_priority(led_tv_data)
        data_cache['led_tv_data'] = led_tv_data
        data_cache['statistics']['led_tv'] = calculate_statistics(led_tv_data)
        
        # Fetch Equipment data
        equipment_data = fetch_csv_data(EQUIPMENT_CSV_URL, rename_columns={'ISSUE': 'STATUS'})
        equipment_data = calculate_alert_states(equipment_data, status_column='STATUS')
        equipment_data = sort_data_by_priority(equipment_data, status_column='STATUS')
        data_cache['equipment_data'] = equipment_data
        data_cache['statistics']['equipment'] = calculate_statistics(equipment_data, 'STATUS')
        
        # Fetch and process PA data
        pa_data = fetch_csv_data(PA_CSV_URL, {
            'TIME STAMP': 'TIME STAMP',
            'NAME': 'NAME',
            'Phone No': 'PHONE NO', 
            'ZONE': 'ZONE',
            'SECTOR': 'SECTOR',
            'LOCATION': 'LOCATION',
            'P.A': 'PA EQUIPMENT',
            'STATUS': 'STATUS',
            'EVIDENCE': 'EVIDENCE'
        })
        pa_data = calculate_alert_states(pa_data)
        pa_data = sort_data_by_priority(pa_data)
        
        data_cache['pa_data'] = pa_data
        data_cache['statistics']['pa'] = calculate_statistics(pa_data)
        
        # Fetch CCTV statistics
        data_cache['cctv_data'] = []
        data_cache['statistics']['cctv'] = fetch_cctv_statistics()
        
        # Update timestamp
        data_cache['last_updated'] = datetime.now().isoformat()
        
        logger.info(f"Data cache updated successfully at {data_cache['last_updated']}")
        
    except Exception as e:
        logger.error(f"Error updating data cache: {str(e)}")

def background_data_updater():
    """Background thread to update data every 2 seconds"""
    while True:
        try:
            update_data_cache()
            time.sleep(2)  # Update every 2 seconds
        except Exception as e:
            logger.error(f"Error in background updater: {str(e)}")
            time.sleep(5)  # Wait longer on error

# API Routes
@app.route('/api/data')
def get_all_data():
    """Get all dashboard data"""
    return jsonify(data_cache)

@app.route('/api/data/led-tv')
def get_led_tv_data():
    """Get LED/TV data only"""
    return jsonify({
        'data': data_cache['led_tv_data'],
        'statistics': data_cache['statistics']['led_tv'],
        'last_updated': data_cache['last_updated']
    })

@app.route('/api/data/equipments')
def get_equipment_data():
    """Get Equipment data only"""
    return jsonify({
        'data': data_cache['equipment_data'],
        'statistics': data_cache['statistics']['equipment'],
        'last_updated': data_cache['last_updated']
    })

@app.route('/api/data/pa')
def get_pa_data():
    """Get PA data only"""
    return jsonify({
        'data': data_cache['pa_data'],
        'statistics': data_cache['statistics']['pa'],
        'last_updated': data_cache['last_updated']
    })

@app.route('/api/data/cctv')
def get_cctv_data():
    """Get CCTV data only"""
    return jsonify({
        'data': data_cache['cctv_data'],
        'statistics': data_cache['statistics']['cctv'],
        'last_updated': data_cache['last_updated']
    })

@app.route('/api/refresh')
def manual_refresh():
    """Manual data refresh trigger"""
    update_data_cache()
    return jsonify({
        'status': 'success',
        'message': 'Data refreshed successfully',
        'last_updated': data_cache['last_updated']
    })

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

if __name__ == '__main__':
    # Initial data load
    update_data_cache()
    
    # Start background data updater thread
    updater_thread = threading.Thread(target=background_data_updater, daemon=True)
    updater_thread.start()
    
    logger.info("Starting Janmashtami Seva Dashboard Server...")
    logger.info("Dashboard will be available at: http://localhost:5000")
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)