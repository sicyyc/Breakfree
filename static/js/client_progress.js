// Client Progress Tracking JavaScript
// This file handles all progress-related functionality for client profiles

document.addEventListener('DOMContentLoaded', function() {
    console.log('Client Progress JS loaded');
    
    // Get client ID from the page
    const clientId = getCurrentClientId();
    
    if (!clientId) {
        console.error('No client ID found');
        return;
    }
    
    // Initialize progress tracking
    initializeProgressTracking(clientId);
});

function getCurrentClientId() {
    // Try to get client ID from URL or data attribute
    const pathParts = window.location.pathname.split('/');
    const clientIndex = pathParts.indexOf('client');
    
    if (clientIndex !== -1 && pathParts[clientIndex + 1]) {
        return pathParts[clientIndex + 1];
    }
    
    // Fallback: try to get from data attribute
    const profileElement = document.querySelector('[data-client-id]');
    if (profileElement) {
        return profileElement.getAttribute('data-client-id');
    }
    
    return null;
}

function initializeProgressTracking(clientId) {
    console.log('Initializing progress tracking for client:', clientId);
    
    // Load initial progress data
    loadClientProgress(clientId);
    
    // Load milestones
    loadMilestones(clientId);
    
    // Set up event listeners
    setupProgressEventListeners(clientId);
    
    // Initialize progress chart if element exists
    const chartElement = document.getElementById('progressChart');
    if (chartElement) {
        initializeProgressChart(clientId);
    }
}

async function loadClientProgress(clientId) {
    try {
        console.log('Loading progress for client:', clientId);
        
        const response = await fetch(`/api/client-progress/${clientId}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('Progress data loaded:', result.data);
            updateProgressDisplay(result.data);
        } else {
            console.error('Failed to load progress:', result.error);
            showProgressError('Failed to load progress data');
        }
    } catch (error) {
        console.error('Error loading progress:', error);
        showProgressError('Error loading progress data');
    }
}

function updateProgressDisplay(data) {
    console.log('Updating progress display with:', data);
    
    const progress = data.progress || {};
    
    // Update overall progress
    updateProgressBar('overallProgressFill', 'overallProgressText', progress.overall_progress || 0);
    
    // Update progress stats
    updateProgressStat('overallProgressStat', `${Math.round(progress.overall_progress || 0)}%`);
    updateProgressStat('engagementStat', `${(progress.engagement_score || 0).toFixed(1)}/10`);
    updateProgressStat('riskLevelStat', (progress.risk_level || 'low').toUpperCase());
    updateProgressStat('daysInTreatmentStat', progress.days_in_treatment || 0);
    updateProgressStat('progressTrend', progress.progress_trend || 'stable');
    
    // Update intervention section progress indicators
    updateProgressStat('engagementScore', `${(progress.engagement_score || 0).toFixed(1)}/10`);
    updateProgressStat('riskLevel', (progress.risk_level || 'low').toUpperCase());
    updateProgressStat('daysInTreatment', progress.days_in_treatment || 0);
    
    // Update risk level styling
    const riskElements = document.querySelectorAll('.risk-level');
    riskElements.forEach(element => {
        element.className = `risk-level risk-${progress.risk_level || 'low'}`;
    });
    
    // Check completion eligibility
    checkCompletionEligibility(progress.overall_progress || 0);
}

function updateProgressBar(fillId, textId, percentage) {
    const fillElement = document.getElementById(fillId);
    const textElement = document.getElementById(textId);
    
    if (fillElement) {
        fillElement.style.width = `${percentage}%`;
    }
    
    if (textElement) {
        textElement.textContent = `${Math.round(percentage)}%`;
    }
}

function updateProgressStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function checkCompletionEligibility(overallProgress) {
    console.log('Checking completion eligibility with progress:', overallProgress);
    
    const completeTreatmentBtn = document.getElementById('completeTreatmentBtn');
    
    if (!completeTreatmentBtn) {
        console.log('Complete treatment button not found');
        return;
    }
    
    // Get client status and care type from page data
    const clientStatus = getClientStatus();
    const clientCareType = getClientCareType();
    
    console.log('Client status:', clientStatus, 'Care type:', clientCareType);
    
    // Show complete treatment button if progress is 100% and client is eligible
    if (overallProgress >= 100 && clientStatus === 'active' && clientCareType === 'in_house') {
        console.log('Showing complete treatment button');
        completeTreatmentBtn.style.display = 'block';
        completeTreatmentBtn.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Complete Treatment (${Math.round(overallProgress)}% Progress)
        `;
    } else {
        console.log('Hiding complete treatment button');
        completeTreatmentBtn.style.display = 'none';
    }
}

function getClientStatus() {
    // Try to get from status badge
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        const statusText = statusBadge.textContent.trim().toLowerCase();
        return statusText;
    }
    
    // Fallback: try to get from data attribute
    const profileElement = document.querySelector('[data-client-status]');
    if (profileElement) {
        return profileElement.getAttribute('data-client-status');
    }
    
    return 'unknown';
}

