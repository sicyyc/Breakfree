document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements with null checks
    const municipalitySelect = document.getElementById('municipality');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('street_address');
    const completeAddressInput = document.getElementById('complete_address');
    const latInput = document.getElementById('address_lat');
    const lngInput = document.getElementById('address_lng');

    // Early return if required elements don't exist
    if (!municipalitySelect || !barangaySelect || !completeAddressInput) {
        console.error('Required form elements not found');
        return;
    }

    // Load municipalities on page load using Laguna Location API
    fetch('/api/municipalities')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to load municipalities`);
            }
            return response.json();
        })
        .then(data => {
            // Handle error response
            if (data.error) {
                throw new Error(data.error);
            }
            
            const municipalities = Array.isArray(data) ? data : [];
            
            if (municipalities.length === 0) {
                console.warn('No municipalities received from API');
                showNotification('No municipalities available. Please contact administrator.', 'warning');
                return;
            }
            
            // Sort municipalities by type (cities first) then by name
            municipalities.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'city' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            municipalities.forEach(muni => {
                const option = new Option(muni.name, muni.id);
                option.dataset.lat = muni.lat;
                option.dataset.lng = muni.lng;
                option.dataset.type = muni.type;
                option.dataset.population = muni.population || '';
                option.dataset.area = muni.area_km2 || '';
                municipalitySelect.add(option);
            });
            
            console.log(`Loaded ${municipalities.length} municipalities from Laguna Location API`);
            
            // Check if a municipality is already selected and load its barangays
            const selectedMunicipality = municipalitySelect.value;
            if (selectedMunicipality) {
                loadBarangaysForMunicipality(selectedMunicipality);
            }
        })
        .catch(error => {
            console.error('Error loading municipalities:', error);
            showNotification('Failed to load municipalities. Please refresh the page.', 'error');
        });

    // Function to load barangays for a municipality
    function loadBarangaysForMunicipality(municipalityId) {
        // Clear barangay dropdown
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        
        // Store municipality coordinates
        const selectedOption = municipalitySelect.querySelector(`option[value="${municipalityId}"]`);
        if (selectedOption) {
            latInput.value = selectedOption.dataset.lat;
            lngInput.value = selectedOption.dataset.lng;
            
            // Load barangays for selected municipality using new API
            fetch(`/api/barangays/${municipalityId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to load barangays');
                    }
                    return response.json();
                })
                .then(data => {
                    // Handle error response
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    const barangays = Array.isArray(data) ? data : [];
                    
                    // Sort barangays alphabetically
                    barangays.sort((a, b) => a.localeCompare(b));
                    
                    barangays.forEach(brgy => {
                        barangaySelect.add(new Option(brgy, brgy));
                    });
                    
                    console.log(`Loaded ${barangays.length} barangays for ${selectedOption.text}`);
                })
                .catch(error => {
                    console.error('Error loading barangays:', error);
                    showNotification('Failed to load barangays for selected municipality.', 'error');
                });
        }
        updateCompleteAddress();
    }

    // Handle municipality selection
    municipalitySelect.addEventListener('change', function() {
        if (this.value) {
            loadBarangaysForMunicipality(this.value);
        } else {
            // Clear barangay dropdown if no municipality selected
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            updateCompleteAddress();
        }
    });

    // Handle barangay selection
    barangaySelect.addEventListener('change', updateCompleteAddress);
    
    // Address validation button removed - no longer needed
    
    // Handle street address input
    if (streetAddressInput) {
        streetAddressInput.addEventListener('input', function() {
            updateCompleteAddress();
        });
    }

    // Function to update complete address
    function updateCompleteAddress() {
        const municipalityIndex = municipalitySelect.selectedIndex;
        const municipality = municipalityIndex > 0 ? municipalitySelect.options[municipalityIndex].text : '';
        const barangay = barangaySelect.value;
        const street = streetAddressInput ? streetAddressInput.value.trim() : '';

        let parts = [];
        if (street) parts.push(street);
        if (barangay) parts.push(barangay);
        if (municipality && municipality !== 'Select Municipality/City') parts.push(municipality);
        parts.push('Laguna');

        completeAddressInput.value = parts.join(', ');
    }

    // Address validation functions removed - no longer needed

    // Utility function to escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Enhanced Image Upload Handling
    const clientImage = document.getElementById('clientImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadArea = document.querySelector('.image-upload-area');

    // Handle drag and drop with null checks
    if (uploadArea) {
        uploadArea.addEventListener('dragenter', preventDefaults, false);
        uploadArea.addEventListener('dragover', preventDefaults, false);
        uploadArea.addEventListener('dragleave', preventDefaults, false);
        uploadArea.addEventListener('drop', handleDrop, false);
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
                clientImage.files = files;
            }
        }
    }

    function validateImage(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload a valid image file (JPG, PNG, or GIF)', 'error');
            return false;
        }
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Image size should be less than 2MB', 'error');
            return false;
        }
        return true;
    }

    function displayPreview(file) {
        if (!imagePreview) return;
        
        // Check file size before processing
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Image too large for preview', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.classList.add('has-image');
            const placeholder = uploadArea ? uploadArea.querySelector('.upload-placeholder') : null;
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    if (clientImage) {
        clientImage.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && validateImage(file)) {
                displayPreview(file);
            }
        });
    }

    // Form Validation and Submission
    const addClientForm = document.getElementById('addClientForm');
    let isSubmitting = false;

    if (addClientForm) {
        addClientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        if (!validateForm()) {
            return;
        }

        isSubmitting = true;
        showLoadingState();

        try {
            const formData = new FormData(this);
            
            // Send the form data to the server
            const response = await fetch('/clients/add', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Client added successfully!', 'success');
                // Wait a moment to show the success message before redirecting
                setTimeout(() => {
                    window.location.href = '/clients';
                }, 1500);
            } else {
                throw new Error(result.error || 'Failed to add client');
            }

        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Failed to add client. Please try again.', 'error');
        } finally {
            isSubmitting = false;
            hideLoadingState();
        }
        });
    }

    function validateForm() {
        if (!addClientForm) return false;
        
        const requiredFields = addClientForm.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            const value = field.value ? field.value.trim() : '';
            if (!value) {
                isValid = false;
                field.classList.add('error');
                showFieldError(field);
            } else {
                field.classList.remove('error');
                hideFieldError(field);
            }
        });

        if (!isValid) {
            showNotification('Please fill in all required fields', 'error');
        }

        return isValid;
    }

    function showFieldError(field) {
        if (!field.parentElement) return;
        
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (!errorDiv) {
            const div = document.createElement('div');
            div.className = 'field-error';
            div.textContent = `${field.getAttribute('placeholder') || field.getAttribute('name') || 'Field'} is required`;
            field.parentElement.appendChild(div);
        }
    }

    function hideFieldError(field) {
        if (!field.parentElement) return;
        
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    function showLoadingState() {
        if (!addClientForm) return;
        
        const submitBtn = addClientForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Client...';
        }
    }

    function hideLoadingState() {
        if (!addClientForm) return;
        
        const submitBtn = addClientForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Add Client';
        }
    }

    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        const iconClass = type === 'success' ? 'check-circle' : 'exclamation-circle';
        notification.innerHTML = `
            <i class="fas fa-${iconClass}"></i>
            <span>${escapeHtml(message)}</span>
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

    // Add input event listeners for real-time validation
    if (addClientForm) {
        const formInputs = addClientForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.hasAttribute('required')) {
                    const value = this.value ? this.value.trim() : '';
                    if (value) {
                        this.classList.remove('error');
                        hideFieldError(this);
                    } else {
                        this.classList.add('error');
                        showFieldError(this);
                    }
                }
            });
        });
    }

    // Calculate age from birthday
    function calculateAge(birthday) {
        const birthDate = new Date(birthday);
        
        // Validate date
        if (isNaN(birthDate.getTime())) {
            return 0;
        }
        
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return Math.max(0, age);
    }

    // Update age when birthday changes
    const clientBirthday = document.getElementById('clientBirthday');
    const clientAge = document.getElementById('clientAge');
    
    if (clientBirthday && clientAge) {
        clientBirthday.addEventListener('change', function() {
            const age = calculateAge(this.value);
            clientAge.value = age;
        });
    }

    // Format middle initial input
    const clientMiddleInitial = document.getElementById('clientMiddleInitial');
    if (clientMiddleInitial) {
        clientMiddleInitial.addEventListener('input', function() {
            let value = this.value.toUpperCase();
            if (value && !value.endsWith('.')) {
                value += '.';
            }
            this.value = value;
        });
    }

    // Street address input handling moved above
}); // End of DOMContentLoaded