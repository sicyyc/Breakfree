from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import os
from dotenv import load_dotenv
from functools import wraps
from werkzeug.utils import secure_filename
import uuid
import requests
import time
import re
from math import isnan
import hashlib
import math
from datetime import datetime

# Load environment variables before importing Firebase config
load_dotenv()

# Firebase imports
from firebase_config import db
from firebase_admin import auth, firestore

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))  # Use environment variable for session key

# Configure upload folder
UPLOAD_FOLDER = os.path.join('static', 'uploads', 'client_images')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Geocoding configuration
GOOGLE_GEOCODING_API_KEY = os.getenv('GOOGLE_GEOCODING_API_KEY')  # Optional: Add to .env file
NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search'

# Import the new Laguna Location API
from laguna_locations_api import laguna_api, get_municipality, get_all_municipalities, get_barangays, search_locations, get_location_stats


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def geocode_address(address):
    """
    Geocode an address to get latitude and longitude coordinates.
    First tries Google Geocoding API (if key is available), then falls back to Nominatim.
    """
    if not address or len(address.strip()) < 5:
        return None
    
    # Clean and prepare the address
    cleaned_address = clean_address(address)
    
    # Try Google Geocoding API first (if API key is available)
    if GOOGLE_GEOCODING_API_KEY:
        coords = geocode_with_google(cleaned_address)
        if coords:
            return coords
    
    # Fallback to Nominatim (OpenStreetMap)
    coords = geocode_with_nominatim(cleaned_address)
    return coords

def clean_address(address):
    """Clean and standardize the address for better geocoding results."""
    # Remove extra spaces and standardize
    address = re.sub(r'\s+', ' ', address.strip())
    
    # Add "Philippines" if not present to improve geocoding accuracy
    if 'philippines' not in address.lower() and 'ph' not in address.lower():
        address += ', Philippines'
    
    # Add "Laguna" if not present but address seems to be in Laguna
    if 'laguna' not in address.lower() and any(city in address.lower() for city in [
        'santa rosa', 'calamba', 'san pablo', 'los baños', 'biñan', 'cabuyao', 
        'sta rosa', 'bay', 'calauan', 'san pedro'
    ]):
        # Insert Laguna before Philippines
        if ', philippines' in address.lower():
            address = address.replace(', Philippines', ', Laguna, Philippines')
        else:
            address += ', Laguna'
    
    return address

