# BreakFree - Client Management System

A comprehensive web application for managing clients, interventions, and check-ins built with Flask and Firebase.

## Features

- **Client Management**: Add, view, and manage client profiles
- **Interventions**: Track and manage client interventions
- **Check-ins**: Monitor client check-in status
- **Reports**: Generate comprehensive reports
- **Dashboard**: Real-time statistics and overview
- **Map Integration**: Visualize client locations
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Python Flask
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: Custom CSS with modern UI design

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
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the application**
   
   Open your browser and go to `http://localhost:5000`

## Project Structure

```
BreakFree/
├── app.py                 # Main Flask application
├── firebase_config.py     # Firebase configuration (not in git)
├── firebase_config_template.py  # Template for Firebase setup
├── requirements.txt       # Python dependencies
├── .gitignore            # Git ignore rules
├── static/               # Static files (CSS, JS, images)
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   ├── images/          # Images
│   └── uploads/         # Uploaded files
└── templates/           # HTML templates
    ├── base.html        # Base template
    ├── dashboard.html   # Dashboard page
    ├── clients.html     # Clients management
    └── ...              # Other templates
```

## Security Notes

- Never commit `firebase-auth.json` or `firebase_config.py` to version control
- Keep your Firebase credentials secure
- Use environment variables for sensitive configuration
- The `.gitignore` file is configured to exclude sensitive files

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
