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

    // Section edit buttons → inline edit mode (no prompts)
    document.querySelectorAll('.btn-edit[data-edit-section]').forEach(button => {
        button.addEventListener('click', function() {
            const clientId = this.getAttribute('data-client-id');
            if (!clientId) { alert('Client ID missing.'); return; }

            const card = this.closest('.card');
            if (!card) return;
            if (card.dataset.editing === 'true') return; // already editing
            card.dataset.editing = 'true';

            // Hide the Edit button and inject Save/Cancel
            const headerActions = card.querySelector('.card-header .header-actions') || card.querySelector('.header-actions');
            if (!headerActions) return;

            this.style.display = 'none';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.textContent = 'Save';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Cancel';

            headerActions.appendChild(saveBtn);
            headerActions.appendChild(cancelBtn);

            // Turn editable display fields into inputs
            const displayFields = Array.from(card.querySelectorAll('.editable-field[data-field]'));

            const inputFor = (displayEl) => {
                const field = displayEl.getAttribute('data-field');
                const originalText = displayEl.textContent.trim();

                // prevent per-field click editor while in section-edit mode
                displayEl.dataset.editing = 'true';

                const fieldLower = field.toLowerCase();
                let inputType = 'text';
                if (['age', 'number_of_children', 'years_married', 'number_of_siblings', 'birth_order', 'currentmood', 'stresslevel'].includes(fieldLower)) {
                    inputType = 'number';
                } else if (['birthdate', 'birthday', 'date_of_birth', 'checkindate', 'registrationdate'].includes(fieldLower)) {
                    inputType = 'date';
                }

                const input = document.createElement('input');
                input.type = inputType;
                input.className = 'inline-edit-input';
                input.value = (inputType === 'number') ? originalText.replace(/\D+/g, '') : originalText;
                input.dataset.original = originalText;
                input.dataset.field = field;
                input.style.width = '100%';

                displayEl.textContent = '';
                displayEl.appendChild(input);
                return input;
            };

            const inputs = displayFields.map(inputFor);
            if (inputs.length) { inputs[0].focus(); inputs[0].select(); }

            const teardown = () => {
                // Restore texts and state
                displayFields.forEach(el => {
                    const input = el.querySelector('input.inline-edit-input');
                    if (input) {
                        el.textContent = input.dataset.original || '';
                    }
                    delete el.dataset.editing;
                });
                saveBtn.remove();
                cancelBtn.remove();
                button.style.display = '';
                delete card.dataset.editing;
            };

            cancelBtn.addEventListener('click', function() {
                teardown();
            });

            saveBtn.addEventListener('click', async function() {
                const updates = {};
                inputs.forEach(input => {
                    const field = input.dataset.field;
                    const original = input.dataset.original || '';
                    const value = input.value;
                    if (value !== original) {
                        const isNumber = input.type === 'number';
                        updates[field] = isNumber ? (value === '' ? null : Number(value)) : value;
                    }
                });

                if (Object.keys(updates).length === 0) { teardown(); return; }

                try {
                    const res = await fetch(`/clients/${clientId}/update-fields`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    const result = await res.json();
                    if (!result.success) throw new Error(result.error || 'Update failed');

                    // Reflect new values
                    displayFields.forEach(el => {
                        const input = el.querySelector('input.inline-edit-input');
                        if (input) {
                            el.textContent = input.value;
                        }
                        delete el.dataset.editing;
                    });
                    saveBtn.remove();
                    cancelBtn.remove();
                    button.style.display = '';
                    delete card.dataset.editing;
                } catch (e) {
                    console.error(e);
                    alert('Failed to save changes');
                }
            });
        });
    });

    // Inline per-field editing on click (input field, no prompt)
    document.querySelectorAll('.editable-field[data-field]').forEach(displayEl => {
        displayEl.style.cursor = 'text';
        displayEl.addEventListener('click', function() {
            // Prevent duplicate editors
            if (this.dataset.editing === 'true') return;
            this.dataset.editing = 'true';

            const clientId = this.getAttribute('data-client-id');
            const field = this.getAttribute('data-field');
            const originalText = this.textContent.trim();

            // Decide input type based on field
            const fieldLower = field.toLowerCase();
            let inputType = 'text';
            if (['age', 'number_of_children', 'years_married', 'number_of_siblings', 'birth_order', 'currentmood', 'stresslevel'].includes(fieldLower)) {
                inputType = 'number';
            } else if (['birthdate', 'birthday', 'date_of_birth', 'checkindate', 'registrationdate'].includes(fieldLower)) {
                inputType = 'date';
            }

            const input = document.createElement('input');
            input.type = inputType;
            input.className = 'inline-edit-input';
            input.value = (inputType === 'number') ? originalText.replace(/\D+/g, '') : originalText;
            input.style.width = '100%';

            // Replace content with input
            this.textContent = '';
            this.appendChild(input);
            input.focus();
            input.select();

            const cancelEdit = () => {
                this.textContent = originalText;
                delete this.dataset.editing;
            };

            const saveEdit = async () => {
                const newValueRaw = input.value;
                // No change
                if (newValueRaw === originalText) { cancelEdit(); return; }
                const updates = {};
                // Parse numbers
                updates[field] = (inputType === 'number') ? (newValueRaw === '' ? null : Number(newValueRaw)) : newValueRaw;
                try {
                    const res = await fetch(`/clients/${clientId}/update-fields`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    const result = await res.json();
                    if (!result.success) throw new Error(result.error || 'Update failed');
                    this.textContent = newValueRaw;
                } catch (e) {
                    console.error(e);
                    this.textContent = originalText;
                    alert('Failed to update field');
                } finally {
                    delete this.dataset.editing;
                }
            };

            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            });
            input.addEventListener('blur', saveEdit);
        });
    });

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