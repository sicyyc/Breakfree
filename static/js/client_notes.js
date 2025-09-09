/**
 * Client Notes with NLP Analysis
 * Handles note creation, display, and NLP analysis integration
 */

class ClientNotesManager {
    constructor(clientId) {
        this.clientId = clientId;
        this.notes = [];
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
            const response = await fetch(`/clients/${this.clientId}/progress?period=weekly`);
            const data = await response.json();

            if (response.ok && data.progress && data.progress.weekly) {
                this.displayNLPSummary(data.progress.weekly);
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

        const sentiment = progressData.sentiment || {};
        const domains = progressData.domains || {};
        const keywords = progressData.keyword_frequency || {};

        nlpSummary.innerHTML = `
            <div class="summary-section">
                <h4><i class="fas fa-heart"></i> Sentiment Overview</h4>
                <div class="sentiment-overview">
                    <div class="sentiment-item">
                        <span class="sentiment-label positive">Positive</span>
                        <span class="sentiment-count">${sentiment.counts?.positive || 0}</span>
                        <span class="sentiment-percentage">(${sentiment.distribution?.positive_pct || 0}%)</span>
                    </div>
                    <div class="sentiment-item">
                        <span class="sentiment-label neutral">Neutral</span>
                        <span class="sentiment-count">${sentiment.counts?.neutral || 0}</span>
                        <span class="sentiment-percentage">(${sentiment.distribution?.neutral_pct || 0}%)</span>
                    </div>
                    <div class="sentiment-item">
                        <span class="sentiment-label negative">Negative</span>
                        <span class="sentiment-count">${sentiment.counts?.negative || 0}</span>
                        <span class="sentiment-percentage">(${sentiment.distribution?.negative_pct || 0}%)</span>
                    </div>
                </div>
                <div class="average-sentiment">
                    <strong>Average Score: ${sentiment.average_score || 0}</strong>
                </div>
            </div>

            <div class="summary-section">
                <h4><i class="fas fa-chart-line"></i> Domain Trends</h4>
                <div class="domain-trends">
                    ${Object.entries(domains).map(([domain, data]) => `
                        <div class="domain-trend">
                            <span class="domain-name">${domain}</span>
                            <div class="trend-bar">
                                <div class="trend-fill" style="width: ${Math.abs(data.score) * 100}%; background-color: ${data.score >= 0 ? '#4CAF50' : '#f44336'}"></div>
                            </div>
                            <span class="trend-score">${data.score.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="summary-section">
                <h4><i class="fas fa-search"></i> Top Keywords</h4>
                <div class="top-keywords">
                    ${Object.entries(keywords).slice(0, 5).map(([keyword, count]) => `
                        <span class="keyword-item">
                            <span class="keyword-text">${keyword}</span>
                            <span class="keyword-count">${count}</span>
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
    }

    async handleAddNote(e) {
        e.preventDefault();
        console.log('handleAddNote called');

        const noteText = document.getElementById('noteText').value.trim();
        const noteAuthor = document.getElementById('noteAuthor').value.trim();

        console.log('Note text:', noteText);
        console.log('Note author:', noteAuthor);

        if (!noteText) {
            this.showError('Please enter note content');
            return;
        }

        if (!noteAuthor) {
            this.showError('Please enter your name');
            return;
        }

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
                    text: noteText,
                    author: noteAuthor
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get client ID from the current page
    let clientId = window.location.pathname.split('/').pop();
    
    // If we're on a client profile page, extract the client ID properly
    if (window.location.pathname.includes('/client/')) {
        const pathParts = window.location.pathname.split('/');
        const clientIndex = pathParts.indexOf('client');
        if (clientIndex !== -1 && pathParts[clientIndex + 1]) {
            clientId = pathParts[clientIndex + 1];
        }
    }
    
    // Also handle the case where URL might have hash fragments
    if (clientId && clientId.includes('#')) {
        clientId = clientId.split('#')[0];
    }
    
    // Also try to get it from the data attribute on the main header
    if (!clientId || clientId === 'clients') {
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader) {
            clientId = mainHeader.getAttribute('data-client-id');
        }
    }
    
    console.log('Client ID extracted:', clientId);
    
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
            addNoteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Fallback form submission');
                
                const noteText = document.getElementById('noteText').value.trim();
                const noteAuthor = document.getElementById('noteAuthor').value.trim();
                
                if (!noteText || !noteAuthor) {
                    alert('Please fill in all fields');
                    return;
                }
                
                const saveBtn = document.getElementById('saveNoteBtn');
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                saveBtn.disabled = true;
                
                try {
                    const response = await fetch(`/clients/${clientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: noteText, author: noteAuthor })
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
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                }
            });
        }
    }
});
