# NLP Pipeline for Client Notes Analysis

This Flask application provides a comprehensive NLP pipeline for analyzing narrative observations about clients and converting them into structured progress data.

## Features

### 🔍 NLP Analysis
- **Sentiment Analysis**: Detects positive, neutral, or negative sentiment with numerical scores
- **Keyword Extraction**: Extracts important behaviors and keywords from narrative text
- **Domain Tagging**: Categorizes observations into emotional, cognitive, and social domains
- **Automatic Processing**: NLP analysis runs automatically when notes are submitted

### 📊 Progress Tracking
- **Weekly/Monthly Metrics**: Aggregated sentiment counts, keyword frequency, and domain scores
- **Dashboard Data**: Structured data ready for visualization
- **Historical Analysis**: Track client progress over time

### 🗄️ Firestore Integration
- **Client Management**: Integrates with existing clients collection
- **Structured Storage**: Organized subcollections for notes and progress data
- **Real-time Updates**: Automatic progress metric calculations

## Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Download spaCy Model**:
   ```bash
   python -m spacy download en_core_web_sm
   ```

3. **Configure Firebase**:
   - Ensure `firebase_config.py` is properly configured
   - Firebase credentials should be set up

## API Endpoints

### Client Management

#### Get All Clients with Notes
```http
GET /api/clients/notes
```

**Note**: Clients are created through the existing client management system. This endpoint retrieves all clients and their note counts.

### Notes Management

#### Add Note with NLP Analysis
```http
POST /clients/{client_id}/notes
Content-Type: application/json

{
    "text": "Client appeared calm and cooperative during morning activities..."
}
```

**Response**:
```json
{
    "message": "Note added and analyzed successfully",
    "client_id": "client_001",
    "analysis": {
        "text": "Client appeared calm and cooperative...",
        "sentiment": {
            "sentiment": "positive",
            "score": 1,
            "polarity": 0.6,
            "subjectivity": 0.8
        },
        "keywords": ["calm", "cooperative", "activities", "morning"],
        "tags": {
            "emotional": {
                "score": 0.5,
                "counts": {"positive": 2, "negative": 0, "neutral": 0},
                "total_mentions": 2
            },
            "cognitive": {
                "score": 0.0,
                "counts": {"positive": 0, "negative": 0, "neutral": 0},
                "total_mentions": 0
            },
            "social": {
                "score": 1.0,
                "counts": {"positive": 1, "negative": 0, "neutral": 0},
                "total_mentions": 1
            }
        },
        "created_at": "2024-01-15T10:30:00",
        "analysis_metadata": {
            "text_length": 85,
            "word_count": 12,
            "analysis_timestamp": "2024-01-15T10:30:00"
        }
    }
}
```

#### Get Client Notes
```http
GET /clients/{client_id}/notes
```

**Query Parameters**:
- `limit`: Maximum number of notes to return
- `sentiment`: Filter by sentiment (positive/neutral/negative)
- `domain`: Filter by domain (emotional/cognitive/social)
- `min_score`: Minimum domain score for filtering

#### Search Notes by Keywords
```http
GET /clients/{client_id}/notes/search?keywords=calm,cooperative,agitated
```

#### Delete Note
```http
DELETE /clients/{client_id}/notes/{note_id}
```

### Progress Metrics

#### Get Progress Metrics
```http
GET /clients/{client_id}/progress?period=weekly
```

**Query Parameters**:
- `period`: Time period (weekly/monthly/both)

**Response**:
```json
{
    "client_id": "client_001",
    "demographics": {
        "name": "John Doe",
        "age": 35,
        "gender": "Male",
        "care_type": "in_house"
    },
    "total_notes": 5,
    "progress": {
        "weekly": {
            "period": "weekly",
            "total_notes": 5,
            "sentiment": {
                "counts": {"positive": 2, "neutral": 1, "negative": 2},
                "average_score": 0.2,
                "distribution": {
                    "positive_pct": 40.0,
                    "neutral_pct": 20.0,
                    "negative_pct": 40.0
                }
            },
            "domains": {
                "emotional": {
                    "score": 0.3,
                    "counts": {"positive": 4, "negative": 2, "neutral": 1},
                    "total_mentions": 7
                },
                "cognitive": {
                    "score": -0.2,
                    "counts": {"positive": 1, "negative": 3, "neutral": 1},
                    "total_mentions": 5
                },
                "social": {
                    "score": 0.6,
                    "counts": {"positive": 3, "negative": 1, "neutral": 1},
                    "total_mentions": 5
                }
            },
            "keyword_frequency": {
                "calm": 3,
                "cooperative": 2,
                "agitated": 2,
                "attentive": 1
            },
            "calculated_at": "2024-01-15T10:30:00"
        }
    }
}
```

