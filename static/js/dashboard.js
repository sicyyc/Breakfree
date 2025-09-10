document.addEventListener('DOMContentLoaded', function() {
    // Tab Functionality
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(tabId) {
        // Hide all tabs
        tabContents.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        }
        
        // Update sidebar navigation
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Initialize charts if needed
        if (tabId === 'dashboard') {
            initializeCharts();
        } else if (tabId === 'client-profile') {
            initClientProgressChart();
        }
    }

    // Handle sidebar navigation
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Handle profile view button click
    document.querySelectorAll('.action-btn[title="View Profile"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('client-profile');
        });
    });

    // Back button click handler
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            switchTab('clients');
        });
    }

    // Initialize Analytics Charts
    function initializeCharts() {
        // Get analytics data from global variable
        const analyticsData = window.analyticsData || getDefaultAnalyticsData();
        
        // Initialize Sentiment Trend Chart
        initializeSentimentChart(analyticsData.sentiment_trend);
        
        // Initialize Domain Scores Chart
        initializeDomainScoresChart(analyticsData.domain_scores);
        
        // Initialize Word Cloud
        initializeWordCloud(analyticsData.top_behaviors);
        
        // Update Summary Stats
        updateSummaryStats(analyticsData.summary_stats);
        
        // Keep existing doughnut chart for task distribution
        initializeTaskDistributionChart();
    }
    
    function initializeSentimentChart(sentimentData) {
        const sentimentCtx = document.getElementById('sentimentChart');
        if (!sentimentCtx) return;

        new Chart(sentimentCtx, {
            type: 'line',
            data: {
                labels: sentimentData.labels,
                datasets: [{
                    label: 'Sentiment Score',
                    data: sentimentData.data,
                    borderColor: '#4682A9',
                    backgroundColor: 'rgba(70, 130, 169, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4682A9',
                    pointBorderColor: '#4682A9',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Sentiment: ${context.parsed.y}/10`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function initializeDomainScoresChart(domainData) {
        const domainCtx = document.getElementById('domainScoresChart');
        if (!domainCtx) return;

        const labels = Object.keys(domainData).map(key => 
            key.charAt(0).toUpperCase() + key.slice(1)
        );
        const data = Object.values(domainData);

        new Chart(domainCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Score',
                    data: data,
                    backgroundColor: [
                        'rgba(70, 130, 169, 0.8)',
                        'rgba(145, 200, 228, 0.8)',
                        'rgba(75, 0, 130, 0.8)'
                    ],
                    borderColor: [
                        '#4682A9',
                        '#91C8E4',
                        '#4B0082'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Score: ${context.parsed.y}/10`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function initializeWordCloud(behaviors) {
        const wordCloudContainer = document.getElementById('wordCloud');
        if (!wordCloudContainer) return;
        
        // Clear existing content
        wordCloudContainer.innerHTML = '';
        
        // Create word cloud items
        behaviors.forEach(behavior => {
            const wordElement = document.createElement('span');
            wordElement.className = 'word-cloud-item';
            wordElement.textContent = behavior.text;
            wordElement.style.fontSize = `${Math.max(12, Math.min(24, behavior.count * 0.5))}px`;
            wordElement.title = `Mentioned ${behavior.count} times`;
            wordCloudContainer.appendChild(wordElement);
        });
    }
    
    function updateSummaryStats(summaryStats) {
        // Update improvement percentage
        const improvementEl = document.getElementById('improvementPercentage');
        if (improvementEl) {
            improvementEl.textContent = `${summaryStats.improvement_percentage}%`;
        }
        
        // Update average sentiment
        const sentimentEl = document.getElementById('avgSentimentScore');
        if (sentimentEl) {
            sentimentEl.textContent = summaryStats.avg_sentiment;
        }
        
        // Update total notes
        const notesEl = document.getElementById('totalNotes');
        if (notesEl) {
            notesEl.textContent = summaryStats.total_notes.toLocaleString();
        }
    }
    
    function initializeTaskDistributionChart() {
        const doughnutCtx = document.getElementById('doughnutChart');
        if (!doughnutCtx) return;

        new Chart(doughnutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending'],
                datasets: [{
                    data: [89, 8, 3],
                    backgroundColor: [
                        '#4682A9',
                        '#91C8E4',
                        '#e0e0e0'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
    
    function getDefaultAnalyticsData() {
        return {
            sentiment_trend: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                data: [6.2, 6.8, 7.1, 6.9, 7.3, 7.0, 6.7]
            },
            domain_scores: {
                emotional: 7.2,
                cognitive: 6.8,
                social: 7.5
            },
            top_behaviors: [
                {text: 'positive attitude', count: 45},
                {text: 'active participation', count: 38},
                {text: 'improved communication', count: 32},
                {text: 'better focus', count: 28},
                {text: 'increased confidence', count: 25}
            ],
            summary_stats: {
                improvement_percentage: 65.0,
                avg_sentiment: 7.2,
                total_notes: 1247
            }
        };
    }

    // Initialize charts on page load
    initializeCharts();

    // Handle logout
    const logoutBtn = document.querySelector('.sidebar-footer .nav-item');
    logoutBtn.addEventListener('click', function() {
        window.location.href = '/';
    });

    // Handle search
    const searchInput = document.querySelector('.search-container input');
    searchInput.addEventListener('input', function(e) {
        // Implement search functionality here
        console.log('Searching for:', e.target.value);
    });

    // Handle create sample data button
    const createSampleBtn = document.getElementById('createSampleNotes');
    if (createSampleBtn) {
        createSampleBtn.addEventListener('click', function() {
            if (confirm('This will create sample notes for all clients to test the analytics. Continue?')) {
                fetch('/create-sample-notes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`Success! Created ${data.notes_created} sample notes. Refresh the page to see updated analytics.`);
                        // Refresh the page to show updated data
                        window.location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error creating sample data');
                });
            }
        });
    }

    // Handle quick action buttons
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.querySelector('span').textContent;
            console.log('Quick action clicked:', action);
            // Implement quick action functionality here
        });
    });

    // Client Table Search
    const clientSearch = document.querySelector('#clients .search-container input');
    if (clientSearch) {
        clientSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('.clients-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Client Table Filters
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            applyFilters();
        });
    });

    function applyFilters() {
        const statusFilter = document.querySelector('.filter-group select[value="all"]')?.value || 'all';
        const ageFilter = document.querySelector('.filter-group select[value="all"]')?.value || 'all';
        const genderFilter = document.querySelector('.filter-group select[value="all"]')?.value || 'all';
        
        const rows = document.querySelectorAll('.clients-table tbody tr');
        
        rows.forEach(row => {
            const status = row.querySelector('.stage-badge').textContent.toLowerCase();
            const age = parseInt(row.children[1].textContent);
            const gender = row.children[2].textContent.toLowerCase();
            
            let showRow = true;
            
            if (statusFilter !== 'all' && status !== statusFilter) {
                showRow = false;
            }
            
            if (ageFilter !== 'all') {
                const [min, max] = ageFilter.split('-').map(Number);
                if (age < min || (max && age > max)) {
                    showRow = false;
                }
            }
            
            if (genderFilter !== 'all' && gender !== genderFilter) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    }

    // Client Table Action Buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('title');
            const clientName = this.closest('tr').children[0].textContent;
            
            console.log(`${action} clicked for client: ${clientName}`);
            // Implement specific actions here
            switch(action) {
                case 'View Profile':
                    // Handle view profile
                    break;
                case 'Flag for Review':
                    // Handle flag for review
                    break;
                case 'Archive':
                    // Handle archive
                    break;
            }
        });
    });

    // Handle responsive sidebar for mobile
    function handleResize() {
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').style.position = 'relative';
            document.querySelector('.main').style.marginLeft = '0';
        } else {
            document.querySelector('.sidebar').style.position = 'fixed';
            document.querySelector('.main').style.marginLeft = '250px';
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check


    // Client Profile Chart
    function initClientProgressChart() {
        const ctx = document.getElementById('clientProgressChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [
                    {
                        label: 'Mood Score',
                        data: [5, 6, 6, 7, 8, 8],
                        borderColor: '#4682A9',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Participation',
                        data: [4, 5, 7, 7, 8, 9],
                        borderColor: '#749BC2',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Client Progress Over Time'
                    }
                }
            }
        });
    }

    // Handle notes submission
    const notesEditor = document.querySelector('.notes-editor');
    if (notesEditor) {
        notesEditor.querySelector('button').addEventListener('click', function() {
            const textarea = notesEditor.querySelector('textarea');
            const noteContent = textarea.value.trim();
            
            if (noteContent) {
                const notesList = document.querySelector('.notes-list');
                const currentDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                const newNote = document.createElement('div');
                newNote.className = 'note-item';
                newNote.innerHTML = `
                    <div class="note-header">
                        <span class="note-author">Staff Member</span>
                        <span class="note-date">${currentDate}</span>
                    </div>
                    <p class="note-content">${noteContent}</p>
                `;
                
                notesList.insertBefore(newNote, notesList.firstChild);
                textarea.value = '';
            }
        });
    }

    // Handle flag button
    const flagBtn = document.querySelector('.flag-btn');
    if (flagBtn) {
        flagBtn.addEventListener('click', function() {
            const currentState = this.classList.contains('active');
            if (currentState) {
                this.classList.remove('active');
                this.style.background = '';
                this.style.color = '';
            } else {
                this.classList.add('active');
                this.style.background = '#dc3545';
                this.style.color = '#fff';
            }
        });
    }

    // Modal and Preview Popup Functionality
    const modal = document.getElementById('checkinModal');
    const previewPopup = document.getElementById('previewPopup');
    const closeModalBtn = modal.querySelector('.modal-close');
    const submissionsList = document.querySelector('.submissions-list');

    // Close Modal Function
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Open Modal Function
    function openModal(data = null) {
        if (data) {
            updateModalContent(data);
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Update Modal Content
    function updateModalContent(data) {
        // Example data structure
        const modalData = {
            date: data.date || 'June 15, 2024',
            client: {
                name: 'John Doe',
                id: 'CLIENT123',
                avatar: 'path/to/avatar',
                checkInTime: '9:30 AM'
            },
            mood: {
                score: 9,
                label: 'Excellent',
                emoji: '🌟'
            },
            reflection: 'Had a productive therapy session today...',
            activities: [
                { name: 'Morning Meditation', completed: true },
                { name: 'Group Therapy Session', completed: true },
                { name: 'Evening Exercise', completed: false }
            ],
            metrics: {
                viewedIntervention: true,
                checkInStatus: 'On Time',
                weeklyCompletion: '5/7',
                moodTrend: 'Improving'
            }
        };

        modal.querySelector('.modal-date').textContent = modalData.date;
        modal.querySelector('.client-name').textContent = modalData.client.name;
        modal.querySelector('.client-id').textContent = modalData.client.id;
        modal.querySelector('.check-in-time span').textContent = `Submitted at ${modalData.client.checkInTime}`;
        
        const moodIndicator = modal.querySelector('.mood-indicator');
        moodIndicator.className = `mood-indicator mood-${modalData.mood.label.toLowerCase()} large`;
        moodIndicator.querySelector('.mood-emoji').textContent = modalData.mood.emoji;
        moodIndicator.querySelector('.mood-score').textContent = `${modalData.mood.score}/10`;
        moodIndicator.querySelector('.mood-label').textContent = modalData.mood.label;

        modal.querySelector('.reflection-content p').textContent = modalData.reflection;

        const activityList = modal.querySelector('.activity-list');
        activityList.innerHTML = modalData.activities.map(activity => `
            <div class="activity-item ${activity.completed ? 'completed' : 'missed'}">
                <i class="fas fa-${activity.completed ? 'check' : 'times'}-circle"></i>
                <span>${activity.name}</span>
            </div>
        `).join('');

        updateMetrics(modalData.metrics);
    }

    // Update Metrics Section
    function updateMetrics(metrics) {
        const metricsGrid = modal.querySelector('.metrics-grid');
        metricsGrid.innerHTML = `
            <div class="metric-item">
                <i class="fas fa-eye"></i>
                <span class="metric-label">Viewed Intervention</span>
                <span class="metric-value">${metrics.viewedIntervention ? 'Yes' : 'No'}</span>
            </div>
            <div class="metric-item">
                <i class="fas fa-clock"></i>
                <span class="metric-label">Check-in Status</span>
                <span class="metric-value ${metrics.checkInStatus.toLowerCase().replace(' ', '-')}">${metrics.checkInStatus}</span>
            </div>
            <div class="metric-item">
                <i class="fas fa-calendar-check"></i>
                <span class="metric-label">Weekly Completion</span>
                <span class="metric-value">${metrics.weeklyCompletion} days</span>
            </div>
            <div class="metric-item">
                <i class="fas fa-chart-line"></i>
                <span class="metric-label">Mood Trend</span>
                <span class="metric-value positive">↗ ${metrics.moodTrend}</span>
            </div>
        `;
    }

    // Preview Popup Functions
    function showPreview(event, data = null) {
        const previewData = {
            date: data?.date || 'June 15, 2024',
            client: {
                name: 'John Doe',
                time: '9:30 AM'
            },
            mood: {
                score: 9,
                emoji: '🌟'
            },
            reflection: 'Had a productive therapy session today...'
        };

        // Update preview content
        previewPopup.querySelector('.preview-client-info h4').textContent = previewData.client.name;
        previewPopup.querySelector('.preview-time').textContent = previewData.client.time;
        previewPopup.querySelector('.mood-emoji').textContent = previewData.mood.emoji;
        previewPopup.querySelector('.mood-score').textContent = `${previewData.mood.score}/10`;
        previewPopup.querySelector('.preview-reflection').textContent = previewData.reflection;

        // Position the preview popup
        const rect = event.target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        previewPopup.style.top = `${rect.bottom + scrollTop + 10}px`;
        previewPopup.style.left = `${rect.left + scrollLeft}px`;
        previewPopup.classList.add('active');

        // Add click handler to "View Full Details" button
        previewPopup.querySelector('.btn-text').onclick = () => {
            hidePreview();
            openModal(data);
        };
    }

    function hidePreview() {
        previewPopup.classList.remove('active');
    }

    // Add click handler to close preview when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.preview-popup') && !e.target.closest('.calendar-day') && !e.target.closest('.submission-item')) {
            hidePreview();
        }
    });

    // Event Listeners
    closeModalBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            hidePreview();
        }
    });

    // Submissions list click handler
    if (submissionsList) {
        submissionsList.addEventListener('click', (e) => {
            const submissionItem = e.target.closest('.submission-item');
            if (submissionItem) {
                openModal();
            }
        });

        // Submissions list hover handler
        submissionsList.addEventListener('mouseover', (e) => {
            const submissionItem = e.target.closest('.submission-item');
            if (submissionItem) {
                showPreview(e);
            }
        });

        submissionsList.addEventListener('mouseout', (e) => {
            const submissionItem = e.target.closest('.submission-item');
            if (submissionItem) {
                hidePreview();
            }
        });
    }

    // View toggle functionality
    const viewToggleButtons = document.querySelectorAll('.view-btn');
    const views = document.querySelectorAll('.checkin-view');

    viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewType = button.getAttribute('data-view');
            
            // Update buttons
            viewToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update views
            views.forEach(view => {
                if (view.classList.contains(`${viewType}-view`)) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });
        });
    });
}); 