function getClientCareType() {
    // Try to get from care type badge
    const careTypeBadge = document.querySelector('.care-type-badge');
    if (careTypeBadge) {
        const careTypeText = careTypeBadge.textContent.trim().toLowerCase();
        if (careTypeText.includes('after care') || careTypeText.includes('aftercare')) {
            return 'after_care';
        }
        return 'in_house';
    }
    
    // Fallback: try to get from data attribute
    const profileElement = document.querySelector('[data-client-care-type]');
    if (profileElement) {
        return profileElement.getAttribute('data-client-care-type');
    }
    
    return 'in_house';
}

function setupProgressEventListeners(clientId) {
    // Update Progress button
    const updateProgressBtn = document.getElementById('updateProgressBtn');
    if (updateProgressBtn) {
        updateProgressBtn.addEventListener('click', () => openUpdateProgressModal(clientId));
    }
    
    // Add Milestone button
    const addMilestoneBtn = document.getElementById('addMilestoneBtn');
    if (addMilestoneBtn) {
        addMilestoneBtn.addEventListener('click', () => openAddMilestoneModal(clientId));
    }
    
    // Update Milestone button
    const updateMilestoneBtn = document.getElementById('updateMilestoneBtn');
    if (updateMilestoneBtn) {
        updateMilestoneBtn.addEventListener('click', () => openUpdateMilestoneModal(clientId));
    }
}

function openUpdateProgressModal(clientId) {
    console.log('Opening update progress modal for client:', clientId);
    
    const modalHtml = `
        <div class="modal" id="updateProgressModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Update Progress</h3>
                    <button class="modal-close" onclick="closeModal('updateProgressModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="updateProgressForm">
                        <div class="form-group">
                            <label for="progressType">Progress Type</label>
                            <select id="progressType" required>
                                <option value="">Select Type</option>
                                <option value="milestone">Milestone Update</option>
                                <option value="assessment">Assessment</option>
                                <option value="status_update">Status Update</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="milestoneFields" style="display: none;">
                            <label for="milestoneTitle">Milestone Title</label>
                            <input type="text" id="milestoneTitle" placeholder="Enter milestone title">
                            
                            <label for="milestoneDescription">Description</label>
                            <textarea id="milestoneDescription" placeholder="Enter milestone description"></textarea>
                            
                            <label for="milestoneCategory">Category</label>
                            <select id="milestoneCategory">
                                <option value="general">General</option>
                                <option value="therapy">Therapy</option>
                                <option value="counseling">Counseling</option>
                                <option value="recreation">Recreation</option>
                                <option value="education">Education</option>
                            </select>
                            
                            <label for="milestoneStatus">Status</label>
                            <select id="milestoneStatus">
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="assessmentFields" style="display: none;">
                            <label for="assessmentCategory">Assessment Category</label>
                            <select id="assessmentCategory">
                                <option value="mood">Mood</option>
                                <option value="engagement">Engagement</option>
                                <option value="compliance">Compliance</option>
                                <option value="general">General</option>
                            </select>
                            
                            <label for="assessmentScore">Score (1-10)</label>
                            <input type="number" id="assessmentScore" min="1" max="10" placeholder="Enter score">
                            
                            <label for="assessmentNotes">Notes</label>
                            <textarea id="assessmentNotes" placeholder="Enter assessment notes"></textarea>
                        </div>
                        
                        <div class="form-group" id="statusFields" style="display: none;">
                            <label for="newStatus">New Status</label>
                            <select id="newStatus">
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="relapsed">Relapsed</option>
                                <option value="review">Under Review</option>
                            </select>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('updateProgressModal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Progress</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = document.getElementById('updateProgressModal');
    modal.classList.add('active');
    
    // Set up form handling
    const form = document.getElementById('updateProgressForm');
    const progressTypeSelect = document.getElementById('progressType');
    
    progressTypeSelect.addEventListener('change', toggleProgressFields);
    form.addEventListener('submit', (e) => handleUpdateProgress(e, clientId));
}

function openAddMilestoneModal(clientId) {
    console.log('Opening add milestone modal for client:', clientId);
    
    const modalHtml = `
        <div class="modal" id="addMilestoneModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Milestone</h3>
                    <button class="modal-close" onclick="closeModal('addMilestoneModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="addMilestoneForm">
                        <div class="form-group">
                            <label for="newMilestoneTitle">Title</label>
                            <input type="text" id="newMilestoneTitle" required placeholder="Enter milestone title">
                        </div>
                        
                        <div class="form-group">
                            <label for="newMilestoneDescription">Description</label>
                            <textarea id="newMilestoneDescription" required placeholder="Enter milestone description"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="newMilestoneCategory">Category</label>
                            <select id="newMilestoneCategory" required>
                                <option value="general">General</option>
                                <option value="therapy">Therapy</option>
                                <option value="counseling">Counseling</option>
                                <option value="recreation">Recreation</option>
                                <option value="education">Education</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="newMilestoneTargetDate">Target Date (Optional)</label>
                            <input type="date" id="newMilestoneTargetDate">
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('addMilestoneModal')">Cancel</button>
                            <button type="submit" class="btn-primary">Add Milestone</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = document.getElementById('addMilestoneModal');
    modal.classList.add('active');
    
    // Set up form handling
    const form = document.getElementById('addMilestoneForm');
    form.addEventListener('submit', (e) => handleAddMilestone(e, clientId));
}

