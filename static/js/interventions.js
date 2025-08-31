document.addEventListener('DOMContentLoaded', function() {
    // Initialize the interventions page
    initializeInterventionsPage();
    
    // Initialize export dropdown functionality
    initializeExportDropdown();
    
    // Initialize modals
    initializeModals();
    
    // Initialize search and filters
    initializeSearchAndFilters();
    
    // Initialize action buttons
    initializeActionButtons();
});

function initializeInterventionsPage() {
    console.log('Interventions page initialized');
    
    // Add any page-specific initialization here
    // For example, loading intervention data from the backend
    loadInterventionData();
}

function initializeExportDropdown() {
    const exportBtn = document.getElementById('exportDropdownBtn');
    const exportMenu = document.getElementById('exportMenu');
    
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            exportMenu.classList.toggle('active');
        });
        
        document.addEventListener('click', function() {
            exportMenu.classList.remove('active');
        });
        
        // Handle export options
        const exportItems = document.querySelectorAll('.export-item');
        exportItems.forEach(item => {
            item.addEventListener('click', function() {
                const exportType = this.dataset.export;
                handleExport(exportType);
            });
        });
    }
}

function initializeModals() {
    // Create Intervention Modal
    const createModal = document.getElementById('createInterventionModal');
    const createBtn = document.getElementById('createInterventionBtn');
    const closeCreateBtn = createModal?.querySelector('.modal-close');
    
    if (createBtn && createModal) {
        createBtn.addEventListener('click', () => {
            createModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        if (closeCreateBtn) {
            closeCreateBtn.addEventListener('click', () => {
                createModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }
    }
    
    // Intervention Scan Modal
    const scanModal = document.getElementById('interventionScanModal');
    const scanBtn = document.getElementById('interventionScanBtn');
    const closeScanBtn = scanModal?.querySelector('.modal-close');
    const cancelScanBtn = document.getElementById('cancelScan');
    
    if (scanBtn && scanModal) {
        scanBtn.addEventListener('click', () => {
            scanModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Load clients when modal opens
            loadClientsFromFirebase();
        });
        
        if (closeScanBtn) {
            closeScanBtn.addEventListener('click', () => {
                scanModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                resetScanModal();
            });
        }
        
        if (cancelScanBtn) {
            cancelScanBtn.addEventListener('click', () => {
                scanModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                resetScanModal();
            });
        }
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        document.body.style.overflow = 'auto';
        }
    });

    // Handle form submission
    const interventionForm = document.getElementById('interventionForm');
    if (interventionForm) {
        interventionForm.addEventListener('submit', handleInterventionFormSubmit);
    }
    
    // Handle scan functionality
    initializeScanFunctionality();
}

function initializeSearchAndFilters() {
    // Search functionality
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterInterventions(searchTerm);
        });
    }
    
    // Filter functionality
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            applyFilters();
        });
    });
    
    // Date filter functionality
    const dateInputs = document.querySelectorAll('.date-input input');
    dateInputs.forEach(input => {
        input.addEventListener('change', function() {
            applyDateFilters();
        });
    });
}

function initializeActionButtons() {
    // View Details buttons
    const viewButtons = document.querySelectorAll('.action-btn[title="View Details"]');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            viewInterventionDetails(interventionId);
        });
    });
    
    // Edit buttons
    const editButtons = document.querySelectorAll('.action-btn[title="Edit"]');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            editIntervention(interventionId);
        });
    });
    
    // Track Progress buttons
    const progressButtons = document.querySelectorAll('.action-btn[title="Track Progress"]');
    progressButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            trackProgress(interventionId);
        });
    });
    
    // Archive buttons
    const archiveButtons = document.querySelectorAll('.action-btn[title="Archive"]');
    archiveButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            archiveIntervention(interventionId);
        });
    });
    
    // Send Reminder buttons
    const reminderButtons = document.querySelectorAll('.action-btn[title="Send Reminder"]');
    reminderButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            sendReminder(interventionId);
        });
    });
    
    // Send Urgent Reminder buttons
    const urgentReminderButtons = document.querySelectorAll('.action-btn[title="Send Urgent Reminder"]');
    urgentReminderButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const interventionId = row.dataset.interventionId;
            sendUrgentReminder(interventionId);
        });
    });
}

function initializeScanFunctionality() {
    const startScanBtn = document.getElementById('startScan');
    const uploadQRBtn = document.getElementById('uploadQRBtn');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    
    if (startScanBtn) {
        startScanBtn.addEventListener('click', startQRScan);
    }
    
    if (uploadQRBtn) {
        uploadQRBtn.addEventListener('click', uploadQRImage);
    }
    
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', openManualEntry);
    }
}

