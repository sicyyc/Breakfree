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
        } else if (tabId === 'check-in') {
            initializeCheckinCalendar();
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

    // Initialize Line Chart
    function initializeCharts() {
        const lineCtx = document.getElementById('lineChart');
        if (!lineCtx) return;

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Tasks Completed',
                    data: [12, 19, 15, 17, 14, 15, 16],
                    borderColor: '#4682A9',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Initialize Doughnut Chart
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

    // Handle add task button
    const addTaskBtn = document.querySelector('.btn-primary');
    addTaskBtn.addEventListener('click', function() {
        // Implement add task functionality here
        alert('Add task functionality would be implemented here');
    });

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

    // Calendar Functionality
    function initializeCalendar() {
        const currentMonthElement = document.getElementById('checkinCurrentMonth');
        const calendarDaysElement = document.getElementById('checkinCalendarDays');
        const prevMonthButton = document.getElementById('checkinPrevMonth');
        const nextMonthButton = document.getElementById('checkinNextMonth');

        if (!currentMonthElement || !calendarDaysElement) return;

        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        // Sample data for appointments and checkups
        const events = {
            '2024-02-15': ['appointment'],
            '2024-02-20': ['checkup'],
            '2024-02-25': ['appointment', 'checkup'],
        };

        function updateCalendar() {
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const startingDay = firstDay.getDay();
            const monthLength = lastDay.getDate();
            
            // Update month/year display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

            // Clear previous days
            calendarDaysElement.innerHTML = '';

            // Calculate the total number of days to display (6 weeks × 7 days = 42)
            const totalDaysToShow = 42;
            
            // Calculate the start date (first day of the first week to display)
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startingDay);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < totalDaysToShow; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const isToday = date.getTime() === today.getTime();
                const isCurrentMonth = date.getMonth() === currentMonth;
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                let additionalClass = '';
                if (!isCurrentMonth) {
                    additionalClass = 'other-month';
                } else if (isToday) {
                    additionalClass = 'today';
                }
                
                const dayElement = createDayElement(date.getDate(), additionalClass, events[dateStr]);
                calendarDaysElement.appendChild(dayElement);
            }
        }

        function createDayElement(day, additionalClass, eventData = null) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            if (additionalClass) {
                dayElement.classList.add(additionalClass);
            }
            dayElement.textContent = day;
            
            if (eventData) {
                eventData.forEach(eventType => {
                    dayElement.classList.add(`has-${eventType}`);
                });
            }
            
            // Add click event listener
            dayElement.addEventListener('click', () => {
                // Remove selected class from all days
                document.querySelectorAll('.calendar-day').forEach(el => {
                    el.classList.remove('selected');
                });
                // Add selected class to clicked day
                dayElement.classList.add('selected');
                console.log(`Selected date: ${day}-${currentMonth + 1}-${currentYear}`);
            });
            
            return dayElement;
        }

        // Event listeners for month navigation
        prevMonthButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateCalendar();
        });

        nextMonthButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            updateCalendar();
        });

        // Initialize calendar
        updateCalendar();
    }

    // Initialize calendar
    initializeCalendar();

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