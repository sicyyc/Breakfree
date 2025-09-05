document.addEventListener('DOMContentLoaded', function() {
    // Only run this code on the login page
    if (!document.getElementById('loginForm')) return;

    const roleSelect = document.getElementById('roleSelect');
    const roleDropdown = document.getElementById('roleDropdown');
    const roleInput = document.getElementById('roleInput');
    const form = document.getElementById('loginForm');
    const forgotPassword = document.getElementById('forgotPassword');
    
    // Only proceed if we have the required elements
    if (!roleSelect || !roleDropdown || !roleInput || !form) return;
    
    const selectOptions = roleDropdown.querySelectorAll('.select-option');

    // Toggle dropdown
    roleSelect.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = roleDropdown.classList.contains('show');
        
        if (isOpen) {
            roleDropdown.classList.remove('show');
            roleSelect.classList.remove('active');
        } else {
            roleDropdown.classList.add('show');
            roleSelect.classList.add('active');
        }
    });

    // Handle option selection
    selectOptions.forEach(function(option) {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            
            // Update button text
            roleSelect.querySelector('span').textContent = text;
            roleSelect.classList.add('has-value');
            
            // Update hidden input
            roleInput.value = value;
            
            // Update selected state
            selectOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            // Close dropdown
            roleDropdown.classList.remove('show');
            roleSelect.classList.remove('active');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!roleSelect.contains(e.target) && !roleDropdown.contains(e.target)) {
            roleDropdown.classList.remove('show');
            roleSelect.classList.remove('active');
        }
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!roleInput.value) {
            alert('Please select your role');
            return;
        }
        
        const button = this.querySelector('.login-button');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<span>Logging in...</span>';
        button.style.background = 'linear-gradient(135deg, #4682A9 0%, #91C8E4 100%)';
        button.disabled = true;
        
        // Submit the form
        this.submit();
    });

    // Forgot password
    forgotPassword.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Password reset functionality would be implemented here');
    });

    // Input focus effects
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.01)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
}); 