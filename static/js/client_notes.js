/**
 * Client Notes with NLP Analysis
 * Handles note creation, display, and NLP analysis integration
 */

class ClientNotesManager {
    constructor(clientId) {
        this.clientId = clientId;
        this.notes = [];
        this.isSubmitting = false; // Flag to prevent duplicate submissions
        this.currentFilters = {
            sentiment: '',
            domain: '',
            keyword: ''
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes();
        this.loadNLPSummary();
        
        // Also set up event listeners when notes tab becomes active
        this.setupTabActivationListener();
    }

    setupEventListeners() {
        // Add Note Button
        const addNoteBtn = document.getElementById('addNoteBtn');
        console.log('Add Note Button found:', addNoteBtn);
        if (addNoteBtn) {
            // Remove any existing listeners to prevent duplicates
            addNoteBtn.removeEventListener('click', this.showAddNoteModal);
            addNoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Add Note button clicked!');
                this.showAddNoteModal();
            });
        } else {
            console.error('Add Note Button not found!');
        }

        // Modal controls
        const closeModal = document.getElementById('closeNoteModal');
        const cancelBtn = document.getElementById('cancelNoteBtn');
        if (closeModal) {
            closeModal.removeEventListener('click', this.hideAddNoteModal);
            closeModal.addEventListener('click', () => this.hideAddNoteModal());
        }
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', this.hideAddNoteModal);
            cancelBtn.addEventListener('click', () => this.hideAddNoteModal());
        }

        // Form submission
        const addNoteForm = document.getElementById('addNoteForm');
        if (addNoteForm) {
            addNoteForm.removeEventListener('submit', this.handleAddNote);
            addNoteForm.addEventListener('submit', (e) => this.handleAddNote(e));
        }

        // Filters
        const sentimentFilter = document.getElementById('sentimentFilter');
        const domainFilter = document.getElementById('domainFilter');
        const keywordSearch = document.getElementById('keywordSearch');

        if (sentimentFilter) {
            sentimentFilter.addEventListener('change', (e) => {
                this.currentFilters.sentiment = e.target.value;
                this.applyFilters();
            });
        }

        if (domainFilter) {
            domainFilter.addEventListener('change', (e) => {
                this.currentFilters.domain = e.target.value;
                this.applyFilters();
            });
        }

        if (keywordSearch) {
            keywordSearch.addEventListener('input', (e) => {
                this.currentFilters.keyword = e.target.value;
                this.applyFilters();
            });
        }

        // Close modal when clicking outside
        const modal = document.getElementById('addNoteModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddNoteModal();
                }
            });
        }
    }

    setupTabActivationListener() {
        // Listen for tab changes to re-setup event listeners if needed
        const notesTab = document.querySelector('[data-tab="notes"]');
        if (notesTab) {
            notesTab.addEventListener('click', () => {
                // Small delay to ensure tab content is visible
                setTimeout(() => {
                    this.setupEventListeners();
                }, 100);
            });
        }
    }

    async loadNotes() {
        const notesList = document.getElementById('notesList');
        const noNotesMessage = document.getElementById('noNotesMessage');
        const loadingMessage = document.getElementById('notesLoading');

        if (loadingMessage) loadingMessage.style.display = 'block';
        if (notesList) notesList.innerHTML = '';
        if (noNotesMessage) noNotesMessage.style.display = 'none';

        try {
            const response = await fetch(`/clients/${this.clientId}/notes`);
            const data = await response.json();

            if (response.ok) {
                this.notes = data.notes || [];
                this.displayNotes(this.notes);
            } else {
                console.error('Error loading notes:', data.error);
                this.showError('Failed to load notes');
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showError('Failed to load notes');
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    async loadNLPSummary() {
        const nlpSummary = document.getElementById('nlpSummary');
        if (!nlpSummary) return;

        try {
            const response = await fetch(`/api/client-progress/${this.clientId}/analytics`);
            const data = await response.json();

            if (response.ok && data.success && data.data) {
                this.displayNLPSummary(data.data);
            } else {
                nlpSummary.innerHTML = '<p>No analysis data available yet.</p>';
            }
        } catch (error) {
            console.error('Error loading NLP summary:', error);
            nlpSummary.innerHTML = '<p>Error loading analysis data.</p>';
        }
    }

    displayNotes(notes) {
        const notesList = document.getElementById('notesList');
        const noNotesMessage = document.getElementById('noNotesMessage');

        if (!notesList) return;

        if (notes.length === 0) {
            notesList.innerHTML = '';
            if (noNotesMessage) noNotesMessage.style.display = 'block';
            return;
        }

        if (noNotesMessage) noNotesMessage.style.display = 'none';

        notesList.innerHTML = notes.map(note => this.createNoteElement(note)).join('');
    }

    createNoteElement(note) {
        const date = new Date(note.created_at).toLocaleString();
        const sentiment = note.sentiment || {};
        const tags = note.tags || {};
        const keywords = note.keywords || [];

        // Get sentiment color
        const sentimentColor = this.getSentimentColor(sentiment.sentiment);
        
        // Get domain scores
        const domainScores = this.getDomainScores(tags);

        return `
            <div class="note-item" data-note-id="${note.note_id}">
                <div class="note-header">
                    <div class="note-meta">
                        <span class="note-date">${date}</span>
                        <span class="note-author">${note.author || 'Staff Member'}</span>
                    </div>
                    <div class="note-sentiment">
                        <span class="sentiment-badge sentiment-${sentiment.sentiment}" style="background-color: ${sentimentColor}">
                            <i class="fas fa-${this.getSentimentIcon(sentiment.sentiment)}"></i>
                            ${sentiment.sentiment || 'neutral'}
                        </span>
                    </div>
                </div>
                <p class="note-content">${note.text}</p>
                
                <!-- NLP Analysis Results -->
                <div class="nlp-analysis">
                    <div class="analysis-section">
                        <h4><i class="fas fa-tags"></i> Keywords</h4>
                        <div class="keywords">
                            ${keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="analysis-section">
                        <h4><i class="fas fa-chart-bar"></i> Domain Analysis</h4>
                        <div class="domain-scores">
                            ${Object.entries(domainScores).map(([domain, score]) => `
                                <div class="domain-score">
                                    <span class="domain-name">${domain}</span>
                                    <div class="score-bar">
                                        <div class="score-fill" style="width: ${Math.abs(score) * 100}%; background-color: ${score >= 0 ? '#4CAF50' : '#f44336'}"></div>
                                    </div>
                                    <span class="score-value">${score.toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    displayNLPSummary(progressData) {
        const nlpSummary = document.getElementById('nlpSummary');
        if (!nlpSummary) return;

        console.log('Progress data received:', progressData);

        // Extract data from the analytics response
        const sentimentTrend = progressData.sentiment_trend || {};
        const sentimentCounts = progressData.sentiment_counts || {};
        const domainBreakdown = progressData.domain_breakdown || {};
        const topKeywords = progressData.top_keywords || [];
        
        // Use individual sentiment counts from backend
        const counts = sentimentCounts.counts || {};
        const positiveCount = counts.positive || 0;
        const neutralCount = counts.neutral || 0;
        const negativeCount = counts.negative || 0;
        const totalNotes = sentimentCounts.total_notes || 0;
        const averageSentiment = sentimentCounts.average_sentiment || 0;

        nlpSummary.innerHTML = `
            <div class="summary-section">
                <h4><i class="fas fa-heart"></i> Sentiment Overview</h4>
                <div class="sentiment-overview">
                    <div class="sentiment-item">
                        <span class="sentiment-label positive">Positive</span>
                        <span class="sentiment-count">${positiveCount}</span>
                        <span class="sentiment-percentage">(${totalNotes > 0 ? Math.round((positiveCount / totalNotes) * 100) : 0}%)</span>
                    </div>
                    <div class="sentiment-item">
                        <span class="sentiment-label neutral">Neutral</span>
                        <span class="sentiment-count">${neutralCount}</span>
                        <span class="sentiment-percentage">(${totalNotes > 0 ? Math.round((neutralCount / totalNotes) * 100) : 0}%)</span>
                    </div>
                    <div class="sentiment-item">
                        <span class="sentiment-label negative">Negative</span>
                        <span class="sentiment-count">${negativeCount}</span>
                        <span class="sentiment-percentage">(${totalNotes > 0 ? Math.round((negativeCount / totalNotes) * 100) : 0}%)</span>
                    </div>
                </div>
                <div class="average-sentiment">
                    <strong>Average Score: ${averageSentiment.toFixed(2)}</strong>
                </div>
            </div>

            <div class="summary-section">
                <h4><i class="fas fa-chart-line"></i> Domain Analysis</h4>
                <div class="domain-trends">
                    ${Object.entries(domainBreakdown).map(([domain, data]) => `
                        <div class="domain-trend">
                            <span class="domain-name">${domain.charAt(0).toUpperCase() + domain.slice(1)}</span>
                            <div class="trend-bar">
                                <div class="trend-fill" style="width: ${Math.abs(data.average_score || 0) * 100}%; background-color: ${(data.average_score || 0) >= 0 ? '#4CAF50' : '#f44336'}"></div>
                            </div>
                            <span class="trend-score">${(data.average_score || 0).toFixed(2)}</span>
                            <span class="trend-mentions">(${data.mentions || 0} mentions)</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="summary-section">
                <h4><i class="fas fa-search"></i> Top Keywords</h4>
                <div class="top-keywords">
                    ${topKeywords.slice(0, 5).map(keyword => `
                        <span class="keyword-item">
                            <span class="keyword-text">${keyword.keyword}</span>
                            <span class="keyword-count">${keyword.count}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showAddNoteModal() {
        console.log('showAddNoteModal called');
        const modal = document.getElementById('addNoteModal');
        console.log('Modal element found:', modal);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('Modal should be visible now');
            
            // Set up real-time analysis
            this.setupRealTimeAnalysis();
            
            // Focus on the first input
            const noteText = document.getElementById('noteText');
            if (noteText) {
                setTimeout(() => noteText.focus(), 100);
            }
        } else {
            console.error('Modal element not found!');
        }
    }

    hideAddNoteModal() {
        const modal = document.getElementById('addNoteModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.resetAddNoteForm();
        }
    }

    resetAddNoteForm() {
        const form = document.getElementById('addNoteForm');
        if (form) {
            form.reset();
        }
        
        // Reset character count
        const charCount = document.getElementById('charCount');
        if (charCount) {
            charCount.textContent = '0';
        }
        
        // Hide NLP preview
        const nlpPreview = document.getElementById('nlpPreview');
        if (nlpPreview) {
            nlpPreview.style.display = 'none';
        }
    }

    async handleAddNote(e) {
        e.preventDefault();
        console.log('handleAddNote called');

        // Prevent multiple submissions
        if (this.isSubmitting) {
            console.log('Already submitting, ignoring duplicate request');
            return;
        }

        const noteText = document.getElementById('noteText').value.trim();

        console.log('Note text:', noteText);

        if (!noteText) {
            this.showError('Please enter note content');
            return;
        }

        // Set submitting flag
        this.isSubmitting = true;

        const saveBtn = document.getElementById('saveNoteBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        saveBtn.disabled = true;

        try {
            console.log('Sending note to server...');
            const response = await fetch(`/clients/${this.clientId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: noteText
                })
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok) {
                this.hideAddNoteModal();
                this.loadNotes();
                this.loadNLPSummary();
                this.showSuccess('Note added successfully with NLP analysis!');
            } else {
                this.showError(data.error || 'Failed to add note');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            this.showError('Failed to add note');
        } finally {
            // Reset submitting flag and button state
            this.isSubmitting = false;
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    applyFilters() {
        let filteredNotes = [...this.notes];

        // Apply sentiment filter
        if (this.currentFilters.sentiment) {
            filteredNotes = filteredNotes.filter(note => 
                note.sentiment?.sentiment === this.currentFilters.sentiment
            );
        }

        // Apply domain filter
        if (this.currentFilters.domain) {
            filteredNotes = filteredNotes.filter(note => {
                const domainData = note.tags?.[this.currentFilters.domain];
                return domainData && domainData.score > 0;
            });
        }

        // Apply keyword filter
        if (this.currentFilters.keyword) {
            const keyword = this.currentFilters.keyword.toLowerCase();
            filteredNotes = filteredNotes.filter(note => 
                note.text.toLowerCase().includes(keyword) ||
                (note.keywords || []).some(k => k.toLowerCase().includes(keyword))
            );
        }

        this.displayNotes(filteredNotes);
    }

    getSentimentColor(sentiment) {
        switch (sentiment) {
            case 'positive': return '#4CAF50';
            case 'negative': return '#f44336';
            default: return '#9E9E9E';
        }
    }

    getSentimentIcon(sentiment) {
        switch (sentiment) {
            case 'positive': return 'smile';
            case 'negative': return 'frown';
            default: return 'meh';
        }
    }

    getDomainScores(tags) {
        const scores = {};
        Object.entries(tags).forEach(([domain, data]) => {
            scores[domain] = data.score || 0;
        });
        return scores;
    }

    showSuccess(message) {
        // You can implement a toast notification here
        console.log('Success:', message);
        alert(message); // Simple alert for now
    }

    showError(message) {
        // You can implement a toast notification here
        console.error('Error:', message);
        alert('Error: ' + message); // Simple alert for now
    }

    setupRealTimeAnalysis() {
        const noteText = document.getElementById('noteText');
        const charCount = document.getElementById('charCount');
        const nlpPreview = document.getElementById('nlpPreview');
        
        if (!noteText || !charCount || !nlpPreview) return;
        
        // Remove existing listeners to prevent duplicates
        noteText.removeEventListener('input', this.handleTextInput);
        noteText.removeEventListener('keyup', this.handleTextInput);
        
        // Add new listeners
        noteText.addEventListener('input', (e) => this.handleTextInput(e));
        noteText.addEventListener('keyup', (e) => this.handleTextInput(e));
    }
    
    handleTextInput(event) {
        const noteText = event.target;
        const charCount = document.getElementById('charCount');
        const nlpPreview = document.getElementById('nlpPreview');
        
        if (!charCount || !nlpPreview) return;
        
        const count = noteText.value.length;
        charCount.textContent = count;
        
        // Show preview if text is long enough
        if (count > 10) {
            nlpPreview.style.display = 'block';
            this.analyzeTextRealTime(noteText.value);
        } else {
            nlpPreview.style.display = 'none';
        }
    }
    
    analyzeTextRealTime(text) {
        // Clear previous timeout
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
        
        // Debounce the analysis
        this.analysisTimeout = setTimeout(async () => {
            try {
                const response = await fetch('/analyze-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                });
                
                if (response.ok) {
                    const analysis = await response.json();
                    this.updatePreviewWithAnalysis(analysis);
                } else {
                    this.updatePreviewError(`Analysis failed (${response.status})`);
                }
            } catch (error) {
                console.error('Real-time analysis error:', error);
                this.updatePreviewError('Network error: ' + error.message);
            }
        }, 1000); // Wait 1 second after user stops typing
    }
    
    updatePreviewWithAnalysis(analysis) {
        // Update sentiment
        const sentiment = analysis.sentiment || {};
        const sentimentPreview = document.getElementById('sentimentPreview');
        if (sentimentPreview) {
            sentimentPreview.innerHTML = `
                <span class="sentiment-badge sentiment-${sentiment.sentiment || 'neutral'}">
                    <i class="fas fa-${this.getSentimentIcon(sentiment.sentiment)}"></i>
                    ${sentiment.sentiment || 'neutral'}
                    ${sentiment.score ? ` (${sentiment.score.toFixed(2)})` : ''}
                </span>
            `;
        }
        
        // Update keywords
        const keywords = analysis.keywords || [];
        const keywordsPreview = document.getElementById('keywordsPreview');
        if (keywordsPreview) {
            if (keywords.length > 0) {
                keywordsPreview.innerHTML = keywords.map(keyword => 
                    `<span class="keyword-tag">${keyword}</span>`
                ).join('');
            } else {
                keywordsPreview.innerHTML = '<span class="no-data">No keywords detected</span>';
            }
        }
        
        // Update domains
        const tags = analysis.tags || {};
        const domainsPreview = document.getElementById('domainsPreview');
        if (domainsPreview) {
            domainsPreview.innerHTML = this.getDomainAnalysisPreviewHTML(tags);
        }
    }
    
    updatePreviewError(message) {
        const sentimentPreview = document.getElementById('sentimentPreview');
        const keywordsPreview = document.getElementById('keywordsPreview');
        const domainsPreview = document.getElementById('domainsPreview');
        
        if (sentimentPreview) sentimentPreview.innerHTML = `<span class="error">${message}</span>`;
        if (keywordsPreview) keywordsPreview.innerHTML = `<span class="error">${message}</span>`;
        if (domainsPreview) domainsPreview.innerHTML = `<span class="error">${message}</span>`;
    }
    
    getDomainAnalysisPreviewHTML(tags) {
        const domainLabels = {
            'emotional': 'Emotional',
            'cognitive': 'Cognitive', 
            'social': 'Social'
        };
        
        const domainIcons = {
            'emotional': 'fas fa-heart',
            'cognitive': 'fas fa-brain',
            'social': 'fas fa-users'
        };
        
        const domains = ['emotional', 'cognitive', 'social'];
        
        return domains.map(domain => {
            const data = tags[domain] || { score: 0, counts: { positive: 0, negative: 0, neutral: 0 }, total_mentions: 0 };
            const score = data.score || 0;
            const totalMentions = data.total_mentions || 0;
            
            const barWidth = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
            
            let barColor = '#e0e0e0';
            if (score > 0.1) barColor = '#4CAF50';
            else if (score < -0.1) barColor = '#f44336';
            else if (totalMentions > 0) barColor = '#ff9800';
            
            return `
                <div class="domain-preview-item">
                    <div class="domain-preview-header">
                        <i class="${domainIcons[domain]}"></i>
                        <span class="domain-preview-name">${domainLabels[domain]}</span>
                        <span class="domain-preview-mentions">${totalMentions}</span>
                    </div>
                    <div class="domain-score-preview">
                        <div class="score-bar-preview">
                            <div class="score-fill-preview" style="width: ${barWidth}%; background-color: ${barColor}"></div>
                        </div>
                        <span class="score-value-preview">${score.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get client ID from multiple sources
    let clientId = null;
    
    // Try to get from main header data attribute first
    const mainHeader = document.querySelector('.main-header');
    if (mainHeader) {
        clientId = mainHeader.getAttribute('data-client-id');
    }
    
    // If not found, try to extract from URL
    if (!clientId) {
        if (window.location.pathname.includes('/client/')) {
            const pathParts = window.location.pathname.split('/');
            const clientIndex = pathParts.indexOf('client');
            if (clientIndex !== -1 && pathParts[clientIndex + 1]) {
                clientId = pathParts[clientIndex + 1];
                // Remove any hash fragments
                if (clientId && clientId.includes('#')) {
                    clientId = clientId.split('#')[0];
                }
            }
        }
    }
    
    console.log('Client ID extracted in client_notes.js:', clientId);
    
    if (clientId && clientId !== 'clients' && clientId !== '') {
        window.clientNotesManager = new ClientNotesManager(clientId);
        console.log('ClientNotesManager initialized for client:', clientId);
    } else {
        console.log('No valid client ID found, skipping ClientNotesManager initialization');
        
        // Add fallback event listeners for when ClientNotesManager isn't initialized
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Fallback Add Note button clicked!');
                const modal = document.getElementById('addNoteModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    console.log('Modal shown via fallback listener');
                } else {
                    console.error('Modal not found in fallback listener');
                }
            });
        }
        
        // Add fallback for modal close buttons
        const closeModal = document.getElementById('closeNoteModal');
        const cancelBtn = document.getElementById('cancelNoteBtn');
        
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                const modal = document.getElementById('addNoteModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    document.body.style.overflow = 'auto';
                }
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const modal = document.getElementById('addNoteModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    document.body.style.overflow = 'auto';
                }
            });
        }
        
        // Add fallback for form submission
        const addNoteForm = document.getElementById('addNoteForm');
        if (addNoteForm) {
            let isSubmitting = false; // Flag to prevent duplicate submissions
            addNoteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Fallback form submission');
                
                // Prevent multiple submissions
                if (isSubmitting) {
                    console.log('Already submitting, ignoring duplicate request');
                    return;
                }
                
                const noteText = document.getElementById('noteText').value.trim();
                
                if (!noteText) {
                    alert('Please enter note content');
                    return;
                }
                
                // Set submitting flag
                isSubmitting = true;
                
                const saveBtn = document.getElementById('saveNoteBtn');
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                saveBtn.disabled = true;
                
                try {
                    const response = await fetch(`/clients/${clientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: noteText })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        const modal = document.getElementById('addNoteModal');
                        if (modal) {
                            modal.style.display = 'none';
                            modal.classList.remove('show');
                            document.body.style.overflow = 'auto';
                        }
                        addNoteForm.reset();
                        alert('Note added successfully!');
                        location.reload(); // Simple reload to refresh notes
                    } else {
                        alert('Error: ' + (data.error || 'Failed to add note'));
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Failed to add note');
                } finally {
                    // Reset submitting flag and button state
                    isSubmitting = false;
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                }
            });
        }
    }
});

// Duplicate event listener removed - initialization is handled above
