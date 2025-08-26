#!/usr/bin/env python3
"""
Standalone script to update client coordinates with offset for better map visibility.
This script can be run independently to update existing clients.
"""

import os
import sys
import hashlib
import math
from datetime import datetime

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_config import db

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
        
        print("Starting coordinate update process...")
        
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
                
                print(f"Processing client: {client_data.get('name', 'Unknown')} (ID: {client_id})")
                print(f"  Original coordinates: {coordinates.get('lat', 'N/A')}, {coordinates.get('lng', 'N/A')}")
                
                # Generate new offset coordinates
                new_coordinates = generate_offset_coordinates(coordinates, client_id)
                
                print(f"  New coordinates: {new_coordinates['lat']}, {new_coordinates['lng']}")
                
                # Update the client
                client_ref = db.collection('clients').document(client_id)
                client_ref.update({
                    'coordinates': new_coordinates
                })
                
                results['updated'] += 1
                results['details'].append(f"Updated {client_data.get('name', 'Unknown')}: {new_coordinates['lat']}, {new_coordinates['lng']}")
                
                print(f"  ✓ Updated successfully")
                
            except Exception as e:
                results['errors'] += 1
                error_msg = f"Error updating {client_data.get('name', 'Unknown')}: {str(e)}"
                results['details'].append(error_msg)
                print(f"  ✗ {error_msg}")
        
        print(f"\nUpdate process completed!")
        print(f"Successfully updated: {results['updated']} clients")
        print(f"Errors: {results['errors']}")
        
        if results['details']:
            print("\nDetails:")
            for detail in results['details']:
                print(f"  - {detail}")
        
        return results
        
    except Exception as e:
        error_result = {'success': False, 'error': str(e)}
        print(f"Fatal error: {str(e)}")
        return error_result

if __name__ == "__main__":
    print("BreakFree Client Coordinate Update Tool")
    print("=" * 50)
    print("This tool will update all client coordinates with slight offsets")
    print("to ensure all clients are visible on the map even if they have the same location.")
    print()
    
    response = input("Do you want to proceed? (y/N): ")
    if response.lower() in ['y', 'yes']:
        result = update_all_client_coordinates()
        if result['success']:
            print(f"\n✅ Successfully updated {result['updated']} client coordinates!")
        else:
            print(f"\n❌ Failed to update coordinates: {result['error']}")
    else:
        print("Operation cancelled.")
