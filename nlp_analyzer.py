"""
NLP Analysis Module for Client Notes
Analyzes narrative observations and extracts structured data
"""

import re
from collections import Counter
from datetime import datetime
import logging

# Try to import NLP libraries, but make them optional
NLTK_AVAILABLE = False
SPACY_AVAILABLE = False
TEXTBLOB_AVAILABLE = False
TRANSFORMERS_AVAILABLE = False
nlp = None
sentiment_pipeline = None
domain_classifier = None

# Enable transformers for domain classification
DISABLE_TRANSFORMERS = False
DISABLE_TEXTBLOB = True

def _init_nltk():
    global NLTK_AVAILABLE
    try:
        import nltk
        NLTK_AVAILABLE = True
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords', quiet=True)
        return True
    except ImportError:
        NLTK_AVAILABLE = False
        return False

def _init_spacy():
    global SPACY_AVAILABLE, nlp
    try:
        import spacy
        SPACY_AVAILABLE = True
        # Load spaCy model (download with: python -m spacy download en_core_web_sm)
        try:
            nlp = spacy.load("en_core_web_sm")
            return True
        except OSError:
            nlp = None
            return False
    except ImportError:
        SPACY_AVAILABLE = False
        nlp = None
        return False

def _init_textblob():
    global TEXTBLOB_AVAILABLE
    if DISABLE_TEXTBLOB:
        TEXTBLOB_AVAILABLE = False
        return False
    try:
        from textblob import TextBlob
        TEXTBLOB_AVAILABLE = True
        return True
    except ImportError:
        TEXTBLOB_AVAILABLE = False
        return False

def _init_transformers():
    global TRANSFORMERS_AVAILABLE, sentiment_pipeline, domain_classifier
    if DISABLE_TRANSFORMERS:
        TRANSFORMERS_AVAILABLE = False
        sentiment_pipeline = None
        domain_classifier = None
        return False
    try:
        from transformers import pipeline
        TRANSFORMERS_AVAILABLE = True
        
        # Initialize sentiment analysis pipeline
        try:
            sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                return_all_scores=True
            )
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to initialize sentiment pipeline: {e}")
            sentiment_pipeline = None
        
        # Initialize zero-shot classification pipeline for domain tagging
        try:
            domain_classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to initialize domain classifier: {e}")
            domain_classifier = None
        
        return True
    except ImportError as e:
        logging.getLogger(__name__).warning(f"Transformers not available: {e}")
        TRANSFORMERS_AVAILABLE = False
        sentiment_pipeline = None
        domain_classifier = None
        return False
    except Exception as e:
        logging.getLogger(__name__).warning(f"Unexpected error initializing transformers: {e}")
        TRANSFORMERS_AVAILABLE = False
        sentiment_pipeline = None
        domain_classifier = None
        return False

# Domain-specific keyword dictionaries
DOMAIN_KEYWORDS = {
    'emotional': {
        'positive': ['calm', 'happy', 'cheerful', 'content', 'peaceful', 'relaxed', 'serene', 'joyful', 'optimistic', 'hopeful'],
        'negative': ['agitated', 'angry', 'frustrated', 'upset', 'distressed', 'anxious', 'worried', 'fearful', 'sad', 'depressed', 'irritable', 'moody'],
        'neutral': ['neutral', 'stable', 'steady', 'composed', 'reserved']
    },
    'cognitive': {
        'positive': ['attentive', 'focused', 'alert', 'engaged', 'responsive', 'clear', 'lucid', 'oriented', 'coherent', 'sharp'],
        'negative': ['forgetful', 'confused', 'disoriented', 'distracted', 'unfocused', 'scattered', 'unclear', 'foggy', 'dazed'],
        'neutral': ['average', 'normal', 'typical', 'standard']
    },
    'social': {
        'positive': ['cooperative', 'friendly', 'sociable', 'outgoing', 'helpful', 'supportive', 'collaborative', 'engaging', 'communicative'],
        'negative': ['withdrawn', 'isolated', 'antisocial', 'uncooperative', 'hostile', 'aggressive', 'defensive', 'distant', 'unresponsive'],
        'neutral': ['reserved', 'quiet', 'private', 'independent']
    }
}

