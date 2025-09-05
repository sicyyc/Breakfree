document.addEventListener('DOMContentLoaded', function() {
    // User Management
    const addUserForm = document.getElementById('addUserForm');
    const usersList = document.getElementById('usersList');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const userSearch = document.getElementById('userSearch');

    // Toggle password visibility
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('newUserPassword');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Handle adding new user
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('newUserEmail').value;
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;

            if (!email || !password || !role) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            // Validate password strength
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long', 'error');
                return;
            }

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        role: role
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showMessage('User added successfully!', 'success');
                    addUserForm.reset();
                    
                    // Reload the page to show the new user
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showMessage(result.error || 'Failed to add user', 'error');
                }
            } catch (error) {
                console.error('Error adding user:', error);
                showMessage('Failed to add user. Please try again.', 'error');
            }
        });
    }

    // Search functionality
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#usersList tr');
            
            rows.forEach(row => {
                const email = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
                const role = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
                
                if (email.includes(searchTerm) || role.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Message toast functionality
    function showMessage(message, type = 'info') {
        const toast = document.getElementById('messageToast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastMessage) return;
        
        toastMessage.textContent = message;
        toast.className = 'message-toast';
        toast.classList.add(type);
        toast.style.display = 'block';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // Delete user function
    window.deleteUser = async function(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const result = await response.json();

                if (result.success) {
                    showMessage('User deleted successfully!', 'success');
                    // Reload the page to update the user list
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showMessage(result.error || 'Failed to delete user', 'error');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showMessage('Failed to delete user. Please try again.', 'error');
            }
        }
    };

    // Edit user function
    window.editUser = async function(userId) {
        // For now, just show a message. You can implement a modal for editing later
        showMessage('Edit functionality coming soon!', 'info');
    };

    // Collapsible sections
    const collapseButtons = document.querySelectorAll('.btn-collapse');
    collapseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const isCollapsed = targetElement.style.display === 'none';
                targetElement.style.display = isCollapsed ? 'block' : 'none';
                
                // Update button icon
                const icon = this.querySelector('i');
                if (isCollapsed) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            }
        });
    });

    // Settings toggles
    const settingsToggles = document.querySelectorAll('.switch input[type="checkbox"]');
    settingsToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const settingName = this.closest('.settings-item')?.querySelector('h4')?.textContent || 'Setting';
            console.log(`${settingName}: ${this.checked ? 'enabled' : 'disabled'}`);
            showMessage(`${settingName} ${this.checked ? 'enabled' : 'disabled'}`, 'success');
        });
    });

    // Select dropdowns
    const selectDropdowns = document.querySelectorAll('select');
    selectDropdowns.forEach(select => {
        select.addEventListener('change', function() {
            const settingName = this.closest('.settings-item')?.querySelector('h4')?.textContent || 'Setting';
            console.log(`${settingName}: ${this.value}`);
            showMessage(`${settingName} updated to ${this.value}`, 'success');
        });
    });

    // Edit role permissions function
    window.editRolePermissions = async function(roleClass) {
        showMessage('Role permissions editing coming soon!', 'info');
    };
}); 