// Data handling functions
function loadInterventionData() {
    // This function would typically fetch data from the backend
    // For now, we'll use the sample data already in the HTML
    console.log('Loading intervention data...');
    
    // Simulate API call
    setTimeout(() => {
        console.log('Intervention data loaded');
        updateProgressBars();
    }, 500);
}

function filterInterventions(searchTerm) {
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const title = row.cells[1].textContent.toLowerCase();
        const client = row.cells[2].textContent.toLowerCase();
        const category = row.cells[3].textContent.toLowerCase();
        
        if (title.includes(searchTerm) || client.includes(searchTerm) || category.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function applyFilters() {
    const statusFilter = document.querySelector('select[data-filter="status"]').value;
    const categoryFilter = document.querySelector('select[data-filter="category"]').value;
    
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const status = row.cells[4].textContent.toLowerCase();
        const category = row.cells[3].textContent.toLowerCase();
        
        const statusMatch = statusFilter === 'all' || status.includes(statusFilter);
        const categoryMatch = categoryFilter === 'all' || category.includes(categoryFilter);
        
        if (statusMatch && categoryMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function applyDateFilters() {
    const fromDate = document.querySelector('input[aria-label="From date"]').value;
    const toDate = document.querySelector('input[aria-label="To date"]').value;
    
    if (!fromDate && !toDate) {
        // Show all rows if no dates are selected
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => row.style.display = '');
        return;
    }
    
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const assignedDate = row.cells[5].textContent;
        const dueDate = row.cells[6].textContent;
        
        let showRow = true;
        
        if (fromDate && assignedDate < fromDate) {
            showRow = false;
        }
        
        if (toDate && dueDate > toDate) {
            showRow = false;
        }
        
        row.style.display = showRow ? '' : 'none';
    });
}

// Action functions
function viewInterventionDetails(interventionId) {
    console.log(`Viewing details for intervention: ${interventionId}`);
    // Implement view details functionality
    alert(`Viewing details for intervention: ${interventionId}`);
}

function editIntervention(interventionId) {
    console.log(`Editing intervention: ${interventionId}`);
    // Implement edit functionality
    alert(`Editing intervention: ${interventionId}`);
}

function trackProgress(interventionId) {
    console.log(`Tracking progress for intervention: ${interventionId}`);
    // Implement progress tracking functionality
    alert(`Tracking progress for intervention: ${interventionId}`);
}

function archiveIntervention(interventionId) {
    if (confirm('Are you sure you want to archive this intervention?')) {
        console.log(`Archiving intervention: ${interventionId}`);
        // Implement archive functionality
        alert(`Intervention ${interventionId} archived successfully`);
    }
}

function sendReminder(interventionId) {
    console.log(`Sending reminder for intervention: ${interventionId}`);
    // Implement reminder functionality
    alert(`Reminder sent for intervention: ${interventionId}`);
}

function sendUrgentReminder(interventionId) {
    console.log(`Sending urgent reminder for intervention: ${interventionId}`);
    // Implement urgent reminder functionality
    alert(`Urgent reminder sent for intervention: ${interventionId}`);
}

// Export functionality
function handleExport(exportType) {
    console.log(`Exporting data: ${exportType}`);
    
    switch (exportType) {
        case 'filtered':
            exportFilteredData();
            break;
        case 'all':
            exportAllData();
            break;
        case 'status':
            exportByStatus();
            break;
        case 'category':
            exportByCategory();
            break;
        default:
            console.log('Unknown export type:', exportType);
    }
}

function exportFilteredData() {
    // Implement filtered data export
    alert('Exporting filtered data...');
}

function exportAllData() {
    // Implement all data export
    alert('Exporting all data...');
}

function exportByStatus() {
    // Implement status-based export
    alert('Exporting by status...');
}

function exportByCategory() {
    // Implement category-based export
    alert('Exporting by category...');
}

// Form handling
function handleInterventionFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const interventionData = Object.fromEntries(formData.entries());
    
    console.log('Intervention form submitted:', interventionData);
    
    // Here you would typically send the data to the backend
    // For now, we'll just show a success message
    
    alert('Intervention created successfully!');
    
    // Close the modal
    const modal = document.getElementById('createInterventionModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset the form
    e.target.reset();
}

// Multi-step scan functionality
let currentStep = 1;
let selectedClient = null;
let clientsData = [];

function initializeScanFunctionality() {
    const startScanBtn = document.getElementById('startScan');
    const uploadQRBtn = document.getElementById('uploadQRBtn');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    const nextStepBtn = document.getElementById('nextStep');
    const backStepBtn = document.getElementById('backStep');
    const saveInterventionBtn = document.getElementById('saveInterventionFromScan');
    
    if (startScanBtn) {
        startScanBtn.addEventListener('click', startQRScan);
    }
    
    if (uploadQRBtn) {
        uploadQRBtn.addEventListener('click', uploadQRImage);
    }
    
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', openManualEntry);
    }
    
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', nextStep);
    }
    
    if (backStepBtn) {
        backStepBtn.addEventListener('click', previousStep);
    }
    
    if (saveInterventionBtn) {
        saveInterventionBtn.addEventListener('click', saveInterventionFromScan);
    }
    
    // Initialize client search
    const clientSearchInput = document.getElementById('clientSearchInput');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', filterClients);
    }
    
    // Load clients when scan modal opens
    const scanModal = document.getElementById('interventionScanModal');
    if (scanModal) {
        scanModal.addEventListener('show.bs.modal', loadClientsFromFirebase);
    }
}

