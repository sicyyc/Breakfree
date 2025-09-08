// Daily Activities Management - BreakFree with Backend API Integration

// Global variables
let activities = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let editingActivityId = null;

// DOM elements
const activitiesList = document.getElementById('activitiesList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const addActivityBtn = document.getElementById('addActivityBtn');
const printScheduleBtn = document.getElementById('printScheduleBtn');

// View toggle elements
const listViewBtn = document.getElementById('listViewBtn');
const tableViewBtn = document.getElementById('tableViewBtn');
const listView = document.getElementById('listView');
const tableView = document.getElementById('tableView');
const weeklyTableBody = document.getElementById('weeklyTableBody');

// Modal elements
const activityModal = document.getElementById('activityModal');
const deleteModal = document.getElementById('deleteModal');
const activityForm = document.getElementById('activityForm');
const modalTitle = document.getElementById('modalTitle');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Daily Activities Management initialized');
    initializeEventListeners();
    loadActivities();
});

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });
    
    // Modal controls
    addActivityBtn.addEventListener('click', () => openActivityModal());
    printScheduleBtn.addEventListener('click', () => printWeeklySchedule());
    
    // View toggle controls
    listViewBtn.addEventListener('click', () => switchView('list'));
    tableViewBtn.addEventListener('click', () => switchView('table'));
    
    // Close modal buttons
    document.getElementById('closeModal').addEventListener('click', closeActivityModal);
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    
    // Cancel buttons
    document.getElementById('cancelBtn').addEventListener('click', closeActivityModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    
    // Form submission
    activityForm.addEventListener('submit', handleFormSubmit);
    
    // Confirm delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === activityModal) closeActivityModal();
        if (e.target === deleteModal) closeDeleteModal();
    });
}

