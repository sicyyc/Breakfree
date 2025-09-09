"""
Firestore Schema and Database Operations for Client Notes NLP Pipeline
"""

from firebase_config import db
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

class FirestoreSchema:
    """Firestore schema definitions and database operations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def get_client_demographics(self, client_id: str) -> Optional[Dict[str, Any]]:
        """
        Get client demographics from existing clients collection
        
        Args:
            client_id (str): Client identifier
            
        Returns:
            dict or None: Client data or None if not found
        """
        try:
            doc = db.collection('clients').document(client_id).get()
            if doc.exists:
                client_data = doc.to_dict()
                client_data['client_id'] = doc.id
                return client_data
            return None
            
        except Exception as e:
            self.logger.error(f"Error retrieving client demographics: {e}")
            return None
    
    def add_note_to_client(self, client_id: str, note_analysis: Dict[str, Any]) -> bool:
        """
        Add a new note with NLP analysis to client's notes subcollection
        
        Args:
            client_id (str): Client identifier
            note_analysis (dict): Complete note analysis from NLP pipeline
            
        Returns:
            bool: Success status
        """
        try:
            # Add note to subcollection
            notes_ref = db.collection('clients').document(client_id).collection('notes')
            note_doc = notes_ref.add(note_analysis)
            
            # Update client document with note count and last note date
            client_ref = db.collection('clients').document(client_id)
            client_ref.update({
                'total_notes': firestore.Increment(1),
                'last_note_date': datetime.now(),
                'updated_at': datetime.now()
            })
            
            self.logger.info(f"Added note to client {client_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding note to client: {e}")
            return False
    
    def get_client_notes(self, client_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all notes for a client with optional limit
        
        Args:
            client_id (str): Client identifier
            limit (int, optional): Maximum number of notes to retrieve
            
        Returns:
            list: List of note documents with analysis
        """
        try:
            notes_ref = db.collection('clients').document(client_id).collection('notes')
            query = notes_ref.order_by('created_at', direction='DESCENDING')
            
            if limit:
                query = query.limit(limit)
            
            notes = []
            for doc in query.stream():
                note_data = doc.to_dict()
                note_data['note_id'] = doc.id
                notes.append(note_data)
            
            return notes
            
        except Exception as e:
            self.logger.error(f"Error retrieving client notes: {e}")
            return []
    
    def update_progress_metrics(self, client_id: str, metrics: Dict[str, Any], period: str) -> bool:
        """
        Update or create progress metrics document for a client
        
        Args:
            client_id (str): Client identifier
            metrics (dict): Calculated progress metrics
            period (str): Time period (weekly/monthly)
            
        Returns:
            bool: Success status
        """
        try:
            progress_data = {
                'client_id': client_id,
                'period': period,
                'metrics': metrics,
                'calculated_at': datetime.now(),
                'updated_at': datetime.now()
            }
            
            # Store in progress subcollection
            progress_ref = db.collection('clients').document(client_id).collection('progress')
            progress_ref.document(period).set(progress_data)
            
            self.logger.info(f"Updated progress metrics for client {client_id}, period: {period}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating progress metrics: {e}")
            return False
    
    def get_progress_metrics(self, client_id: str, period: str) -> Optional[Dict[str, Any]]:
        """
        Get progress metrics for a client and period
        
        Args:
            client_id (str): Client identifier
            period (str): Time period (weekly/monthly)
            
        Returns:
            dict or None: Progress metrics or None if not found
        """
        try:
            doc = db.collection('clients').document(client_id).collection('progress').document(period).get()
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            self.logger.error(f"Error retrieving progress metrics: {e}")
            return None
    
    def get_all_clients(self) -> List[Dict[str, Any]]:
        """
        Get all clients with basic information
        
        Returns:
            list: List of client documents
        """
        try:
            clients = []
            for doc in db.collection('clients').stream():
                client_data = doc.to_dict()
                client_data['client_id'] = doc.id
                clients.append(client_data)
            
            return clients
            
        except Exception as e:
            self.logger.error(f"Error retrieving all clients: {e}")
            return []
    
    def delete_client_note(self, client_id: str, note_id: str) -> bool:
        """
        Delete a specific note from client's notes subcollection
        
        Args:
            client_id (str): Client identifier
            note_id (str): Note document ID
            
        Returns:
            bool: Success status
        """
        try:
            db.collection('clients').document(client_id).collection('notes').document(note_id).delete()
            
            # Update client document note count
            client_ref = db.collection('clients').document(client_id)
            client_ref.update({
                'total_notes': firestore.Increment(-1),
                'updated_at': datetime.now()
            })
            
            self.logger.info(f"Deleted note {note_id} for client {client_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting client note: {e}")
            return False
    
    def search_notes_by_keywords(self, client_id: str, keywords: List[str]) -> List[Dict[str, Any]]:
        """
        Search client notes by keywords
        
        Args:
            client_id (str): Client identifier
            keywords (list): List of keywords to search for
            
        Returns:
            list: List of matching notes
        """
        try:
            notes_ref = db.collection('clients').document(client_id).collection('notes')
            matching_notes = []
            
            for doc in notes_ref.stream():
                note_data = doc.to_dict()
                note_keywords = note_data.get('keywords', [])
                
                # Check if any search keywords match note keywords
                if any(keyword.lower() in [kw.lower() for kw in note_keywords] for keyword in keywords):
                    note_data['note_id'] = doc.id
                    matching_notes.append(note_data)
            
            return matching_notes
            
        except Exception as e:
            self.logger.error(f"Error searching notes by keywords: {e}")
            return []
    
    def get_notes_by_sentiment(self, client_id: str, sentiment: str) -> List[Dict[str, Any]]:
        """
        Get client notes filtered by sentiment
        
        Args:
            client_id (str): Client identifier
            sentiment (str): Sentiment to filter by (positive/neutral/negative)
            
        Returns:
            list: List of notes with specified sentiment
        """
        try:
            notes_ref = db.collection('clients').document(client_id).collection('notes')
            filtered_notes = []
            
            for doc in notes_ref.stream():
                note_data = doc.to_dict()
                note_sentiment = note_data.get('sentiment', {}).get('sentiment', 'neutral')
                
                if note_sentiment == sentiment:
                    note_data['note_id'] = doc.id
                    filtered_notes.append(note_data)
            
            return filtered_notes
            
        except Exception as e:
            self.logger.error(f"Error filtering notes by sentiment: {e}")
            return []
    
    def get_notes_by_domain(self, client_id: str, domain: str, min_score: float = 0.0) -> List[Dict[str, Any]]:
        """
        Get client notes filtered by domain score
        
        Args:
            client_id (str): Client identifier
            domain (str): Domain to filter by (emotional/cognitive/social)
            min_score (float): Minimum domain score threshold
            
        Returns:
            list: List of notes meeting domain criteria
        """
        try:
            notes_ref = db.collection('clients').document(client_id).collection('notes')
            filtered_notes = []
            
            for doc in notes_ref.stream():
                note_data = doc.to_dict()
                domain_data = note_data.get('tags', {}).get(domain, {})
                domain_score = domain_data.get('score', 0.0)
                
                if domain_score >= min_score:
                    note_data['note_id'] = doc.id
                    filtered_notes.append(note_data)
            
            return filtered_notes
            
        except Exception as e:
            self.logger.error(f"Error filtering notes by domain: {e}")
            return []

# Initialize global schema instance
firestore_schema = FirestoreSchema()