function loadClientsFromFirebase() {
    console.log('Loading clients from Firebase...');
    
    const clientsList = document.getElementById('clientsList');
    if (!clientsList) return;
    
    // Show loading state
    clientsList.innerHTML = `
        <div class="loading-clients">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading clients...</p>
        </div>
    `;
    
    // Fetch clients from API
    fetch('/api/clients/list')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                clientsData = data.clients;
                displayClients(clientsData);
            } else {
                throw new Error(data.error || 'Failed to load clients');
            }
        })
        .catch(error => {
            console.error('Error loading clients:', error);
            clientsList.innerHTML = `
                <div class="error-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading clients: ${error.message}</p>
                    <button class="btn-secondary" onclick="loadClientsFromFirebase()">Retry</button>
                </div>
            `;
        });
}

function displayClients(clients) {
    const clientsList = document.getElementById('clientsList');
    if (!clientsList) return;
    
    if (clients.length === 0) {
        clientsList.innerHTML = `
            <div class="no-clients">
                <i class="fas fa-users"></i>
                <p>No clients found</p>
            </div>
        `;
        return;
    }
    
    clientsList.innerHTML = clients.map(client => `
        <div class="client-item" data-client-id="${client.id}" onclick="selectClient('${client.id}')">
            <div class="client-avatar">
                ${client.name.charAt(0).toUpperCase()}
            </div>
            <div class="client-info">
                <div class="client-name-display">${client.name}</div>
                <div class="client-details">
                    ID: ${client.clientId} | Age: ${client.age} | ${client.gender}
                </div>
            </div>
            <div class="client-status ${client.status}">
                ${client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </div>
        </div>
    `).join('');
}

function selectClient(clientId) {
    // Remove previous selection
    const previousSelected = document.querySelector('.client-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // Select new client
    const clientItem = document.querySelector(`[data-client-id="${clientId}"]`);
    if (clientItem) {
        clientItem.classList.add('selected');
    }
    
    selectedClient = clientsData.find(client => client.id === clientId);
    console.log('Selected client:', selectedClient);
}

function filterClients() {
    const searchTerm = document.getElementById('clientSearchInput').value.toLowerCase();
    const filteredClients = clientsData.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        client.clientId.toLowerCase().includes(searchTerm)
    );
    displayClients(filteredClients);
}

function nextStep() {
    if (currentStep === 1) {
        // Step 1 to Step 2: Client Selection to QR Scan
        if (!selectedClient) {
            alert('Please select a client first');
            return;
        }
        
        document.getElementById('clientSelectionStep').style.display = 'none';
        document.getElementById('qrScanStep').style.display = 'block';
        document.getElementById('selectedClientName').textContent = selectedClient.name;
        
        document.getElementById('nextStep').style.display = 'none';
        document.getElementById('startScan').style.display = 'inline-block';
        document.getElementById('backStep').style.display = 'inline-block';
        
        currentStep = 2;
        
    } else if (currentStep === 2) {
        // Step 2 to Step 3: QR Scan to Intervention Details
        // This would typically happen after successful QR scan
        // For now, we'll simulate it
        document.getElementById('qrScanStep').style.display = 'none';
        document.getElementById('interventionDetailsStep').style.display = 'block';
        
        document.getElementById('startScan').style.display = 'none';
        document.getElementById('saveInterventionFromScan').style.display = 'inline-block';
        
        currentStep = 3;
    }
}

