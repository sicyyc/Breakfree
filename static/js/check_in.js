// Daily Activities Schedule JavaScript - BreakFree Design System with Firebase Integration
document.addEventListener('DOMContentLoaded', function() {
    initializeSchedule();
});

function initializeSchedule() {
    // Load activities from Firebase
    loadActivitiesFromFirebase();
    
    // Add search functionality
    addSearchBar();
    
    // Add activity highlighting
    highlightCurrentTime();
    
    // Add edit functionality
    addEditFunctionality();
    
    // Add activity filtering
    addActivityFilter();
    
    // Add responsive behavior
    handleResponsiveBehavior();
    
    // Add activity type highlighting
    highlightActivityTypes();
}

async function loadActivitiesFromFirebase() {
    try {
        showLoadingIndicator();
        
        const response = await fetch('/api/activities/load');
        const data = await response.json();
        
        if (data.success && data.activities.length > 0) {
            // Load saved activities from Firebase
            loadSavedActivities(data.activities);
            showNotification('Activities loaded from database', 'success');
        } else {
            // Use default activities if none saved
            console.log('No saved activities found, using defaults');
        }
        
        hideLoadingIndicator();
    } catch (error) {
        console.error('Error loading activities:', error);
        hideLoadingIndicator();
        showNotification('Error loading activities from database', 'error');
    }
}

function loadSavedActivities(activities) {
    activities.forEach(activity => {
        // Find the row by time using a more reliable method
        const timeCells = document.querySelectorAll('.time-cell');
        let targetRow = null;
        
        for (let timeCell of timeCells) {
            if (timeCell.textContent.trim() === activity.time.trim()) {
                targetRow = timeCell.closest('tr');
                break;
            }
        }
        
        if (targetRow) {
            const cell = targetRow.querySelector(`.activity-cell:nth-child(${activity.column + 1})`);
            if (cell) {
                cell.textContent = activity.activity;
                cell.dataset.activity = activity.activity;
                
                // Update merged cells if necessary
                if (activity.colspan > 1) {
                    updateMergedCells(cell, activity.activity);
                }
            }
        }
    });
}

function addSearchBar() {
    const searchInput = document.getElementById('activitySearch');
    if (!searchInput) return;
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterActivities(searchTerm);
    });
}

function filterActivities(searchTerm) {
    const activityCells = document.querySelectorAll('.activity-cell');
    let matchCount = 0;
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent.toLowerCase();
        if (searchTerm === '' || activityText.includes(searchTerm)) {
            cell.style.display = '';
            cell.style.opacity = '1';
            matchCount++;
        } else {
            cell.style.display = 'none';
            cell.style.opacity = '0.3';
        }
    });
}

function highlightCurrentTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Find the current time slot
    const timeCells = document.querySelectorAll('.time-cell');
    timeCells.forEach(cell => {
        const timeText = cell.textContent;
        const timeRange = parseTimeRange(timeText);
        
        if (timeRange && currentTime >= timeRange.start && currentTime <= timeRange.end) {
            // Highlight current time row
            const row = cell.closest('tr');
            if (row) {
                row.style.backgroundColor = 'var(--warning-light)';
                row.style.border = '2px solid var(--warning)';
                
                // Add current time indicator
                addCurrentTimeIndicator(row);
                
                // Scroll to current time
                setTimeout(() => {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    });
}

function parseTimeRange(timeText) {
    // Parse time ranges like "5:00AM-5:15AM" or "9:00PM"
    const timeRegex = /(\d{1,2}):(\d{2})(AM|PM)(?:-(\d{1,2}):(\d{2})(AM|PM))?/;
    const match = timeText.match(timeRegex);
    
    if (match) {
        let startHour = parseInt(match[1]);
        let startMinute = parseInt(match[2]);
        let startPeriod = match[3];
        
        // Convert to 24-hour format
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        
        let startTime = startHour * 60 + startMinute;
        
        if (match[4]) {
            // Has end time
            let endHour = parseInt(match[4]);
            let endMinute = parseInt(match[5]);
            let endPeriod = match[6];
            
            if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
            if (endPeriod === 'AM' && endHour === 12) endHour = 0;
            
            let endTime = endHour * 60 + endMinute;
            
            return { start: startTime, end: endTime };
        } else {
            // Single time point (like 9:00PM)
            return { start: startTime, end: startTime + 15 }; // Assume 15-minute slot
        }
    }
    
    return null;
}

function addCurrentTimeIndicator(row) {
    // Remove existing indicator
    const existingIndicator = row.querySelector('.current-time-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Add new indicator
    const indicator = document.createElement('div');
    indicator.className = 'current-time-indicator';
    indicator.innerHTML = '<i class="fa-solid fa-clock"></i> Current Time';
    
    row.style.position = 'relative';
    row.appendChild(indicator);
}

function addEditFunctionality() {
    const editModeBtn = document.getElementById('editModeBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const printScheduleBtn = document.getElementById('printScheduleBtn');
    
    if (!editModeBtn || !saveChangesBtn || !printScheduleBtn) return;
    
    let isEditMode = false;
    
    // Edit Mode Toggle
    editModeBtn.addEventListener('click', function() {
        isEditMode = !isEditMode;
        toggleEditMode(isEditMode);
        
        if (isEditMode) {
            this.innerHTML = '<i class="fa-solid fa-times"></i> Exit Edit Mode';
            this.classList.remove('btn-secondary');
            this.classList.add('btn-danger');
            saveChangesBtn.style.display = 'flex';
        } else {
            this.innerHTML = '<i class="fa-regular fa-edit"></i> Edit Mode';
            this.classList.remove('btn-danger');
            this.classList.add('btn-secondary');
            saveChangesBtn.style.display = 'none';
        }
    });
    
    // Save Changes
    saveChangesBtn.addEventListener('click', async function() {
        try {
            await saveActivitiesToFirebase();
            isEditMode = false;
            editModeBtn.innerHTML = '<i class="fa-regular fa-edit"></i> Edit Mode';
            editModeBtn.classList.remove('btn-danger');
            editModeBtn.classList.add('btn-secondary');
            this.style.display = 'none';
            toggleEditMode(false);
        } catch (error) {
            console.error('Error saving activities:', error);
            showNotification('Error saving activities to database', 'error');
        }
    });
    
    // Print Schedule
    printScheduleBtn.addEventListener('click', function() {
        window.print();
    });
    
    // Add click handlers to activity cells
    const activityCells = document.querySelectorAll('.activity-cell');
    activityCells.forEach(cell => {
        cell.addEventListener('click', function() {
            if (isEditMode && !this.classList.contains('empty-cell')) {
                openEditModal(this);
            }
        });
    });
}

function toggleEditMode(enabled) {
    const scheduleTable = document.getElementById('scheduleTable');
    const activityCells = document.querySelectorAll('.activity-cell');
    
    if (enabled) {
        scheduleTable.classList.add('edit-mode');
        activityCells.forEach(cell => {
            if (!cell.classList.contains('empty-cell')) {
                cell.style.cursor = 'pointer';
                cell.title = 'Click to edit activity';
            }
        });
    } else {
        scheduleTable.classList.remove('edit-mode');
        activityCells.forEach(cell => {
            cell.style.cursor = 'default';
            cell.title = '';
        });
    }
}

function openEditModal(cell) {
    const modal = document.getElementById('editModal');
    const editActivityText = document.getElementById('editActivityText');
    const daysGroup = document.getElementById('editDaysGroup');
    const startSelect = document.getElementById('editStartTime');
    const endSelect = document.getElementById('editEndTime');
    
    if (!modal || !editActivityText || !daysGroup || !startSelect || !endSelect) return;
    
    // Get cell information
    const row = cell.closest('tr');
    const timeCell = row.querySelector('.time-cell');
    
    // Fill modal with current values
    editActivityText.value = cell.textContent;
    // preselect clicked day
    const clickedDay = getDayFromCell(cell);
    Array.from(daysGroup.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
        cb.checked = (cb.value.toUpperCase() === clickedDay.toUpperCase());
    });
    // populate time options from all available time slots
    populateTimeSelects(startSelect, endSelect, timeCell.textContent);
    
    // Store reference to the cell being edited
    modal.dataset.editingCell = cell.dataset.activity;
    modal.dataset.cellElement = cell;
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus on text input
    editActivityText.focus();
    
    // Add event listeners
    addModalEventListeners(modal, cell);
}

function getDayFromCell(cell) {
    const columnIndex = cell.cellIndex;
    const headers = document.querySelectorAll('.daily-schedule-table th');
    
    if (columnIndex >= 2 && columnIndex < headers.length) {
        return headers[columnIndex].textContent;
    }
    return 'All Days';
}

function populateTimeSelects(startSelect, endSelect, currentTimeText) {
    const timeCells = Array.from(document.querySelectorAll('.time-cell')).map(tc => tc.textContent.trim());
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    timeCells.forEach(t => {
        const opt1 = document.createElement('option'); opt1.value = t; opt1.textContent = t; startSelect.appendChild(opt1);
        const opt2 = document.createElement('option'); opt2.value = t; opt2.textContent = t; endSelect.appendChild(opt2);
    });
    // preselect current time as start, next slot as end if exists
    startSelect.value = currentTimeText.trim();
    const idx = timeCells.indexOf(currentTimeText.trim());
    endSelect.value = timeCells[Math.min(idx + 1, timeCells.length - 1)];
}

function applyEditsToSelection(clickedCell, selectedDays, startTime, endTime, newText) {
    const table = document.getElementById('scheduleTable');
    if (!table) return;
    const headers = Array.from(table.querySelectorAll('thead th'));
    const dayToColIndex = new Map();
    headers.forEach((th, idx) => {
        if (idx >= 1) { // index 0 is TIME
            dayToColIndex.set(th.textContent.trim().toUpperCase(), idx);
        }
    });
    // compute time index range inclusive
    const times = Array.from(document.querySelectorAll('.time-cell')).map(tc => tc.textContent.trim());
    const startIdx = times.indexOf(startTime.trim());
    const endIdx = times.indexOf(endTime.trim());
    if (startIdx === -1 || endIdx === -1) return;
    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const bodyRows = table.querySelectorAll('tbody tr');
    for (let r = lo; r <= hi; r++) {
        const row = bodyRows[r];
        selectedDays.forEach(day => {
            const colIndex = dayToColIndex.get(day);
            if (typeof colIndex === 'number') {
                const targetCell = row.querySelector(`.activity-cell:nth-child(${colIndex + 1})`);
                if (targetCell && !targetCell.classList.contains('empty-cell')) {
                    targetCell.textContent = newText;
                    targetCell.dataset.activity = newText;
                }
            }
        });
    }
}

function addModalEventListeners(modal, cell) {
    const closeBtn = modal.querySelector('.close');
    const saveBtn = document.getElementById('saveActivityBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const editActivityText = document.getElementById('editActivityText');
    const daysGroup = document.getElementById('editDaysGroup');
    const startSelect = document.getElementById('editStartTime');
    const endSelect = document.getElementById('editEndTime');
    
    // Close modal
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Save changes
    saveBtn.onclick = async function() {
        const newText = editActivityText.value.trim();
        if (!newText) return;
        const selectedDays = Array.from(daysGroup.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value.toUpperCase());
        const startTime = startSelect.value;
        const endTime = endSelect.value;
        applyEditsToSelection(cell, selectedDays, startTime, endTime, newText);
        modal.style.display = 'none';
        showNotification('Activity updated successfully!', 'success');
    };
    
    // Cancel edit
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Handle Enter key
    editActivityText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}

function updateMergedCells(cell, newText) {
    // Find all cells in the same row with the same colspan
    const row = cell.closest('tr');
    const cells = row.querySelectorAll('.activity-cell');
    
    cells.forEach(c => {
        if (c.colSpan === cell.colSpan && c !== cell) {
            c.textContent = newText;
            c.dataset.activity = newText;
        }
    });
}

async function saveActivitiesToFirebase() {
    try {
        showLoadingIndicator();
        
        // Collect all activity data
        const activities = [];
        const activityCells = document.querySelectorAll('.activity-cell');
        
        activityCells.forEach(cell => {
            if (!cell.classList.contains('empty-cell')) {
                const row = cell.closest('tr');
                const timeCell = row.querySelector('.time-cell');
                const dayCell = row.querySelector('.day-cell');
                
                activities.push({
                    time: timeCell.textContent,
                    day: dayCell.textContent,
                    activity: cell.textContent,
                    column: cell.cellIndex,
                    colspan: cell.colSpan
                });
            }
        });
        
        // Send to backend
        const response = await fetch('/api/activities/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ activities: activities })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('All activities saved successfully to database!', 'success');
        } else {
            throw new Error(data.message);
        }
        
        hideLoadingIndicator();
        
    } catch (error) {
        console.error('Error saving activities:', error);
        hideLoadingIndicator();
        throw error;
    }
}

function addActivityFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterType = this.dataset.filter;
            filterByType(filterType);
        });
    });
}

