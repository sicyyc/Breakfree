document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables for modal handling
    let modalElements = {
        addModal: null,
        addClientBtn: null,
        clientImage: null,
        imagePreview: null,
        uploadArea: null,
        addClientForm: null
    };

    // Function to initialize modal elements
    function initializeModalElements() {
        modalElements.addModal = document.getElementById('addClientModal');
        modalElements.addClientBtn = document.getElementById('addClientBtn');
        modalElements.clientImage = document.getElementById('clientImage');
        modalElements.imagePreview = document.getElementById('imagePreview');
        modalElements.uploadArea = document.querySelector('.image-upload-area');
        modalElements.addClientForm = document.getElementById('addClientForm');
    }

    // Initialize elements
    initializeModalElements();

    function openModal(modal) {
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function resetForm() {
        if (modalElements.addClientForm && modalElements.imagePreview && modalElements.uploadArea) {
            modalElements.addClientForm.reset();
            modalElements.imagePreview.innerHTML = '';
            modalElements.imagePreview.classList.remove('has-image');
            const uploadPlaceholder = modalElements.uploadArea.querySelector('.upload-placeholder');
            if (uploadPlaceholder) {
                uploadPlaceholder.style.display = 'flex';
            }
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            if (modal === modalElements.addModal) {
                resetForm();
            }
        }
    }

    // Only initialize modal functionality if elements exist
    if (modalElements.uploadArea) {
        // Handle drag and drop
        modalElements.uploadArea.addEventListener('dragenter', preventDefaults, false);
        modalElements.uploadArea.addEventListener('dragover', preventDefaults, false);
        modalElements.uploadArea.addEventListener('dragleave', preventDefaults, false);
        modalElements.uploadArea.addEventListener('drop', handleDrop, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        preventDefaults(e);
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (validateImage(file)) {
                displayPreview(file);
                modalElements.clientImage.files = files;
            }
        }
    }

    function validateImage(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPG, PNG, or GIF)');
            return false;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return false;
        }
        return true;
    }

    function displayPreview(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            modalElements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            modalElements.imagePreview.classList.add('has-image');
            modalElements.uploadArea.querySelector('.upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    if (modalElements.clientImage) {
        modalElements.clientImage.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && validateImage(file)) {
                displayPreview(file);
            }
        });
    }

    // Modal event listeners only if elements exist
    if (modalElements.addModal && modalElements.addClientBtn) {
        const closeAddModalBtn = modalElements.addModal.querySelector('.close-modal');
        const cancelAddModalBtn = modalElements.addModal.querySelector('.cancel-modal');
        
        modalElements.addClientBtn.addEventListener('click', () => openModal(modalElements.addModal));
        
        if (closeAddModalBtn) {
            closeAddModalBtn.addEventListener('click', () => closeModal(modalElements.addModal));
        }
        if (cancelAddModalBtn) {
            cancelAddModalBtn.addEventListener('click', () => closeModal(modalElements.addModal));
        }
        
        modalElements.addModal.addEventListener('click', function(e) {
            if (e.target === modalElements.addModal) {
                closeModal(modalElements.addModal);
            }
        });
    }

    // Handle form submission only if form exists
    if (modalElements.addClientForm) {
        let isSubmitting = false; // Flag to prevent multiple submissions

        modalElements.addClientForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (isSubmitting) return; // Prevent multiple submissions
            isSubmitting = true;

            const formData = new FormData(this);
            const clientData = {
                name: formData.get('name'),
                age: formData.get('age'),
                gender: formData.get('gender'),
                address: formData.get('address'),
                checkInDate: formData.get('checkInDate'),
                status: formData.get('status'),
                imageUrl: await handleImageUpload(formData.get('image'))
            };

            // Here you would typically send this data to your backend
            console.log('New client data:', clientData);
            
            // For demo purposes, add to table immediately
            addClientToTable(clientData);
            
            closeModal(modalElements.addModal);
            isSubmitting = false; // Reset submission flag
        });
    }

    async function handleImageUpload(file) {
        // In a real application, you would upload the file to your server
        // For demo purposes, we'll just create a data URL
        if (!file) return null;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    function addClientToTable(clientData) {
        const tbody = document.querySelector('.clients-table tbody');
        if (!tbody) return;
        
        const tr = document.createElement('tr');
        
        // Generate a temporary client ID (in production this would come from the server)
        const tempClientId = Date.now();
        
        tr.innerHTML = `
            <td>${clientData.name}</td>
            <td>${clientData.age}</td>
            <td>${clientData.gender}</td>
            <td>${clientData.address}</td>
            <td><span class="stage-badge stage-${clientData.status.toLowerCase()}" data-status="${clientData.status.toLowerCase()}">${clientData.status}</span></td>
            <td>${clientData.checkInDate}</td>
            <td></td>
            <td class="actions-cell">
                <a href="/client/${tempClientId}" class="action-btn" title="View Profile">
                    <i class="fas fa-user"></i>
                </a>
                <button class="action-btn" title="Flag for Review">
                    <i class="fas fa-flag"></i>
                </button>
                <button class="action-btn" title="Archive">
                    <i class="fas fa-archive"></i>
                </button>
            </td>
        `;
        
        tbody.insertBefore(tr, tbody.firstChild);
        
        // Add event listeners to flag and archive buttons
        const flagBtn = tr.querySelector('[title="Flag for Review"]');
        const archiveBtn = tr.querySelector('[title="Archive"]');
        
        if (flagBtn) flagBtn.addEventListener('click', () => toggleFlag(tr, clientData));
        if (archiveBtn) archiveBtn.addEventListener('click', () => archiveClient(tr, clientData));
    }

    function toggleFlag(row, clientData) {
        const flagsCell = row.querySelector('td:nth-child(7)');
        const currentFlag = flagsCell.querySelector('.flag-badge');
        
        if (currentFlag) {
            flagsCell.innerHTML = '';
        } else {
            flagsCell.innerHTML = '<span class="flag-badge">Review</span>';
        }
    }

    function archiveClient(row, clientData) {
        if (confirm('Are you sure you want to archive this client?')) {
            row.classList.add('archived');
            setTimeout(() => {
                row.remove();
            }, 500);
        }
    }

    // Enhanced Search and Filter functionality
    const searchInput = document.querySelector('.search-container input');
    const filterSelects = document.querySelectorAll('.filter-select');
    let searchTimeout;

    // FIXED: Initialize filters immediately instead of nested DOMContentLoaded
    initializeFilters();

    function initializeFilters() {
        console.log('Initializing filters...');
        
        // Initialize search and filters
        const searchInput = document.querySelector('.search-container input');
        const filterSelects = document.querySelectorAll('.filter-select');
        
        if (!searchInput) {
            console.error('Search input not found');
        }
        
        if (!filterSelects.length) {
            console.error('Filter selects not found');
        }

        if (!searchInput || !filterSelects.length) {
            console.error('Search or filter elements not found');
            return;
        }

        console.log('Found search input and', filterSelects.length, 'filter selects');

        // Add event listener for search input with debounce
        searchInput.addEventListener('input', () => {
            console.log('Search input changed:', searchInput.value);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => applyFilters(), 300);
        });

        // Add event listeners for filter selects
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                console.log('Filter select changed:', select.getAttribute('data-filter'), '=', select.value);
                applyFilters();
            });
        });

        // Initial filter application
        console.log('Applying initial filters...');
        applyFilters();
    }

    function resetFilters() {
        console.log('Resetting filters...');
        
        // Reset all filter selects to 'all'
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.value = 'all';
        });

        // Clear search input
        const searchInput = document.querySelector('.search-container input');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reapply filters
        applyFilters();
    }

    // Make resetFilters available globally for the reset button
    window.resetFilters = resetFilters;

    function applyFilters() {
        console.log('applyFilters called');
        try {
            // Get filter values
            const searchInput = document.querySelector('.search-container input');
            const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
            
            const statusSelect = document.querySelector('select[data-filter="status"]');
            const careTypeSelect = document.querySelector('select[data-filter="care_type"]');
            const ageSelect = document.querySelector('select[data-filter="age"]');
            const genderSelect = document.querySelector('select[data-filter="gender"]');
            
            if (!statusSelect || !careTypeSelect || !ageSelect || !genderSelect) {
                console.error('Filter elements not found', { statusSelect, careTypeSelect, ageSelect, genderSelect });
                return;
            }

            const statusFilter = statusSelect.value.toLowerCase();
            const careTypeFilter = careTypeSelect.value.toLowerCase();
            const ageFilter = ageSelect.value;
            const genderFilter = genderSelect.value.toLowerCase();

            console.log('Applying filters:', { statusFilter, careTypeFilter, ageFilter, genderFilter, searchTerm });
            
            // If we're filtering and not on page 1, redirect to page 1 to see all filtered results
            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = urlParams.get('page');
            const hasActiveFilters = searchTerm || statusFilter !== 'all' || careTypeFilter !== 'all' || 
                                   ageFilter !== 'all' || genderFilter !== 'all';
            
            if (hasActiveFilters && currentPage && currentPage !== '1') {
                // Build new URL with filters and reset to page 1
                const baseUrl = window.location.pathname;
                window.location.href = baseUrl + '?page=1';
                return;
            }
            
            // Get table rows
            const tbody = document.querySelector('.clients-table tbody');
            if (!tbody) {
                console.error('Table body not found');
                return;
            }

            // Get all client rows (excluding the no-results row)
            const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
                return !row.classList.contains('no-results') && !row.classList.contains('no-data') && row.cells.length > 1;
            });

            console.log('Found', rows.length, 'client rows to filter');

            let visibleCount = 0;

            // Filter rows
            rows.forEach(row => {
                try {
                    const cells = Array.from(row.cells);
                    const nameCell = cells[0].textContent.toLowerCase().trim();
                    const ageCell = parseInt(cells[1].textContent) || 0;
                    const genderCell = cells[2].textContent.toLowerCase().trim();
                    const addressCell = cells[3].textContent.toLowerCase().trim();
                    
                    // Get care type from the care type badge
                    const careTypeBadge = row.querySelector('.care-type-badge');
                    const careTypeValue = careTypeBadge ? 
                        (careTypeBadge.getAttribute('data-care-type') || '').toLowerCase() : '';
                    
                    // Get status from the stage badge
                    const statusBadge = row.querySelector('.stage-badge');
                    const statusValue = statusBadge ? 
                        (statusBadge.getAttribute('data-status') || statusBadge.classList.toString().match(/stage-(\w+)/)?.[1] || '').toLowerCase() : '';

                    // Apply filters
                    const matchesSearch = !searchTerm || 
                        nameCell.includes(searchTerm) || 
                        addressCell.includes(searchTerm);

                    const matchesStatus = statusFilter === 'all' || statusValue === statusFilter;
                    const matchesCareType = careTypeFilter === 'all' || careTypeValue === careTypeFilter;
                    const matchesGender = genderFilter === 'all' || genderCell === genderFilter;

                    let matchesAge = true;
                    if (ageFilter !== 'all') {
                        if (ageFilter === '45+') {
                            matchesAge = ageCell >= 45;
                        } else {
                            const [minAge, maxAge] = ageFilter.split('-').map(Number);
                            matchesAge = ageCell >= minAge && ageCell <= maxAge;
                        }
                    }

                    // Show/hide row based on all filters
                    const showRow = matchesSearch && matchesStatus && matchesCareType && matchesGender && matchesAge;
                    row.style.display = showRow ? '' : 'none';
                    if (showRow) visibleCount++;

                } catch (rowError) {
                    console.error('Error processing row:', rowError);
                }
            });

            console.log('Visible rows after filtering:', visibleCount);

            // Remove any existing no-results message
            const existingNoResults = tbody.querySelector('.no-results');
            if (existingNoResults) {
                existingNoResults.remove();
            }

            // Show no results message if needed
            if (visibleCount === 0 && rows.length > 0) {
                const noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results';
                
                let message = '';
                if (searchTerm) {
                    message = 'No matching clients found';
                } else {
                    const statusText = statusFilter === 'all' ? '' : 
                        `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)}`;
                    const careTypeText = careTypeFilter === 'all' ? '' :
                        `${careTypeFilter.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
                    
                    message = `No${statusText ? ' ' + statusText : ''}${careTypeText ? ' ' + careTypeText : ''} clients found`;
                    if (genderFilter !== 'all') {
                        message += ` (${genderFilter})`;
                    }
                    if (ageFilter !== 'all') {
                        message += ` in age group ${ageFilter}`;
                    }
                }

                tbody.insertAdjacentHTML('beforeend', `
                    <tr class="no-results">
                        <td colspan="9" class="no-data">
                            <div class="no-data-message">
                                <i class="fas fa-filter"></i>
                                <p>${message}</p>
                                <button class="btn-secondary" onclick="resetFilters()">
                                    <i class="fas fa-undo"></i> Reset Filters
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
            }
        } catch (error) {
            console.error('Error in applyFilters:', error);
        }
    }

    // Flag client
    window.toggleFlag = async function(clientId) {
        try {
            const response = await fetch(`/clients/${clientId}/flag`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Refresh the page to show updated flags
                location.reload();
            } else {
                showNotification(result.error || 'Failed to update flag', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to update flag', 'error');
        }
    };

    // Archive client
    window.archiveClient = async function(clientId) {
        if (!confirm('Are you sure you want to archive this client?')) {
            return;
        }

        try {
            const response = await fetch(`/clients/${clientId}/archive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Animate row removal
                const row = document.querySelector(`[data-client-id="${clientId}"]`);
                if (row) {
                    row.classList.add('fade-out');
                    setTimeout(() => {
                        row.remove();
                        showNotification('Client archived successfully', 'success');
                        
                        // Check if table is empty
                        const rows = document.querySelectorAll('.clients-table tbody tr:not(.no-results)');
                        if (rows.length === 0) {
                            location.reload(); // Reload to show empty state
                        }
                    }, 300);
                }
            } else {
                showNotification(result.error || 'Failed to archive client', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to archive client', 'error');
        }
    };

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}); 