function previousStep() {
    if (currentStep === 2) {
        // Step 2 to Step 1: QR Scan to Client Selection
        document.getElementById('qrScanStep').style.display = 'none';
        document.getElementById('clientSelectionStep').style.display = 'block';
        
        document.getElementById('startScan').style.display = 'none';
        document.getElementById('backStep').style.display = 'none';
        document.getElementById('nextStep').style.display = 'inline-block';
        
        currentStep = 1;
        
    } else if (currentStep === 3) {
        // Step 3 to Step 2: Intervention Details to QR Scan
        document.getElementById('interventionDetailsStep').style.display = 'none';
        document.getElementById('qrScanStep').style.display = 'block';
        
        document.getElementById('saveInterventionFromScan').style.display = 'none';
        document.getElementById('startScan').style.display = 'inline-block';
        
        currentStep = 2;
    }
}

function resetScanModal() {
    currentStep = 1;
    selectedClient = null;
    
    // Reset all steps
    document.getElementById('clientSelectionStep').style.display = 'block';
    document.getElementById('qrScanStep').style.display = 'none';
    document.getElementById('interventionDetailsStep').style.display = 'none';
    
    // Reset buttons
    document.getElementById('nextStep').style.display = 'inline-block';
    document.getElementById('startScan').style.display = 'none';
    document.getElementById('backStep').style.display = 'none';
    document.getElementById('saveInterventionFromScan').style.display = 'none';
    
    // Clear selections
    const selectedItems = document.querySelectorAll('.client-item.selected');
    selectedItems.forEach(item => item.classList.remove('selected'));
    
    // Clear search
    const searchInput = document.getElementById('clientSearchInput');
    if (searchInput) searchInput.value = '';
    
    // Reload clients
    loadClientsFromFirebase();
}

// Scan functionality
function startQRScan() {
    console.log('Starting QR scan...');
    
    // This would typically initialize a camera or QR scanner
    // For now, we'll simulate the scanning process
    
    const scanFrame = document.querySelector('.scan-frame');
    if (scanFrame) {
        scanFrame.style.borderColor = '#4CAF50';
        scanFrame.style.borderStyle = 'solid';
        
        // Simulate scanning process
        setTimeout(() => {
            alert('QR Code scanned successfully!');
            scanFrame.style.borderColor = '';
            scanFrame.style.borderStyle = 'dashed';
            
            // Move to next step
            nextStep();
        }, 2000);
    }
}

function uploadQRImage() {
    console.log('Opening file upload for QR image...');
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('QR image uploaded:', file.name);
            alert(`QR image uploaded: ${file.name}`);
            
            // Move to next step (intervention details)
            nextStep();
        }
    });
    
    fileInput.click();
}

function openManualEntry() {
    console.log('Opening manual entry form...');
    
    // This could open a form for manual QR code entry
    const qrCode = prompt('Please enter the QR code manually:');
    if (qrCode) {
        console.log('Manual QR code entered:', qrCode);
        alert(`QR code entered: ${qrCode}`);
        
        // Move to next step (intervention details)
        nextStep();
    }
}

function saveInterventionFromScan() {
    console.log('Saving intervention from scan...');
    
    // Get form values
    const title = document.getElementById('interventionTitle').value;
    const category = document.getElementById('interventionCategory').value;
    const description = document.getElementById('interventionDescription').value;
    const dueDate = document.getElementById('interventionDueDate').value;
    const priority = document.getElementById('interventionPriority').value;
    
    // Validate form
    if (!title || !category || !description || !dueDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (!selectedClient) {
        alert('No client selected');
        return;
    }
    
    // Prepare intervention data
    const interventionData = {
        title: title,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        category: category,
        description: description,
        due_date: dueDate,
        priority: priority,
        status: 'pending',
        created_at: new Date().toISOString(),
        assigned_date: new Date().toISOString()
    };
    
    console.log('Intervention data to save:', interventionData);
    
    // Here you would typically send the data to the backend
    // For now, we'll just show a success message
    
    alert(`Intervention "${title}" created successfully for ${selectedClient.name}!`);
    
    // Close the modal and reset
    const modal = document.getElementById('interventionScanModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    resetScanModal();
    
    // Optionally refresh the interventions table
    // loadInterventionData();
}

// Utility functions
function updateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        if (width) {
            // Animate the progress bar
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        }
    });
}

// Add some visual enhancements
function addRowHoverEffects() {
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

// Initialize hover effects
document.addEventListener('DOMContentLoaded', function() {
    addRowHoverEffects();
});

// Make functions globally available for onclick handlers
window.selectClient = selectClient;
window.loadClientsFromFirebase = loadClientsFromFirebase; 