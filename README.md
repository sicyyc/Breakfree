# BreakFree - Client Management System

A comprehensive web application for managing clients, interventions, and check-ins built with Flask and Firebase.

## Features

- **Client Management**: Add, view, and manage client profiles
- **Interventions**: Track and manage client interventions
- **Check-ins**: Monitor client check-in status
- **Reports**: Generate comprehensive reports
- **Dashboard**: Real-time statistics and overview
- **🌐 Online Map Integration**: Advanced mapping with multiple tile layers
- **🔥 Interactive Heat Map**: Real-time client density visualization
- **📍 Google Maps-Style Markers**: Professional pin markers with client details
- **📊 Real-time Data Updates**: Live client location tracking
- **🌍 Multiple Map Layers**: OpenStreetMap, CartoDB, Esri, and Satellite views
- **📱 Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Python Flask
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Frontend**: HTML, CSS, JavaScript
- **Mapping**: Leaflet.js with multiple online tile providers
- **Heat Maps**: Leaflet.heat for density visualization
- **Styling**: Custom CSS with modern UI design
- **Geocoding**: Google Maps API & OpenStreetMap Nominatim

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Firebase project with Firestore enabled
- Firebase Authentication enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sicyyc/Breakfree.git
   cd BreakFree
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Firebase Setup**
   
   a. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   
   b. Enable Firestore Database
   
   c. Enable Authentication
   
   d. Download your service account key:
      - Go to Project Settings > Service Accounts
      - Click "Generate new private key"
      - Save as `firebase-auth.json` in the project root
   
   e. Copy `firebase_config_template.py` to `firebase_config.py` and update with your credentials:
      ```python
      firebaseConfig = {
          "apiKey": "your-api-key",
          "authDomain": "your-project.firebaseapp.com",
          "projectId": "your-project-id",
          "storageBucket": "your-project.appspot.com",
          "messagingSenderId": "your-sender-id",
          "appId": "your-app-id",
          "measurementId": "your-measurement-id"
      }
      ```

4. **Environment Variables**
   
   Create a `.env` file in the project root:
   ```
   FLASK_SECRET_KEY=your-secure-secret-key-here
   GOOGLE_GEOCODING_API_KEY=your-google-maps-api-key (optional)
   ```
   
   **Note**: The Google Geocoding API key is optional. The system will use OpenStreetMap Nominatim as a fallback.

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the application**
   
   Open your browser and go to `http://localhost:5000`

## 🗺️ Map Features

### **Online Map Integration**
- **Multiple Tile Layers**: Switch between OpenStreetMap, CartoDB Light, Esri Street, and Satellite views
- **Network Monitoring**: Real-time connectivity status with automatic fallbacks
- **Fullscreen Support**: Full-screen map viewing capability
- **Responsive Design**: Optimized for desktop and mobile devices

### **Interactive Heat Map**
- **6-Level Color System**: 
  - 🔵 Blue (Very Low: 0-1 clients)
  - 🟢 Green (Low: 1-2 clients)
  - 🟡 Yellow (Medium: 2-3 clients)
  - 🟠 Orange (High: 3-4 clients)
  - 🔴 Red (Very High: 4-5 clients)
  - ⚫ Dark Red (Maximum: 5+ clients)
- **Click to Explore**: Click anywhere on the map to see detailed density information
- **Real-time Updates**: Heat map refreshes every 2 minutes automatically
- **Interactive Legend**: Toggle legend visibility and refresh data manually

### **Google Maps-Style Markers**
- **Professional Pin Design**: Custom markers with emoji symbols (🏥🏠)
- **Color-coded by Type**: Green for In-House, Yellow for After Care clients
- **Interactive Popups**: Click markers to see client details
- **Cluster Support**: Multiple clients at same location are grouped together
- **Status Indicators**: Visual status (active/inactive) with opacity changes

### **Advanced Features**
- **Auto-geocoding**: Automatically converts addresses to coordinates
- **Background Processing**: Geocoding runs in background without blocking UI
- **Laguna Location API**: Specialized location data for Laguna Province
- **Error Handling**: Graceful fallbacks when services are unavailable
- **Performance Optimized**: Efficient rendering for large datasets

## Project Structure

```
BreakFree/
├── app.py                 # Main Flask application
├── firebase_config.py     # Firebase configuration (not in git)
├── firebase_config_template.py  # Template for Firebase setup
├── laguna_locations_api.py # Laguna Province location data API
├── laguna_locations.json  # Laguna municipalities and barangays data
├── requirements.txt       # Python dependencies
├── .gitignore            # Git ignore rules
├── static/               # Static files (CSS, JS, images)
│   ├── css/             # Stylesheets
│   │   ├── map.css      # Map and heat map styling
│   │   └── ...          # Other stylesheets
│   ├── js/              # JavaScript files
│   │   ├── map.js       # Interactive map functionality
│   │   └── ...          # Other JavaScript files
│   ├── images/          # Images
│   └── uploads/         # Uploaded files
└── templates/           # HTML templates
    ├── base.html        # Base template
    ├── dashboard.html   # Dashboard page
    ├── map.html         # Interactive map page
    ├── clients.html     # Clients management
    └── ...              # Other templates
```

## 🚀 Usage Guide

### **Accessing the Map**
1. Navigate to the **Map** section in the sidebar
2. The map will automatically load with your client locations
3. Use the toolbar controls to interact with the map

### **Map Controls**
- **Layer Buttons**: Switch between Map, Light, Street, and Satellite views
- **Heat Map Toggle**: Show/hide the heat map overlay
- **Markers Only**: Display only client markers without heat map
- **Refresh**: Manually refresh client data
- **Fit Bounds**: Zoom to show all client locations

### **Understanding the Heat Map**
- **Click anywhere** on the map to see density information for that area
- **Red areas** = High client concentration (focus resources here)
- **Blue areas** = Low client concentration (consider outreach)
- **Use the legend** to understand color meanings

### **Client Markers**
- **Green pins** 🏥 = In-House clients
- **Yellow pins** 🏠 = After Care clients
- **Click markers** to see client details and information
- **Multiple clients** at same location are grouped together

## Security Notes

- Never commit `firebase-auth.json` or `firebase_config.py` to version control
- Keep your Firebase credentials secure
- Use environment variables for sensitive configuration
- The `.gitignore` file is configured to exclude sensitive files

## 🆕 Recent Updates

### **Enhanced Map Features (Latest)**
- ✅ **Online Map Integration**: Multiple tile layers with network monitoring
- ✅ **Interactive Heat Map**: 6-level color system with click-to-explore
- ✅ **Google Maps-Style Markers**: Professional pin design with emoji symbols
- ✅ **Real-time Updates**: Automatic data refresh every 2 minutes
- ✅ **Laguna Location API**: Specialized data for Laguna Province
- ✅ **Responsive Design**: Optimized for all device sizes

### **Key Improvements**
- **Better Color System**: Clear 6-level density visualization
- **Interactive Legend**: Toggle visibility and manual refresh
- **Network Monitoring**: Real-time connectivity status
- **Performance Optimized**: Efficient rendering for large datasets
- **Professional UI**: Modern design with smooth animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.