function filterByType(filterType) {
    const activityCells = document.querySelectorAll('.activity-cell');
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent.toLowerCase();
        let shouldShow = false;
        
        switch(filterType) {
            case 'meals':
                shouldShow = activityText.includes('breakfast') || 
                           activityText.includes('lunch') || 
                           activityText.includes('dinner') ||
                           activityText.includes('snack') ||
                           activityText.includes('food preparation');
                break;
            case 'activities':
                shouldShow = activityText.includes('sports') || 
                           activityText.includes('exercise') || 
                           activityText.includes('gardening') ||
                           activityText.includes('project') ||
                           activityText.includes('recreational') ||
                           activityText.includes('skills training');
                break;
            case 'cleaning':
                shouldShow = activityText.includes('cleaning') || 
                           activityText.includes('washing') || 
                           activityText.includes('general cleaning') ||
                           activityText.includes('dining area');
                break;
            case 'spiritual':
                shouldShow = activityText.includes('prayer') || 
                           activityText.includes('mass') || 
                           activityText.includes('angelus') ||
                           activityText.includes('rosary') ||
                           activityText.includes('flag ceremony');
                break;
            case 'personal':
                shouldShow = activityText.includes('bathing') || 
                           activityText.includes('laundry') || 
                           activityText.includes('hygiene') ||
                           activityText.includes('waking') ||
                           activityText.includes('nap');
                break;
            default:
                shouldShow = true;
        }
        
        if (shouldShow) {
            cell.style.display = '';
            cell.style.opacity = '1';
        } else {
            cell.style.display = 'none';
            cell.style.opacity = '0.3';
        }
    });
}