def geocode_with_google(address):
    """Geocode using Google Geocoding API."""
    try:
        url = 'https://maps.googleapis.com/maps/api/geocode/json'
        params = {
            'address': address,
            'key': GOOGLE_GEOCODING_API_KEY,
            'region': 'ph',  # Bias towards Philippines
            'bounds': '13.9,120.8|14.7,121.6'  # Laguna bounds
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'OK' and data['results']:
                location = data['results'][0]['geometry']['location']
                coords = {
                    'lat': round(location['lat'], 6),
                    'lng': round(location['lng'], 6),
                    'source': 'google',
                    'formatted_address': data['results'][0]['formatted_address']
                }
                print(f"Google geocoded '{address}' to {coords['lat']}, {coords['lng']}")
                return coords
    except Exception as e:
        print(f"Google geocoding error for '{address}': {e}")
    
    return None

def geocode_with_nominatim(address):
    """Geocode using Nominatim (OpenStreetMap) service."""
    try:
        # Rate limiting for Nominatim (max 1 request per second)
        time.sleep(1.1)
        
        params = {
            'q': address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'ph',  # Limit to Philippines
            'bounded': 1,
            'viewbox': '120.8,13.9,121.6,14.7',  # Laguna bounds (west,south,east,north)
            'addressdetails': 1
        }
        
        headers = {
            'User-Agent': 'BreakFree-App/1.0'  # Required by Nominatim
        }
        
        response = requests.get(NOMINATIM_BASE_URL, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                result = data[0]
                coords = {
                    'lat': round(float(result['lat']), 6),
                    'lng': round(float(result['lon']), 6),
                    'source': 'nominatim',
                    'formatted_address': result.get('display_name', address)
                }
                print(f"Nominatim geocoded '{address}' to {coords['lat']}, {coords['lng']}")
                return coords
    except Exception as e:
        print(f"Nominatim geocoding error for '{address}': {e}")
    
    return None

def generate_fallback_coordinates():
    """Generate random coordinates within Laguna bounds as last resort."""
    import random
    laguna_bounds = {
        'north': 14.7,
        'south': 13.9,
        'east': 121.6,
        'west': 120.8
    }
    
    lat = random.uniform(laguna_bounds['south'], laguna_bounds['north'])
    lng = random.uniform(laguna_bounds['west'], laguna_bounds['east'])
    
    return {
        'lat': round(lat, 6),
        'lng': round(lng, 6),
        'source': 'fallback',
        'formatted_address': 'Generated coordinates (Laguna area)'
    }

def geocode_with_laguna_api(address):
    """Geocode using Laguna Location API for municipalities and barangays."""
    try:
        address_lower = address.lower()
        
        # Search for locations using the Laguna API
        search_results = search_locations(address_lower)
        
        if search_results:
            # Prioritize municipality matches over barangay matches
            municipality_matches = [r for r in search_results if r.type == 'municipality']
            barangay_matches = [r for r in search_results if r.type == 'barangay']
            
            # Use municipality match if available, otherwise use barangay match
            best_match = municipality_matches[0] if municipality_matches else barangay_matches[0]
            
            coords = {
                'lat': best_match.lat,
                'lng': best_match.lng,
                'source': 'laguna_api',
                'formatted_address': f"{best_match.name}, Laguna"
            }
            print(f"Laguna API geocoded '{address}' to {coords['lat']}, {coords['lng']} ({best_match.type}: {best_match.name})")
            return coords
        
        # If no direct match found, try to find municipality by partial name matching
        all_municipalities = get_all_municipalities()
        for municipality in all_municipalities:
            # Check if municipality name appears in the address
            if municipality.name.lower() in address_lower:
                coords = {
                    'lat': municipality.lat,
                    'lng': municipality.lng,
                    'source': 'laguna_api',
                    'formatted_address': f"{municipality.name}, Laguna"
                }
                print(f"Laguna API partial match geocoded '{address}' to {coords['lat']}, {coords['lng']} ({municipality.name})")
                return coords
                
    except Exception as e:
        print(f"Laguna API geocoding error for '{address}': {e}")
    
    return None

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        if session.get('role') != 'admin':
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            if session.get('role') not in allowed_roles:
                flash('Access denied. Insufficient privileges.', 'error')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        try:
            # Get form data
            email = request.form.get('email')
            uid = request.form.get('uid')

            if not all([email, uid]):
                return jsonify({'success': False, 'error': 'Missing required fields'}), 400

            # Verify the Firebase ID token
            user = auth.get_user(uid)
            
            # Get user's role from Firestore
            users_ref = db.collection('users')
            user_query = users_ref.where('uid', '==', uid).limit(1).stream()
            user_doc = next(user_query, None)
            
            if not user_doc:
                return jsonify({'success': False, 'error': 'User not found in database'}), 404
                
            actual_role = user_doc.to_dict().get('role')
            
            if not actual_role:
                return jsonify({'success': False, 'error': 'User role not found'}), 404
            
            # Store user info in session
            session['user_id'] = uid
            session['email'] = email
            session['role'] = actual_role
            
            # Log login activity
            log_activity(
                user_id=uid,
                user_email=email,
                user_role=actual_role,
                action='Login',
                details=f'User logged in successfully from {request.remote_addr}',
                target_id=uid,
                target_type='user'
            )
            
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        except Exception as e:
            print(f"Login error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
            
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        # Fetch clients from Firestore
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        # Initialize counters
        total_clients = 0
        in_house_clients = 0
        after_care_clients = 0
        
        # Count clients by care type
        for client in clients:
            client_data = client.to_dict()
            total_clients += 1
            
            care_type = client_data.get('care_type', 'in_house').lower().replace(' ', '_')
            if care_type in ['after_care', 'aftercare']:
                after_care_clients += 1
            else:
                in_house_clients += 1
        
        # Role-based filtering: House workers only see in-house statistics
        user_role = session.get('role', '')
        if user_role == 'house_worker':
            print("House worker detected - showing only in-house statistics")
            total_clients = in_house_clients
            after_care_clients = 0
                
    except Exception as e:
        print(f"Error fetching client counts: {e}")
        total_clients = 0
        in_house_clients = 0
        after_care_clients = 0
    
    return render_template('dashboard.html', 
                         email=session['email'],
                         username=session['email'].split('@')[0],
                         total_clients=total_clients,
                         in_house_clients=in_house_clients,
                         after_care_clients=after_care_clients,
                         active_tab='dashboard')

@app.route('/check_in')
@role_required(['admin', 'psychometrician', 'house_worker'])
def check_in():
    try:
        print(f"User accessing check_in: {session.get('email')} with role: {session.get('role')}")
        return render_template('check_in.html', 
                            email=session.get('email'),
                            user_id=session.get('user_id'),
                            role=session.get('role'),
                            active_tab='check-in')
    except Exception as e:
        print(f"Error in check_in route: {e}")
        return redirect(url_for('login'))



# Weekly Schedule API (Firestore-backed)
@app.route('/api/schedule', methods=['GET', 'POST'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def api_schedule():
    from flask import jsonify
    try:
        schedule_doc_ref = db.collection('meta').document('weekly_schedule')
        if request.method == 'GET':
            snapshot = schedule_doc_ref.get()
            data = snapshot.to_dict() if snapshot.exists else {}
            # Ensure consistent structure
            if not isinstance(data, dict):
                data = {}
            return jsonify(data)
        else:
            body = request.get_json(silent=True) or {}
            if not isinstance(body, dict):
                body = {}
            schedule_doc_ref.set(body)
            return jsonify({'status': 'ok'})
    except Exception as e:
        from flask import jsonify
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule/reset', methods=['POST'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def api_schedule_reset():
    from flask import jsonify
    try:
        schedule_doc_ref = db.collection('meta').document('weekly_schedule')
        # Clearing the stored custom schedule lets the client fall back to defaults
        schedule_doc_ref.delete()
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Daily Activities API Routes
@app.route('/api/daily-activities', methods=['GET'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_daily_activities():
    """Get all daily activities"""
    try:
        activities_ref = db.collection('daily_activities')
        activities = []
        
        for activity in activities_ref.stream():
            activity_data = activity.to_dict()
            activity_data['id'] = activity.id
            activities.append(activity_data)
        
        # Sort by start time
        activities.sort(key=lambda x: x.get('startTime', ''))
        
        return jsonify({'success': True, 'activities': activities})
    except Exception as e:
        print(f"Error fetching daily activities: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/daily-activities', methods=['POST'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def create_daily_activity():
    """Create a new daily activity"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'startTime', 'endTime', 'days']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Validate time format
        if data['startTime'] >= data['endTime']:
            return jsonify({'success': False, 'error': 'End time must be after start time'}), 400
        
        # Prepare activity data
        activity_data = {
            'name': data['name'],
            'startTime': data['startTime'],
            'endTime': data['endTime'],
            'days': data['days'],
            'type': data.get('type', 'other'),
            'description': data.get('description', ''),
            'isRecurring': data.get('isRecurring', False),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'createdBy': session.get('user_id'),
            'createdByEmail': session.get('email')
        }
        
        # Add to Firestore
        doc_ref = db.collection('daily_activities').add(activity_data)
        activity_id = doc_ref[1].id
        
        # Log activity
        log_activity(
            user_id=session.get('user_id'),
            user_email=session.get('email'),
            user_role=session.get('role'),
            action='Create Daily Activity',
            details=f'Created activity: {data["name"]}',
            target_id=activity_id,
            target_type='daily_activity'
        )
        
        return jsonify({'success': True, 'id': activity_id})
    except Exception as e:
        print(f"Error creating daily activity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/daily-activities/<activity_id>', methods=['PUT'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def update_daily_activity(activity_id):
    """Update an existing daily activity"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'startTime', 'endTime', 'days']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Validate time format
        if data['startTime'] >= data['endTime']:
            return jsonify({'success': False, 'error': 'End time must be after start time'}), 400
        
        # Check if activity exists
        activity_ref = db.collection('daily_activities').document(activity_id)
        if not activity_ref.get().exists:
            return jsonify({'success': False, 'error': 'Activity not found'}), 404
        
        # Prepare update data
        update_data = {
            'name': data['name'],
            'startTime': data['startTime'],
            'endTime': data['endTime'],
            'days': data['days'],
            'type': data.get('type', 'other'),
            'description': data.get('description', ''),
            'isRecurring': data.get('isRecurring', False),
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'updatedBy': session.get('user_id'),
            'updatedByEmail': session.get('email')
        }
        
        # Update in Firestore
        activity_ref.update(update_data)
        
        # Log activity
        log_activity(
            user_id=session.get('user_id'),
            user_email=session.get('email'),
            user_role=session.get('role'),
            action='Update Daily Activity',
            details=f'Updated activity: {data["name"]}',
            target_id=activity_id,
            target_type='daily_activity'
        )
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating daily activity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/daily-activities/<activity_id>', methods=['DELETE'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def delete_daily_activity(activity_id):
    """Delete a daily activity"""
    try:
        # Check if activity exists
        activity_ref = db.collection('daily_activities').document(activity_id)
        activity_doc = activity_ref.get()
        
        if not activity_doc.exists:
            return jsonify({'success': False, 'error': 'Activity not found'}), 404
        
        activity_data = activity_doc.to_dict()
        
        # Delete from Firestore
        activity_ref.delete()
        
        # Log activity
        log_activity(
            user_id=session.get('user_id'),
            user_email=session.get('email'),
            user_role=session.get('role'),
            action='Delete Daily Activity',
            details=f'Deleted activity: {activity_data.get("name", "Unknown")}',
            target_id=activity_id,
            target_type='daily_activity'
        )
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting daily activity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/daily-activities/schedule', methods=['GET'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_daily_activities_schedule():
    """Get daily activities formatted as a weekly schedule"""
    try:
        activities_ref = db.collection('daily_activities')
        activities = []
        
        for activity in activities_ref.stream():
            activity_data = activity.to_dict()
            activity_data['id'] = activity.id
            activities.append(activity_data)
        
        # Group activities by day
        schedule = {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
            'saturday': [],
            'sunday': []
        }
        
        for activity in activities:
            for day in activity.get('days', []):
                if day in schedule:
                    schedule[day].append(activity)
        
        # Sort activities by start time for each day
        for day in schedule:
            schedule[day].sort(key=lambda x: x.get('startTime', ''))
        
        return jsonify({'success': True, 'schedule': schedule})
    except Exception as e:
        print(f"Error fetching daily activities schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/debug/clients')
@role_required(['admin', 'psychometrician', 'house_worker'])
def debug_clients():
    """Debug route to see what's happening with clients data"""
    try:
        clients_ref = db.collection('clients')
        all_clients_data = []
        
        for client in clients_ref.stream():
            client_dict = client.to_dict()
            client_dict['id'] = client.id
            all_clients_data.append(client_dict)
        
        debug_info = {
            'total_clients': len(all_clients_data),
            'clients': all_clients_data,
            'session': dict(session)
        }
        
        from flask import jsonify
        return jsonify(debug_info)
    except Exception as e:
        from flask import jsonify
        return jsonify({'error': str(e), 'traceback': str(e.__traceback__)})

@app.route('/clients')
@role_required(['admin', 'psychometrician', 'house_worker'])
def clients():
    try:
        print(f"User accessing clients page: {session.get('email')} with role: {session.get('role')}")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = 10  # Maximum 10 clients per page
        print(f"Pagination: page {page}, per_page {per_page}")
        
        # Fetch clients from Firestore
        clients_ref = db.collection('clients')
        all_clients_data = []
        print("Starting to fetch clients from Firestore...")
        
        print("Fetching clients stream...")
        clients_stream = clients_ref.stream()
        print("Got clients stream, iterating...")
        
        for client in clients_stream:
            client_dict = client.to_dict()
            client_dict['id'] = client.id
            print(f"Processing client: {client_dict.get('name', 'Unknown')} (ID: {client.id})")
            
            # Ensure ALL required fields exist with proper defaults
            # Skip clients with None names or fix them
            if client_dict.get('name') is None or client_dict.get('name') == '':
                print(f"Skipping client with None/empty name (ID: {client.id})")
                continue
            
            # Basic fields with defaults
            if 'phone' not in client_dict:
                client_dict['phone'] = None
            
            if 'emergency_contact' not in client_dict:
                client_dict['emergency_contact'] = None
                
            if 'registrationDate' not in client_dict:
                client_dict['registrationDate'] = client_dict.get('created_at', None)
            
            if 'flags' not in client_dict:
                client_dict['flags'] = []
                
            if 'archived' not in client_dict:
                client_dict['archived'] = False
            
            # Required template fields with defaults
            if 'age' not in client_dict or client_dict['age'] is None:
                client_dict['age'] = 'N/A'
                
            if 'gender' not in client_dict or client_dict['gender'] is None:
                client_dict['gender'] = 'Not specified'
                
            if 'address' not in client_dict or client_dict['address'] is None:
                client_dict['address'] = 'No address provided'
                
            if 'checkInDate' not in client_dict or client_dict['checkInDate'] is None:
                client_dict['checkInDate'] = 'N/A'
                
            # Handle new fields that might not exist for old clients
            if 'civil_status' not in client_dict:
                client_dict['civil_status'] = None
            if 'spouse_name' not in client_dict:
                client_dict['spouse_name'] = None
            if 'father_name' not in client_dict:
                client_dict['father_name'] = None
            if 'mother_name' not in client_dict:
                client_dict['mother_name'] = None
            if 'elementary_school' not in client_dict:
                client_dict['elementary_school'] = None
            if 'secondary_school' not in client_dict:
                client_dict['secondary_school'] = None
            if 'college' not in client_dict:
                client_dict['college'] = None
            if 'education_completed' not in client_dict:
                client_dict['education_completed'] = None
            if 'work_experience' not in client_dict:
                client_dict['work_experience'] = None
            if 'drug_usage_amount' not in client_dict:
                client_dict['drug_usage_amount'] = None
            if 'drug_effects' not in client_dict:
                client_dict['drug_effects'] = None
            if 'last_drug_use' not in client_dict:
                client_dict['last_drug_use'] = None
            if 'why_rehabilitation' not in client_dict:
                client_dict['why_rehabilitation'] = None
            if 'rehabilitation_goals' not in client_dict:
                client_dict['rehabilitation_goals'] = None

            # Normalize care type
            if 'care_type' not in client_dict or client_dict['care_type'] is None:
                client_dict['care_type'] = 'in_house'  # Default to in_house
            else:
                care_type = str(client_dict['care_type']).lower().replace(' ', '_')
                if care_type in ['after_care', 'aftercare']:
                    client_dict['care_type'] = 'after_care'
                else:
                    client_dict['care_type'] = 'in_house'

            # Normalize status value
            if 'status' in client_dict and client_dict['status'] is not None:
                status = str(client_dict['status']).lower()
                if status == 'active':
                    client_dict['status'] = 'active'
                elif status == 'relapsed':
                    client_dict['status'] = 'relapsed'
                elif status in ['review', 'under review']:
                    client_dict['status'] = 'review'
                elif status == 'pending':
                    client_dict['status'] = 'pending'
                elif status == 'rejected':
                    client_dict['status'] = 'rejected'
                elif status == 'completed':
                    client_dict['status'] = 'completed'
                elif status == 'ready_for_aftercare':
                    client_dict['status'] = 'ready_for_aftercare'
                elif status == 'pending_aftercare':
                    client_dict['status'] = 'pending_aftercare'
                else:
                    client_dict['status'] = 'active'  # Default status
            else:
                client_dict['status'] = 'active'  # Default if no status
            
            # Only add non-archived clients that are NOT pending (but include rejected clients)
            archived = client_dict.get('archived', False)
            status = client_dict.get('status', 'active')
            print(f"Client {client_dict.get('name', 'Unknown')}: archived = {archived}, status = {status}")
            if not archived and status not in ['pending', 'pending_aftercare']:
                all_clients_data.append(client_dict)
                print(f"Added client {client_dict.get('name', 'Unknown')} to display list")

        # Role-based filtering: House workers can only see in-house clients
        user_role = session.get('role', '')
        if user_role == 'house_worker':
            print("House worker detected - filtering to show only in-house clients")
            all_clients_data = [client for client in all_clients_data if client.get('care_type') != 'after_care']
            print(f"After filtering: {len(all_clients_data)} in-house clients")

        # Sort clients by name for consistent pagination
        all_clients_data.sort(key=lambda x: x.get('name', '').lower())
        
        # Calculate pagination
        total_clients = len(all_clients_data)
        total_pages = (total_clients + per_page - 1) // per_page  # Ceiling division
        print(f"Total clients: {total_clients}, Total pages: {total_pages}")
        
        # Calculate start and end indices for current page
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        # Get clients for current page
        clients_data = all_clients_data[start_idx:end_idx]
        print(f"Displaying clients {start_idx + 1} to {min(end_idx, total_clients)}")
        
        # Create pagination info
        pagination = {
            'page': page,
            'per_page': per_page,
            'total': total_clients,
            'total_pages': total_pages,
            'has_prev': page > 1,
            'has_next': page < total_pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < total_pages else None,
            'start_record': start_idx + 1 if total_clients > 0 else 0,
            'end_record': min(end_idx, total_clients)
        }

        print(f"Pagination: Page {page}/{total_pages}, showing {len(clients_data)} of {total_clients} clients")
    except Exception as e:
        print(f"Error fetching clients: {e}")
        clients_data = []
        pagination = {
            'page': 1,
            'per_page': per_page,
            'total': 0,
            'total_pages': 0,
            'has_prev': False,
            'has_next': False,
            'prev_num': None,
            'next_num': None,
            'start_record': 0,
            'end_record': 0
        }
    
    return render_template('clients.html', email=session['email'], clients=clients_data, pagination=pagination, active_tab='clients')

@app.route('/pending-clients')
@role_required(['admin'])
def pending_clients():
    try:
        print(f"Admin accessing pending clients page: {session.get('email')}")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = 10
        
        # Fetch pending clients from Firestore
        clients_ref = db.collection('clients')
        all_pending_clients = []
        
        clients_stream = clients_ref.stream()
        
        for client in clients_stream:
            client_dict = client.to_dict()
            client_dict['id'] = client.id
            
            # Skip clients with None names
            if client_dict.get('name') is None or client_dict.get('name') == '':
                continue
            
            # Include both pending approval clients and pending aftercare clients
            status = client_dict.get('status', 'active')
            archived = client_dict.get('archived', False)
            if (status == 'pending' or status == 'pending_aftercare') and not archived:
                # Ensure required fields exist
                if 'phone' not in client_dict:
                    client_dict['phone'] = None
                if 'emergency_contact' not in client_dict:
                    client_dict['emergency_contact'] = None
                if 'registrationDate' not in client_dict:
                    client_dict['registrationDate'] = client_dict.get('created_at', None)
                if 'age' not in client_dict or client_dict['age'] is None:
                    client_dict['age'] = 'N/A'
                if 'gender' not in client_dict or client_dict['gender'] is None:
                    client_dict['gender'] = 'Not specified'
                if 'address' not in client_dict or client_dict['address'] is None:
                    client_dict['address'] = 'No address provided'
                if 'checkInDate' not in client_dict or client_dict['checkInDate'] is None:
                    client_dict['checkInDate'] = 'N/A'
                if 'care_type' not in client_dict or client_dict['care_type'] is None:
                    client_dict['care_type'] = 'in_house'
                else:
                    care_type = str(client_dict['care_type']).lower().replace(' ', '_')
                    if care_type in ['after_care', 'aftercare']:
                        client_dict['care_type'] = 'after_care'
                    else:
                        client_dict['care_type'] = 'in_house'
                
                all_pending_clients.append(client_dict)
        
        # Sort by creation date (newest first)
        all_pending_clients.sort(key=lambda x: x.get('created_at', datetime.now()), reverse=True)
        
        # Calculate pagination
        total_clients = len(all_pending_clients)
        total_pages = math.ceil(total_clients / per_page)
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        clients_for_page = all_pending_clients[start_idx:end_idx]
        
        pagination = {
            'page': page,
            'per_page': per_page,
            'total': total_clients,
            'total_pages': total_pages,
            'has_prev': page > 1,
            'has_next': page < total_pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < total_pages else None,
            'start_record': start_idx + 1 if total_clients > 0 else 0,
            'end_record': min(end_idx, total_clients)
        }
        
        return render_template('pending_clients.html', clients=clients_for_page, pagination=pagination)
        
    except Exception as e:
        print(f"Error in pending_clients route: {e}")
        flash('Error loading pending clients. Please try again.', 'error')
        return render_template('pending_clients.html', clients=[], pagination={
            'page': 1,
            'per_page': 10,
            'total': 0,
            'total_pages': 0,
            'has_prev': False,
            'has_next': False,
            'prev_num': None,
            'next_num': None,
            'start_record': 0,
            'end_record': 0
        })

@app.route('/clients/add', methods=['GET', 'POST'])
@role_required(['admin', 'psychometrician'])
def add_client():
    if request.method == 'POST':
        try:
            # Debug: Log received form data
            print("Received form data:", dict(request.form))
            print("Received files:", list(request.files.keys()) if request.files else "No files")
            
            # Get form data
            # Handle both old and new form structures
            first_name = request.form.get('firstName', '')
            surname = request.form.get('surname', '')
            middle_initial = request.form.get('middleInitial', '')
            
            # Construct full name
            if first_name and surname:
                full_name = f"{first_name} {middle_initial} {surname}".strip()
            else:
                full_name = request.form.get('name', '')  # Fallback for old form
            
            # Get age, handle both string and int
            age_str = request.form.get('age', '0')
            try:
                age = int(age_str) if age_str else 0
            except ValueError:
                age = 0
            
            client_data = {
                'name': full_name,
                'firstName': first_name,
                'surname': surname,
                'middleInitial': middle_initial,
                'age': age,
                'gender': request.form.get('gender'),
                'address': request.form.get('address'),
                'phone': request.form.get('phone'),
                'emergency_contact': {
                    'name': request.form.get('emergency_name'),
                    'phone': request.form.get('emergency_phone')
                },
                # Credentials for client mobile login
                'clientId': request.form.get('clientId'),
                'registrationDate': request.form.get('registrationDate'),
                'checkInDate': request.form.get('checkInDate'),
                'status': 'pending',  # Always set as pending for new clients
                'care_type': request.form.get('care_type', 'in_house'),
                'created_at': datetime.now(),
                'created_by': session['user_id'],
                'created_by_role': session['role'],  # Track who created the client
                'flags': [],
                'archived': False
            }
            
            # Add new personal information fields
            client_data['civil_status'] = request.form.get('civil_status')
            client_data['spouse_name'] = request.form.get('spouse_name')
            client_data['years_married'] = request.form.get('years_married')
            client_data['number_of_children'] = request.form.get('number_of_children')
            client_data['relationship_with_children'] = request.form.get('relationship_with_children')
            client_data['father_name'] = request.form.get('father_name')
            client_data['mother_name'] = request.form.get('mother_name')
            client_data['relationship_with_father'] = request.form.get('relationship_with_father')
            client_data['relationship_with_mother'] = request.form.get('relationship_with_mother')
            client_data['number_of_siblings'] = request.form.get('number_of_siblings')
            client_data['birth_order'] = request.form.get('birth_order')
            client_data['relationship_with_siblings'] = request.form.get('relationship_with_siblings')
            client_data['elementary_school'] = request.form.get('elementary_school')
            client_data['secondary_school'] = request.form.get('secondary_school')
            client_data['college'] = request.form.get('college')
            client_data['education_completed'] = request.form.get('education_completed')
            client_data['reason_for_incomplete'] = request.form.get('reason_for_incomplete')
            client_data['work_experience'] = request.form.get('work_experience')
            
            # Rehabilitation Assessment Data
            client_data['drug_usage_amount'] = request.form.get('drug_usage_amount')
            client_data['drug_effects'] = request.form.get('drug_effects')
            client_data['drug_impact'] = request.form.get('drug_impact')
            client_data['last_drug_use'] = request.form.get('last_drug_use')
            client_data['first_drug_use'] = request.form.get('first_drug_use')
            client_data['drug_types'] = request.form.get('drug_types')
            client_data['drug_reasons'] = request.form.get('drug_reasons')
            client_data['drug_duration'] = request.form.get('drug_duration')
            client_data['why_rehabilitation'] = request.form.get('why_rehabilitation')
            client_data['wants_rehabilitation'] = request.form.get('wants_rehabilitation')
            client_data['who_wants_rehabilitation'] = request.form.get('who_wants_rehabilitation')
            client_data['previous_rehabilitation'] = request.form.get('previous_rehabilitation')
            client_data['previous_rehabilitation_location'] = request.form.get('previous_rehabilitation_location')
            client_data['rehabilitation_goals'] = request.form.get('rehabilitation_goals')
            client_data['rehabilitation_questions'] = request.form.get('rehabilitation_questions')

            # Ensure clientId is unique
            try:
                existing_iter = db.collection('clients').where('clientId', '==', client_id).limit(1).stream()
                existing_list = [doc for doc in existing_iter]
                if existing_list:
                    return jsonify({'success': False, 'error': 'Client ID already exists. Please choose another.'}), 409
            except Exception as e:
                # Log but do not block creation in case of transient read error
                print(f"Warning: could not verify clientId uniqueness: {e}")

            # Validate phone numbers (more flexible)
            phone = client_data['phone'].replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            emergency_phone = client_data['emergency_contact']['phone'].replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            
            if not (phone.isdigit() and len(phone) >= 10 and len(phone) <= 11):
                return jsonify({'success': False, 'error': 'Invalid contact number format. Please use 10-11 digits.'}), 400
            
            if not (emergency_phone.isdigit() and len(emergency_phone) >= 10 and len(emergency_phone) <= 11):
                return jsonify({'success': False, 'error': 'Invalid emergency contact number format. Please use 10-11 digits.'}), 400
            
            # Update with cleaned phone numbers
            client_data['phone'] = phone
            client_data['emergency_contact']['phone'] = emergency_phone

            # Validate client credentials (basic)
            client_id = (client_data.get('clientId') or '').strip()
            # Auto-generate client_id if missing
            if not client_id:
                try:
                    total_existing = sum(1 for _ in db.collection('clients').stream())
                    client_id = str(total_existing + 1)
                    client_data['clientId'] = client_id
                except Exception as e:
                    print(f"Error auto-generating clientId: {e}")
            # Password field removed - no longer required

            # Geocode the address automatically
            address = client_data.get('address', '').strip()
            if address and address != 'No address provided':
                print(f"Geocoding address for new client {client_data['name']}: {address}")
                try:
                    coordinates = geocode_address(address)
                    if coordinates:
                        # Generate offset coordinates to ensure unique positioning
                        client_data['coordinates'] = generate_offset_coordinates(coordinates, client_data.get('clientId', client_data.get('name', 'unknown')))
                        print(f"Successfully geocoded address with offset: {client_data['coordinates']['lat']}, {client_data['coordinates']['lng']} (source: {client_data['coordinates']['source']})")
                    else:
                        print(f"Failed to geocode address: {address}")
                        # Try manual mapping using Laguna API
                        manual_coords = geocode_with_laguna_api(address)
                        
                        if manual_coords:
                            # Generate offset coordinates to ensure unique positioning
                            client_data['coordinates'] = generate_offset_coordinates(manual_coords, client_data.get('clientId', client_data.get('name', 'unknown')))
                            print(f"Used Laguna API coordinates with offset: {client_data['coordinates']['lat']}, {client_data['coordinates']['lng']}")
                except Exception as geocode_error:
                    print(f"Error geocoding address: {geocode_error}")
                    # Continue without coordinates rather than failing the entire operation

            # Handle image upload
            if 'image' in request.files:
                image = request.files['image']
                if image.filename and allowed_file(image.filename):
                    # Generate a unique filename
                    filename = secure_filename(image.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                    
                    # Save the file
                    image.save(file_path)
                    
                    # Store the relative path in client data
                    client_data['image_url'] = os.path.join('uploads', 'client_images', unique_filename)

            # Add to Firestore
            new_client = db.collection('clients').add(client_data)
            
            # Log client creation activity
            log_activity(
                user_id=session['user_id'],
                user_email=session['email'],
                user_role=session['role'],
                action='Create Client',
                details=f'Created new client: {client_data["name"]}',
                target_id=new_client[1].id,
                target_type='client'
            )
            
            response_data = {
                'success': True, 
                'message': 'Client assessment submitted successfully and is pending admin approval',
                'client_id': new_client[1].id
            }
            
            # Add coordinates info to response
            if 'coordinates' in client_data:
                response_data['coordinates'] = client_data['coordinates']
                response_data['message'] += f" (Location: {client_data['coordinates']['source']})"
            else:
                response_data['message'] += " (No location data available)"
            
            return jsonify(response_data)
            
        except Exception as e:
            print(f"Error adding client: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 400

    # GET: suggest next client ID based on current total count
    try:
        clients_ref = db.collection('clients')
        total = sum(1 for _ in clients_ref.stream())
        suggested_client_id = str(total + 1)
    except Exception as e:
        print(f"Error counting clients for suggested ID: {e}")
        suggested_client_id = ''

    return render_template('add_client.html', email=session['email'], suggested_client_id=suggested_client_id)

@app.route('/clients/add/step2')
@role_required(['admin', 'psychometrician'])
def add_client_step2():
    return render_template('add_client_step2.html', email=session['email'])



@app.route('/clients/<client_id>/flag', methods=['POST'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def flag_client(client_id):
    try:
        # Get client reference
        client_ref = db.collection('clients').document(client_id)
        client = client_ref.get()

        if not client.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404

        # Get current flags
        client_data = client.to_dict()
        flags = client_data.get('flags', [])

        # Check if client is already flagged for review
        has_review_flag = any(flag['type'] == 'Review' for flag in flags)

        if has_review_flag:
            # Remove review flag
            flags = [flag for flag in flags if flag['type'] != 'Review']
        else:
            # Add review flag
            flags.append({
                'type': 'Review',
                'added_by': session['user_id'],
                'added_at': datetime.now(),
                'urgent': False
            })

        # Update client document
        client_ref.update({'flags': flags})

        return jsonify({'success': True, 'message': 'Flag updated successfully'})
    except Exception as e:
        print(f"Error flagging client: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/clients/<client_id>/archive', methods=['POST'])
@role_required(['admin'])
def archive_client(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        # Update the client to archived
        client_ref.update({
            'archived': True,
            'archived_at': datetime.now(),
            'archived_by': session['user_id']
        })
        
        # Log client archiving activity
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Archive Client',
            details=f'Archived client: {client_doc.to_dict().get("name", "Unknown")}',
            target_id=client_id,
            target_type='client'
        )
        
        return jsonify({'success': True, 'message': 'Client archived successfully'})
        
    except Exception as e:
        print(f"Error archiving client: {e}")
        return jsonify({'success': False, 'error': 'Failed to archive client'}), 500

@app.route('/clients/<client_id>/approve', methods=['POST'])
@role_required(['admin'])
def approve_client(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is pending
        if client_data.get('status') != 'pending':
            return jsonify({'success': False, 'error': 'Client is not pending approval'}), 400
        
        # Update the client status to active
        client_ref.update({
            'status': 'active',
            'approved_at': datetime.now(),
            'approved_by': session['user_id']
        })
        
        # Log client approval activity
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Approve Client',
            details=f'Approved client: {client_data.get("name", "Unknown")}',
            target_id=client_id,
            target_type='client'
        )
        
        return jsonify({'success': True, 'message': 'Client approved successfully'})
        
    except Exception as e:
        print(f"Error approving client: {e}")
        return jsonify({'success': False, 'error': 'Failed to approve client'}), 500

@app.route('/clients/<client_id>/reject', methods=['POST'])
@role_required(['admin'])
def reject_client(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is pending
        if client_data.get('status') != 'pending':
            return jsonify({'success': False, 'error': 'Client is not pending approval'}), 400
        
        # Get rejection reason from request
        rejection_reason = request.json.get('reason', 'No reason provided')
        
        # Update the client status to rejected
        client_ref.update({
            'status': 'rejected',
            'rejected_at': datetime.now(),
            'rejected_by': session['user_id'],
            'rejection_reason': rejection_reason
        })
        
        # Log client rejection activity
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Reject Client',
            details=f'Rejected client: {client_data.get("name", "Unknown")} - Reason: {rejection_reason}',
            target_id=client_id,
            target_type='client'
        )
        
        return jsonify({'success': True, 'message': 'Client rejected successfully'})
        
    except Exception as e:
        print(f"Error rejecting client: {e}")
        return jsonify({'success': False, 'error': 'Failed to reject client'}), 500

@app.route('/clients/<client_id>/send-to-aftercare', methods=['POST'])
@role_required(['admin', 'psychometrician'])
def send_to_aftercare(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is in-house and completed
        if client_data.get('care_type') != 'in_house':
            return jsonify({'success': False, 'error': 'Client is not in in-house care'}), 400
        
        if client_data.get('status') != 'completed':
            return jsonify({'success': False, 'error': 'Client treatment must be completed first'}), 400
        
        # Update client status to pending aftercare approval
        client_ref.update({
            'status': 'pending_aftercare',
            'aftercare_request_date': datetime.now(),
            'aftercare_requested_by': session['user_id']
        })
        
        return jsonify({
            'success': True, 
            'message': f'Aftercare request submitted for {client_data.get("name")}. Waiting for admin approval.'
        })
        
    except Exception as e:
        print(f"Error sending client to aftercare: {e}")
        return jsonify({'success': False, 'error': 'Failed to send client to aftercare'}), 500

@app.route('/clients/<client_id>/approve-aftercare', methods=['POST'])
@role_required(['admin'])
def approve_aftercare(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is pending aftercare
        if client_data.get('status') != 'pending_aftercare':
            return jsonify({'success': False, 'error': 'Client is not pending aftercare approval'}), 400
        
        # Update client status to approved and transfer to aftercare
        client_ref.update({
            'status': 'active',
            'care_type': 'after_care',
            'aftercare_approved_date': datetime.now(),
            'aftercare_approved_by': session['user_id']
        })
        
        return jsonify({
            'success': True, 
            'message': f'Aftercare request approved for {client_data.get("name")}. Client transferred to aftercare system.'
        })
        
    except Exception as e:
        print(f"Error approving aftercare: {e}")
        return jsonify({'success': False, 'error': 'Failed to approve aftercare'}), 500

@app.route('/clients/<client_id>/reject-aftercare', methods=['POST'])
@role_required(['admin'])
def reject_aftercare(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is pending aftercare
        if client_data.get('status') != 'pending_aftercare':
            return jsonify({'success': False, 'error': 'Client is not pending aftercare approval'}), 400
        
        # Get rejection reason from request
        rejection_reason = request.json.get('reason', 'No reason provided')
        
        # Update client status back to completed (rejected aftercare)
        client_ref.update({
            'status': 'completed',
            'aftercare_rejected_date': datetime.now(),
            'aftercare_rejected_by': session['user_id'],
            'aftercare_rejection_reason': rejection_reason
        })
        
        return jsonify({
            'success': True, 
            'message': f'Aftercare request rejected for {client_data.get("name")}.'
        })
        
    except Exception as e:
        print(f"Error rejecting aftercare: {e}")
        return jsonify({'success': False, 'error': 'Failed to reject aftercare'}), 500

@app.route('/clients/<client_id>/complete-treatment', methods=['POST'])
@role_required(['admin', 'facilitator'])
def complete_treatment(client_id):
    try:
        # Get the client document
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Check if client is in-house and active
        if client_data.get('care_type') != 'in_house':
            return jsonify({'success': False, 'error': 'Client is not in in-house care'}), 400
        
        if client_data.get('status') != 'active':
            return jsonify({'success': False, 'error': 'Client is not active'}), 400
        
        # Check progress status - get progress data
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        progress_data = progress_doc.to_dict() if progress_doc.exists else {}
        
        # Calculate current progress
        milestones = progress_data.get('milestones', [])
        if milestones:
            completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
            total_milestones = len(milestones)
            overall_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        else:
            overall_progress = 0
        
        # Check if progress is sufficient for completion (at least 80% or force completion)
        force_completion = request.json.get('force_completion', False) if request.is_json else False
        
        if overall_progress < 80 and not force_completion:
            return jsonify({
                'success': False, 
                'error': f'Client progress is only {overall_progress:.1f}%. Minimum 80% progress required for treatment completion.',
                'current_progress': overall_progress,
                'requires_force': True
            }), 400
        
        # Update client status to completed
        client_ref.update({
            'status': 'completed',
            'completion_date': datetime.now(),
            'completed_by': session['user_id']
        })
        
        return jsonify({
            'success': True, 
            'message': f'Treatment completed for {client_data.get("name")}. Client is now ready for aftercare.'
        })
        
    except Exception as e:
        print(f"Error completing treatment: {e}")
        return jsonify({'success': False, 'error': 'Failed to complete treatment'}), 500

@app.route('/client/<client_id>')
@role_required(['admin', 'psychometrician', 'house_worker'])
def client_profile(client_id):
    try:
        # Get client reference
        client_ref = db.collection('clients').document(client_id)
        client = client_ref.get()

        if not client.exists:
            flash('Client not found', 'error')
            return redirect(url_for('clients'))

        # Get client data
        client_data = client.to_dict()
        client_data['id'] = client.id
        
        # Ensure all required fields exist with proper defaults
        if 'phone' not in client_data:
            client_data['phone'] = None
            
        # Handle basic client fields
        if 'firstName' not in client_data:
            client_data['firstName'] = None
        if 'surname' not in client_data:
            client_data['surname'] = None
        if 'middleInitial' not in client_data:
            client_data['middleInitial'] = None
        if 'checkInDate' not in client_data:
            client_data['checkInDate'] = None
        if 'status' not in client_data:
            client_data['status'] = 'active'
        if 'care_type' not in client_data:
            client_data['care_type'] = 'in_house'
            
        if 'emergency_contact' not in client_data:
            client_data['emergency_contact'] = None
            
        # Handle registration date
        if 'registrationDate' not in client_data or not client_data['registrationDate']:
            if 'created_at' in client_data:
                client_data['registrationDate'] = client_data['created_at']
            else:
                client_data['registrationDate'] = None
        
        # Convert registration date if it's a timestamp
        if isinstance(client_data['registrationDate'], datetime):
            client_data['registrationDate'] = client_data['registrationDate'].strftime('%B %d, %Y')
        
        # Handle image URL
        if 'image_url' not in client_data or not client_data['image_url']:
            client_data['image_url'] = 'images/default-avatar.png'
            
        # Handle new personal information fields
        if 'civil_status' not in client_data:
            client_data['civil_status'] = None
        if 'spouse_name' not in client_data:
            client_data['spouse_name'] = None
        if 'years_married' not in client_data:
            client_data['years_married'] = None
        if 'number_of_children' not in client_data:
            client_data['number_of_children'] = None
        if 'relationship_with_children' not in client_data:
            client_data['relationship_with_children'] = None
        if 'father_name' not in client_data:
            client_data['father_name'] = None
        if 'mother_name' not in client_data:
            client_data['mother_name'] = None
        if 'relationship_with_father' not in client_data:
            client_data['relationship_with_father'] = None
        if 'relationship_with_mother' not in client_data:
            client_data['relationship_with_mother'] = None
        if 'number_of_siblings' not in client_data:
            client_data['number_of_siblings'] = None
        if 'birth_order' not in client_data:
            client_data['birth_order'] = None
        if 'relationship_with_siblings' not in client_data:
            client_data['relationship_with_siblings'] = None
            
        # Handle education and work fields
        if 'elementary_school' not in client_data:
            client_data['elementary_school'] = None
        if 'secondary_school' not in client_data:
            client_data['secondary_school'] = None
        if 'college' not in client_data:
            client_data['college'] = None
        if 'education_completed' not in client_data:
            client_data['education_completed'] = None
        if 'reason_for_incomplete' not in client_data:
            client_data['reason_for_incomplete'] = None
        if 'work_experience' not in client_data:
            client_data['work_experience'] = None
            
        # Handle rehabilitation assessment fields
        if 'drug_usage_amount' not in client_data:
            client_data['drug_usage_amount'] = None
        if 'drug_effects' not in client_data:
            client_data['drug_effects'] = None
        if 'drug_impact' not in client_data:
            client_data['drug_impact'] = None
        if 'last_drug_use' not in client_data:
            client_data['last_drug_use'] = None
        if 'first_drug_use' not in client_data:
            client_data['first_drug_use'] = None
        if 'drug_types' not in client_data:
            client_data['drug_types'] = None
        if 'drug_reasons' not in client_data:
            client_data['drug_reasons'] = None
        if 'drug_duration' not in client_data:
            client_data['drug_duration'] = None
        if 'why_rehabilitation' not in client_data:
            client_data['why_rehabilitation'] = None
        if 'wants_rehabilitation' not in client_data:
            client_data['wants_rehabilitation'] = None
        if 'who_wants_rehabilitation' not in client_data:
            client_data['who_wants_rehabilitation'] = None
        if 'previous_rehabilitation' not in client_data:
            client_data['previous_rehabilitation'] = None
        if 'previous_rehabilitation_location' not in client_data:
            client_data['previous_rehabilitation_location'] = None
        if 'rehabilitation_goals' not in client_data:
            client_data['rehabilitation_goals'] = None
        if 'rehabilitation_questions' not in client_data:
            client_data['rehabilitation_questions'] = None
            
        # Handle legacy fields that might still exist
        if 'primarySubstance' not in client_data:
            client_data['primarySubstance'] = None
        if 'usageFrequency' not in client_data:
            client_data['usageFrequency'] = None
        if 'useSeverity' not in client_data:
            client_data['useSeverity'] = None
        if 'lifeInterference' not in client_data:
            client_data['lifeInterference'] = None
        if 'mentalHealthConditions' not in client_data:
            client_data['mentalHealthConditions'] = None
        if 'mentalHealthNotes' not in client_data:
            client_data['mentalHealthNotes'] = None
        if 'currentMood' not in client_data:
            client_data['currentMood'] = None
        if 'stressLevel' not in client_data:
            client_data['stressLevel'] = None
        if 'supportNetwork' not in client_data:
            client_data['supportNetwork'] = None
        if 'livingSituation' not in client_data:
            client_data['livingSituation'] = None
        if 'livingSituationNotes' not in client_data:
            client_data['livingSituationNotes'] = None

        return render_template('client_profile.html', client=client_data, active_tab='clients')
    except Exception as e:
        print(f"Error fetching client profile: {e}")
        flash('Error loading client profile', 'error')
        return redirect(url_for('clients'))

@app.route('/interventions')
@role_required(['admin', 'psychometrician'])
def interventions():
    return render_template('interventions.html', email=session['email'], active_tab='interventions')

@app.route('/map')
@role_required(['admin', 'psychometrician', 'house_worker'])
def map():
    return render_template('map.html', email=session['email'], active_tab='map')

@app.route('/reports')
@role_required(['admin', 'psychometrician', 'house_worker'])
def reports():
    return render_template('reports.html', email=session['email'], active_tab='reports')

@app.route('/clients/<client_id>/update-fields', methods=['POST', 'PATCH'])
@role_required(['admin', 'psychometrician', 'facilitator'])
def update_client_fields(client_id):
    try:
        payload = request.get_json(force=True, silent=True) or {}
        if not isinstance(payload, dict) or not payload:
            return jsonify({'success': False, 'error': 'No fields provided'}), 400

        client_ref = db.collection('clients').document(client_id)
        doc = client_ref.get()
        if not doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404

        # Normalize potential birth date keys
        if 'birthday' in payload and 'birthdate' not in payload:
            payload['birthdate'] = payload.pop('birthday')
        if 'date_of_birth' in payload and 'birthdate' not in payload:
            payload['birthdate'] = payload.pop('date_of_birth')

        client_ref.update(payload)
        return jsonify({'success': True, 'updated': list(payload.keys())})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/activity-log')
@admin_required
def activity_log():
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = 20
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_filter = request.args.get('date', '')
        
        # Fetch activity logs from Firestore
        logs_ref = db.collection('activity_logs')
        query = logs_ref.order_by('timestamp', direction=firestore.Query.DESCENDING)
        
        # Apply filters
        if user_filter:
            query = query.where('user_email', '==', user_filter)
        if action_filter:
            query = query.where('action', '==', action_filter)
        if date_filter:
            # Parse date filter (assuming format: YYYY-MM-DD)
            try:
                from datetime import datetime, timedelta
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
                next_date = filter_date + timedelta(days=1)
                query = query.where('timestamp', '>=', filter_date).where('timestamp', '<', next_date)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        # Get all logs for pagination
        all_logs = []
        for log in query.stream():
            log_data = log.to_dict()
            log_data['id'] = log.id
            all_logs.append(log_data)
        
        # Calculate pagination
        total_logs = len(all_logs)
        total_pages = (total_logs + per_page - 1) // per_page
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        logs_for_page = all_logs[start_idx:end_idx]
        
        # Get unique users and actions for filter dropdowns
        users_ref = db.collection('users')
        all_users = []
        for user in users_ref.stream():
            user_data = user.to_dict()
            all_users.append(user_data.get('email', ''))
        
        # Get unique actions from logs
        unique_actions = list(set(log.get('action', '') for log in all_logs))
        unique_actions.sort()
        
        pagination = {
            'page': page,
            'per_page': per_page,
            'total': total_logs,
            'total_pages': total_pages,
            'has_prev': page > 1,
            'has_next': page < total_pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < total_pages else None,
            'start_record': start_idx + 1 if total_logs > 0 else 0,
            'end_record': min(end_idx, total_logs)
        }
        
        return render_template('activity_log.html', 
                             logs=logs_for_page, 
                             pagination=pagination,
                             users=all_users,
                             actions=unique_actions,
                             current_filters={
                                 'user': user_filter,
                                 'action': action_filter,
                                 'date': date_filter
                             },
                             active_tab='activity-log')
        
    except Exception as e:
        print(f"Error loading activity log: {e}")
        flash('Error loading activity log. Please try again.', 'error')
        return render_template('activity_log.html', 
                             logs=[], 
                             pagination={
                                 'page': 1,
                                 'per_page': 20,
                                 'total': 0,
                                 'total_pages': 0,
                                 'has_prev': False,
                                 'has_next': False,
                                 'prev_num': None,
                                 'next_num': None,
                                 'start_record': 0,
                                 'end_record': 0
                             },
                             users=[],
                             actions=[],
                             current_filters={},
                             active_tab='activity-log')

@app.route('/settings')
@role_required(['admin', 'psychometrician', 'house_worker'])
def settings():
    try:
        # Get all users from Firestore (only for admin and psychometrician)
        users = []
        if session.get('role') in ['admin', 'psychometrician']:
            users_ref = db.collection('users')
            for user in users_ref.stream():
                user_data = user.to_dict()
                user_data['id'] = user.id
                users.append(user_data)
        
        return render_template('settings.html', email=session['email'], users=users, active_tab='settings')
    except Exception as e:
        print(f"Error loading settings: {e}")
        return render_template('settings.html', email=session['email'], users=[], active_tab='settings')

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    """API endpoint to get all users"""
    try:
        users_ref = db.collection('users')
        users = []
        
        for user in users_ref.stream():
            user_data = user.to_dict()
            user_data['id'] = user.id
            # Don't include sensitive data like passwords
            if 'password' in user_data:
                del user_data['password']
            users.append(user_data)
        
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    """API endpoint to create a new user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        
        if not all([email, password, role]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Validate role
        valid_roles = ['admin', 'psychometrician', 'house_worker']
        if role not in valid_roles:
            return jsonify({'success': False, 'error': 'Invalid role'}), 400
        
        # Check if user already exists
        users_ref = db.collection('users')
        existing_user = users_ref.where('email', '==', email).limit(1).stream()
        if list(existing_user):
            return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
        
        # Create user in Firebase Auth
        try:
            user = auth.create_user(
                email=email,
                password=password
            )
        except Exception as auth_error:
            return jsonify({'success': False, 'error': f'Firebase Auth error: {str(auth_error)}'}), 400
        
        # Add user to Firestore
        user_data = {
            'uid': user.uid,
            'email': email,
            'role': role,
            'created_at': datetime.now(),
            'created_by': session['user_id'],
            'status': 'active'
        }
        
        new_user = users_ref.add(user_data)
        
        # Log user creation activity
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Create User',
            details=f'Created new user: {email} with role: {role}',
            target_id=new_user[1].id,
            target_type='user'
        )
        
        return jsonify({
            'success': True, 
            'message': 'User created successfully',
            'user_id': new_user[1].id
        })
        
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """API endpoint to delete a user"""
    try:
        # Get user data first
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        # Don't allow admin to delete themselves
        if user_data.get('uid') == session['user_id']:
            return jsonify({'success': False, 'error': 'Cannot delete your own account'}), 400
        
        # Delete from Firebase Auth
        try:
            auth.delete_user(user_data['uid'])
        except Exception as auth_error:
            print(f"Error deleting from Firebase Auth: {auth_error}")
            # Continue with Firestore deletion even if Auth fails
        
        # Delete from Firestore
        user_ref.delete()
        
        # Log user deletion activity
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Delete User',
            details=f'Deleted user: {user_data.get("email", "Unknown")}',
            target_id=user_id,
            target_type='user'
        )
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
        
    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """API endpoint to update a user"""
    try:
        data = request.get_json()
        role = data.get('role')
        status = data.get('status')
        
        if not role and not status:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        # Validate role if provided
        if role:
            valid_roles = ['admin', 'psychometrician', 'house_worker']
            if role not in valid_roles:
                return jsonify({'success': False, 'error': 'Invalid role'}), 400
        
        # Update user in Firestore
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        update_data = {}
        if role:
            update_data['role'] = role
        if status:
            update_data['status'] = status
        
        update_data['updated_at'] = datetime.now()
        update_data['updated_by'] = session['user_id']
        
        user_ref.update(update_data)
        
        # Log user update activity
        update_details = []
        if role:
            update_details.append(f'role: {role}')
        if status:
            update_details.append(f'status: {status}')
        
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Update User',
            details=f'Updated user: {user_doc.to_dict().get("email", "Unknown")} - {", ".join(update_details)}',
            target_id=user_id,
            target_type='user'
        )
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout')
def logout():
    # Log logout activity before clearing session
    if 'user_id' in session:
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Logout',
            details=f'User logged out from {request.remote_addr}',
            target_id=session['user_id'],
            target_type='user'
        )
    
    session.clear()
    return redirect(url_for('index'))

@app.route('/api/clients/locations')
@role_required(['admin', 'facilitator', 'caseworker'])
def get_client_locations():
    try:
        # Fetch clients from Firestore
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        clients_data = []
        debug_info = []  # For debugging
        
        for client in clients:
            client_dict = client.to_dict()
            client_id = client.id
            
            # Debug info
            debug_info.append({
                'id': client_id,
                'name': client_dict.get('name', 'Unknown'),
                'raw_coordinates': client_dict.get('coordinates', 'No coordinates')
            })
            
            # Only include essential fields for map display
            name = client_dict.get('name', 'Unknown Client')
            address = client_dict.get('address', 'No address provided')
            care_type = client_dict.get('care_type', 'in_house').lower().replace(' ', '_')
            status = client_dict.get('status', 'active').lower()
            coordinates = client_dict.get('coordinates', {})
            
            # Normalize care_type
            care_type = 'after_care' if care_type in ['after_care', 'aftercare'] else 'in_house'
            
            # Normalize status
            if status not in ['active', 'inactive', 'relapsed']:
                status = 'active'
            
            # Check coordinates format and convert if necessary
            valid_coordinates = False
            if isinstance(coordinates, dict):
                if 'lat' in coordinates and 'lng' in coordinates:
                    try:
                        lat = float(coordinates['lat'])
                        lng = float(coordinates['lng'])
                        if not (isnan(lat) or isnan(lng)):
                            valid_coordinates = True
                            coordinates = {'lat': lat, 'lng': lng}
                    except (ValueError, TypeError):
                        pass
            elif isinstance(coordinates, str):
                # Try to parse string format (in case it's stored as string)
                try:
                    import json
                    coords_dict = json.loads(coordinates)
                    if isinstance(coords_dict, dict) and 'lat' in coords_dict and 'lng' in coords_dict:
                        lat = float(coords_dict['lat'])
                        lng = float(coords_dict['lng'])
                        if not (isnan(lat) or isnan(lng)):
                            valid_coordinates = True
                            coordinates = {'lat': lat, 'lng': lng}
                except:
                    pass
            
            if valid_coordinates:
                client_data = {
                    'id': client_id,
                    'name': name,
                    'address': address,
                    'coordinates': coordinates,
                    'care_type': care_type,
                    'status': status,
                    'coordinate_source': coordinates.get('source', 'unknown')
                }
                
                # Add formatted address if available
                if 'formatted_address' in coordinates:
                    client_data['formatted_address'] = coordinates['formatted_address']
                
                clients_data.append(client_data)
        
        # Role-based filtering: House workers can only see in-house clients
        user_role = session.get('role', '')
        if user_role == 'house_worker':
            print("House worker detected - filtering API to show only in-house clients")
            clients_data = [client for client in clients_data if client.get('care_type') != 'after_care']
            print(f"After filtering: {len(clients_data)} in-house clients")
        
        print("Debug info for all clients:", debug_info)
        print(f"Returning {len(clients_data)} clients with location data")
        return jsonify(clients_data)
        
    except Exception as e:
        print(f"Error fetching client locations: {e}")
        import traceback
        traceback.print_exc()  # Print full error traceback
        return jsonify([])

# Add a new endpoint for background geocoding
@app.route('/api/clients/geocode-missing', methods=['POST'])
@role_required(['admin', 'facilitator'])
def geocode_missing_coordinates():
    try:
        # Get clients that need geocoding
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        to_geocode = []
        for client in clients:
            client_dict = client.to_dict()
            coordinates = client_dict.get('coordinates', {})
            address = client_dict.get('address', '')
            
            needs_geocoding = (
                not coordinates or 
                not isinstance(coordinates, dict) or
                'lat' not in coordinates or 
                'lng' not in coordinates or
                coordinates.get('source') == 'fallback'
            )
            
            if needs_geocoding and address and address != 'No address provided':
                to_geocode.append({
                    'id': client.id,
                    'name': client_dict.get('name', 'Unknown Client'),
                    'address': address
                })
        
        if not to_geocode:
            return jsonify({
                'success': True,
                'message': 'No clients need geocoding',
                'count': 0
            })
        
        # Start background geocoding task
        # Note: In a production environment, you would use a task queue like Celery
        # For now, we'll do it in a separate thread
        from threading import Thread
        
        def background_geocoding():
            for client in to_geocode:
                try:
                    coords = geocode_address(client['address'])
                    if coords:
                        client_ref = db.collection('clients').document(client['id'])
                        client_ref.update({
                            'coordinates': coords,
                            'coordinates_updated_at': datetime.now(),
                            'coordinates_updated_by': 'system_geocoder'
                        })
                        print(f"Geocoded {client['name']}: {coords['lat']}, {coords['lng']} (source: {coords['source']})")
                    time.sleep(1)  # Rate limiting
                except Exception as e:
                    print(f"Error geocoding {client['name']}: {e}")
        
        Thread(target=background_geocoding).start()
        
        return jsonify({
            'success': True,
            'message': f'Started geocoding {len(to_geocode)} clients in background',
            'count': len(to_geocode)
        })
        
    except Exception as e:
        print(f"Error starting geocoding: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# Add a new endpoint to update client coordinates
@app.route('/api/clients/<client_id>/coordinates', methods=['PUT'])
@role_required(['admin', 'facilitator'])
def update_client_coordinates(client_id):
    try:
        data = request.get_json()
        
        if not data or 'lat' not in data or 'lng' not in data:
            return jsonify({'success': False, 'error': 'Invalid coordinates data'}), 400
        
        lat = float(data['lat'])
        lng = float(data['lng'])
        
        # Validate coordinates are within reasonable bounds (Philippines area)
        if not (10 <= lat <= 20 and 115 <= lng <= 130):
            return jsonify({'success': False, 'error': 'Coordinates are outside valid range'}), 400
        
        # Update client coordinates
        client_ref = db.collection('clients').document(client_id)
        client = client_ref.get()
        
        if not client.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        coordinates = {
            'lat': lat,
            'lng': lng
        }
        
        client_ref.update({
            'coordinates': coordinates,
            'coordinates_updated_at': datetime.now(),
            'coordinates_updated_by': session['user_id']
        })
        
        return jsonify({
            'success': True,
            'message': 'Client coordinates updated successfully',
            'coordinates': coordinates
        })
        
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid coordinate values'}), 400
    except Exception as e:
        print(f"Error updating client coordinates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

# Add endpoint to manually geocode all clients
@app.route('/api/geocode/all', methods=['POST'])
@role_required(['admin'])
def geocode_all_clients():
    try:
        # Get optional parameters
        data = request.get_json() or {}
        force_regeocode = data.get('force', False)  # Force re-geocode even if coordinates exist
        max_requests = data.get('max_requests', 10)  # Limit requests to avoid rate limiting
        
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        results = {
            'total_processed': 0,
            'geocoded': 0,
            'cached': 0,
            'failed': 0,
            'skipped': 0,
            'errors': []
        }
        
        for client in clients:
            if results['total_processed'] >= max_requests:
                break
                
            client_dict = client.to_dict()
            client_id = client.id
            name = client_dict.get('name', 'Unknown Client')
            address = client_dict.get('address', '')
            
            results['total_processed'] += 1
            
            # Skip if no address
            if not address or address.strip() == '' or address == 'No address provided':
                results['skipped'] += 1
                continue
            
            # Check if we need to geocode
            coordinates = client_dict.get('coordinates')
            needs_geocoding = force_regeocode
            
            if not force_regeocode:
                if not coordinates or not isinstance(coordinates, dict):
                    needs_geocoding = True
                elif not ('lat' in coordinates and 'lng' in coordinates):
                    needs_geocoding = True
                elif coordinates.get('source') == 'fallback':
                    needs_geocoding = True
            
            if needs_geocoding:
                print(f"Geocoding {name}: {address}")
                
                try:
                    geocoded_coords = geocode_address(address)
                    
                    if geocoded_coords:
                        # Save to database
                        client_ref = db.collection('clients').document(client_id)
                        update_data = {
                            'coordinates': geocoded_coords,
                            'coordinates_updated_at': datetime.now(),
                            'coordinates_updated_by': session['user_id']
                        }
                        client_ref.update(update_data)
                        
                        results['geocoded'] += 1
                        print(f"Successfully geocoded {name}: {geocoded_coords['lat']}, {geocoded_coords['lng']} (source: {geocoded_coords['source']})")
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"Failed to geocode {name}: {address}")
                        
                except Exception as e:
                    results['failed'] += 1
                    error_msg = f"Error geocoding {name}: {str(e)}"
                    results['errors'].append(error_msg)
                    print(error_msg)
            else:
                results['cached'] += 1
        
        return jsonify({
            'success': True,
            'message': f"Geocoding completed. Processed {results['total_processed']} clients.",
            'results': results
        })
        
    except Exception as e:
        print(f"Error in bulk geocoding: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/clients/update-coordinates', methods=['POST'])
@admin_required
def update_all_client_coordinates():
    """
    Update all existing clients to have offset coordinates for better map visibility.
    This ensures clients with the same location are still visible on the map.
    """
    try:
        results = {
            'success': True,
            'updated': 0,
            'errors': 0,
            'details': []
        }
        
        # Get all clients
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        for client in clients:
            try:
                client_data = client.to_dict()
                client_id = client.id
                coordinates = client_data.get('coordinates', {})
                
                # Skip if no coordinates or already has offset
                if not coordinates or coordinates.get('offset_applied'):
                    continue
                
                # Generate new offset coordinates
                new_coordinates = generate_offset_coordinates(coordinates, client_id)
                
                # Update the client
                client_ref = db.collection('clients').document(client_id)
                client_ref.update({
                    'coordinates': new_coordinates
                })
                
                results['updated'] += 1
                results['details'].append(f"Updated {client_data.get('name', 'Unknown')}: {new_coordinates['lat']}, {new_coordinates['lng']}")
                
            except Exception as e:
                results['errors'] += 1
                results['details'].append(f"Error updating {client_data.get('name', 'Unknown')}: {str(e)}")
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clients/list', methods=['GET'])
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_clients_list():
    """
    API endpoint to get a list of clients for intervention assignment.
    Returns only active, non-archived clients.
    """
    try:
        # Fetch clients from Firestore
        clients_ref = db.collection('clients')
        clients_data = []
        
        for client in clients_ref.stream():
            client_dict = client.to_dict()
            client_dict['id'] = client.id
            
            # Skip clients with None names or archived clients
            if client_dict.get('name') is None or client_dict.get('name') == '':
                continue
                
            if client_dict.get('archived', False):
                continue
                
            # Only include clients eligible for interventions
            # Exclude pending and rejected clients
            if client_dict.get('status') in ['pending', 'rejected']:
                continue
            
            # Role-based filtering: House workers can only see in-house clients
            user_role = session.get('role', '')
            if user_role == 'house_worker':
                if client_dict.get('care_type') == 'after_care':
                    continue
            
            # Prepare client data for the list
            client_info = {
                'id': client.id,
                'name': client_dict.get('name', 'Unknown'),
                'clientId': client_dict.get('clientId', 'N/A'),
                'age': client_dict.get('age', 'N/A'),
                'gender': client_dict.get('gender', 'Not specified'),
                'care_type': client_dict.get('care_type', 'in_house'),
                'status': client_dict.get('status', 'active')
            }
            
            clients_data.append(client_info)
        
        # Sort by name
        clients_data.sort(key=lambda x: x.get('name', '').lower())
        
        return jsonify({
            'success': True,
            'clients': clients_data,
            'total': len(clients_data)
        })
        
    except Exception as e:
        print(f"Error fetching clients for intervention: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Add debug endpoint to check client data
@app.route('/api/debug/client/<client_id>')
@role_required(['admin'])
def debug_client_data(client_id):
    try:
        client_ref = db.collection('clients').document(client_id)
        client = client_ref.get()
        
        if not client.exists:
            return jsonify({'error': 'Client not found'}), 404
            
        client_data = client.to_dict()
        
        # Add debug info
        debug_info = {
            'id': client.id,
            'coordinates_type': type(client_data.get('coordinates')).__name__,
            'coordinates_raw': client_data.get('coordinates'),
            'all_data': client_data
        }
        
        return jsonify(debug_info)
        
    except Exception as e:
        print(f"Error in debug endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Add endpoint to fix client coordinates
@app.route('/api/fix/client-coordinates', methods=['POST'])
@role_required(['admin'])
def fix_client_coordinates():
    try:
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        fixed_count = 0
        errors = []
        
        for client in clients:
            try:
                client_dict = client.to_dict()
                coordinates = client_dict.get('coordinates', {})
                
                # Skip if no coordinates
                if not coordinates:
                    continue
                
                needs_fix = False
                fixed_coordinates = {}
                
                # Handle string format
                if isinstance(coordinates, str):
                    try:
                        import json
                        coordinates = json.loads(coordinates)
                        needs_fix = True
                    except:
                        errors.append(f"Failed to parse coordinates string for client {client.id}")
                        continue
                
                # Handle dict format
                if isinstance(coordinates, dict):
                    if 'lat' in coordinates and 'lng' in coordinates:
                        try:
                            lat = float(coordinates['lat'])
                            lng = float(coordinates['lng'])
                            if not (isnan(lat) or isnan(lng)):
                                fixed_coordinates = {
                                    'lat': lat,
                                    'lng': lng,
                                    'source': coordinates.get('source', 'unknown'),
                                }
                                if 'formatted_address' in coordinates:
                                    fixed_coordinates['formatted_address'] = coordinates['formatted_address']
                                needs_fix = True
                        except (ValueError, TypeError):
                            errors.append(f"Invalid coordinate values for client {client.id}")
                            continue
                
                if needs_fix:
                    client_ref = db.collection('clients').document(client.id)
                    client_ref.update({
                        'coordinates': fixed_coordinates,
                        'coordinates_updated_at': datetime.now()
                    })
                    fixed_count += 1
                    
            except Exception as e:
                errors.append(f"Error processing client {client.id}: {str(e)}")
        
        return jsonify({
            'success': True,
            'fixed_count': fixed_count,
            'errors': errors
        })
        
    except Exception as e:
        print(f"Error fixing coordinates: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Add endpoint to manually set coordinates for clients
@app.route('/api/set-client-coordinates', methods=['POST'])
@role_required(['admin'])
def set_client_coordinates():
    try:
        # Manual coordinates for common Laguna addresses
        address_coords = {
            'sta cruz laguna': {'lat': 14.2854, 'lng': 121.4134, 'source': 'manual'},
            'santa cruz laguna': {'lat': 14.2854, 'lng': 121.4134, 'source': 'manual'},
            'longos kalayaan laguna': {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'},
            'kalayaan laguna': {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'},
            '1069 zone 1 purok 1a real st': {'lat': 14.1850, 'lng': 121.0583, 'source': 'manual'},
            'purok 1a real st': {'lat': 14.1850, 'lng': 121.0583, 'source': 'manual'},
            'real street': {'lat': 14.1850, 'lng': 121.0583, 'source': 'manual'},
            'sta cruz laguna sambat': {'lat': 14.2791, 'lng': 121.4113, 'source': 'manual'}
        }
        
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        updated_count = 0
        client_info = []
        
        for client in clients:
            client_dict = client.to_dict()
            client_id = client.id
            name = client_dict.get('name', 'Unknown')
            address = client_dict.get('address', '').lower().strip()
            coordinates = client_dict.get('coordinates', {})
            
            client_info.append({
                'id': client_id,
                'name': name,
                'address': address,
                'has_coordinates': bool(coordinates and 'lat' in coordinates and 'lng' in coordinates)
            })
            
            # Check if client needs coordinates
            needs_coordinates = not (coordinates and 'lat' in coordinates and 'lng' in coordinates)
            
            if needs_coordinates and address:
                # Try to find matching coordinates
                matched_coords = None
                for addr_key, coords in address_coords.items():
                    if addr_key in address:
                        matched_coords = coords
                        break
                
                if matched_coords:
                    # Update client with coordinates
                    client_ref = db.collection('clients').document(client_id)
                    client_ref.update({
                        'coordinates': matched_coords,
                        'coordinates_updated_at': datetime.now(),
                        'coordinates_updated_by': session.get('user_id', 'manual_update')
                    })
                    updated_count += 1
                    print(f"Updated coordinates for {name}: {matched_coords}")
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'client_info': client_info,
            'message': f'Updated coordinates for {updated_count} clients'
        })
        
    except Exception as e:
        print(f"Error setting client coordinates: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Add endpoint to force geocode all existing clients
@app.route('/api/force-geocode-all', methods=['POST'])
@role_required(['admin'])
def force_geocode_all():
    try:
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        results = {
            'total': 0,
            'updated': 0,
            'failed': 0,
            'details': []
        }
        
        for client in clients:
            client_dict = client.to_dict()
            client_id = client.id
            name = client_dict.get('name', 'Unknown')
            address = client_dict.get('address', '').strip()
            
            results['total'] += 1
            
            if not address or address == 'No address provided':
                results['details'].append(f"Skipped {name}: No address")
                continue
            
            print(f"Force geocoding {name}: {address}")
            
            # Try geocoding first
            coordinates = None
            try:
                coordinates = geocode_address(address)
            except Exception as e:
                print(f"Geocoding error for {name}: {e}")
            
            # If geocoding fails, try manual mapping with accurate coordinates
            if not coordinates:
                address_lower = address.lower()
                
                # PRIORITY 1: Municipality/City matching (highest priority)
                # Cities
                if 'calamba' in address_lower:
                    coordinates = {'lat': 14.1877, 'lng': 121.1251, 'source': 'manual'}
                elif 'san pablo' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.0683, 'lng': 121.3251, 'source': 'manual'}
                elif 'santa rosa' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.3119, 'lng': 121.1114, 'source': 'manual'}
                elif 'binan' in address_lower or 'biñan' in address_lower:
                    coordinates = {'lat': 14.3306, 'lng': 121.0856, 'source': 'manual'}
                elif 'cabuyao' in address_lower:
                    coordinates = {'lat': 14.2471, 'lng': 121.1367, 'source': 'manual'}
                elif 'san pedro' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.3589, 'lng': 121.0476, 'source': 'manual'}
                
                # Municipalities - Northern Laguna
                elif 'siniloan' in address_lower:
                    coordinates = {'lat': 14.4167, 'lng': 121.4500, 'source': 'manual'}
                elif 'famy' in address_lower:
                    coordinates = {'lat': 14.4333, 'lng': 121.4500, 'source': 'manual'}
                elif 'mabitac' in address_lower:
                    coordinates = {'lat': 14.4500, 'lng': 121.4333, 'source': 'manual'}
                elif 'sta maria' in address_lower or 'santa maria' in address_lower:
                    coordinates = {'lat': 14.4667, 'lng': 121.4167, 'source': 'manual'}
                elif 'magsaysay' in address_lower:
                    coordinates = {'lat': 14.4833, 'lng': 121.4000, 'source': 'manual'}
                elif 'sta catalina' in address_lower or 'santa catalina' in address_lower:
                    coordinates = {'lat': 14.5000, 'lng': 121.3833, 'source': 'manual'}
                elif 'pansol' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.5167, 'lng': 121.3667, 'source': 'manual'}
                
                # Municipalities - Eastern Laguna
                elif 'paete' in address_lower:
                    coordinates = {'lat': 14.3667, 'lng': 121.4833, 'source': 'manual'}
                elif 'pakil' in address_lower:
                    coordinates = {'lat': 14.3833, 'lng': 121.4833, 'source': 'manual'}
                elif 'pangil' in address_lower:
                    coordinates = {'lat': 14.4000, 'lng': 121.4667, 'source': 'manual'}
                elif 'pagsanjan' in address_lower:
                    coordinates = {'lat': 14.2667, 'lng': 121.4500, 'source': 'manual'}
                elif 'cavinti' in address_lower:
                    coordinates = {'lat': 14.2500, 'lng': 121.5000, 'source': 'manual'}
                elif 'lumban' in address_lower:
                    coordinates = {'lat': 14.3000, 'lng': 121.4667, 'source': 'manual'}
                elif 'kalayaan' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                elif 'longos' in address_lower and 'kalayaan' in address_lower:
                    coordinates = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                
                # Municipalities - Central Laguna
                elif 'sta cruz' in address_lower or 'santa cruz' in address_lower:
                    if 'laguna' in address_lower or 'sambat' in address_lower:
                        coordinates = {'lat': 14.2854, 'lng': 121.4134, 'source': 'manual'}
                elif 'bay' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.1833, 'lng': 121.2833, 'source': 'manual'}
                elif 'los banos' in address_lower or 'los baños' in address_lower:
                    coordinates = {'lat': 14.1692, 'lng': 121.2417, 'source': 'manual'}
                elif 'calauan' in address_lower:
                    coordinates = {'lat': 14.1497, 'lng': 121.3156, 'source': 'manual'}
                elif 'alaminos' in address_lower:
                    coordinates = {'lat': 14.0639, 'lng': 121.2461, 'source': 'manual'}
                
                # Municipalities - Southern Laguna
                elif 'magdalena' in address_lower:
                    coordinates = {'lat': 14.2000, 'lng': 121.4333, 'source': 'manual'}
                elif 'majayjay' in address_lower:
                    coordinates = {'lat': 14.1500, 'lng': 121.4667, 'source': 'manual'}
                elif 'liliw' in address_lower:
                    coordinates = {'lat': 14.1333, 'lng': 121.4333, 'source': 'manual'}
                elif 'nagcarlan' in address_lower:
                    coordinates = {'lat': 14.1333, 'lng': 121.4167, 'source': 'manual'}
                elif 'rizal' in address_lower and 'laguna' in address_lower:
                    coordinates = {'lat': 14.1167, 'lng': 121.4000, 'source': 'manual'}
                elif 'san pascual' in address_lower:
                    coordinates = {'lat': 14.1000, 'lng': 121.3833, 'source': 'manual'}
                elif 'pila' in address_lower:
                    coordinates = {'lat': 14.2333, 'lng': 121.3667, 'source': 'manual'}
                elif 'victoria' in address_lower:
                    coordinates = {'lat': 14.2167, 'lng': 121.3333, 'source': 'manual'}
                
                # PRIORITY 2: Specific barangay matching (if no municipality found)
                elif 'longos' in address_lower:
                    # Longos is a barangay in Kalayaan, Laguna
                    coordinates = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                
                # PRIORITY 3: Street-specific mapping (lowest priority - only if no municipality/barangay found)
                elif 'real' in address_lower and ('st' in address_lower or 'street' in address_lower):
                    if 'zone' in address_lower or 'purok' in address_lower:
                        coordinates = {'lat': 14.2100, 'lng': 121.1200, 'source': 'manual'}
                    else:
                        coordinates = {'lat': 14.2120, 'lng': 121.1250, 'source': 'manual'}
            
            if coordinates:
                try:
                    client_ref = db.collection('clients').document(client_id)
                    client_ref.update({
                        'coordinates': coordinates,
                        'coordinates_updated_at': datetime.now(),
                        'coordinates_updated_by': session.get('user_id', 'force_geocode')
                    })
                    results['updated'] += 1
                    results['details'].append(f"Updated {name}: {coordinates['lat']}, {coordinates['lng']} ({coordinates['source']})")
                    print(f"Successfully updated coordinates for {name}")
                except Exception as e:
                    results['failed'] += 1
                    results['details'].append(f"Failed to update {name}: {str(e)}")
                    print(f"Error updating {name}: {e}")
            else:
                results['failed'] += 1
                results['details'].append(f"No coordinates found for {name}: {address}")
        
        return jsonify({
            'success': True,
            'results': results,
            'message': f"Processed {results['total']} clients. Updated: {results['updated']}, Failed: {results['failed']}"
        })
        
    except Exception as e:
        print(f"Error in force geocode: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/municipalities')
def get_municipalities():
    """Get all Laguna municipalities and cities with their coordinates"""
    try:
        municipalities = get_all_municipalities()
        return jsonify([{
            'id': muni.id,
            'name': muni.name,
            'type': muni.type,
            'lat': muni.lat,
            'lng': muni.lng,
            'population': muni.population,
            'area_km2': muni.area_km2
        } for muni in municipalities])
    except Exception as e:
        print(f"Error fetching municipalities: {e}")
        return jsonify({'error': 'Failed to load municipalities'}), 500

@app.route('/api/barangays/<municipality_id>')
def get_barangays_endpoint(municipality_id):
    """Get barangays for a specific municipality"""
    try:
        barangays = get_barangays(municipality_id)
        return jsonify(barangays)
    except Exception as e:
        print(f"Error fetching barangays for {municipality_id}: {e}")
        return jsonify({'error': 'Failed to load barangays'}), 500

@app.route('/api/locations/validate')
@role_required(['admin', 'psychometrician', 'house_worker'])
def validate_address():
    """Validate and geocode an address for the add client form"""
    try:
        address = request.args.get('address', '').strip()
        if not address:
            return jsonify({
                'success': False,
                'error': 'Address parameter required'
            }), 400
        
        # Try to geocode the address
        coordinates = geocode_address(address)
        
        if coordinates:
            return jsonify({
                'success': True,
                'address': address,
                'coordinates': coordinates,
                'message': f'Address geocoded successfully using {coordinates["source"]}'
            })
        else:
            return jsonify({
                'success': False,
                'address': address,
                'error': 'Could not geocode address. Please check the address format.'
            }), 400
        
    except Exception as e:
        print(f"Error validating address: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/locations/debug')
@role_required(['admin'])
def debug_locations():
    """Debug endpoint to check location mapping for specific addresses"""
    try:
        address = request.args.get('address', '').lower()
        if not address:
            return jsonify({
                'success': False,
                'error': 'Address parameter required'
            }), 400
        
        # Test the geocoding logic using Laguna API
        manual_coords = geocode_with_laguna_api(address)
        
        return jsonify({
            'success': True,
            'address': address,
            'manual_coordinates': manual_coords,
            'matched_location': manual_coords['source'] if manual_coords else 'no_match'
        })
        
    except Exception as e:
        print(f"Error in location debug: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/locations/stats')
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_location_stats():
    """Get statistics about client distribution across Laguna locations"""
    try:
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        location_stats = {}
        total_clients = 0
        
        for client in clients:
            client_dict = client.to_dict()
            address = client_dict.get('address', '').lower()
            total_clients += 1
            
            # Match address to municipality using new API
            matched_municipality = None
            municipalities = get_all_municipalities()
            for municipality in municipalities:
                if municipality.id in address or municipality.name.lower() in address:
                    matched_municipality = municipality.id
                    break
            
            if matched_municipality:
                if matched_municipality not in location_stats:
                    muni = get_municipality(matched_municipality)
                    location_stats[matched_municipality] = {
                        'name': muni.name,
                        'lat': muni.lat,
                        'lng': muni.lng,
                        'count': 0,
                        'in_house': 0,
                        'after_care': 0
                    }
                
                location_stats[matched_municipality]['count'] += 1
                care_type = client_dict.get('care_type', 'in_house').lower().replace(' ', '_')
                if care_type == 'after_care':
                    location_stats[matched_municipality]['after_care'] += 1
                else:
                    location_stats[matched_municipality]['in_house'] += 1
        
        return jsonify({
            'success': True,
            'stats': list(location_stats.values()),
            'total_clients': total_clients,
            'total_locations': len(location_stats)
        })
        
    except Exception as e:
        print(f"Error getting location stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/locations/api-stats')
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_location_api_stats():
    """Get statistics about the Laguna location API data"""
    try:
        stats = get_location_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/locations/search')
@role_required(['admin', 'psychometrician', 'house_worker'])
def search_locations_endpoint():
    """Search for Laguna locations by name"""
    query = request.args.get('q', '').lower()
    if not query or len(query) < 2:
        return jsonify({
            'success': True,
            'results': [],
            'total': 0
        })
    
    results = search_locations(query)
    formatted_results = [{
        'type': result.type,
        'name': result.name,
        'id': result.municipality_id,
        'municipality': result.municipality_name,
        'barangay': result.barangay,
        'lat': result.lat,
        'lng': result.lng
    } for result in results]
    
    return jsonify({
        'success': True,
        'results': formatted_results[:20],  # Limit to 20 results
        'total': len(formatted_results)
    })

@app.route('/api/locations/test')
@role_required(['admin', 'psychometrician', 'house_worker'])
def test_location_api():
    """Test endpoint to verify Laguna Location API is working"""
    try:
        # Test getting all municipalities
        municipalities = get_all_municipalities()
        
        # Test getting barangays for a specific municipality
        test_municipality = 'calamba' if municipalities else None
        test_barangays = get_barangays(test_municipality) if test_municipality else []
        
        # Test search functionality
        search_results = search_locations('santa')
        
        # Get API stats
        api_stats = get_location_stats()
        
        return jsonify({
            'success': True,
            'test_results': {
                'total_municipalities': len(municipalities),
                'sample_municipality': municipalities[0].name if municipalities else None,
                'test_barangays_count': len(test_barangays),
                'search_results_count': len(search_results),
                'api_stats': api_stats
            },
            'message': 'Laguna Location API is working correctly'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Laguna Location API test failed'
        }), 500

# Activity Log API Endpoints
@app.route('/api/activity-log/check-updates')
@admin_required
def check_activity_updates():
    """Check if there are new activities since last check"""
    try:
        # Get parameters
        page = request.args.get('page', 1, type=int)
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_filter = request.args.get('date', '')
        
        # Get the latest activity timestamp from the current page
        logs_ref = db.collection('activity_logs')
        query = logs_ref.order_by('timestamp', direction=firestore.Query.DESCENDING)
        
        # Apply filters
        if user_filter:
            query = query.where('user_email', '==', user_filter)
        if action_filter:
            query = query.where('action', '==', action_filter)
        if date_filter:
            try:
                from datetime import datetime, timedelta
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
                next_date = filter_date + timedelta(days=1)
                query = query.where('timestamp', '>=', filter_date).where('timestamp', '<', next_date)
            except ValueError:
                pass
        
        # Get the most recent activity
        latest_activity = query.limit(1).stream()
        latest_timestamp = None
        
        for activity in latest_activity:
            activity_data = activity.to_dict()
            latest_timestamp = activity_data.get('timestamp')
            break
        
        # Check if there are newer activities
        if latest_timestamp:
            # Get activities newer than the latest one
            newer_query = logs_ref.where('timestamp', '>', latest_timestamp)
            newer_count = sum(1 for _ in newer_query.stream())
            
            return jsonify({
                'success': True,
                'has_new_activities': newer_count > 0,
                'new_count': newer_count,
                'latest_timestamp': latest_timestamp.isoformat() if latest_timestamp else None
            })
        
        return jsonify({
            'success': True,
            'has_new_activities': False,
            'new_count': 0,
            'latest_timestamp': None
        })
        
    except Exception as e:
        print(f"Error checking activity updates: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/activity-log/export', methods=['POST'])
@admin_required
def export_activity_log():
    """Export activity logs to CSV"""
    try:
        data = request.get_json()
        user_filter = data.get('user', '')
        action_filter = data.get('action', '')
        date_filter = data.get('date', '')
        
        # Build query
        logs_ref = db.collection('activity_logs')
        query = logs_ref.order_by('timestamp', direction=firestore.Query.DESCENDING)
        
        # Apply filters
        if user_filter:
            query = query.where('user_email', '==', user_filter)
        if action_filter:
            query = query.where('action', '==', action_filter)
        if date_filter:
            try:
                from datetime import datetime, timedelta
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
                next_date = filter_date + timedelta(days=1)
                query = query.where('timestamp', '>=', filter_date).where('timestamp', '<', next_date)
            except ValueError:
                pass
        
        # Get all logs
        logs = []
        for log in query.stream():
            log_data = log.to_dict()
            logs.append(log_data)
        
        # Create CSV content
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Timestamp', 'User Email', 'User Role', 'Action', 'Details', 
            'Target Type', 'Target ID', 'IP Address', 'User Agent'
        ])
        
        # Write data
        for log in logs:
            writer.writerow([
                log.get('timestamp', '').strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') else '',
                log.get('user_email', ''),
                log.get('user_role', ''),
                log.get('action', ''),
                log.get('details', ''),
                log.get('target_type', ''),
                log.get('target_id', ''),
                log.get('ip_address', ''),
                log.get('user_agent', '')
            ])
        
        # Create response
        from flask import Response
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=activity_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
        )
        
    except Exception as e:
        print(f"Error exporting activity log: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/activity-log/stats')
@admin_required
def get_activity_stats():
    """Get activity statistics"""
    try:
        logs_ref = db.collection('activity_logs')
        
        # Get total count
        total_activities = sum(1 for _ in logs_ref.stream())
        
        # Get unique users
        users = set()
        for log in logs_ref.stream():
            log_data = log.to_dict()
            users.add(log_data.get('user_email', ''))
        
        # Get unique actions
        actions = set()
        for log in logs_ref.stream():
            log_data = log.to_dict()
            actions.add(log_data.get('action', ''))
        
        # Get today's activities
        from datetime import datetime, timedelta
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_query = logs_ref.where('timestamp', '>=', today_start)
        today_activities = sum(1 for _ in today_query.stream())
        
        # Get this week's activities
        week_start = today_start - timedelta(days=today_start.weekday())
        week_query = logs_ref.where('timestamp', '>=', week_start)
        week_activities = sum(1 for _ in week_query.stream())
        
        # Get most active users
        user_activity = {}
        for log in logs_ref.stream():
            log_data = log.to_dict()
            user_email = log_data.get('user_email', '')
            if user_email:
                user_activity[user_email] = user_activity.get(user_email, 0) + 1
        
        top_users = sorted(user_activity.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Get most common actions
        action_counts = {}
        for log in logs_ref.stream():
            log_data = log.to_dict()
            action = log_data.get('action', '')
            if action:
                action_counts[action] = action_counts.get(action, 0) + 1
        
        top_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_activities': total_activities,
                'unique_users': len(users),
                'unique_actions': len(actions),
                'today_activities': today_activities,
                'week_activities': week_activities,
                'top_users': top_users,
                'top_actions': top_actions
            }
        })
        
    except Exception as e:
        print(f"Error getting activity stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def log_activity(user_id, user_email, user_role, action, details=None, target_id=None, target_type=None):
    """
    Log user activity to Firestore for audit trail.
    
    Args:
        user_id: ID of the user performing the action
        user_email: Email of the user performing the action
        user_role: Role of the user performing the action
        action: Description of the action performed
        details: Additional details about the action
        target_id: ID of the target object (client, user, etc.)
        target_type: Type of the target object (client, user, etc.)
    """
    try:
        log_data = {
            'user_id': user_id,
            'user_email': user_email,
            'user_role': user_role,
            'action': action,
            'details': details,
            'target_id': target_id,
            'target_type': target_type,
            'timestamp': datetime.now(),
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None
        }
        
        # Add to Firestore
        db.collection('activity_logs').add(log_data)
        
    except Exception as e:
        print(f"Error logging activity: {e}")
        # Don't fail the main operation if logging fails

# ==================== CLIENT PROGRESS STATUS API ====================

@app.route('/api/client-progress/<client_id>', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker', 'house_worker'])
def get_client_progress_status(client_id):
    """Get comprehensive progress status for a client"""
    try:
        print(f"Getting progress status for client: {client_id}")
        
        # Get client data
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            print(f"Client {client_id} not found")
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        print(f"Client data found: {client_data.get('name', 'Unknown')}")
        
        # Get progress milestones
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        
        progress_data = progress_doc.to_dict() if progress_doc.exists else {}
        print(f"Progress data exists: {progress_doc.exists}")
        
        # Get recent activities for progress calculation
        logs_ref = db.collection('activity_logs')
        logs_query = logs_ref.where('target_id', '==', client_id).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(50)
        recent_logs = logs_query.stream()
        
        # If no progress data exists, create basic structure
        if not progress_doc.exists:
            print("No progress data found, creating basic structure")
            basic_progress_data = {
                'client_id': client_id,
                'client_name': client_data.get('name', 'Unknown'),
                'milestones': [],
                'progress_scores': {},
                'last_updated': datetime.now(),
                'created_at': datetime.now()
            }
            progress_ref.set(basic_progress_data)
            progress_data = basic_progress_data
            print("Basic progress structure created")
        
        # Calculate progress metrics
        recent_logs_list = []
        try:
            recent_logs_list = list(recent_logs)
        except Exception as e:
            print(f"Error converting logs to list: {e}")
            recent_logs_list = []
        
        progress_metrics = calculate_progress_metrics(client_data, progress_data, recent_logs_list)
        print(f"Calculated progress metrics: {progress_metrics}")
        
        return jsonify({
            'success': True,
            'data': {
                'client_info': {
                    'id': client_id,
                    'name': client_data.get('name', 'Unknown'),
                    'status': client_data.get('status', 'unknown'),
                    'care_type': client_data.get('care_type', 'unknown'),
                    'registration_date': client_data.get('registrationDate', 'Unknown')
                },
                'progress': progress_metrics,
                'milestones': progress_data.get('milestones', []),
                'last_updated': progress_data.get('last_updated', None)
            }
        })
        
    except Exception as e:
        print(f"Error getting client progress status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/client-progress/<client_id>/update', methods=['POST'])
@role_required(['admin', 'psychometrician', 'facilitator'])
def update_client_progress(client_id):
    """Update client progress status and milestones"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('progress_type'):
            return jsonify({'success': False, 'error': 'Progress type is required'}), 400
        
        progress_type = data['progress_type']
        
        # Get client data
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Get or create progress document
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        progress_data = progress_doc.to_dict() if progress_doc.exists else {}
        
        # Initialize progress data if it doesn't exist
        if not progress_data:
            progress_data = {
                'client_id': client_id,
                'client_name': client_data.get('name', 'Unknown'),
                'milestones': [],
                'progress_scores': {},
                'last_updated': datetime.now(),
                'created_at': datetime.now()
            }
        
        # Update progress based on type
        if progress_type == 'milestone':
            milestone_id = data.get('milestone_id')
            milestones = progress_data.get('milestones', [])
            
            if milestone_id:
                # Update existing milestone
                milestone_found = False
                for i, milestone in enumerate(milestones):
                    if milestone.get('id') == milestone_id:
                        # Update existing milestone
                        milestones[i].update({
                            'title': data.get('title', milestone.get('title', '')),
                            'description': data.get('description', milestone.get('description', '')),
                            'category': data.get('category', milestone.get('category', 'general')),
                            'status': data.get('status', milestone.get('status', 'pending')),
                            'target_date': data.get('target_date', milestone.get('target_date')),
                            'completed_date': data.get('completed_date', milestone.get('completed_date')),
                            'updated_at': datetime.now(),
                            'updated_by': session['user_id']
                        })
                        milestone_found = True
                        break
                
                if not milestone_found:
                    return jsonify({'success': False, 'error': 'Milestone not found'}), 404
            else:
                # Create new milestone
                milestone_data = {
                    'id': f"milestone_{len(milestones) + 1}_{int(datetime.now().timestamp())}",
                    'title': data.get('title', ''),
                    'description': data.get('description', ''),
                    'category': data.get('category', 'general'),
                    'status': data.get('status', 'pending'),
                    'target_date': data.get('target_date'),
                    'completed_date': data.get('completed_date'),
                    'created_by': session['user_id'],
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                milestones.append(milestone_data)
            
            progress_data['milestones'] = milestones
            
            # Log the milestone activity
            action = 'Milestone Updated' if milestone_id else 'Milestone Created'
            log_activity(
                user_id=session['user_id'],
                user_email=session.get('email', 'Unknown'),
                user_role=session.get('role', 'unknown'),
                action=action,
                details=f'Milestone: {data.get("title", "Unknown")}',
                target_id=client_id,
                target_type='client'
            )
            
        elif progress_type == 'assessment':
            assessment_data = {
                'date': datetime.now(),
                'category': data.get('category', 'general'),
                'score': data.get('score', 0),
                'max_score': data.get('max_score', 10),
                'notes': data.get('notes', ''),
                'assessed_by': session['user_id'],
                'assessed_by_name': session.get('email', 'Unknown')
            }
            
            # Store assessment scores
            progress_scores = progress_data.get('progress_scores', {})
            category = assessment_data['category']
            
            if category not in progress_scores:
                progress_scores[category] = []
            
            progress_scores[category].append(assessment_data)
            progress_data['progress_scores'] = progress_scores
            
            # Log the assessment activity
            log_activity(
                user_id=session['user_id'],
                user_email=session.get('email', 'Unknown'),
                user_role=session.get('role', 'unknown'),
                action=f'Assessment Update - {category.title()}',
                details=f'Score: {assessment_data["score"]}/{assessment_data["max_score"]}',
                target_id=client_id,
                target_type='client'
            )
            
        elif progress_type == 'status_update':
            new_status = data.get('status')
            if new_status:
                # Update client status
                client_ref.update({
                    'status': new_status,
                    'status_updated_at': datetime.now(),
                    'status_updated_by': session['user_id']
                })
                
                # Log status change
                log_activity(
                    user_id=session['user_id'],
                    user_email=session['email'],
                    user_role=session['role'],
                    action='Update Client Status',
                    details=f'Status changed to: {new_status}',
                    target_id=client_id,
                    target_type='client'
                )
        
        # Update progress document
        progress_data['last_updated'] = datetime.now()
        progress_data['updated_by'] = session['user_id']
        
        progress_ref.set(progress_data)
        
        # Log progress update
        log_activity(
            user_id=session['user_id'],
            user_email=session['email'],
            user_role=session['role'],
            action='Update Client Progress',
            details=f'Updated {progress_type}: {data.get("title", data.get("category", "progress"))}',
            target_id=client_id,
            target_type='client_progress'
        )
        
        return jsonify({
            'success': True,
            'message': 'Progress updated successfully',
            'data': progress_data
        })
        
    except Exception as e:
        print(f"Error updating client progress: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/client-progress/<client_id>/milestones', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker', 'house_worker'])
def get_client_milestones(client_id):
    """Get client milestones and progress tracking"""
    try:
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        
        if not progress_doc.exists:
            return jsonify({
                'success': True,
                'data': {
                    'milestones': [],
                    'progress_summary': {
                        'total_milestones': 0,
                        'completed_milestones': 0,
                        'in_progress_milestones': 0,
                        'pending_milestones': 0,
                        'overall_progress': 0
                    }
                }
            })
        
        progress_data = progress_doc.to_dict()
        milestones = progress_data.get('milestones', [])
        
        # Calculate progress summary
        total_milestones = len(milestones)
        completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
        in_progress_milestones = len([m for m in milestones if m.get('status') == 'in_progress'])
        pending_milestones = len([m for m in milestones if m.get('status') == 'pending'])
        
        overall_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'milestones': milestones,
                'progress_summary': {
                    'total_milestones': total_milestones,
                    'completed_milestones': completed_milestones,
                    'in_progress_milestones': in_progress_milestones,
                    'pending_milestones': pending_milestones,
                    'overall_progress': round(overall_progress, 1)
                }
            }
        })
        
    except Exception as e:
        print(f"Error getting client milestones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/client-progress/<client_id>/chart-data', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker', 'house_worker'])
def get_client_progress_chart_data(client_id):
    """Get client progress chart data for visualization"""
    try:
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Default to last month if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            if period == 'week':
                start_date = end_date - timedelta(weeks=1)
            elif period == 'year':
                start_date = end_date - timedelta(days=365)
            else:  # month
                start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get client data
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Get progress data
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        progress_data = progress_doc.to_dict() if progress_doc.exists else {}
        
        # Get activity logs for the period
        logs_ref = db.collection('activity_logs')
        logs_query = logs_ref.where('target_id', '==', client_id).where('timestamp', '>=', start_date).where('timestamp', '<=', end_date).order_by('timestamp')
        logs = logs_query.stream()
        
        # Generate chart data based on period
        if period == 'week':
            # Daily data for week
            labels = []
            overall_progress = []
            engagement_scores = []
            
            current_date = start_date
            while current_date <= end_date:
                labels.append(current_date.strftime('%a %m/%d'))
                
                # Calculate progress for this day
                day_logs = [log for log in logs if log.to_dict().get('timestamp').date() == current_date.date()]
                
                # Calculate engagement score for the day
                if day_logs:
                    engagement_points = 0
                    for log in day_logs:
                        action = log.to_dict().get('action', '').lower()
                        if 'complete' in action or 'finish' in action:
                            engagement_points += 3
                        elif 'check' in action or 'update' in action:
                            engagement_points += 2
                        else:
                            engagement_points += 1
                    engagement_scores.append(min(10, engagement_points))
                else:
                    engagement_scores.append(0)
                
                # Calculate cumulative progress (simplified)
                milestones = progress_data.get('milestones', [])
                if milestones:
                    completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
                    total_milestones = len(milestones)
                    day_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
                else:
                    day_progress = 0
                
                overall_progress.append(day_progress)
                current_date += timedelta(days=1)
                
        else:
            # Weekly data for month/year
            labels = []
            overall_progress = []
            engagement_scores = []
            
            current_date = start_date
            week_num = 1
            
            while current_date <= end_date:
                labels.append(f'Week {week_num}')
                
                # Get logs for this week
                week_end = min(current_date + timedelta(days=6), end_date)
                week_logs = [log for log in logs if current_date <= log.to_dict().get('timestamp') <= week_end]
                
                # Calculate engagement score for the week
                if week_logs:
                    engagement_points = 0
                    for log in week_logs:
                        action = log.to_dict().get('action', '').lower()
                        if 'complete' in action or 'finish' in action:
                            engagement_points += 3
                        elif 'check' in action or 'update' in action:
                            engagement_points += 2
                        else:
                            engagement_points += 1
                    engagement_scores.append(min(10, engagement_points / len(week_logs) * 2))
                else:
                    engagement_scores.append(0)
                
                # Calculate cumulative progress
                milestones = progress_data.get('milestones', [])
                if milestones:
                    completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
                    total_milestones = len(milestones)
                    week_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
                else:
                    week_progress = 0
                
                overall_progress.append(week_progress)
                current_date += timedelta(weeks=1)
                week_num += 1
        
        return jsonify({
            'success': True,
            'data': {
                'labels': labels,
                'overall_progress': overall_progress,
                'engagement_scores': engagement_scores
            }
        })
        
    except Exception as e:
        print(f"Error getting client progress chart data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_progress_metrics(client_data, progress_data, recent_logs):
    """Calculate comprehensive progress metrics for a client"""
    try:
        # Initialize metrics
        metrics = {
            'overall_progress': 0,
            'engagement_score': 0,
            'compliance_rate': 0,
            'mood_score': 5,  # Default neutral
            'intervention_success_rate': 0,
            'days_in_treatment': 0,
            'last_activity_days_ago': 0,
            'progress_trend': 'stable',
            'risk_level': 'low',
            'next_milestone': None
        }
        
        # Calculate days in treatment
        registration_date = client_data.get('created_at') or client_data.get('registrationDate')
        if registration_date:
            if isinstance(registration_date, str):
                try:
                    # Try multiple date formats
                    for fmt in ['%Y-%m-%d', '%B %d, %Y', '%m/%d/%Y']:
                        try:
                            registration_date = datetime.strptime(registration_date, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        registration_date = None
                except:
                    registration_date = None
            elif hasattr(registration_date, 'timestamp'):
                # Handle Firestore timestamp
                registration_date = registration_date
            
            if registration_date:
                days_in_treatment = (datetime.now() - registration_date).days
                metrics['days_in_treatment'] = max(0, days_in_treatment)
        
        # Calculate engagement score from recent activities and stored assessments
        engagement_scores = []
        
        # Get engagement scores from stored assessments
        progress_scores = progress_data.get('progress_scores', {})
        if 'engagement' in progress_scores:
            recent_assessments = progress_scores['engagement'][-5:]  # Last 5 assessments
            engagement_scores.extend([a.get('score', 0) for a in recent_assessments])
        
        # Calculate from recent activities if no assessments
        if recent_logs and not engagement_scores:
            total_activities = len(recent_logs)
            engagement_points = 0
            
            for log in recent_logs:
                try:
                    log_data = log.to_dict() if hasattr(log, 'to_dict') else log
                    action = log_data.get('action', '').lower()
                    
                    if 'complete' in action or 'finish' in action:
                        engagement_points += 3
                    elif 'check' in action or 'update' in action:
                        engagement_points += 2
                    elif 'participate' in action or 'attend' in action:
                        engagement_points += 2
                    else:
                        engagement_points += 1
                except Exception as e:
                    print(f"Error processing log: {e}")
                    engagement_points += 1
            
            if total_activities > 0:
                calculated_score = min(10, max(1, engagement_points / total_activities * 2))
                engagement_scores.append(calculated_score)
        
        # Calculate average engagement score
        if engagement_scores:
            metrics['engagement_score'] = sum(engagement_scores) / len(engagement_scores)
        else:
            metrics['engagement_score'] = 5.0  # Default neutral score
            
            # Calculate last activity
            try:
                last_log = recent_logs[0]
                last_log_data = last_log.to_dict() if hasattr(last_log, 'to_dict') else last_log
                last_activity_date = last_log_data.get('timestamp')
                
                if isinstance(last_activity_date, datetime):
                    days_ago = (datetime.now() - last_activity_date).days
                    metrics['last_activity_days_ago'] = days_ago
            except Exception as e:
                print(f"Error calculating last activity: {e}")
                metrics['last_activity_days_ago'] = 0
        
        # Calculate milestone progress
        milestones = progress_data.get('milestones', [])
        if milestones:
            completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
            total_milestones = len(milestones)
            metrics['overall_progress'] = (completed_milestones / total_milestones) * 100
            
            # Find next milestone
            pending_milestones = [m for m in milestones if m.get('status') in ['pending', 'in_progress']]
            if pending_milestones:
                # Sort by target date or creation date
                pending_milestones.sort(key=lambda x: x.get('target_date', x.get('created_at', '')))
                metrics['next_milestone'] = pending_milestones[0]
        
        # Calculate compliance rate (simplified)
        if metrics['days_in_treatment'] > 0:
            expected_activities = metrics['days_in_treatment'] * 0.5  # Expected 0.5 activities per day
            actual_activities = len(recent_logs)
            metrics['compliance_rate'] = min(100, (actual_activities / expected_activities) * 100) if expected_activities > 0 else 0
        
        # Determine risk level
        if metrics['last_activity_days_ago'] > 7:
            metrics['risk_level'] = 'high'
        elif metrics['last_activity_days_ago'] > 3:
            metrics['risk_level'] = 'medium'
        else:
            metrics['risk_level'] = 'low'
        
        # Determine progress trend
        if metrics['engagement_score'] > 7:
            metrics['progress_trend'] = 'improving'
        elif metrics['engagement_score'] < 4:
            metrics['progress_trend'] = 'declining'
        else:
            metrics['progress_trend'] = 'stable'
        
        return metrics
        
    except Exception as e:
        print(f"Error calculating progress metrics: {e}")
        return {
            'overall_progress': 0,
            'engagement_score': 5,
            'compliance_rate': 0,
            'mood_score': 5,
            'intervention_success_rate': 0,
            'days_in_treatment': 0,
            'last_activity_days_ago': 0,
            'progress_trend': 'stable',
            'risk_level': 'low',
            'next_milestone': None
        }

# ==================== PROGRESS REPORTS API ====================

@app.route('/api/reports/monthly-summary', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator'])
def get_monthly_summary_report():
    """Generate monthly summary report data"""
    try:
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 6 months if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)  # 6 months
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get clients data
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        # Initialize counters
        monthly_data = {}
        current_date = start_date
        
        # Initialize monthly data structure
        while current_date <= end_date:
            month_key = current_date.strftime('%Y-%m')
            monthly_data[month_key] = {
                'active_clients': 0,
                'completed_treatments': 0,
                'new_registrations': 0,
                'relapse_cases': 0,
                'aftercare_transfers': 0
            }
            current_date = current_date.replace(day=1) + timedelta(days=32)
            current_date = current_date.replace(day=1)
        
        # Process clients data
        for client_doc in clients:
            client_data = client_doc.to_dict()
            client_id = client_doc.id
            
            # Get registration date
            reg_date = client_data.get('created_at') or client_data.get('registrationDate')
            if reg_date:
                if isinstance(reg_date, str):
                    try:
                        reg_date = datetime.strptime(reg_date, '%Y-%m-%d')
                    except:
                        reg_date = None
                
                if reg_date and start_date <= reg_date <= end_date:
                    month_key = reg_date.strftime('%Y-%m')
                    if month_key in monthly_data:
                        monthly_data[month_key]['new_registrations'] += 1
            
            # Get completion date and check progress-based completion
            completion_date = client_data.get('completion_date')
            if completion_date:
                if isinstance(completion_date, str):
                    try:
                        completion_date = datetime.strptime(completion_date, '%Y-%m-%d')
                    except:
                        completion_date = None
                
                if completion_date and start_date <= completion_date <= end_date:
                    month_key = completion_date.strftime('%Y-%m')
                    if month_key in monthly_data:
                        monthly_data[month_key]['completed_treatments'] += 1
            else:
                # Check if client has 100% progress (milestone-based completion)
                progress_ref = db.collection('client_progress').document(client_doc.id)
                progress_doc = progress_ref.get()
                if progress_doc.exists:
                    progress_data = progress_doc.to_dict()
                    milestones = progress_data.get('milestones', [])
                    if milestones:
                        completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
                        total_milestones = len(milestones)
                        progress_percentage = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
                        
                        # If progress is 100% and client is active, count as completed
                        if progress_percentage >= 100 and client_data.get('status') == 'active':
                            # Use registration date as completion date for progress-based completion
                            reg_date = client_data.get('created_at') or client_data.get('registrationDate')
                            if reg_date:
                                if isinstance(reg_date, str):
                                    try:
                                        reg_date = datetime.strptime(reg_date, '%Y-%m-%d')
                                    except:
                                        reg_date = None
                                
                                if reg_date and start_date <= reg_date <= end_date:
                                    month_key = reg_date.strftime('%Y-%m')
                                    if month_key in monthly_data:
                                        monthly_data[month_key]['completed_treatments'] += 1
            
            # Count active clients (simplified - count current status)
            if client_data.get('status') == 'active':
                # Count as active in current month
                current_month = datetime.now().strftime('%Y-%m')
                if current_month in monthly_data:
                    monthly_data[current_month]['active_clients'] += 1
            
            # Count aftercare transfers
            transfer_date = client_data.get('transfer_to_aftercare_date')
            if transfer_date:
                if isinstance(transfer_date, str):
                    try:
                        transfer_date = datetime.strptime(transfer_date, '%Y-%m-%d')
                    except:
                        transfer_date = None
                
                if transfer_date and start_date <= transfer_date <= end_date:
                    month_key = transfer_date.strftime('%Y-%m')
                    if month_key in monthly_data:
                        monthly_data[month_key]['aftercare_transfers'] += 1
            
            # Count relapse cases (clients with status 'relapsed')
            if client_data.get('status') == 'relapsed':
                # This is a simplified approach - you might want to track relapse dates separately
                current_month = datetime.now().strftime('%Y-%m')
                if current_month in monthly_data:
                    monthly_data[current_month]['relapse_cases'] += 1
        
        # Convert to chart-friendly format
        labels = sorted(monthly_data.keys())
        active_clients = [monthly_data[month]['active_clients'] for month in labels]
        completed_treatments = [monthly_data[month]['completed_treatments'] for month in labels]
        new_registrations = [monthly_data[month]['new_registrations'] for month in labels]
        relapse_cases = [monthly_data[month]['relapse_cases'] for month in labels]
        aftercare_transfers = [monthly_data[month]['aftercare_transfers'] for month in labels]
        
        return jsonify({
            'success': True,
            'data': {
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Active Clients',
                        'data': active_clients,
                        'backgroundColor': '#4682A9'
                    },
                    {
                        'label': 'Completed Treatments',
                        'data': completed_treatments,
                        'backgroundColor': '#91C8E4'
                    },
                    {
                        'label': 'New Registrations',
                        'data': new_registrations,
                        'backgroundColor': '#4CAF50'
                    },
                    {
                        'label': 'Aftercare Transfers',
                        'data': aftercare_transfers,
                        'backgroundColor': '#FF9800'
                    }
                ]
            }
        })
        
    except Exception as e:
        print(f"Error generating monthly summary report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/client-progress/<client_id>', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker'])
def get_client_progress_report(client_id):
    """Generate individual client progress report"""
    try:
        # Get client data
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            return jsonify({'success': False, 'error': 'Client not found'}), 404
        
        client_data = client_doc.to_dict()
        
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 4 weeks if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(weeks=4)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get activity logs for this client
        logs_ref = db.collection('activity_logs')
        logs_query = logs_ref.where('target_id', '==', client_id).where('timestamp', '>=', start_date).where('timestamp', '<=', end_date)
        logs = logs_query.stream()
        
        # Process activity data
        weekly_data = {}
        current_date = start_date
        
        # Initialize weekly data structure
        week_num = 1
        while current_date <= end_date:
            week_key = f'Week {week_num}'
            weekly_data[week_key] = {
                'activities_count': 0,
                'engagement_score': 0,
                'mood_score': 5,  # Default neutral mood
                'interventions_completed': 0
            }
            current_date += timedelta(weeks=1)
            week_num += 1
        
        # Process logs to calculate metrics
        for log in logs:
            log_data = log.to_dict()
            log_date = log_data.get('timestamp')
            
            if isinstance(log_date, datetime):
                # Calculate which week this log belongs to
                days_diff = (log_date - start_date).days
                week_num = (days_diff // 7) + 1
                week_key = f'Week {week_num}'
                
                if week_key in weekly_data:
                    weekly_data[week_key]['activities_count'] += 1
                    
                    # Simple engagement scoring based on activity type
                    action = log_data.get('action', '').lower()
                    if 'check' in action or 'update' in action:
                        weekly_data[week_key]['engagement_score'] += 2
                    elif 'complete' in action or 'finish' in action:
                        weekly_data[week_key]['engagement_score'] += 3
                        weekly_data[week_key]['interventions_completed'] += 1
                    else:
                        weekly_data[week_key]['engagement_score'] += 1
        
        # Normalize engagement scores (scale to 1-10)
        for week_data in weekly_data.values():
            if week_data['activities_count'] > 0:
                week_data['engagement_score'] = min(10, max(1, week_data['engagement_score']))
            else:
                week_data['engagement_score'] = 1
        
        # Convert to chart-friendly format
        labels = list(weekly_data.keys())
        mood_scores = [weekly_data[week]['mood_score'] for week in labels]
        engagement_scores = [weekly_data[week]['engagement_score'] for week in labels]
        activities_count = [weekly_data[week]['activities_count'] for week in labels]
        interventions_completed = [weekly_data[week]['interventions_completed'] for week in labels]
        
        # Calculate overall progress metrics
        total_activities = sum(activities_count)
        avg_engagement = sum(engagement_scores) / len(engagement_scores) if engagement_scores else 0
        total_interventions = sum(interventions_completed)
        
        # Check if client is eligible for completion
        progress_ref = db.collection('client_progress').document(client_id)
        progress_doc = progress_ref.get()
        progress_data = progress_doc.to_dict() if progress_doc.exists else {}
        
        milestones = progress_data.get('milestones', [])
        if milestones:
            completed_milestones = len([m for m in milestones if m.get('status') == 'completed'])
            total_milestones = len(milestones)
            overall_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        else:
            overall_progress = 0
        
        # Determine completion eligibility
        completion_eligible = overall_progress >= 100 and client_data.get('status') == 'active' and client_data.get('care_type') == 'in_house'
        
        return jsonify({
            'success': True,
            'data': {
                'client_info': {
                    'id': client_id,
                    'name': client_data.get('name', 'Unknown'),
                    'status': client_data.get('status', 'unknown'),
                    'care_type': client_data.get('care_type', 'unknown'),
                    'registration_date': client_data.get('registrationDate', 'Unknown'),
                    'completion_date': client_data.get('completion_date', None),
                    'overall_progress': round(overall_progress, 1),
                    'completion_eligible': completion_eligible
                },
                'chart_data': {
                    'labels': labels,
                    'datasets': [
                        {
                            'label': 'Mood Score',
                            'data': mood_scores,
                            'borderColor': '#4682A9',
                            'tension': 0.4
                        },
                        {
                            'label': 'Engagement Score',
                            'data': engagement_scores,
                            'borderColor': '#91C8E4',
                            'tension': 0.4
                        }
                    ]
                },
                'metrics': {
                    'total_activities': total_activities,
                    'average_engagement': round(avg_engagement, 1),
                    'total_interventions': total_interventions,
                    'progress_trend': 'improving' if engagement_scores[-1] > engagement_scores[0] else 'stable',
                    'overall_progress': round(overall_progress, 1),
                    'completion_eligible': completion_eligible
                }
            }
        })
        
    except Exception as e:
        print(f"Error generating client progress report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/relapse-trends', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator'])
def get_relapse_trends_report():
    """Generate municipal relapse trends report"""
    try:
        # Get area filter from query parameters
        area_filter = request.args.get('area', 'all')
        
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 6 months if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get clients data
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        # Initialize monthly data structure
        monthly_data = {}
        current_date = start_date
        
        while current_date <= end_date:
            month_key = current_date.strftime('%Y-%m')
            monthly_data[month_key] = {
                'relapse_rate': 0,
                'total_clients': 0,
                'relapsed_clients': 0
            }
            current_date = current_date.replace(day=1) + timedelta(days=32)
            current_date = current_date.replace(day=1)
        
        # Process clients data
        for client_doc in clients:
            client_data = client_doc.to_dict()
            
            # Apply area filter if specified
            if area_filter != 'all':
                address = client_data.get('address', '').lower()
                if area_filter == 'north' and 'north' not in address:
                    continue
                elif area_filter == 'south' and 'south' not in address:
                    continue
                elif area_filter == 'east' and 'east' not in address:
                    continue
                elif area_filter == 'west' and 'west' not in address:
                    continue
            
            # Get registration date
            reg_date = client_data.get('created_at') or client_data.get('registrationDate')
            if reg_date:
                if isinstance(reg_date, str):
                    try:
                        reg_date = datetime.strptime(reg_date, '%Y-%m-%d')
                    except:
                        reg_date = None
                
                if reg_date and start_date <= reg_date <= end_date:
                    month_key = reg_date.strftime('%Y-%m')
                    if month_key in monthly_data:
                        monthly_data[month_key]['total_clients'] += 1
                        
                        # Check if client relapsed
                        if client_data.get('status') == 'relapsed':
                            monthly_data[month_key]['relapsed_clients'] += 1
        
        # Calculate relapse rates
        for month_data in monthly_data.values():
            if month_data['total_clients'] > 0:
                month_data['relapse_rate'] = (month_data['relapsed_clients'] / month_data['total_clients']) * 100
        
        # Convert to chart-friendly format
        labels = sorted(monthly_data.keys())
        relapse_rates = [monthly_data[month]['relapse_rate'] for month in labels]
        
        return jsonify({
            'success': True,
            'data': {
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Relapse Rate (%)',
                        'data': relapse_rates,
                        'borderColor': '#4682A9',
                        'tension': 0.4
                    }
                ],
                'area_filter': area_filter
            }
        })
        
    except Exception as e:
        print(f"Error generating relapse trends report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/intervention-success', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator'])
def get_intervention_success_report():
    """Generate intervention success rate report"""
    try:
        # Get intervention type filter from query parameters
        intervention_filter = request.args.get('type', 'all')
        
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 6 months if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get activity logs for interventions
        logs_ref = db.collection('activity_logs')
        logs_query = logs_ref.where('timestamp', '>=', start_date).where('timestamp', '<=', end_date)
        logs = logs_query.stream()
        
        # Initialize counters
        intervention_stats = {
            'successful': 0,
            'partial': 0,
            'needs_review': 0,
            'total': 0
        }
        
        # Process logs to categorize interventions
        for log in logs:
            log_data = log.to_dict()
            action = log_data.get('action', '').lower()
            details = log_data.get('details', '').lower()
            
            # Check if this is an intervention-related activity
            if any(keyword in action for keyword in ['intervention', 'treatment', 'therapy', 'counseling']):
                intervention_stats['total'] += 1
                
                # Apply type filter if specified
                if intervention_filter != 'all':
                    if intervention_filter == 'counseling' and 'counseling' not in action:
                        continue
                    elif intervention_filter == 'therapy' and 'therapy' not in action:
                        continue
                    elif intervention_filter == 'support' and 'support' not in action:
                        continue
                
                # Categorize based on action and details
                if 'complete' in action or 'success' in action or 'finished' in action:
                    intervention_stats['successful'] += 1
                elif 'partial' in action or 'ongoing' in action or 'continue' in action:
                    intervention_stats['partial'] += 1
                elif 'review' in action or 'assess' in action or 'evaluate' in action:
                    intervention_stats['needs_review'] += 1
                else:
                    # Default categorization based on completion status
                    if 'complete' in details:
                        intervention_stats['successful'] += 1
                    else:
                        intervention_stats['partial'] += 1
        
        # Calculate percentages
        total = intervention_stats['total']
        if total > 0:
            successful_pct = (intervention_stats['successful'] / total) * 100
            partial_pct = (intervention_stats['partial'] / total) * 100
            review_pct = (intervention_stats['needs_review'] / total) * 100
        else:
            successful_pct = partial_pct = review_pct = 0
        
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Successful', 'Partial', 'Needs Review'],
                'datasets': [
                    {
                        'data': [successful_pct, partial_pct, review_pct],
                        'backgroundColor': ['#4682A9', '#91C8E4', '#e0e0e0']
                    }
                ],
                'raw_data': intervention_stats,
                'intervention_filter': intervention_filter
            }
        })
        
    except Exception as e:
        print(f"Error generating intervention success report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/aftercare-summary', methods=['GET'])
@role_required(['caseworker', 'admin', 'psychometrician'])
def get_aftercare_summary_report():
    """Generate aftercare summary report for caseworkers"""
    try:
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 30 days if no dates provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Get aftercare clients
        clients_ref = db.collection('clients')
        aftercare_clients = clients_ref.where('care_type', '==', 'after_care').where('archived', '==', False).stream()
        
        # Initialize counters
        aftercare_stats = {
            'total_clients': 0,
            'active_clients': 0,
            'completed_clients': 0,
            'pending_clients': 0,
            'weekly_activities': 0,
            'monthly_activities': 0
        }
        
        # Process aftercare clients
        for client_doc in aftercare_clients:
            client_data = client_doc.to_dict()
            aftercare_stats['total_clients'] += 1
            
            # Count by status
            status = client_data.get('status', 'unknown')
            if status == 'active':
                aftercare_stats['active_clients'] += 1
            elif status == 'completed':
                aftercare_stats['completed_clients'] += 1
            elif status == 'pending':
                aftercare_stats['pending_clients'] += 1
        
        # Get activity logs for aftercare clients
        logs_ref = db.collection('activity_logs')
        logs_query = logs_ref.where('timestamp', '>=', start_date).where('timestamp', '<=', end_date)
        logs = logs_query.stream()
        
        # Count activities
        for log in logs:
            log_data = log.to_dict()
            target_type = log_data.get('target_type', '')
            
            if target_type == 'client':
                # Check if this is for an aftercare client
                target_id = log_data.get('target_id')
                if target_id:
                    client_ref = db.collection('clients').document(target_id)
                    client_doc = client_ref.get()
                    if client_doc.exists:
                        client_data = client_doc.to_dict()
                        if client_data.get('care_type') == 'after_care':
                            aftercare_stats['monthly_activities'] += 1
                            
                            # Count weekly activities (last 7 days)
                            log_date = log_data.get('timestamp')
                            if isinstance(log_date, datetime):
                                days_diff = (datetime.now() - log_date).days
                                if days_diff <= 7:
                                    aftercare_stats['weekly_activities'] += 1
        
        # Calculate success rate
        if aftercare_stats['total_clients'] > 0:
            success_rate = (aftercare_stats['completed_clients'] / aftercare_stats['total_clients']) * 100
        else:
            success_rate = 0
        
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Active', 'Completed', 'Pending'],
                'datasets': [
                    {
                        'data': [
                            aftercare_stats['active_clients'],
                            aftercare_stats['completed_clients'],
                            aftercare_stats['pending_clients']
                        ],
                        'backgroundColor': ['#4682A9', '#4CAF50', '#FF9800']
                    }
                ],
                'metrics': {
                    'total_clients': aftercare_stats['total_clients'],
                    'success_rate': round(success_rate, 1),
                    'weekly_activities': aftercare_stats['weekly_activities'],
                    'monthly_activities': aftercare_stats['monthly_activities']
                }
            }
        })
        
    except Exception as e:
        print(f"Error generating aftercare summary report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/clients-list', methods=['GET'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker'])
def get_clients_for_reports():
    """Get list of clients for report selection"""
    try:
        # Get clients data
        clients_ref = db.collection('clients')
        clients = clients_ref.where('archived', '==', False).stream()
        
        clients_list = []
        for client_doc in clients:
            client_data = client_doc.to_dict()
            
            # Only include active clients for progress reports
            if client_data.get('status') in ['active', 'completed']:
                clients_list.append({
                    'id': client_doc.id,
                    'name': client_data.get('name', 'Unknown'),
                    'clientId': client_data.get('clientId', ''),
                    'status': client_data.get('status', 'unknown'),
                    'care_type': client_data.get('care_type', 'unknown')
                })
        
        # Sort by name
        clients_list.sort(key=lambda x: x['name'])
        
        return jsonify({
            'success': True,
            'clients': clients_list
        })
        
    except Exception as e:
        print(f"Error getting clients list for reports: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/export/<report_type>', methods=['POST'])
@role_required(['admin', 'psychometrician', 'facilitator', 'caseworker'])
def export_report(report_type):
    """Export report data in various formats"""
    try:
        data = request.get_json()
        format_type = data.get('format', 'pdf')
        report_data = data.get('data', {})
        
        if report_type == 'monthly-summary':
            # Generate CSV for monthly summary
            if format_type == 'csv':
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write headers
                writer.writerow(['Month', 'Active Clients', 'Completed Treatments', 'New Registrations', 'Aftercare Transfers'])
                
                # Write data
                labels = report_data.get('labels', [])
                datasets = report_data.get('datasets', [])
                
                for i, month in enumerate(labels):
                    row = [month]
                    for dataset in datasets:
                        if i < len(dataset.get('data', [])):
                            row.append(dataset['data'][i])
                        else:
                            row.append(0)
                    writer.writerow(row)
                
                csv_content = output.getvalue()
                output.close()
                
                return jsonify({
                    'success': True,
                    'content': csv_content,
                    'filename': f'monthly_summary_{datetime.now().strftime("%Y%m%d")}.csv'
                })
        
        elif report_type == 'client-progress':
            # Generate CSV for client progress
            if format_type == 'csv':
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write headers
                writer.writerow(['Week', 'Mood Score', 'Engagement Score', 'Activities Count'])
                
                # Write data
                chart_data = report_data.get('chart_data', {})
                labels = chart_data.get('labels', [])
                datasets = chart_data.get('datasets', [])
                
                for i, week in enumerate(labels):
                    row = [week]
                    for dataset in datasets:
                        if i < len(dataset.get('data', [])):
                            row.append(dataset['data'][i])
                        else:
                            row.append(0)
                    writer.writerow(row)
                
                csv_content = output.getvalue()
                output.close()
                
                return jsonify({
                    'success': True,
                    'content': csv_content,
                    'filename': f'client_progress_{datetime.now().strftime("%Y%m%d")}.csv'
                })
        
        # For other formats (PDF, Excel), you would implement additional logic here
        # For now, return a placeholder response
        return jsonify({
            'success': True,
            'message': f'{format_type.upper()} export for {report_type} is not yet implemented',
            'content': 'Export functionality will be implemented in future updates'
        })
        
    except Exception as e:
        print(f"Error exporting report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def generate_offset_coordinates(base_coords, client_id, offset_radius=0.001):
    """
    Generate slightly offset coordinates for clients in the same location.
    This ensures all clients are visible on the map even if they have the same address.
    
    Args:
        base_coords: Original coordinates dict with 'lat' and 'lng'
        client_id: Client ID to use for consistent offset generation
        offset_radius: Maximum offset radius in degrees (default 0.001 = ~100m)
    
    Returns:
        dict: New coordinates with slight offset
    """
    import hashlib
    import math
    
    # Use client_id to generate consistent offset
    hash_obj = hashlib.md5(str(client_id).encode())
    hash_hex = hash_obj.hexdigest()
    
    # Convert hash to offset values (0 to 1)
    offset_lat = int(hash_hex[:8], 16) / (16**8)  # 0 to 1
    offset_lng = int(hash_hex[8:16], 16) / (16**8)  # 0 to 1
    
    # Convert to offset range (-offset_radius to +offset_radius)
    lat_offset = (offset_lat - 0.5) * 2 * offset_radius
    lng_offset = (offset_lng - 0.5) * 2 * offset_radius
    
    # Apply offset to base coordinates
    new_lat = base_coords['lat'] + lat_offset
    new_lng = base_coords['lng'] + lng_offset
    
    # Create new coordinates dict with offset info
    new_coords = {
        'lat': round(new_lat, 6),
        'lng': round(new_lng, 6),
        'source': base_coords.get('source', 'manual'),
        'original_coords': {
            'lat': base_coords['lat'],
            'lng': base_coords['lng']
        },
        'offset_applied': True
    }
    
    # Preserve other fields from original coordinates
    if 'formatted_address' in base_coords:
        new_coords['formatted_address'] = base_coords['formatted_address']
    
    return new_coords

@app.route('/debug/client/<client_id>')
@role_required(['admin', 'psychometrician', 'house_worker'])
def debug_client(client_id):
    """Debug route to see client data"""
    try:
        from flask import jsonify
        client_ref = db.collection('clients').document(client_id)
        client = client_ref.get()
        
        if not client.exists:
            return jsonify({'error': 'Client not found'}), 404
            
        client_data = client.to_dict()
        client_data['id'] = client.id
        
        return jsonify({
            'success': True,
            'client_data': client_data,
            'has_name': 'name' in client_data,
            'has_status': 'status' in client_data,
            'has_care_type': 'care_type' in client_data,
            'all_fields': list(client_data.keys())
        })
        
    except Exception as e:
        from flask import jsonify
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
