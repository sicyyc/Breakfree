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

# Load environment variables before importing Firebase config
load_dotenv()

from firebase_config import db
from firebase_admin import auth
from datetime import datetime

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

# Add this after the imports
LAGUNA_LOCATIONS = {
    "municipalities": [
        # Cities
        {"id": "calamba", "name": "Calamba City", "lat": 14.1877, "lng": 121.1251},
        {"id": "sanpablo", "name": "San Pablo City", "lat": 14.0683, "lng": 121.3251},
        {"id": "santarosa", "name": "Santa Rosa City", "lat": 14.3119, "lng": 121.1114},
        {"id": "binan", "name": "Biñan City", "lat": 14.3306, "lng": 121.0856},
        {"id": "cabuyao", "name": "Cabuyao City", "lat": 14.2471, "lng": 121.1367},
        {"id": "sanpedro", "name": "San Pedro City", "lat": 14.3589, "lng": 121.0476},
        
        # Municipalities
        {"id": "santacruz", "name": "Santa Cruz", "lat": 14.2854, "lng": 121.4134},
        {"id": "kalayaan", "name": "Kalayaan", "lat": 14.2691, "lng": 121.4213},
        {"id": "bay", "name": "Bay", "lat": 14.1833, "lng": 121.2833},
        {"id": "losbanos", "name": "Los Baños", "lat": 14.1692, "lng": 121.2417},
        {"id": "calauan", "name": "Calauan", "lat": 14.1497, "lng": 121.3156},
        {"id": "alaminos", "name": "Alaminos", "lat": 14.0639, "lng": 121.2461},
        {"id": "magdalena", "name": "Magdalena", "lat": 14.2000, "lng": 121.4333},
        {"id": "majayjay", "name": "Majayjay", "lat": 14.1500, "lng": 121.4667},
        {"id": "liliw", "name": "Liliw", "lat": 14.1333, "lng": 121.4333},
        {"id": "nagcarlan", "name": "Nagcarlan", "lat": 14.1333, "lng": 121.4167},
        {"id": "rizal", "name": "Rizal", "lat": 14.1167, "lng": 121.4000},
        {"id": "sanpascual", "name": "San Pascual", "lat": 14.1000, "lng": 121.3833},
        {"id": "pila", "name": "Pila", "lat": 14.2333, "lng": 121.3667},
        {"id": "victoria", "name": "Victoria", "lat": 14.2167, "lng": 121.3333},
        {"id": "pagsanjan", "name": "Pagsanjan", "lat": 14.2667, "lng": 121.4500},
        {"id": "cavinti", "name": "Cavinti", "lat": 14.2500, "lng": 121.5000},
        {"id": "lumban", "name": "Lumban", "lat": 14.3000, "lng": 121.4667},
        {"id": "paete", "name": "Paete", "lat": 14.3667, "lng": 121.4833},
        {"id": "pakil", "name": "Pakil", "lat": 14.3833, "lng": 121.4833},
        {"id": "pangil", "name": "Pangil", "lat": 14.4000, "lng": 121.4667},
        {"id": "siniloan", "name": "Siniloan", "lat": 14.4167, "lng": 121.4500},
        {"id": "famy", "name": "Famy", "lat": 14.4333, "lng": 121.4500},
        {"id": "mabitac", "name": "Mabitac", "lat": 14.4500, "lng": 121.4333},
        {"id": "sta_maria", "name": "Sta. Maria", "lat": 14.4667, "lng": 121.4167},
        {"id": "magsaysay", "name": "Magsaysay", "lat": 14.4833, "lng": 121.4000},
        {"id": "sta_catalina", "name": "Sta. Catalina", "lat": 14.5000, "lng": 121.3833},
        {"id": "pansol", "name": "Pansol", "lat": 14.5167, "lng": 121.3667},
        {"id": "pagsanjan", "name": "Pagsanjan", "lat": 14.2667, "lng": 121.4500}
    ],
    "barangays": {
        "calamba": [
            "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Barangay 6", "Barangay 7",
            "Parian", "Crossing", "Real", "Mayapa", "Canlubang", "Pansol", "Bagong Kalsada", "Bucal",
            "Banadero", "Banlic", "Batino", "Bubuyan", "Bunggo", "Burol", "Camaligan", "Halang",
            "Hornalan", "Kay-Anlog", "La Mesa", "Laguerta", "Lawa", "Lecheria", "Lingga", "Looc",
            "Mabato", "Majada Labas", "Makiling", "Mapagong", "Masili", "Maunong", "Milagrosa",
            "Paciano Rizal", "Palingon", "Paliparan", "Palo-Alto", "Pansol", "Prinza", "Punta",
            "Sucol", "Turbina", "Ulango", "Uwisan"
        ],
        "sanpablo": [
            "San Roque", "San Rafael", "Santa Maria", "San Nicolas", "San Jose", "San Vicente",
            "San Antonio", "San Bartolome", "San Francisco", "San Pedro", "San Lorenzo",
            "San Diego", "San Lucas", "San Cristobal", "San Juan", "San Isidro", "San Miguel",
            "San Gabriel", "San Mateo", "San Andres", "San Agustin", "San Buenaventura",
            "San Ignacio", "San Luis", "San Marcos", "San Pablo", "San Sebastian", "San Simon",
            "San Vicente", "Santa Ana", "Santa Catalina", "Santa Cruz", "Santa Elena",
            "Santa Isabel", "Santa Monica", "Santa Veronica", "Santo Angel", "Santo Cristo",
            "Santo Niño", "Santo Tomas"
        ],
        "santarosa": [
            "Balibago", "Don Jose", "Dita", "Kanluran", "Labas", "Macabling", "Market Area",
            "Malitlit", "Pooc", "Tagapo", "Aplaya", "Caingin", "Diliman", "Ibaba", "Malusak",
            "Pook", "Pulong Santa Cruz", "Sinalhan", "Tunasan"
        ],
        "binan": [
            "Canlalay", "Casile", "De La Paz", "Ganado", "Langkiwa", "Malaban", "Mampalasan",
            "Platero", "San Antonio", "San Francisco", "San Jose", "San Vicente", "Santo Domingo",
            "Santo Niño", "Santo Tomas", "Timbao", "Tubigan", "Zapote"
        ],
        "cabuyao": [
            "Baclaran", "Banay-Banay", "Banlic", "Bigaa", "Butong", "Diezmo", "Gulod",
            "Mamatid", "Marinig", "Niugan", "Pulong Buhangin", "Katapatan", "Pulo", "Sala",
            "San Isidro", "San Vicente", "Santa Rosa", "Tambo", "Tuntungin-Putho"
        ],
        "sanpedro": [
            "Bagong Silang", "Calendola", "Chrysanthemum", "Cuyab", "Estrella", "Fatima",
            "G.S.I.S.", "Landayan", "Langgam", "Laram", "Magsaysay", "Maharlika", "Narra",
            "Nueva", "Pacita 1", "Pacita 2", "Poblacion", "Riverside", "Rosario", "Sampaguita",
            "San Antonio", "San Lorenzo Ruiz", "San Roque", "San Vicente", "Santo Niño",
            "United Bayanihan", "United Better Living"
        ],
        "santacruz": [
            "Alipit", "Bagumbayan", "Bubukal", "Gatid", "Labuin", "Oogong", "Pagsawitan",
            "Patimbao", "Santisima Cruz", "Santo Angel", "San Jose", "San Pablo", "San Roque",
            "San Vicente", "Santa Lucia", "Santa Maria", "Santo Domingo", "Santo Tomas"
        ],
        "kalayaan": [
            "Longos", "San Antonio", "San Juan", 
        ],
        "bay": [
            "Bitin", "Calo", "Dila", "Maitim", "Masaya", "Paciano Rizal", "Puypuy",
            "San Agustin", "Santo Domingo", "Tagumpay", "San Antonio", "San Isidro",
            "San Nicolas", "San Pablo", "San Pedro", "Santa Cruz", "Santo Domingo"
        ],
        "losbanos": [
            "Anos", "Bambang", "Batong Malake", "Baybayin", "Bayog", "Lalakay", "Maahas",
            "Malinta", "Mayondon", "San Antonio", "Bagong Silang", "Bambang", "Batong Malake",
            "Baybayin", "Bayog", "Lalakay", "Maahas", "Malinta", "Mayondon", "San Antonio",
            "Tuntungin-Putho"
        ],
        "siniloan": [
            "Acevida", "Bagong Pag-asa", "Bagong Silang", "Baguio", "Burgos", "Calumpang",
            "Casinsin", "De La Paz", "General Luna", "Halayhayin", "Jose Rizal", "Laguio",
            "Liwayway", "Lourdes", "Macatad", "Magsaysay", "Mendiola", "Nabangka", "Nangka",
            "P. Burgos", "Pandayan", "Poblacion", "Quisao", "Rizal", "San Andres", "San Antonio",
            "San Francisco", "San Jose", "San Miguel", "San Nicolas", "San Pedro", "San Roque",
            "San Vicente", "Santa Maria", "Santo Niño", "Santo Tomas", "Silangan", "Tatlong Krus"
        ],
        "paete": [
            "Bagumbayan", "Balanac", "Bungkol", "Ibaba del Norte", "Ibaba del Sur", "Ilaya del Norte",
            "Ilaya del Sur", "Maytoong", "Quinale", "San Antonio", "San Francisco", "San Jose",
            "San Roque", "San Vicente", "Santa Barbara", "Santo Tomas"
        ],
        "pakil": [
            "Banilan", "Burgos", "Casa Real", "Casinsin", "Dorado", "Gonzales", "Kabulusan",
            "Matikiw", "Nabuclod", "Natalia", "Pagalangan", "Poblacion", "Rizal", "San Antonio",
            "San Francisco", "San Jose", "San Miguel", "San Pedro", "San Vicente", "Santa Maria",
            "Santo Niño", "Santo Tomas", "Taft", "Taquing", "Tubigan"
        ],
        "pangil": [
            "Balian", "Dambo", "Galalan", "Isla", "Mabato-Azufre", "Nieves", "Poblacion",
            "San Jose", "San Nicolas", "San Vicente", "Santa Maria", "Santo Niño", "Santo Tomas"
        ],
        "mabitac": [
            "Amuyong", "Baliuag", "Bayanihan", "Lambac", "Lucong", "Matalatala", "Nangka",
            "Nayon", "Paagahan", "Poblacion", "San Antonio", "San Gabriel", "San Miguel",
            "San Vicente", "Santa Maria", "Santo Niño", "Santo Tomas"
        ],
        "sta_maria": [
            "Adia", "Bagong Pook", "Bagumbayan", "Bubukal", "Cabuyao", "Calangay", "Cambuja",
            "Cueva", "Jose Laurel Jr.", "Kayhakat", "Macasipac", "Manggahan", "Matala",
            "Nagsaing", "Nangka", "Poblacion", "San Antonio", "San Gabriel", "San Jose",
            "San Vicente", "Santa Ana", "Santa Clara", "Santa Cruz", "Santo Niño", "Santo Tomas"
        ],
        "cavinti": [
            "Anglas", "Bangco", "Bukal", "Bulajo", "Cansuso", "Chico", "Dagatan", "Duhat",
            "Inao-Awan", "Kanluran Talaongan", "Labayo", "Layasin", "Layug", "Mahipon",
            "Paowin", "Poblacion", "Silangan Talaongan", "Sisilmin", "Sumucab", "Tibig",
            "Udia", "Ulong-Sulok"
        ]
    }
}

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
            selected_role = request.form.get('role')
            uid = request.form.get('uid')

            if not all([email, selected_role, uid]):
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
            
            # Verify that selected role matches actual role
            if selected_role != actual_role:
                return jsonify({
                    'success': False, 
                    'error': f'Access denied. You are not authorized as {selected_role}.'
                }), 403
            
            # Store user info in session
            session['user_id'] = uid
            session['email'] = email
            session['role'] = actual_role
            
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
                         after_care_clients=after_care_clients)

