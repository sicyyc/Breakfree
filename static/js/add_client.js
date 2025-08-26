document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const municipalitySelect = document.getElementById('municipality');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('street_address');
    const completeAddressInput = document.getElementById('complete_address');
    const latInput = document.getElementById('address_lat');
    const lngInput = document.getElementById('address_lng');

    // Load municipalities on page load
    fetch('/api/municipalities')
        .then(response => response.json())
        .then(municipalities => {
            municipalities.forEach(muni => {
                const option = new Option(muni.name, muni.id);
                option.dataset.lat = muni.lat;
                option.dataset.lng = muni.lng;
                municipalitySelect.add(option);
            });
        });

    // Handle municipality selection
    municipalitySelect.addEventListener('change', function() {
        // Clear barangay dropdown
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        
        // Store municipality coordinates
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            latInput.value = selectedOption.dataset.lat;
            lngInput.value = selectedOption.dataset.lng;
            
            // Load barangays for selected municipality
            fetch(`/api/barangays/${selectedOption.value}`)
                .then(response => response.json())
                .then(barangays => {
                    barangays.forEach(brgy => {
                        barangaySelect.add(new Option(brgy, brgy));
                    });
                });
        }
        updateCompleteAddress();
    });

    // Handle barangay selection
    barangaySelect.addEventListener('change', updateCompleteAddress);
    
    // Handle street address input
    streetAddressInput.addEventListener('input', updateCompleteAddress);

    // Function to update complete address
    function updateCompleteAddress() {
        const municipality = municipalitySelect.options[municipalitySelect.selectedIndex].text;
        const barangay = barangaySelect.value;
        const street = streetAddressInput.value.trim();

        let parts = [];
        if (street) parts.push(street);
        if (barangay) parts.push(barangay);
        if (municipality) parts.push(municipality);
        parts.push('Laguna');

        completeAddressInput.value = parts.join(', ');
    }

    // Enhanced Image Upload Handling
    const clientImage = document.getElementById('clientImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadArea = document.querySelector('.image-upload-area');

    // Handle drag and drop
    uploadArea.addEventListener('dragenter', preventDefaults, false);
    uploadArea.addEventListener('dragover', preventDefaults, false);
    uploadArea.addEventListener('dragleave', preventDefaults, false);
    uploadArea.addEventListener('drop', handleDrop, false);

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
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.classList.add('has-image');
            uploadArea.querySelector('.upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    clientImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && validateImage(file)) {
            displayPreview(file);
        }
    });

    // Form Validation and Submission
    const addClientForm = document.getElementById('addClientForm');
    let isSubmitting = false;

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

    function validateForm() {
        const requiredFields = addClientForm.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value) {
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
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (!errorDiv) {
            const div = document.createElement('div');
            div.className = 'field-error';
            div.textContent = `${field.getAttribute('placeholder') || field.getAttribute('name')} is required`;
            field.parentElement.appendChild(div);
        }
    }

    function hideFieldError(field) {
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    function showLoadingState() {
        const submitBtn = addClientForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Client...';
    }

    function hideLoadingState() {
        const submitBtn = addClientForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Add Client';
    }

    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
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
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add input event listeners for real-time validation
    const formInputs = addClientForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.hasAttribute('required')) {
                if (this.value) {
                    this.classList.remove('error');
                    hideFieldError(this);
                } else {
                    this.classList.add('error');
                    showFieldError(this);
                }
            }
        });
    });

    // Calculate age from birthday
    function calculateAge(birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    // Update age when birthday changes
    document.getElementById('clientBirthday').addEventListener('change', function() {
        const age = calculateAge(this.value);
        document.getElementById('clientAge').value = age;
    });

    // Format middle initial input
    document.getElementById('clientMiddleInitial').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        if (this.value && !this.value.endsWith('.')) {
            this.value += '.';
        }
    });
}); 