class NLPAnalyzer:
    """Main NLP analysis class for client notes"""
    
    def __init__(self):
        # Basic stop words if NLTK is not available
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
        }
        
        self.logger = logging.getLogger(__name__)
        self._nltk_initialized = False
        self._spacy_initialized = False
        self._textblob_initialized = False
        self._transformers_initialized = False
    
    def _ensure_nltk(self):
        """Lazy initialization of NLTK"""
        if not self._nltk_initialized:
            if _init_nltk():
                try:
                    import nltk
                    self.stop_words = set(nltk.corpus.stopwords.words('english'))
                except:
                    pass  # Use basic stop words if NLTK fails
            self._nltk_initialized = True
    
    def _ensure_spacy(self):
        """Lazy initialization of spaCy"""
        if not self._spacy_initialized:
            _init_spacy()
            self._spacy_initialized = True
    
    def _ensure_textblob(self):
        """Lazy initialization of TextBlob"""
        if not self._textblob_initialized:
            _init_textblob()
            self._textblob_initialized = True
    
    def _ensure_transformers(self):
        """Lazy initialization of Transformers"""
        if not self._transformers_initialized:
            _init_transformers()
            self._transformers_initialized = True
    
    def analyze_note(self, text):
        """
        Main analysis function that processes a narrative note
        
        Args:
            text (str): Raw narrative text
            
        Returns:
            dict: Analysis results with sentiment, keywords, and tags
        """
        if not text or not text.strip():
            return self._empty_analysis()
        
        # Clean and preprocess text
        cleaned_text = self._clean_text(text)
        
        # Perform sentiment analysis
        sentiment_result = self._analyze_sentiment(cleaned_text)
        
        # Extract keywords
        keywords = self._extract_keywords(cleaned_text)
        
        # Tag to domains
        domain_tags = self._tag_domains(cleaned_text, keywords)
        
        return {
            'text': text,
            'sentiment': sentiment_result,
            'keywords': keywords,
            'tags': domain_tags,
            'created_at': datetime.now().isoformat(),
            'analysis_metadata': {
                'text_length': len(text),
                'word_count': len(cleaned_text.split()),
                'analysis_timestamp': datetime.now().isoformat()
            }
        }
    
    def _clean_text(self, text):
        """Clean and preprocess text"""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:-]', '', text)
        
        return text.lower()
    
    def _analyze_sentiment(self, text):
        """
        Analyze sentiment using Transformers, TextBlob, or basic keyword analysis
        
        Returns:
            dict: Sentiment analysis results
        """
        # Try Hugging Face Transformers first
        try:
            self._ensure_transformers()
            
            if TRANSFORMERS_AVAILABLE and sentiment_pipeline:
                try:
                    # Truncate text to 512 tokens to avoid errors
                    # Simple tokenization by splitting on whitespace
                    tokens = text.split()
                    if len(tokens) > 512:
                        truncated_text = ' '.join(tokens[:512])
                    else:
                        truncated_text = text
                    
                    # Get sentiment analysis results
                    results = sentiment_pipeline(truncated_text)
                    
                    # Extract the highest confidence result
                    best_result = max(results[0], key=lambda x: x['score'])
                    
                    # Map to our expected format
                    if best_result['label'] == 'POSITIVE':
                        sentiment = 'positive'
                        score = 1
                        polarity = best_result['score']
                    elif best_result['label'] == 'NEGATIVE':
                        sentiment = 'negative'
                        score = -1
                        polarity = -best_result['score']
                    else:
                        sentiment = 'neutral'
                        score = 0
                        polarity = 0.0
                    
                    return {
                        'sentiment': sentiment,
                        'score': score,
                        'polarity': polarity,
                        'subjectivity': 0.5,  # Transformers doesn't provide subjectivity
                        'confidence': best_result['score']
                    }
                    
                except Exception as e:
                    self.logger.error(f"Transformers sentiment analysis error: {e}")
            else:
                self.logger.warning("Transformers not available, falling back to TextBlob")
        except Exception as e:
            self.logger.warning(f"Failed to initialize transformers: {e}")
        
        # Fallback to TextBlob
        self._ensure_textblob()
        
        if TEXTBLOB_AVAILABLE:
            try:
                from textblob import TextBlob
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                
                # Convert to categorical sentiment
                if polarity > 0.1:
                    sentiment = 'positive'
                    score = 1
                elif polarity < -0.1:
                    sentiment = 'negative'
                    score = -1
                else:
                    sentiment = 'neutral'
                    score = 0
                
                return {
                    'sentiment': sentiment,
                    'score': score,
                    'polarity': polarity,
                    'subjectivity': blob.sentiment.subjectivity
                }
            except Exception as e:
                self.logger.error(f"TextBlob sentiment analysis error: {e}")
        
        # Final fallback to basic keyword-based sentiment analysis
        return self._basic_sentiment_analysis(text)
    
    def _basic_sentiment_analysis(self, text):
        """
        Basic sentiment analysis using keyword matching
        
        Returns:
            dict: Sentiment analysis results
        """
        positive_words = ['good', 'great', 'excellent', 'positive', 'happy', 'calm', 'cooperative', 'attentive', 'focused', 'engaged', 'helpful', 'friendly', 'cheerful', 'content', 'peaceful', 'relaxed', 'serene', 'joyful', 'optimistic', 'hopeful', 'pleased', 'satisfied', 'comfortable', 'stable']
        negative_words = ['bad', 'poor', 'negative', 'sad', 'angry', 'mad', 'agitated', 'frustrated', 'upset', 'distressed', 'anxious', 'worried', 'fearful', 'depressed', 'irritable', 'moody', 'withdrawn', 'isolated', 'uncooperative', 'hostile', 'aggressive', 'defensive', 'distant', 'unresponsive', 'annoyed', 'irritated', 'disappointed', 'concerned']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = 'positive'
            score = 1
            polarity = 0.5
        elif negative_count > positive_count:
            sentiment = 'negative'
            score = -1
            polarity = -0.5
        else:
            sentiment = 'neutral'
            score = 0
            polarity = 0.0
        
        return {
            'sentiment': sentiment,
            'score': score,
            'polarity': polarity,
            'subjectivity': 0.5  # Default subjectivity
        }
    
    def _extract_keywords(self, text):
        """
        Extract important keywords and behaviors from text
        
        Returns:
            list: List of extracted keywords
        """
        try:
            self._ensure_spacy()
            
            # Use spaCy for better keyword extraction if available
            if SPACY_AVAILABLE and nlp:
                doc = nlp(text)
                keywords = []
                
                # Extract nouns, adjectives, and verbs
                for token in doc:
                    if (token.pos_ in ['NOUN', 'ADJ', 'VERB'] and 
                        not token.is_stop and 
                        not token.is_punct and 
                        len(token.text) > 2):
                        keywords.append(token.lemma_.lower())
                
                # Count frequency and return top keywords
                keyword_counts = Counter(keywords)
                return [word for word, count in keyword_counts.most_common(10)]
            
            # Use NLTK if available
            elif NLTK_AVAILABLE:
                self._ensure_nltk()
                import nltk
                words = nltk.word_tokenize(text)
                words = [word for word in words if word.lower() not in self.stop_words and len(word) > 2]
                word_counts = Counter(words)
                return [word for word, count in word_counts.most_common(10)]
            
            else:
                # Basic keyword extraction without external libraries
                return self._basic_keyword_extraction(text)
                
        except Exception as e:
            self.logger.error(f"Keyword extraction error: {e}")
            return self._basic_keyword_extraction(text)
    
    def _basic_keyword_extraction(self, text):
        """
        Basic keyword extraction without external libraries
        
        Returns:
            list: List of extracted keywords
        """
        # Simple word splitting and filtering
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Filter out stop words and common words
        filtered_words = [word for word in words if word not in self.stop_words]
        
        # Count frequency and return top keywords
        word_counts = Counter(filtered_words)
        return [word for word, count in word_counts.most_common(10)]
    
    def _tag_domains(self, text, keywords):
        """
        Tag text to emotional, cognitive, and social domains using BART zero-shot classification
        
        Returns:
            dict: Domain tags with scores
        """
        # Try to use BART zero-shot classification first
        try:
            self._ensure_transformers()
            
            if TRANSFORMERS_AVAILABLE and domain_classifier:
                try:
                    # Define candidate labels for domain classification
                    candidate_labels = ["emotional", "cognitive", "social"]
                    
                    # Run zero-shot classification
                    result = domain_classifier(text, candidate_labels)
                    
                    # Extract scores for each domain
                    domain_scores = {}
                    for i, label in enumerate(result['labels']):
                        score = result['scores'][i]
                        domain_scores[label] = score
                    
                    # Normalize scores so they sum to 1.0
                    total_score = sum(domain_scores.values())
                    if total_score > 0:
                        normalized_scores = {domain: score / total_score for domain, score in domain_scores.items()}
                    else:
                        normalized_scores = {domain: 1.0/3 for domain in candidate_labels}
                    
                    # Convert to the expected format
                    domain_tags = {}
                    for domain in candidate_labels:
                        score = normalized_scores.get(domain, 0.0)
                        
                        # Determine category based on score (for compatibility with existing structure)
                        if score > 0.4:  # High confidence
                            category = 'positive'
                        elif score > 0.2:  # Medium confidence
                            category = 'neutral'
                        else:  # Low confidence
                            category = 'negative'
                        
                        domain_tags[domain] = {
                            'score': round(score, 2),
                            'counts': {
                                'positive': 1 if category == 'positive' else 0,
                                'negative': 1 if category == 'negative' else 0,
                                'neutral': 1 if category == 'neutral' else 0
                            },
                            'total_mentions': 1
                        }
                    
                    return domain_tags
                    
                except Exception as e:
                    self.logger.error(f"BART domain classification error: {e}")
                    self.logger.warning("Falling back to keyword-based domain tagging")
            else:
                self.logger.warning("Transformers not available for domain tagging, using keyword-based approach")
        except Exception as e:
            self.logger.warning(f"Failed to initialize transformers for domain tagging: {e}")
        
        # Fallback to keyword-based domain tagging
        return self._keyword_based_domain_tagging(text)
    
    def _keyword_based_domain_tagging(self, text):
        """
        Fallback domain tagging using keyword dictionaries
        
        Returns:
            dict: Domain tags with scores
        """
        domain_scores = {
            'emotional': {'positive': 0, 'negative': 0, 'neutral': 0},
            'cognitive': {'positive': 0, 'negative': 0, 'neutral': 0},
            'social': {'positive': 0, 'negative': 0, 'neutral': 0}
        }
        
        # Check for domain keywords in text
        text_lower = text.lower()
        
        for domain, categories in DOMAIN_KEYWORDS.items():
            for category, words in categories.items():
                for word in words:
                    if word in text_lower:
                        domain_scores[domain][category] += 1
        
        # Calculate domain scores
        domain_tags = {}
        for domain, categories in domain_scores.items():
            total = sum(categories.values())
            if total > 0:
                # Calculate weighted score (positive=1, neutral=0, negative=-1)
                score = (categories['positive'] - categories['negative']) / total
                domain_tags[domain] = {
                    'score': round(score, 2),
                    'counts': categories,
                    'total_mentions': total
                }
            else:
                domain_tags[domain] = {
                    'score': 0.0,
                    'counts': categories,
                    'total_mentions': 0
                }
        
        return domain_tags
    
    def _empty_analysis(self):
        """Return empty analysis for invalid input"""
        return {
            'text': '',
            'sentiment': {'sentiment': 'neutral', 'score': 0, 'polarity': 0.0, 'subjectivity': 0.0},
            'keywords': [],
            'tags': {
                'emotional': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0},
                'cognitive': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0},
                'social': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0}
            },
            'created_at': datetime.now().isoformat(),
            'analysis_metadata': {
                'text_length': 0,
                'word_count': 0,
                'analysis_timestamp': datetime.now().isoformat()
            }
        }

