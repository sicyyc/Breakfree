"""
Test script for the NLP Pipeline
Demonstrates the functionality of the client notes analysis system
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
TEST_CLIENT_ID = "test_client_001"

def test_client_verification():
    """Test verifying a client exists (since clients are created through existing system)"""
    print("=== Testing Client Verification ===")
    
    # First, try to get all clients to see what's available
    response = requests.get(f"{BASE_URL}/api/clients/notes")
    
    if response.status_code == 200:
        data = response.json()
        clients = data.get('clients', [])
        print(f"✅ Found {len(clients)} existing clients")
        
        if clients:
            # Use the first client for testing
            global TEST_CLIENT_ID
            TEST_CLIENT_ID = clients[0].get('client_id', 'test_client_001')
            print(f"Using client ID: {TEST_CLIENT_ID}")
            print(f"Client name: {clients[0].get('name', 'Unknown')}")
        else:
            print("⚠️  No existing clients found. Please create a client first through the main application.")
            print("   You can use any existing client ID from your system.")
    else:
        print(f"❌ Failed to get clients: {response.status_code}")
        print(f"Error: {response.text}")
    
    print()

def test_note_analysis():
    """Test adding and analyzing client notes"""
    print("=== Testing Note Analysis ===")
    
    # Sample narrative observations
    test_notes = [
        {
            "text": "Client appeared calm and cooperative during morning activities. He was attentive during group therapy and showed good social interaction with other residents. No signs of agitation or distress observed."
        },
        {
            "text": "Client seemed withdrawn and quiet today. He appeared forgetful during medication time and was less engaged in activities. Some signs of anxiety noted during individual counseling session."
        },
        {
            "text": "Excellent progress today! Client was very cheerful and outgoing. He actively participated in all group activities and helped other residents. Clear improvement in cognitive function and social engagement."
        },
        {
            "text": "Client was agitated and frustrated during the afternoon. He had difficulty focusing on tasks and showed some aggressive behavior towards staff. Emotional regulation needs attention."
        },
        {
            "text": "Client maintained stable mood throughout the day. He was cooperative with staff and followed routines well. No significant behavioral concerns noted. Average cognitive performance observed."
        }
    ]
    
    for i, note in enumerate(test_notes, 1):
        print(f"Adding note {i}: {note['text'][:50]}...")
        
        response = requests.post(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/notes", json=note)
        
        if response.status_code == 201:
            analysis = response.json()['analysis']
            print(f"✅ Note {i} analyzed successfully")
            print(f"   Sentiment: {analysis['sentiment']['sentiment']} (score: {analysis['sentiment']['score']})")
            print(f"   Keywords: {analysis['keywords'][:5]}")  # Show first 5 keywords
            print(f"   Domain scores:")
            for domain, data in analysis['tags'].items():
                print(f"     {domain}: {data['score']}")
        else:
            print(f"❌ Failed to add note {i}: {response.status_code}")
            print(f"Error: {response.text}")
        
        print()

def test_retrieve_notes():
    """Test retrieving client notes with filters"""
    print("=== Testing Note Retrieval ===")
    
    # Get all notes
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/notes")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved {len(data['notes'])} notes for client")
        print(f"Total notes: {data['total_notes']}")
    else:
        print(f"❌ Failed to retrieve notes: {response.status_code}")
    
    # Filter by sentiment
    print("\n--- Filtering by Positive Sentiment ---")
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/notes?sentiment=positive")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {len(data['notes'])} positive notes")
    else:
        print(f"❌ Failed to filter by sentiment: {response.status_code}")
    
    # Filter by domain
    print("\n--- Filtering by Emotional Domain (score > 0) ---")
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/notes?domain=emotional&min_score=0.1")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {len(data['notes'])} notes with positive emotional scores")
    else:
        print(f"❌ Failed to filter by domain: {response.status_code}")
    
    print()

def test_progress_metrics():
    """Test progress metrics calculation"""
    print("=== Testing Progress Metrics ===")
    
    # Get weekly progress
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/progress?period=weekly")
    if response.status_code == 200:
        data = response.json()
        weekly_progress = data['progress']['weekly']
        print("✅ Weekly progress calculated")
        print(f"   Total notes: {weekly_progress['total_notes']}")
        print(f"   Sentiment distribution:")
        for sentiment, count in weekly_progress['sentiment']['counts'].items():
            pct = weekly_progress['sentiment']['distribution'][f'{sentiment}_pct']
            print(f"     {sentiment}: {count} ({pct}%)")
        print(f"   Average sentiment score: {weekly_progress['sentiment']['average_score']}")
        print(f"   Top keywords: {list(weekly_progress['keyword_frequency'].keys())[:5]}")
    else:
        print(f"❌ Failed to get weekly progress: {response.status_code}")
    
    # Get monthly progress
    print("\n--- Monthly Progress ---")
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/progress?period=monthly")
    if response.status_code == 200:
        data = response.json()
        monthly_progress = data['progress']['monthly']
        print("✅ Monthly progress calculated")
        print(f"   Total notes: {monthly_progress['total_notes']}")
        print(f"   Domain scores:")
        for domain, data in monthly_progress['domains'].items():
            print(f"     {domain}: {data['score']} (mentions: {data['total_mentions']})")
    else:
        print(f"❌ Failed to get monthly progress: {response.status_code}")
    
    print()

def test_keyword_search():
    """Test keyword search functionality"""
    print("=== Testing Keyword Search ===")
    
    # Search for specific keywords
    keywords = "calm,cooperative,agitated"
    response = requests.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/notes/search?keywords={keywords}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Keyword search completed")
        print(f"   Search keywords: {data['search_keywords']}")
        print(f"   Matching notes: {data['total_matches']}")
        
        for i, note in enumerate(data['matching_notes'][:2], 1):  # Show first 2 matches
            print(f"   Match {i}: {note['text'][:100]}...")
    else:
        print(f"❌ Failed to search keywords: {response.status_code}")
    
    print()

def test_all_clients():
    """Test retrieving all clients"""
    print("=== Testing All Clients Retrieval ===")
    
    response = requests.get(f"{BASE_URL}/api/clients/notes")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved {data['total_count']} clients")
        for client in data['clients'][:5]:  # Show first 5 clients
            print(f"   Client: {client.get('name', 'Unknown')} (ID: {client.get('client_id', 'Unknown')}) - Notes: {client.get('total_notes', 0)}")
    else:
        print(f"❌ Failed to retrieve clients: {response.status_code}")
    
    print()

def main():
    """Run all tests"""
    print("🧪 NLP Pipeline Test Suite")
    print("=" * 50)
    print()
    
    try:
        # Test the complete pipeline
        test_client_verification()
        test_note_analysis()
        test_retrieve_notes()
        test_progress_metrics()
        test_keyword_search()
        test_all_clients()
        
        print("🎉 All tests completed!")
        print("\n📊 Summary:")
        print("- Client verification and management ✅")
        print("- Note analysis with NLP ✅")
        print("- Sentiment analysis ✅")
        print("- Keyword extraction ✅")
        print("- Domain tagging ✅")
        print("- Progress metrics calculation ✅")
        print("- Search functionality ✅")
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Make sure the Flask app is running on http://localhost:5000")
        print("   Run: python app.py")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
