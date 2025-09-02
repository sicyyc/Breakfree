// Firebase imports are deferred to runtime where needed to avoid blocking UI initialization

document.addEventListener('DOMContentLoaded', function() {
    console.log('Client Profile JS loaded');
    
    // Tab Navigation Functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Ensure initial pane visibility
    (function ensureInitialTabVisibility() {
        tabPanes.forEach(pane => {
            pane.style.display = 'none';
            pane.style.visibility = 'hidden';
        });
        const initiallyActive = document.querySelector('.tab-pane.active');
        if (initiallyActive) {
            initiallyActive.style.display = 'block';
            initiallyActive.style.visibility = 'visible';
        }
    })();
    
    // Function to switch tabs
    function switchTab(targetTab) {
        // Remove active class and hide all panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
            pane.style.display = 'none';
            pane.style.visibility = 'hidden';
        });

        // Add active class to target button and pane
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetPane = document.getElementById(targetTab);

        if (targetButton && targetPane) {
            targetButton.classList.add('active');
            targetPane.classList.add('active');
            targetPane.style.display = 'block';
            targetPane.style.visibility = 'visible';
            // Update URL hash
            window.location.hash = targetTab;
        }
    }
    
    // Add click event listeners to tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
    
    // Handle URL hash on page load
    window.addEventListener('load', function() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            switchTab(hash);
        } else {
            // Default to the first pane if none selected
            const firstPane = tabPanes[0];
            if (firstPane) {
                switchTab(firstPane.id);
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            switchTab(hash);
        }
    });
    
    // Initialize Recovery Progress Chart (guarded)
    const recoveryCanvas = document.getElementById('recoveryChart');
    if (recoveryCanvas && window.Chart) {
        const ctx = recoveryCanvas.getContext('2d');
        window.recoveryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
            datasets: [{
                label: 'Progress Score',
                data: [65, 70, 68, 75, 82, 85],
                borderColor: 'rgb(70, 130, 180)',
                backgroundColor: 'rgba(70, 130, 180, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
        });
    }

    // Period Selector Functionality
    const periodButtons = document.querySelectorAll('.period-selector .btn-text');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            periodButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update chart data based on selected period
            updateChartData(this.textContent.toLowerCase());
        });
    });

    function updateChartData(period) {
        let labels, data;
        
        switch(period) {
            case 'week':
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                data = [75, 78, 76, 80, 82, 85, 83];
                break;
            case 'month':
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [70, 75, 80, 85];
                break;
            case 'year':
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = [60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 87, 90];
                break;
        }

        window.recoveryChart.data.labels = labels;
        window.recoveryChart.data.datasets[0].data = data;
        window.recoveryChart.update();
    }

    // Edit Profile Button
    const editProfileBtn = document.getElementById('editClientBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async function() {
            try {
                // Lazy-load Firebase only when editing is requested
                const firebaseModule = await import('./firebase-config.js');
                const firestore = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                const { db } = firebaseModule;
                const { doc, getDoc, updateDoc } = firestore;

                const clientId = this.getAttribute('data-client-id');
                if (!clientId) {
                    alert('Client ID missing.');
                    return;
                }

                const clientRef = doc(db, 'clients', clientId);
                const clientSnap = await getDoc(clientRef);
                if (!clientSnap.exists()) {
                    alert('Client record not found in Firestore.');
                    return;
                }

                const current = clientSnap.data() || {};

                const newName = prompt('Edit Name', current.name || this.getAttribute('data-client-name') || '');
                if (newName === null) return;
                const newAddress = prompt('Edit Address', current.address || this.getAttribute('data-client-address') || '');
                if (newAddress === null) return;
                const newCivilStatus = prompt('Edit Civil Status', current.civil_status || this.getAttribute('data-client-civil-status') || '');
                if (newCivilStatus === null) return;

                const updates = {
                    name: newName.trim(),
                    address: newAddress.trim(),
                    civil_status: newCivilStatus.trim()
                };

                await updateDoc(clientRef, updates);
                alert('Client updated successfully.');
                window.location.reload();
            } catch (error) {
                console.error('Failed to update client:', error);
                alert('Failed to update client. See console for details.');
            }
        });
    }

    // Schedule Intervention Button
    const scheduleInterventionBtn = document.getElementById('scheduleInterventionBtn');
    if (scheduleInterventionBtn) {
        scheduleInterventionBtn.addEventListener('click', function() {
            // Implement schedule intervention functionality
            console.log('Schedule intervention clicked');
        });
    }

    // Add Note Button
    const addNoteBtn = document.querySelector('.notes-card .btn-primary');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', function() {
            // Implement add note functionality
            console.log('Add note clicked');
        });
    }

    // Collapsible Card Functionality
    const collapsibleCards = document.querySelectorAll('.collapsible-card');

    console.log('Found collapsible cards:', collapsibleCards.length);

    // Initialize all cards as collapsed
    collapsibleCards.forEach((card, index) => {
        console.log(`Initializing card ${index}:`, card.getAttribute('data-card'));
        card.classList.add('collapsed');
        card.classList.remove('expanded');
        
        // Hide content for all cards initially
        const content = card.querySelector('.collapsible-content');
        if (content) {
            content.style.display = 'none';
            content.style.visibility = 'hidden';
            content.style.opacity = '0';
            content.style.maxHeight = '0';
            content.style.height = '0';
            console.log(`Content hidden for card ${index}`);
        } else {
            console.log(`No content found for card ${index}`);
        }
    });

    // Add click event listeners to all collapsible headers
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    console.log('Found collapsible headers:', collapsibleHeaders.length);
    
    collapsibleHeaders.forEach((header, index) => {
        console.log(`Adding click listener to header ${index}:`, header.getAttribute('data-target'));
        
        header.addEventListener('click', function(e) {
            // Don't trigger if clicking on action buttons (except collapse toggle)
            if (e.target.closest('.btn-icon') && !e.target.closest('.collapse-toggle')) {
                console.log('Clicked on action button, ignoring');
                return;
            }

            const card = this.closest('.collapsible-card');
            const targetId = this.getAttribute('data-target');
            const content = card.querySelector('.collapsible-content');

            console.log('Card clicked:', targetId);
            console.log('Card expanded:', card.classList.contains('expanded'));
            console.log('Content element found:', !!content);

            // If this card is already expanded, collapse it
            if (card.classList.contains('expanded')) {
                console.log('Collapsing card:', targetId);
                card.classList.remove('expanded');
                card.classList.add('collapsed');
                if (content) {
                    content.style.display = 'none';
                    content.style.visibility = 'hidden';
                    content.style.opacity = '0';
                    content.style.maxHeight = '0';
                    content.style.height = '0';
                }
            } else {
                console.log('Expanding card:', targetId);
                
                // Expand this card
                card.classList.remove('collapsed');
                card.classList.add('expanded');
                if (content) {
                    // Show content for this card
                    content.style.display = 'block';
                    content.style.visibility = 'visible';
                    content.style.opacity = '1';
                    content.style.maxHeight = '2000px';
                    content.style.height = 'auto';
                    console.log('Content should now be visible for:', targetId);
                } else {
                    console.log('No content element found for:', targetId);
                }
            }

            // Update chart if this is the progress card
            if (targetId === 'progress' && card.classList.contains('expanded')) {
                setTimeout(() => {
                    if (window.recoveryChart) {
                        window.recoveryChart.resize();
                    }
                }, 300);
            }
        });
    });

    // Prevent event bubbling on action buttons
    const actionButtons = document.querySelectorAll('.header-actions .btn-icon:not(.collapse-toggle)');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // View All Activities Button
    const viewAllActivitiesBtn = document.querySelector('.activity-card .btn-text');
    if (viewAllActivitiesBtn) {
        viewAllActivitiesBtn.addEventListener('click', function() {
            // Implement view all activities functionality
            console.log('View all activities clicked');
        });
    }

    // View Calendar Button
    const viewCalendarBtn = document.querySelector('.interventions-card .btn-text');
    if (viewCalendarBtn) {
        viewCalendarBtn.addEventListener('click', function() {
            // Implement view calendar functionality
            console.log('View calendar clicked');
        });
    }

    // Intervention Item Click
    const interventionItems = document.querySelectorAll('.intervention-item');
    interventionItems.forEach(item => {
        item.addEventListener('click', function() {
            // Implement intervention details view
            console.log('Intervention item clicked');
        });
    });
}); 