function toggleProgressFields() {
    const progressType = document.getElementById('progressType').value;
    
    // Hide all field groups
    document.getElementById('milestoneFields').style.display = 'none';
    document.getElementById('assessmentFields').style.display = 'none';
    document.getElementById('statusFields').style.display = 'none';
    
    // Show relevant field group
    if (progressType === 'milestone') {
        document.getElementById('milestoneFields').style.display = 'block';
    } else if (progressType === 'assessment') {
        document.getElementById('assessmentFields').style.display = 'block';
    } else if (progressType === 'status_update') {
        document.getElementById('statusFields').style.display = 'block';
    }
}

async function handleUpdateProgress(e, clientId) {
    e.preventDefault();
    
    const progressType = document.getElementById('progressType').value;
    const data = { progress_type: progressType };
    
    if (progressType === 'milestone') {
        data.title = document.getElementById('milestoneTitle').value;
        data.description = document.getElementById('milestoneDescription').value;
        data.category = document.getElementById('milestoneCategory').value;
        data.status = document.getElementById('milestoneStatus').value;
    } else if (progressType === 'assessment') {
        data.category = document.getElementById('assessmentCategory').value;
        data.score = parseInt(document.getElementById('assessmentScore').value);
        data.notes = document.getElementById('assessmentNotes').value;
    } else if (progressType === 'status_update') {
        data.status = document.getElementById('newStatus').value;
    }
    
    try {
        const response = await fetch(`/api/client-progress/${clientId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('updateProgressModal');
            showProgressSuccess('Progress updated successfully!');
            // Reload progress data and milestones
            loadClientProgress(clientId);
            loadMilestones(clientId);
        } else {
            showProgressError(result.error || 'Failed to update progress');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showProgressError('Failed to update progress');
    }
}

async function handleAddMilestone(e, clientId) {
    e.preventDefault();
    
    const data = {
        progress_type: 'milestone',
        title: document.getElementById('newMilestoneTitle').value,
        description: document.getElementById('newMilestoneDescription').value,
        category: document.getElementById('newMilestoneCategory').value,
        target_date: document.getElementById('newMilestoneTargetDate').value || null
    };
    
    try {
        const response = await fetch(`/api/client-progress/${clientId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addMilestoneModal');
            showProgressSuccess('Milestone added successfully!');
            // Reload progress data and milestones
            loadClientProgress(clientId);
            loadMilestones(clientId);
        } else {
            showProgressError(result.error || 'Failed to add milestone');
        }
    } catch (error) {
        console.error('Error adding milestone:', error);
        showProgressError('Failed to add milestone');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function showProgressError(message) {
    showProgressNotification(message, 'error');
}

function showProgressSuccess(message) {
    showProgressNotification(message, 'success');
}

function showProgressNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `progress-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

function initializeProgressChart(clientId) {
    console.log('Initializing progress chart for client:', clientId);
    
    const ctx = document.getElementById('progressChart');
    if (!ctx || !window.Chart) {
        console.log('Chart.js not available or canvas not found');
        return;
    }
    
    // Create chart
    const progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Overall Progress',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Engagement Score',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Progress Over Time'
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
    
    // Load chart data
    loadProgressChartData(clientId, progressChart);
}

async function loadProgressChartData(clientId, chart, period = 'month') {
    try {
        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
            case 'week':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }
        
        const response = await fetch(`/api/client-progress/${clientId}/chart-data?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&period=${period}`);
        const result = await response.json();
        
        if (result.success && chart) {
            chart.data.labels = result.data.labels;
            chart.data.datasets[0].data = result.data.overall_progress;
            chart.data.datasets[1].data = result.data.engagement_scores;
            chart.update();
        }
    } catch (error) {
        console.error('Error loading progress chart data:', error);
    }
}

// Milestone editing functions
function openUpdateMilestoneModal(clientId, milestoneId = null) {
    console.log('Opening update milestone modal for client:', clientId, 'milestone:', milestoneId);
    
    // If milestoneId is provided, load existing milestone data
    let existingMilestone = null;
    if (milestoneId) {
        // Find milestone in current data
        const milestonesList = document.getElementById('milestonesList');
        const milestoneElement = milestonesList.querySelector(`[data-milestone-id="${milestoneId}"]`);
        if (milestoneElement) {
            existingMilestone = {
                id: milestoneId,
                title: milestoneElement.querySelector('.milestone-title span').textContent,
                description: milestoneElement.querySelector('.milestone-description').textContent,
                category: milestoneElement.querySelector('.milestone-category').textContent.toLowerCase(),
                status: milestoneElement.classList.contains('milestone-completed') ? 'completed' : 
                       milestoneElement.classList.contains('milestone-in_progress') ? 'in_progress' : 'pending'
            };
        }
    }
    
    const modalHtml = `
        <div class="modal" id="updateMilestoneModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${milestoneId ? 'Edit Milestone' : 'Update Milestone Status'}</h3>
                    <button class="modal-close" onclick="closeModal('updateMilestoneModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="updateMilestoneForm">
                        ${milestoneId ? `
                        <div class="form-group">
                            <label for="editMilestoneTitle">Title</label>
                            <input type="text" id="editMilestoneTitle" required placeholder="Enter milestone title" value="${existingMilestone ? existingMilestone.title : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="editMilestoneDescription">Description</label>
                            <textarea id="editMilestoneDescription" required placeholder="Enter milestone description">${existingMilestone ? existingMilestone.description : ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="editMilestoneCategory">Category</label>
                            <select id="editMilestoneCategory" required>
                                <option value="general" ${existingMilestone && existingMilestone.category === 'general' ? 'selected' : ''}>General</option>
                                <option value="therapy" ${existingMilestone && existingMilestone.category === 'therapy' ? 'selected' : ''}>Therapy</option>
                                <option value="counseling" ${existingMilestone && existingMilestone.category === 'counseling' ? 'selected' : ''}>Counseling</option>
                                <option value="recreation" ${existingMilestone && existingMilestone.category === 'recreation' ? 'selected' : ''}>Recreation</option>
                                <option value="education" ${existingMilestone && existingMilestone.category === 'education' ? 'selected' : ''}>Education</option>
                            </select>
                        </div>
                        ` : ''}
                        
                        <div class="form-group">
                            <label for="editMilestoneStatus">Status</label>
                            <select id="editMilestoneStatus" required>
                                <option value="pending" ${existingMilestone && existingMilestone.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="in_progress" ${existingMilestone && existingMilestone.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${existingMilestone && existingMilestone.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="failed" ${existingMilestone && existingMilestone.status === 'failed' ? 'selected' : ''}>Failed</option>
                            </select>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('updateMilestoneModal')">Cancel</button>
                            <button type="submit" class="btn-primary">${milestoneId ? 'Update Milestone' : 'Update Status'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = document.getElementById('updateMilestoneModal');
    modal.classList.add('active');
    
    // Set up form handling
    const form = document.getElementById('updateMilestoneForm');
    form.addEventListener('submit', (e) => handleUpdateMilestone(e, clientId, milestoneId));
}

async function handleUpdateMilestone(e, clientId, milestoneId) {
    e.preventDefault();
    
    const data = {
        progress_type: 'milestone',
        status: document.getElementById('editMilestoneStatus').value
    };
    
    if (milestoneId) {
        data.milestone_id = milestoneId;
        data.title = document.getElementById('editMilestoneTitle').value;
        data.description = document.getElementById('editMilestoneDescription').value;
        data.category = document.getElementById('editMilestoneCategory').value;
    }
    
    try {
        const response = await fetch(`/api/client-progress/${clientId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('updateMilestoneModal');
            showProgressSuccess('Milestone updated successfully!');
            // Reload progress data and milestones
            loadClientProgress(clientId);
            loadMilestones(clientId);
        } else {
            showProgressError(result.error || 'Failed to update milestone');
        }
    } catch (error) {
        console.error('Error updating milestone:', error);
        showProgressError('Failed to update milestone');
    }
}

function editMilestone(milestoneId) {
    const clientId = getCurrentClientId();
    if (clientId) {
        openUpdateMilestoneModal(clientId, milestoneId);
    }
}

// Load milestones function
async function loadMilestones(clientId) {
    try {
        const response = await fetch(`/api/client-progress/${clientId}/milestones`);
        const result = await response.json();
        
        if (result.success) {
            updateMilestonesDisplay(result.data);
        } else {
            console.error('Failed to load milestones:', result.error);
            updateMilestonesDisplay({
                milestones: [],
                progress_summary: {
                    total_milestones: 0,
                    completed_milestones: 0,
                    in_progress_milestones: 0,
                    pending_milestones: 0,
                    overall_progress: 0
                }
            });
        }
    } catch (error) {
        console.error('Error loading milestones:', error);
        updateMilestonesDisplay({
            milestones: [],
            progress_summary: {
                total_milestones: 0,
                completed_milestones: 0,
                in_progress_milestones: 0,
                pending_milestones: 0,
                overall_progress: 0
            }
        });
    }
}

function updateMilestonesDisplay(data) {
    const summary = data.progress_summary;
    
    // Update milestone counts
    const completedElement = document.getElementById('completedMilestones');
    const inProgressElement = document.getElementById('inProgressMilestones');
    const pendingElement = document.getElementById('pendingMilestones');
    
    if (completedElement) completedElement.textContent = summary.completed_milestones;
    if (inProgressElement) inProgressElement.textContent = summary.in_progress_milestones;
    if (pendingElement) pendingElement.textContent = summary.pending_milestones;
    
    // Update milestones list
    const milestonesList = document.getElementById('milestonesList');
    if (!milestonesList) return;
    
    milestonesList.innerHTML = '';
    
    if (data.milestones.length === 0) {
        milestonesList.innerHTML = '<p class="no-milestones">No milestones set yet. Click "Add Milestone" to create one.</p>';
        return;
    }
    
    data.milestones.forEach(milestone => {
        const milestoneElement = createMilestoneElement(milestone);
        milestonesList.appendChild(milestoneElement);
    });
}

function createMilestoneElement(milestone) {
    const div = document.createElement('div');
    div.className = `milestone-item milestone-${milestone.status}`;
    div.setAttribute('data-milestone-id', milestone.id);
    
    const statusIcon = {
        'completed': 'fas fa-check-circle',
        'in_progress': 'fas fa-clock',
        'pending': 'fas fa-circle',
        'failed': 'fas fa-times-circle'
    }[milestone.status] || 'fas fa-circle';
    
    div.innerHTML = `
        <div class="milestone-header">
            <div class="milestone-title">
                <i class="${statusIcon}"></i>
                <span>${milestone.title}</span>
            </div>
            <div class="milestone-actions">
                <button class="btn-small" onclick="editMilestone('${milestone.id}')" title="Edit Milestone">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small" onclick="openUpdateMilestoneModal('${getCurrentClientId()}', '${milestone.id}')" title="Update Status">
                    <i class="fas fa-sync"></i>
                </button>
            </div>
        </div>
        <div class="milestone-description">${milestone.description}</div>
        <div class="milestone-meta">
            <span class="milestone-category">${milestone.category}</span>
            ${milestone.target_date ? `<span class="milestone-date">Target: ${milestone.target_date}</span>` : ''}
        </div>
    `;
    
    return div;
}

// Export functions for global access
window.loadClientProgress = loadClientProgress;
window.updateProgressDisplay = updateProgressDisplay;
window.checkCompletionEligibility = checkCompletionEligibility;
window.closeModal = closeModal;
window.openUpdateMilestoneModal = openUpdateMilestoneModal;
window.editMilestone = editMilestone;
window.loadMilestones = loadMilestones;