#!/usr/bin/env python3
"""
Script to check users in Firestore database
"""

from firebase_config import db

def check_users():
    print("Checking Firestore users collection...")
    
    try:
        # Get all users
        users_ref = db.collection('users')
        users = list(users_ref.stream())
        
        print(f"Found {len(users)} users in database")
        
        if len(users) == 0:
            print("No users found in the database.")
            print("You need to create users through the settings page.")
            return
        
        # Show details of all users
        print("\nUser details:")
        for i, user in enumerate(users):
            user_data = user.to_dict()
            email = user_data.get('email', 'Unknown')
            role = user_data.get('role', 'Unknown')
            status = user_data.get('status', 'Unknown')
            
            print(f"{i+1}. {email} (Role: {role}, Status: {status})")
        
    except Exception as e:
        print(f"Error accessing Firestore: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_users()


