    #!/usr/bin/env python3
"""
BreakFree - Transfer to Aftercare System Utility

This script helps transfer clients from the main BreakFree system to the aftercare system.
It should be run when clients have completed their in-house treatment and are ready for aftercare.

Usage:
    python transfer_to_aftercare.py --client-id <client_id>
    python transfer_to_aftercare.py --list-ready
    python transfer_to_aftercare.py --transfer-all
"""

import argparse
import sys
import os
from datetime import datetime

# Add the current directory to Python path to import firebase_config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_config import db

def list_ready_clients():
    """List all clients that are ready for transfer to aftercare"""
    try:
        # Get clients who are ready for aftercare
        clients_ref = db.collection('clients')
        clients = clients_ref.stream()
        
        ready_clients = []
        for client in clients:
            client_data = client.to_dict()
            # Check if client is ready for aftercare
            if client_data.get('status') == 'ready_for_aftercare':
                ready_clients.append({
                    'id': client.id,
                    'name': client_data.get('name', 'Unknown'),
                    'care_type': client_data.get('care_type'),
                    'aftercare_request_date': client_data.get('aftercare_request_date')
                })
        
        if not ready_clients:
            print("No clients ready for transfer to aftercare.")
            return
        
        print(f"\nFound {len(ready_clients)} clients ready for aftercare transfer:")
        print("-" * 100)
        print(f"{'ID':<20} {'Name':<30} {'Care Type':<15} {'Request Date':<25}")
        print("-" * 100)
        
        for client in ready_clients:
            request_date = client['aftercare_request_date']
            if request_date:
                if hasattr(request_date, 'strftime'):
                    request_date = request_date.strftime('%Y-%m-%d %H:%M')
                else:
                    request_date = str(request_date)
            else:
                request_date = 'N/A'
            
            print(f"{client['id']:<20} {client['name']:<30} {client['care_type']:<15} {request_date:<25}")
        
        print("-" * 100)
        
    except Exception as e:
        print(f"Error listing ready clients: {str(e)}")

def transfer_client(client_id):
    """Transfer a specific client to aftercare system"""
    try:
        # Get the client
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            print(f"Client with ID {client_id} not found.")
            return False
        
        client_data = client_doc.to_dict()
        
        # Check if client is ready for aftercare
        if client_data.get('status') != 'ready_for_aftercare':
            print(f"Client {client_data.get('name')} is not ready for aftercare transfer.")
            print(f"Current status: {client_data.get('status')}")
            return False
        
        # Update client for aftercare system
        update_data = {
            'status': 'active',  # Set to active in aftercare
            'care_type': 'after_care',
            'transfer_to_aftercare_date': datetime.now(),
            'in_aftercare_system': True
        }
        
        client_ref.update(update_data)
        
        print(f"Successfully transferred {client_data.get('name')} to aftercare system.")
        print(f"Transfer date: {update_data['transfer_to_aftercare_date']}")
        print(f"Client is now active in the aftercare system.")
        
        return True
        
    except Exception as e:
        print(f"Error transferring client: {str(e)}")
        return False

def transfer_all_ready():
    """Transfer all clients ready for aftercare"""
    try:
        # Get all ready clients
        clients_ref = db.collection('clients')
        clients = clients_ref.stream()
        
        ready_clients = []
        for client in clients:
            client_data = client.to_dict()
            if client_data.get('status') == 'ready_for_aftercare':
                ready_clients.append(client.id)
        
        if not ready_clients:
            print("No clients ready for transfer to aftercare.")
            return
        
        print(f"Found {len(ready_clients)} clients ready for transfer.")
        confirm = input("Do you want to transfer all of them? (y/N): ")
        
        if confirm.lower() != 'y':
            print("Transfer cancelled.")
            return
        
        success_count = 0
        for client_id in ready_clients:
            if transfer_client(client_id):
                success_count += 1
        
        print(f"\nTransfer completed: {success_count}/{len(ready_clients)} clients transferred successfully.")
        
    except Exception as e:
        print(f"Error transferring all clients: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Transfer clients to aftercare system')
    parser.add_argument('--client-id', help='Transfer specific client by ID')
    parser.add_argument('--list-ready', action='store_true', help='List all clients ready for transfer')
    parser.add_argument('--transfer-all', action='store_true', help='Transfer all ready clients')
    
    args = parser.parse_args()
    
    if args.list_ready:
        list_ready_clients()
    elif args.client_id:
        transfer_client(args.client_id)
    elif args.transfer_all:
        transfer_all_ready()
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
