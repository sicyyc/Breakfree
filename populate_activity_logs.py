#!/usr/bin/env python3
"""
Script to populate activity logs with sample data for testing
"""

import os
import sys
from datetime import datetime, timedelta
import random

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_config import db

def populate_activity_logs():
    """Populate activity logs with sample data"""
    
    # Sample users
    sample_users = [
        {'email': 'admin@breakfree.com', 'role': 'admin', 'uid': 'admin123'},
        {'email': 'psychologist@breakfree.com', 'role': 'psychometrician', 'uid': 'psych123'},
        {'email': 'worker@breakfree.com', 'role': 'house_worker', 'uid': 'worker123'},
    ]
    
    # Sample actions
    sample_actions = [
        'Login',
        'Logout',
        'Create Client',
        'Update Client',
        'Approve Client',
        'Reject Client',
        'Archive Client',
        'Create User',
        'Update User',
        'Delete User',
        'View Reports',
        'Export Data',
        'Flag Client',
        'Send to Aftercare',
        'Complete Treatment'
    ]
    
    # Sample client names
    sample_clients = [
        'John Doe',
        'Jane Smith',
        'Mike Johnson',
        'Sarah Wilson',
        'David Brown',
        'Lisa Davis',
        'Robert Miller',
        'Jennifer Garcia',
        'William Rodriguez',
        'Maria Martinez'
    ]
    
    # Sample details for different actions
    action_details = {
        'Login': 'User logged in successfully from 192.168.1.100',
        'Logout': 'User logged out from 192.168.1.100',
        'Create Client': 'Created new client assessment',
        'Update Client': 'Updated client information',
        'Approve Client': 'Approved client for treatment',
        'Reject Client': 'Rejected client application',
        'Archive Client': 'Archived client record',
        'Create User': 'Created new user account',
        'Update User': 'Updated user permissions',
        'Delete User': 'Deleted user account',
        'View Reports': 'Viewed system reports',
        'Export Data': 'Exported client data',
        'Flag Client': 'Flagged client for review',
        'Send to Aftercare': 'Transferred client to aftercare',
        'Complete Treatment': 'Marked treatment as completed'
    }
    
    # Generate activity logs for the past 30 days
    logs_to_add = []
    base_time = datetime.now() - timedelta(days=30)
    
    for i in range(200):  # Generate 200 sample logs
        # Random timestamp within the past 30 days
        random_hours = random.randint(0, 30 * 24)
        timestamp = base_time + timedelta(hours=random_hours)
        
        # Random user
        user = random.choice(sample_users)
        
        # Random action
        action = random.choice(sample_actions)
        
        # Generate details
        details = action_details.get(action, f'Performed {action}')
        if 'Client' in action and action != 'Create Client':
            client_name = random.choice(sample_clients)
            details = f'{details}: {client_name}'
        
        # Generate target info
        target_id = None
        target_type = None
        
        if 'Client' in action:
            target_type = 'client'
            target_id = f'client_{random.randint(1000, 9999)}'
        elif 'User' in action:
            target_type = 'user'
            target_id = f'user_{random.randint(100, 999)}'
        
        # Generate IP address
        ip_address = f'192.168.1.{random.randint(1, 255)}'
        
        # Create log entry
        log_entry = {
            'user_id': user['uid'],
            'user_email': user['email'],
            'user_role': user['role'],
            'action': action,
            'details': details,
            'target_id': target_id,
            'target_type': target_type,
            'timestamp': timestamp,
            'ip_address': ip_address,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        logs_to_add.append(log_entry)
    
    # Sort by timestamp
    logs_to_add.sort(key=lambda x: x['timestamp'])
    
    # Add to Firestore
    print(f"Adding {len(logs_to_add)} activity logs to Firestore...")
    
    batch = db.batch()
    for i, log_entry in enumerate(logs_to_add):
        doc_ref = db.collection('activity_logs').document()
        batch.set(doc_ref, log_entry)
        
        # Commit in batches of 500
        if (i + 1) % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"Committed {i + 1} logs...")
    
    # Commit remaining logs
    if logs_to_add:
        batch.commit()
    
    print(f"Successfully added {len(logs_to_add)} activity logs!")
    print("You can now view the activity log in the admin panel.")

if __name__ == '__main__':
    try:
        populate_activity_logs()
    except Exception as e:
        print(f"Error populating activity logs: {e}")
        import traceback
        traceback.print_exc()