class ProgressAggregator:
    """Aggregates progress data for dashboard visualization"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_weekly_metrics(self, notes_data):
        """
        Calculate weekly progress metrics
        
        Args:
            notes_data (list): List of note analysis results
            
        Returns:
            dict: Weekly metrics
        """
        if not notes_data:
            return self._empty_metrics()
        
        # Filter notes from last 7 days
        from datetime import datetime, timedelta
        week_ago = datetime.now() - timedelta(days=7)
        
        recent_notes = [
            note for note in notes_data 
            if datetime.fromisoformat(note['created_at'].replace('Z', '+00:00')) > week_ago
        ]
        
        return self._calculate_metrics(recent_notes, 'weekly')
    
    def calculate_monthly_metrics(self, notes_data):
        """
        Calculate monthly progress metrics
        
        Args:
            notes_data (list): List of note analysis results
            
        Returns:
            dict: Monthly metrics
        """
        if not notes_data:
            return self._empty_metrics()
        
        # Filter notes from last 30 days
        from datetime import datetime, timedelta
        month_ago = datetime.now() - timedelta(days=30)
        
        recent_notes = [
            note for note in notes_data 
            if datetime.fromisoformat(note['created_at'].replace('Z', '+00:00')) > month_ago
        ]
        
        return self._calculate_metrics(recent_notes, 'monthly')
    
    def _calculate_metrics(self, notes_data, period):
        """Calculate metrics for a given period"""
        if not notes_data:
            return self._empty_metrics()
        
        # Sentiment analysis
        sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
        sentiment_scores = []
        
        # Domain analysis
        domain_totals = {
            'emotional': {'positive': 0, 'negative': 0, 'neutral': 0},
            'cognitive': {'positive': 0, 'negative': 0, 'neutral': 0},
            'social': {'positive': 0, 'negative': 0, 'neutral': 0}
        }
        
        # Keyword frequency
        all_keywords = []
        
        for note in notes_data:
            # Sentiment
            sentiment = note['sentiment']['sentiment']
            sentiment_counts[sentiment] += 1
            sentiment_scores.append(note['sentiment']['score'])
            
            # Domains
            for domain, data in note['tags'].items():
                for category, count in data['counts'].items():
                    domain_totals[domain][category] += count
            
            # Keywords
            all_keywords.extend(note['keywords'])
        
        # Calculate averages and frequencies
        avg_sentiment_score = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        keyword_frequency = dict(Counter(all_keywords).most_common(10))
        
        # Calculate domain scores
        domain_scores = {}
        for domain, categories in domain_totals.items():
            total = sum(categories.values())
            if total > 0:
                score = (categories['positive'] - categories['negative']) / total
                domain_scores[domain] = {
                    'score': round(score, 2),
                    'counts': categories,
                    'total_mentions': total
                }
            else:
                domain_scores[domain] = {
                    'score': 0.0,
                    'counts': categories,
                    'total_mentions': 0
                }
        
        return {
            'period': period,
            'total_notes': len(notes_data),
            'sentiment': {
                'counts': sentiment_counts,
                'average_score': round(avg_sentiment_score, 2),
                'distribution': {
                    'positive_pct': round(sentiment_counts['positive'] / len(notes_data) * 100, 1),
                    'neutral_pct': round(sentiment_counts['neutral'] / len(notes_data) * 100, 1),
                    'negative_pct': round(sentiment_counts['negative'] / len(notes_data) * 100, 1)
                }
            },
            'domains': domain_scores,
            'keyword_frequency': keyword_frequency,
            'calculated_at': datetime.now().isoformat()
        }
    
    def _empty_metrics(self):
        """Return empty metrics structure"""
        return {
            'period': 'none',
            'total_notes': 0,
            'sentiment': {
                'counts': {'positive': 0, 'neutral': 0, 'negative': 0},
                'average_score': 0.0,
                'distribution': {'positive_pct': 0.0, 'neutral_pct': 0.0, 'negative_pct': 0.0}
            },
            'domains': {
                'emotional': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0},
                'cognitive': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0},
                'social': {'score': 0.0, 'counts': {'positive': 0, 'negative': 0, 'neutral': 0}, 'total_mentions': 0}
            },
            'keyword_frequency': {},
            'calculated_at': datetime.now().isoformat()
        }

# Initialize global analyzer instance
nlp_analyzer = NLPAnalyzer()
progress_aggregator = ProgressAggregator()