@app.route('/check_in')
@role_required(['admin', 'psychometrician', 'house_worker'])
def check_in():
    return render_template('check_in.html', email=session['email'])

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
            
            # Only add non-archived clients that are NOT pending
            archived = client_dict.get('archived', False)
            status = client_dict.get('status', 'active')
            print(f"Client {client_dict.get('name', 'Unknown')}: archived = {archived}, status = {status}")
            if not archived and status != 'pending':
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
    
    return render_template('clients.html', email=session['email'], clients=clients_data, pagination=pagination)

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
                'clientPassword': request.form.get('clientPassword'),
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
            client_password = (client_data.get('clientPassword') or '').strip()
            # Auto-generate client_id if missing
            if not client_id:
                try:
                    total_existing = sum(1 for _ in db.collection('clients').stream())
                    client_id = str(total_existing + 1)
                    client_data['clientId'] = client_id
                except Exception as e:
                    print(f"Error auto-generating clientId: {e}")
            if not client_password:
                return jsonify({'success': False, 'error': 'Client password is required.'}), 400

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
                        # Try manual mapping for common addresses
                        address_lower = address.lower()
                        manual_coords = None
                        
                        # PRIORITY 1: Municipality/City matching (highest priority)
                        # Cities
                        if 'calamba' in address_lower:
                            manual_coords = {'lat': 14.1877, 'lng': 121.1251, 'source': 'manual'}
                        elif 'san pablo' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.0683, 'lng': 121.3251, 'source': 'manual'}
                        elif 'santa rosa' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.3119, 'lng': 121.1114, 'source': 'manual'}
                        elif 'binan' in address_lower or 'biñan' in address_lower:
                            manual_coords = {'lat': 14.3306, 'lng': 121.0856, 'source': 'manual'}
                        elif 'cabuyao' in address_lower:
                            manual_coords = {'lat': 14.2471, 'lng': 121.1367, 'source': 'manual'}
                        elif 'san pedro' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.3589, 'lng': 121.0476, 'source': 'manual'}
                        
                        # Municipalities - Northern Laguna
                        elif 'siniloan' in address_lower:
                            manual_coords = {'lat': 14.4167, 'lng': 121.4500, 'source': 'manual'}
                        elif 'famy' in address_lower:
                            manual_coords = {'lat': 14.4333, 'lng': 121.4500, 'source': 'manual'}
                        elif 'mabitac' in address_lower:
                            manual_coords = {'lat': 14.4500, 'lng': 121.4333, 'source': 'manual'}
                        elif 'sta maria' in address_lower or 'santa maria' in address_lower:
                            manual_coords = {'lat': 14.4667, 'lng': 121.4167, 'source': 'manual'}
                        elif 'magsaysay' in address_lower:
                            manual_coords = {'lat': 14.4833, 'lng': 121.4000, 'source': 'manual'}
                        elif 'sta catalina' in address_lower or 'santa catalina' in address_lower:
                            manual_coords = {'lat': 14.5000, 'lng': 121.3833, 'source': 'manual'}
                        elif 'pansol' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.5167, 'lng': 121.3667, 'source': 'manual'}
                        
                        # Municipalities - Eastern Laguna
                        elif 'paete' in address_lower:
                            manual_coords = {'lat': 14.3667, 'lng': 121.4833, 'source': 'manual'}
                        elif 'pakil' in address_lower:
                            manual_coords = {'lat': 14.3833, 'lng': 121.4833, 'source': 'manual'}
                        elif 'pangil' in address_lower:
                            manual_coords = {'lat': 14.4000, 'lng': 121.4667, 'source': 'manual'}
                        elif 'pagsanjan' in address_lower:
                            manual_coords = {'lat': 14.2667, 'lng': 121.4500, 'source': 'manual'}
                        elif 'cavinti' in address_lower:
                            manual_coords = {'lat': 14.2500, 'lng': 121.5000, 'source': 'manual'}
                        elif 'lumban' in address_lower:
                            manual_coords = {'lat': 14.3000, 'lng': 121.4667, 'source': 'manual'}
                        elif 'kalayaan' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                        elif 'longos' in address_lower and 'kalayaan' in address_lower:
                            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                        
                        # Municipalities - Central Laguna
                        elif 'sta cruz' in address_lower or 'santa cruz' in address_lower:
                            if 'laguna' in address_lower or 'sambat' in address_lower:
                                manual_coords = {'lat': 14.2854, 'lng': 121.4134, 'source': 'manual'}
                        elif 'bay' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.1833, 'lng': 121.2833, 'source': 'manual'}
                        elif 'los banos' in address_lower or 'los baños' in address_lower:
                            manual_coords = {'lat': 14.1692, 'lng': 121.2417, 'source': 'manual'}
                        elif 'calauan' in address_lower:
                            manual_coords = {'lat': 14.1497, 'lng': 121.3156, 'source': 'manual'}
                        elif 'alaminos' in address_lower:
                            manual_coords = {'lat': 14.0639, 'lng': 121.2461, 'source': 'manual'}
                        
                        # Municipalities - Southern Laguna
                        elif 'magdalena' in address_lower:
                            manual_coords = {'lat': 14.2000, 'lng': 121.4333, 'source': 'manual'}
                        elif 'majayjay' in address_lower:
                            manual_coords = {'lat': 14.1500, 'lng': 121.4667, 'source': 'manual'}
                        elif 'liliw' in address_lower:
                            manual_coords = {'lat': 14.1333, 'lng': 121.4333, 'source': 'manual'}
                        elif 'nagcarlan' in address_lower:
                            manual_coords = {'lat': 14.1333, 'lng': 121.4167, 'source': 'manual'}
                        elif 'rizal' in address_lower and 'laguna' in address_lower:
                            manual_coords = {'lat': 14.1167, 'lng': 121.4000, 'source': 'manual'}
                        elif 'san pascual' in address_lower:
                            manual_coords = {'lat': 14.1000, 'lng': 121.3833, 'source': 'manual'}
                        elif 'pila' in address_lower:
                            manual_coords = {'lat': 14.2333, 'lng': 121.3667, 'source': 'manual'}
                        elif 'victoria' in address_lower:
                            manual_coords = {'lat': 14.2167, 'lng': 121.3333, 'source': 'manual'}
                        
                        # PRIORITY 2: Specific barangay matching (if no municipality found)
                        elif 'longos' in address_lower:
                            # Longos is a barangay in Kalayaan, Laguna
                            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
                        
                        # PRIORITY 3: Street-specific mapping (lowest priority - only if no municipality/barangay found)
                        elif 'real' in address_lower and ('st' in address_lower or 'street' in address_lower):
                            if 'zone' in address_lower or 'purok' in address_lower:
                                manual_coords = {'lat': 14.2100, 'lng': 121.1200, 'source': 'manual'}
                            else:
                                manual_coords = {'lat': 14.2120, 'lng': 121.1250, 'source': 'manual'}
                        
                        if manual_coords:
                            # Generate offset coordinates to ensure unique positioning
                            client_data['coordinates'] = generate_offset_coordinates(manual_coords, client_data.get('clientId', client_data.get('name', 'unknown')))
                            print(f"Used manual coordinates with offset: {client_data['coordinates']['lat']}, {client_data['coordinates']['lng']}")
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

        return render_template('client_profile.html', client=client_data)
    except Exception as e:
        print(f"Error fetching client profile: {e}")
        flash('Error loading client profile', 'error')
        return redirect(url_for('clients'))