// Load activities from backend API
async function loadActivities() {
    try {
        showLoading(true);
        
        console.log('Loading activities from API...');
        
        const response = await fetch('/api/daily-activities', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Load activities response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Load activities error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Load activities response data:', data);
        
        if (data.success) {
            activities = data.activities || [];
            console.log(`Loaded ${activities.length} activities`);
            renderActivities();
            generateWeeklyTable();
        } else {
            throw new Error(data.error || 'Failed to load activities');
        }
        
    } catch (error) {
        console.error('Error loading activities:', error);
        showNotification('Error loading activities: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Real-time listener for activities (optional - for live updates)
function setupRealtimeListener() {
    // Poll for updates every 30 seconds
    setInterval(() => {
        loadActivities();
    }, 30000);
}

// Render activities list
function renderActivities() {
    const filteredActivities = getFilteredActivities();
    
    if (filteredActivities.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    activitiesList.innerHTML = filteredActivities.map(activity => `
        <div class="activity-card" data-activity-id="${activity.id}">
            <div class="activity-header">
                <h3 class="activity-title">${activity.name}</h3>
                <span class="activity-type ${activity.type}">${activity.type}</span>
            </div>
            
            <div class="activity-time">
                <i class="fa-solid fa-clock"></i>
                <span>${formatTime(activity.startTime || '')} - ${formatTime(activity.endTime || '')}</span>
            </div>
            
            <div class="activity-days">
                ${(activity.days || []).map(day => `<span class="day-tag">${day.charAt(0).toUpperCase() + day.slice(1, 3)}</span>`).join('')}
            </div>
            
            ${activity.description ? `<div class="activity-description">${activity.description}</div>` : ''}
            
            <div class="activity-actions">
                <button class="btn btn-sm btn-secondary" onclick="editActivity('${activity.id}')">
                    <i class="fa-solid fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteActivity('${activity.id}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Get filtered activities based on current filter and search
function getFilteredActivities() {
    let filtered = activities;
    
    // Apply search filter
    if (currentSearchTerm) {
        filtered = filtered.filter(activity => 
            activity.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            activity.description?.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            activity.type.toLowerCase().includes(currentSearchTerm.toLowerCase())
        );
    }
    
    // Apply time filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(activity => {
            const startHour = parseInt(activity.startTime.split(':')[0]);
            switch (currentFilter) {
                case 'morning':
                    return startHour >= 5 && startHour < 12;
                case 'afternoon':
                    return startHour >= 12 && startHour < 17;
                case 'evening':
                    return startHour >= 17 && startHour < 22;
                default:
                    return true;
        }
    });
}

    return filtered;
}

// Handle search input
function handleSearch(e) {
    currentSearchTerm = e.target.value;
    renderActivities();
}

// Handle filter selection
function handleFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderActivities();
}

// Open activity modal for adding new activity
function openActivityModal() {
    editingActivityId = null;
    modalTitle.textContent = 'Add New Activity';
    activityForm.reset();
    activityModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Open activity modal for editing
function editActivity(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    editingActivityId = activityId;
    modalTitle.textContent = 'Edit Activity';
    
    // Populate form with activity data
    document.getElementById('activityName').value = activity.name;
    document.getElementById('startTime').value = activity.startTime;
    document.getElementById('endTime').value = activity.endTime;
    document.getElementById('activityType').value = activity.type;
    document.getElementById('description').value = activity.description || '';
    document.getElementById('isRecurring').checked = activity.isRecurring || false;
    
    // Check the appropriate day checkboxes
    document.querySelectorAll('input[name="days"]').forEach(checkbox => {
        checkbox.checked = activity.days.includes(checkbox.value);
    });
    
    activityModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close activity modal
function closeActivityModal() {
    activityModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    editingActivityId = null;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(activityForm);
    const activityData = {
        name: formData.get('name'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        type: formData.get('type'),
        description: formData.get('description'),
        isRecurring: formData.get('isRecurring') === 'on',
        days: formData.getAll('days'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Validate required fields
    if (!activityData.name || !activityData.startTime || !activityData.endTime || activityData.days.length === 0) {
        showNotification('Please fill in all required fields', 'error');
            return;
        }
        
    // Validate time
    if (activityData.startTime >= activityData.endTime) {
        showNotification('End time must be after start time', 'error');
            return;
        }
        
    try {
        showLoading(true);
        
        const url = editingActivityId 
            ? `/api/daily-activities/${editingActivityId}` 
            : '/api/daily-activities';
        const method = editingActivityId ? 'PUT' : 'POST';
        
        console.log('Saving activity:', { url, method, activityData });
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(activityData)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            showNotification(
                editingActivityId ? 'Activity updated successfully' : 'Activity added successfully', 
                'success'
            );
            closeActivityModal();
            await loadActivities();
            generateWeeklyTable();
        } else {
            throw new Error(data.error || 'Failed to save activity');
        }
        
    } catch (error) {
        console.error('Error saving activity:', error);
        showNotification('Error saving activity: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Delete activity
function deleteActivity(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    // Store the activity ID for deletion
    document.getElementById('confirmDeleteBtn').dataset.activityId = activityId;
    deleteModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close delete modal
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Confirm delete
async function confirmDelete() {
    const activityId = document.getElementById('confirmDeleteBtn').dataset.activityId;
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/daily-activities/${activityId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Activity deleted successfully', 'success');
            closeDeleteModal();
            await loadActivities();
            generateWeeklyTable();
        } else {
            throw new Error(data.error || 'Failed to delete activity');
        }
        
    } catch (error) {
        console.error('Error deleting activity:', error);
        showNotification('Error deleting activity: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Print weekly schedule
function printWeeklySchedule() {
    // Ensure we're in table view for printing
    if (tableView.style.display === 'none') {
        switchView('table');
        // Wait a moment for the table to render
        setTimeout(() => {
            printTable();
        }, 100);
    } else {
        printTable();
    }
}

// Print the weekly table
function printTable() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get the current date for the header
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Get the table HTML
    const tableElement = document.querySelector('.weekly-schedule-table');
    if (!tableElement) {
        showNotification('No schedule table found to print', 'error');
        return;
    }
    
    // Create print-friendly HTML
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Weekly Schedule - BreakFree</title>
            <style>
                body {
                    font-family: 'Poppins', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: #333;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #6b46c1;
                    padding-bottom: 20px;
                }
                .print-header h1 {
                    color: #6b46c1;
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .print-header p {
                    margin: 0;
                    color: #666;
                    font-size: 16px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                th, td {
                    padding: 8px 6px;
                    text-align: center;
                    border: 1px solid #e5e7eb;
                    vertical-align: middle;
                    height: 40px;
                }
                th {
                    background: #6b46c1;
                    color: white;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-size: 11px;
                }
                th.time-header {
                    background: #553c9a;
                    min-width: 100px;
                }
                tbody tr:nth-child(even) {
                    background: #f9fafb;
                }
                .time-slot {
                    font-weight: 600;
                    color: #374151;
                    background: #f3f4f6;
                    border-right: 2px solid #d1d5db;
                    font-size: 11px;
                }
                .activity-slot {
                    position: relative;
                    min-height: 30px;
                    padding: 2px;
                    vertical-align: top;
                    height: 40px;
                }
                .activity-item {
                    background: #6b46c1;
                    color: white;
                    padding: 4px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 500;
                    text-align: center;
                    line-height: 1.2;
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .activity-item.meal { background: #fef3c7; color: #92400e; }
                .activity-item.exercise { background: #d1fae5; color: #065f46; }
                .activity-item.education { background: #dbeafe; color: #1e40af; }
                .activity-item.recreation { background: #f3e8ff; color: #7c3aed; }
                .activity-item.cleaning { background: #fecaca; color: #991b1b; }
                .activity-item.spiritual { background: #fef7cd; color: #a16207; }
                .activity-item.personal { background: #e0e7ff; color: #3730a3; }
                .activity-item.other { background: #f3f4f6; color: #374151; }
                .activity-name {
                    font-weight: 600;
                    margin-bottom: 1px;
                    font-size: 10px;
                    line-height: 1.1;
                }
                .activity-time {
                    font-size: 9px;
                    opacity: 0.9;
                    font-weight: 500;
                }
                .print-footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
                @media print {
                    body { margin: 0; padding: 15px; }
                    .print-header { margin-bottom: 20px; }
                    table { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Weekly Schedule</h1>
                <p>Generated on ${currentDate}</p>
            </div>
            ${tableElement.outerHTML}
            <div class="print-footer">
                <p>BreakFree - Daily Activities Management System</p>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML to the print window
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
    
    showNotification('Print dialog opened', 'success');
}

// Utility functions
function formatTime(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        console.warn('Invalid time string:', timeString);
        return 'Invalid Time';
    }
    
    const [hours, minutes] = timeString.split(':');
    if (!hours || !minutes) {
        console.warn('Invalid time format:', timeString);
        return 'Invalid Time';
    }
    
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showEmptyState(show) {
    emptyState.style.display = show ? 'flex' : 'none';
    activitiesList.style.display = show ? 'none' : 'grid';
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
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
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
        max-width: 400px;
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

// Add CSS animations for notifications
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
`;
document.head.appendChild(style);

// View switching functions
function switchView(view) {
    if (view === 'list') {
        listViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        listView.style.display = 'block';
        tableView.style.display = 'none';
    } else if (view === 'table') {
        tableViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        listView.style.display = 'none';
        tableView.style.display = 'block';
        generateWeeklyTable();
    }
}

// Generate weekly table view
function generateWeeklyTable() {
    if (!weeklyTableBody) return;
    
    console.log('Generating weekly table with activities:', activities);
    
    // Create time slots from 5:00 AM to 10:00 PM (every hour)
    const timeSlots = [];
    for (let hour = 5; hour <= 22; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        timeSlots.push(timeString);
    }
    
    // Group activities by day
    const activitiesByDay = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    
    activities.forEach(activity => {
        if (activity.days && Array.isArray(activity.days)) {
            activity.days.forEach(day => {
                if (activitiesByDay[day]) {
                    activitiesByDay[day].push(activity);
                }
            });
        }
    });
    
    // Sort activities by start time for each day
    Object.keys(activitiesByDay).forEach(day => {
        activitiesByDay[day].sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
    });
    
    console.log('Activities grouped by day:', activitiesByDay);
    
    // Generate table rows
    let tableHTML = '';
    
    if (activities.length === 0) {
        tableHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-calendar-plus" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No activities scheduled yet. Add some activities to see them here.
                </td>
            </tr>
        `;
    } else {
        timeSlots.forEach((timeSlot, timeIndex) => {
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            tableHTML += `
                <tr>
                    <td class="time-slot">${formatTime(timeSlot)}</td>
                    ${dayNames.map(day => {
                        // Find activities that start at this time slot
                        const dayActivities = activitiesByDay[day].filter(activity => 
                            activity.startTime === timeSlot
                        );
                        
                        if (dayActivities.length > 0) {
                            console.log(`Found ${dayActivities.length} activities for ${day} at ${timeSlot}:`, dayActivities);
                        }
                        
                        if (dayActivities.length === 0) {
                            return '<td class="activity-slot"></td>';
                        }
                        
                        return `
                            <td class="activity-slot">
                                ${dayActivities.map(activity => {
                                    // Calculate how many time slots this activity spans
                                    const startTime = activity.startTime || '00:00';
                                    const endTime = activity.endTime || '01:00';
                                    
                                    const startHour = parseInt(startTime.split(':')[0]);
                                    const endHour = parseInt(endTime.split(':')[0]);
                                    const endMinute = parseInt(endTime.split(':')[1]);
                                    
                                    // Calculate duration in hours (round up for partial hours)
                                    let duration = endHour - startHour;
                                    if (endMinute > 0) duration += 1;
                                    
                                    // Ensure minimum duration of 1 hour
                                    duration = Math.max(1, duration);
                                    
                                    // Calculate the height based on duration (each hour = 45px)
                                    const height = Math.max(35, duration * 45 - 3);
                                    
                                    const activityName = (activity.name || 'Unnamed Activity').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                    const activityStartTime = formatTime(activity.startTime || '');
                                    const activityEndTime = formatTime(activity.endTime || '');
                                    
                                    return `
                                        <div class="activity-item ${activity.type || 'other'}" 
                                             onclick="editActivity('${activity.id}')"
                                             title="Click to edit - ${activityName}"
                                             style="height: ${height}px; position: absolute; top: 0; left: 0; right: 0; z-index: 10;">
                                            <div class="activity-name">${activityName}</div>
                                            <div class="activity-time">${activityStartTime} - ${activityEndTime}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        });
    }
    
    weeklyTableBody.innerHTML = tableHTML;
}

// Make functions globally available for onclick handlers
window.editActivity = editActivity;
window.deleteActivity = deleteActivity;
