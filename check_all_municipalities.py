#!/usr/bin/env python3
"""Check and ensure all municipalities from API are in JSON file"""

from laguna_locations_api import laguna_api
import json

def check_all_municipalities():
    """Check if all API municipalities are in JSON file"""
    print("🔍 Checking all municipalities in JSON file...")
    
    # Get API data
    api_municipalities = laguna_api.get_all_municipalities()
    api_ids = [m.id for m in api_municipalities]
    
    # Get JSON data
    with open('laguna_locations.json', 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    json_ids = [m['id'] for m in json_data['municipalities']]
    
    print(f"📊 API has {len(api_ids)} municipalities")
    print(f"📊 JSON has {len(json_ids)} municipalities")
    
    # Check for missing municipalities
    missing_in_json = set(api_ids) - set(json_ids)
    extra_in_json = set(json_ids) - set(api_ids)
    
    if missing_in_json:
        print(f"❌ Missing in JSON: {missing_in_json}")
    else:
        print("✅ All API municipalities are in JSON")
    
    if extra_in_json:
        print(f"⚠️ Extra in JSON: {extra_in_json}")
    else:
        print("✅ No extra municipalities in JSON")
    
    # List all municipalities
    print("\n🏛️ All Municipalities:")
    print("-" * 40)
    for i, muni in enumerate(api_municipalities, 1):
        status = "✅" if muni.id in json_ids else "❌"
        print(f"{i:2d}. {status} {muni.name} ({muni.type}) - {len(muni.barangays)} barangays")
    
    return len(missing_in_json) == 0

if __name__ == "__main__":
    check_all_municipalities()
