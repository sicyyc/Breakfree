# Firebase configuration template
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Web app Firebase configuration
firebaseConfig = {
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_AUTH_DOMAIN",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_STORAGE_BUCKET",
    "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
    "appId": "YOUR_APP_ID",
    "measurementId": "YOUR_MEASUREMENT_ID"
}

# Initialize Firebase Admin with credentials from environment or file
def initialize_firebase():
    # Check if credentials file exists
    if os.path.exists('firebase-auth.json'):
        cred = credentials.Certificate('firebase-auth.json')
    else:
        # For development, you can use a service account dictionary
        # Make sure to set this up securely
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": "YOUR_PROJECT_ID",
            "private_key_id": "YOUR_PRIVATE_KEY_ID",
            "private_key": "YOUR_PRIVATE_KEY",
            "client_email": "YOUR_CLIENT_EMAIL",
            "client_id": "YOUR_CLIENT_ID",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "YOUR_CLIENT_X509_CERT_URL"
        })
    
    firebase_admin.initialize_app(cred)
    return firestore.client()

# Initialize Firestore
db = initialize_firebase()