function highlightActivityTypes() {
    const activityCells = document.querySelectorAll('.activity-cell');
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent;
        
        // Add activity type classes for better styling
        if (activityText.includes('BREAKFAST') || activityText.includes('LUNCH') || activityText.includes('DINNER')) {
            cell.classList.add('meal-activity');
        } else if (activityText.includes('SPORTS') || activityText.includes('EXERCISE')) {
            cell.classList.add('sports-activity');
        } else if (activityText.includes('GARDENING')) {
            cell.classList.add('garden-activity');
        } else if (activityText.includes('PROJECT')) {
            cell.classList.add('project-activity');
        } else if (activityText.includes('CLEANING') || activityText.includes('WASHING')) {
            cell.classList.add('cleaning-activity');
        } else if (activityText.includes('PRAYER') || activityText.includes('MASS')) {
            cell.classList.add('spiritual-activity');
        }
    });
}

function handleResponsiveBehavior() {
    // Add touch support for mobile
    if ('ontouchstart' in window) {
        const activityCells = document.querySelectorAll('.activity-cell');
        activityCells.forEach(cell => {
            cell.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            cell.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const table = document.querySelector('.daily-schedule-table');
        if (table) {
            if (window.innerWidth < 768) {
                table.style.fontSize = '0.75rem';
            } else if (window.innerWidth < 1200) {
                table.style.fontSize = '0.8rem';
            } else {
                table.style.fontSize = '0.875rem';
            }
        }
    });
}

function showLoadingIndicator() {
    // Create loading indicator
    const loading = document.createElement('div');
    loading.id = 'loadingIndicator';
    loading.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving to database...</span>
        </div>
    `;
    
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    document.body.appendChild(loading);
}

function hideLoadingIndicator() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.remove();
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications and loading
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .btn-danger {
        background: var(--danger);
        color: var(--text-light);
    }
    
    .btn-danger:hover {
        background: #c0392b;
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
    }
    
    .loading-spinner {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .loading-spinner i {
        font-size: 2rem;
        color: var(--primary-color);
    }
    
    .loading-spinner span {
        color: var(--text-dark);
        font-weight: 500;
    }
`;
document.head.appendChild(style);