@app.route('/interventions')
@role_required(['admin', 'psychometrician'])
def interventions():
    return render_template('interventions.html', email=session['email'])

@app.route('/map')
@role_required(['admin', 'psychometrician', 'house_worker'])
def map():
    return render_template('map.html', email=session['email'])

@app.route('/reports')
@role_required(['admin', 'psychometrician', 'house_worker'])
def reports():
    return render_template('reports.html', email=session['email'])

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
        
        return render_template('settings.html', email=session['email'], users=users)
    except Exception as e:
        print(f"Error loading settings: {e}")
        return render_template('settings.html', email=session['email'], users=[])

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
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout')
def logout():
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
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_municipalities():
    """Get all Laguna municipalities and cities with their coordinates"""
    municipalities = LAGUNA_LOCATIONS['municipalities']
    return jsonify(municipalities)

@app.route('/api/barangays/<municipality_id>')
@role_required(['admin', 'psychometrician', 'house_worker'])
def get_barangays(municipality_id):
    barangays = LAGUNA_LOCATIONS['barangays'].get(municipality_id, [])
    return jsonify(barangays)

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
        
        # Test the geocoding logic
        manual_coords = None
        
        # PRIORITY 1: Municipality/City matching (highest priority)
        # Cities
        if 'calamba' in address:
            manual_coords = {'lat': 14.1877, 'lng': 121.1251, 'source': 'manual'}
        elif 'san pablo' in address and 'laguna' in address:
            manual_coords = {'lat': 14.0683, 'lng': 121.3251, 'source': 'manual'}
        elif 'santa rosa' in address and 'laguna' in address:
            manual_coords = {'lat': 14.3119, 'lng': 121.1114, 'source': 'manual'}
        elif 'binan' in address or 'biñan' in address:
            manual_coords = {'lat': 14.3306, 'lng': 121.0856, 'source': 'manual'}
        elif 'cabuyao' in address:
            manual_coords = {'lat': 14.2471, 'lng': 121.1367, 'source': 'manual'}
        elif 'san pedro' in address and 'laguna' in address:
            manual_coords = {'lat': 14.3589, 'lng': 121.0476, 'source': 'manual'}
        
        # Municipalities - Northern Laguna
        elif 'siniloan' in address:
            manual_coords = {'lat': 14.4167, 'lng': 121.4500, 'source': 'manual'}
        elif 'famy' in address:
            manual_coords = {'lat': 14.4333, 'lng': 121.4500, 'source': 'manual'}
        elif 'mabitac' in address:
            manual_coords = {'lat': 14.4500, 'lng': 121.4333, 'source': 'manual'}
        elif 'sta maria' in address or 'santa maria' in address:
            manual_coords = {'lat': 14.4667, 'lng': 121.4167, 'source': 'manual'}
        elif 'magsaysay' in address:
            manual_coords = {'lat': 14.4833, 'lng': 121.4000, 'source': 'manual'}
        elif 'sta catalina' in address or 'santa catalina' in address:
            manual_coords = {'lat': 14.5000, 'lng': 121.3833, 'source': 'manual'}
        elif 'pansol' in address and 'laguna' in address:
            manual_coords = {'lat': 14.5167, 'lng': 121.3667, 'source': 'manual'}
        
        # Municipalities - Eastern Laguna
        elif 'paete' in address:
            manual_coords = {'lat': 14.3667, 'lng': 121.4833, 'source': 'manual'}
        elif 'pakil' in address:
            manual_coords = {'lat': 14.3833, 'lng': 121.4833, 'source': 'manual'}
        elif 'pangil' in address:
            manual_coords = {'lat': 14.4000, 'lng': 121.4667, 'source': 'manual'}
        elif 'pagsanjan' in address:
            manual_coords = {'lat': 14.2667, 'lng': 121.4500, 'source': 'manual'}
        elif 'cavinti' in address:
            manual_coords = {'lat': 14.2500, 'lng': 121.5000, 'source': 'manual'}
        elif 'lumban' in address:
            manual_coords = {'lat': 14.3000, 'lng': 121.4667, 'source': 'manual'}
        elif 'kalayaan' in address and 'laguna' in address:
            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
        elif 'longos' in address and 'kalayaan' in address:
            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
        
        # Municipalities - Central Laguna
        elif 'sta cruz' in address or 'santa cruz' in address:
            if 'laguna' in address or 'sambat' in address:
                manual_coords = {'lat': 14.2854, 'lng': 121.4134, 'source': 'manual'}
        elif 'bay' in address and 'laguna' in address:
            manual_coords = {'lat': 14.1833, 'lng': 121.2833, 'source': 'manual'}
        elif 'los banos' in address or 'los baños' in address:
            manual_coords = {'lat': 14.1692, 'lng': 121.2417, 'source': 'manual'}
        elif 'calauan' in address:
            manual_coords = {'lat': 14.1497, 'lng': 121.3156, 'source': 'manual'}
        elif 'alaminos' in address:
            manual_coords = {'lat': 14.0639, 'lng': 121.2461, 'source': 'manual'}
        
        # Municipalities - Southern Laguna
        elif 'magdalena' in address:
            manual_coords = {'lat': 14.2000, 'lng': 121.4333, 'source': 'manual'}
        elif 'majayjay' in address:
            manual_coords = {'lat': 14.1500, 'lng': 121.4667, 'source': 'manual'}
        elif 'liliw' in address:
            manual_coords = {'lat': 14.1333, 'lng': 121.4333, 'source': 'manual'}
        elif 'nagcarlan' in address:
            manual_coords = {'lat': 14.1333, 'lng': 121.4167, 'source': 'manual'}
        elif 'rizal' in address and 'laguna' in address:
            manual_coords = {'lat': 14.1167, 'lng': 121.4000, 'source': 'manual'}
        elif 'san pascual' in address:
            manual_coords = {'lat': 14.1000, 'lng': 121.3833, 'source': 'manual'}
        elif 'pila' in address:
            manual_coords = {'lat': 14.2333, 'lng': 121.3667, 'source': 'manual'}
        elif 'victoria' in address:
            manual_coords = {'lat': 14.2167, 'lng': 121.3333, 'source': 'manual'}
        
        # PRIORITY 2: Specific barangay matching (if no municipality found)
        elif 'longos' in address:
            # Longos is a barangay in Kalayaan, Laguna
            manual_coords = {'lat': 14.2691, 'lng': 121.4213, 'source': 'manual'}
        
        # PRIORITY 3: Street-specific mapping (lowest priority - only if no municipality/barangay found)
        elif 'real' in address and ('st' in address or 'street' in address):
            if 'zone' in address or 'purok' in address:
                manual_coords = {'lat': 14.2100, 'lng': 121.1200, 'source': 'manual'}
            else:
                manual_coords = {'lat': 14.2120, 'lng': 121.1250, 'source': 'manual'}
        
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
            
            # Match address to municipality
            matched_municipality = None
            for municipality in LAGUNA_LOCATIONS['municipalities']:
                if municipality['id'] in address or municipality['name'].lower() in address:
                    matched_municipality = municipality['id']
                    break
            
            if matched_municipality:
                if matched_municipality not in location_stats:
                    location_stats[matched_municipality] = {
                        'name': next(m['name'] for m in LAGUNA_LOCATIONS['municipalities'] if m['id'] == matched_municipality),
                        'lat': next(m['lat'] for m in LAGUNA_LOCATIONS['municipalities'] if m['id'] == matched_municipality),
                        'lng': next(m['lng'] for m in LAGUNA_LOCATIONS['municipalities'] if m['id'] == matched_municipality),
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

@app.route('/api/locations/search')
@role_required(['admin', 'psychometrician', 'house_worker'])
def search_locations():
    """Search for Laguna locations by name"""
    query = request.args.get('q', '').lower()
    if not query or len(query) < 2:
        return jsonify({
            'success': True,
            'results': [],
            'total': 0
        })
    
    results = []
    
    # Search municipalities
    for municipality in LAGUNA_LOCATIONS['municipalities']:
        if query in municipality['name'].lower() or query in municipality['id'].lower():
            results.append({
                'type': 'municipality',
                'name': municipality['name'],
                'id': municipality['id'],
                'lat': municipality['lat'],
                'lng': municipality['lng']
            })
    
    # Search barangays
    for municipality_id, barangays in LAGUNA_LOCATIONS['barangays'].items():
        for barangay in barangays:
            if query in barangay.lower():
                # Get municipality info
                municipality = next((m for m in LAGUNA_LOCATIONS['municipalities'] if m['id'] == municipality_id), None)
                if municipality:
                    results.append({
                        'type': 'barangay',
                        'name': f"{barangay}, {municipality['name']}",
                        'municipality': municipality['name'],
                        'barangay': barangay,
                        'lat': municipality['lat'],
                        'lng': municipality['lng']
                    })
    
    return jsonify({
        'success': True,
        'results': results[:20],  # Limit to 20 results
        'total': len(results)
    })

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
