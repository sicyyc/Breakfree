// Activity Log JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize activity log functionality
    initializeActivityLog();
});

function initializeActivityLog() {
    // Add event listeners for filters
    setupFilters();
    
    // Add event listeners for table interactions
    setupTableInteractions();
    
    // Initialize real-time updates (if needed)
    setupRealTimeUpdates();
}

function setupFilters() {
    // Auto-submit form when filters change
    const filterSelects = document.querySelectorAll('.filter-select');
    const filterInputs = document.querySelectorAll('.filter-input');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Add a small delay to allow multiple selections
            setTimeout(() => {
                select.closest('form').submit();
            }, 100);
        });
    });
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            input.closest('form').submit();
        });
    });
}

function setupTableInteractions() {
    // Add hover effects and click handlers for table rows
    const tableRows = document.querySelectorAll('.activity-row');
    
    tableRows.forEach(row => {
        row.addEventListener('click', function() {
            // Toggle row selection
            row.classList.toggle('selected');
        });
        
        // Add data labels for mobile responsiveness
        const cells = row.querySelectorAll('td');
        const labels = ['User', 'Action', 'Details', 'Target', 'Timestamp', 'IP Address'];
        
        cells.forEach((cell, index) => {
            if (index < labels.length) {
                cell.setAttribute('data-label', labels[index]);
            }
        });
    });
}

function setupRealTimeUpdates() {
    // Check for new activities every 30 seconds
    setInterval(checkForNewActivities, 30000);
}

function checkForNewActivities() {
    // Get current page and filters
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = urlParams.get('page') || 1;
    const userFilter = urlParams.get('user') || '';
    const actionFilter = urlParams.get('action') || '';
    const dateFilter = urlParams.get('date') || '';
    
    // Make AJAX request to check for new activities
    fetch(`/api/activity-log/check-updates?page=${currentPage}&user=${userFilter}&action=${actionFilter}&date=${dateFilter}`)
        .then(response => response.json())
        .then(data => {
            if (data.has_new_activities) {
                // Show notification
                showNotification('New activities detected. Refresh to view.', 'info');
            }
        })
        .catch(error => {
            console.error('Error checking for updates:', error);
        });
}

function exportLogs() {
    // Get current filters
    const urlParams = new URLSearchParams(window.location.search);
    const userFilter = urlParams.get('user') || '';
    const actionFilter = urlParams.get('action') || '';
    const dateFilter = urlParams.get('date') || '';
    
    // Show loading state
    const exportBtn = document.querySelector('button[onclick="exportLogs()"]');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fa-regular fa-spinner fa-spin"></i> Exporting...';
    exportBtn.disabled = true;
    
    // Make export request
    fetch('/api/activity-log/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user: userFilter,
            action: actionFilter,
            date: dateFilter
        })
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('Export failed');
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        showNotification('Activity log exported successfully!', 'success');
    })
    .catch(error => {
        console.error('Export error:', error);
        showNotification('Failed to export activity log. Please try again.', 'error');
    })
    .finally(() => {
        // Restore button state
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa-regular ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fa-regular fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${getNotificationColor(type)};
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#2ECC71';
        case 'error': return '#E74C3C';
        case 'warning': return '#F1C40F';
        default: return '#3498DB';
    }
}

// Add CSS for notifications
const notificationStyles = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
    }
    
    .notification-close:hover {
        background: #f0f0f0;
        color: #333;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}

// Search functionality
function searchActivities(query) {
    const rows = document.querySelectorAll('.activity-row');
    const searchTerm = query.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Add search input if not present
function addSearchInput() {
    if (!document.querySelector('.activity-search')) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'activity-search';
        searchContainer.innerHTML = `
            <input type="text" placeholder="Search activities..." 
                   onkeyup="searchActivities(this.value)" 
                   class="search-input">
        `;
        
        const tableContainer = document.querySelector('.table-container');
        tableContainer.insertBefore(searchContainer, tableContainer.firstChild);
    }
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', addSearchInput);