## Firestore Schema

### Clients Collection (Existing)
```
clients/{client_id}
├── name, age, gender, care_type (existing fields)
├── total_notes, last_note_date (added by NLP pipeline)
├── created_at, updated_at (existing fields)
└── notes/{note_id} (new subcollection)
    ├── text: string (raw narrative)
    ├── sentiment: {
    │   ├── sentiment: string (positive/neutral/negative)
    │   ├── score: number (-1, 0, 1)
    │   ├── polarity: number (-1 to 1)
    │   └── subjectivity: number (0 to 1)
    ├── keywords: array of strings
    ├── tags: {
    │   ├── emotional: {score, counts, total_mentions}
    │   ├── cognitive: {score, counts, total_mentions}
    │   └── social: {score, counts, total_mentions}
    ├── created_at: timestamp
    └── analysis_metadata: object
```

### Progress Subcollection (New)
```
clients/{client_id}/progress/{period}
├── client_id: string
├── period: string (weekly/monthly)
├── metrics: object (calculated progress data)
├── calculated_at: timestamp
└── updated_at: timestamp
```

## NLP Analysis Details

### Sentiment Analysis
- Uses TextBlob for sentiment analysis
- Converts polarity scores to categorical sentiment:
  - `positive`: polarity > 0.1 (score: 1)
  - `neutral`: -0.1 ≤ polarity ≤ 0.1 (score: 0)
  - `negative`: polarity < -0.1 (score: -1)

### Keyword Extraction
- Uses spaCy for advanced NLP processing
- Extracts nouns, adjectives, and verbs
- Removes stop words and short words
- Returns top 10 most frequent keywords

### Domain Tagging
Predefined keyword dictionaries for three domains:

#### Emotional Domain
- **Positive**: calm, happy, cheerful, content, peaceful, relaxed, serene, joyful, optimistic, hopeful
- **Negative**: agitated, angry, frustrated, upset, distressed, anxious, worried, fearful, sad, depressed, irritable, moody
- **Neutral**: neutral, stable, steady, composed, reserved

#### Cognitive Domain
- **Positive**: attentive, focused, alert, engaged, responsive, clear, lucid, oriented, coherent, sharp
- **Negative**: forgetful, confused, disoriented, distracted, unfocused, scattered, unclear, foggy, dazed
- **Neutral**: average, normal, typical, standard

#### Social Domain
- **Positive**: cooperative, friendly, sociable, outgoing, helpful, supportive, collaborative, engaging, communicative
- **Negative**: withdrawn, isolated, antisocial, uncooperative, hostile, aggressive, defensive, distant, unresponsive
- **Neutral**: reserved, quiet, private, independent

## Testing

Run the test suite to verify functionality:

```bash
python test_nlp_pipeline.py
```

The test script will:
1. Create a test patient
2. Add sample narrative notes
3. Test NLP analysis
4. Verify progress metrics
5. Test search functionality

## Usage Examples

### Adding a Note
```python
import requests

note_data = {
    "text": "Client was very cooperative during therapy session. Showed good emotional regulation and was attentive to instructions."
}

response = requests.post(
    "http://localhost:5000/clients/client_001/notes",
    json=note_data
)

analysis = response.json()['analysis']
print(f"Sentiment: {analysis['sentiment']['sentiment']}")
print(f"Keywords: {analysis['keywords']}")
```

### Getting Progress Metrics
```python
response = requests.get(
    "http://localhost:5000/clients/client_001/progress?period=weekly"
)

progress = response.json()['progress']['weekly']
print(f"Average sentiment: {progress['sentiment']['average_score']}")
print(f"Top keywords: {list(progress['keyword_frequency'].keys())[:5]}")
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (missing/invalid data)
- `404`: Resource not found
- `409`: Conflict (client already exists)
- `500`: Internal server error

Error responses include descriptive error messages:
```json
{
    "error": "Client not found"
}
```

## Performance Considerations

- NLP analysis is performed synchronously for immediate results
- Progress metrics are cached in Firestore for faster retrieval
- Keyword extraction is limited to top 10 results for performance
- Large text inputs are processed efficiently using spaCy

## Future Enhancements

- Batch processing for multiple notes
- Custom domain keyword dictionaries
- Advanced sentiment analysis with machine learning models
- Real-time progress notifications
- Export functionality for reports
- Integration with external healthcare systems
