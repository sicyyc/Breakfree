import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    const roleSelect = document.getElementById('roleSelect');
    const roleDropdown = document.getElementById('roleDropdown');
    const roleInput = document.getElementById('roleInput');
    const errorMessage = document.getElementById('error-message');

    // Toggle dropdown when clicking the select button
    roleSelect.addEventListener('click', function(e) {
        e.preventDefault();
        roleDropdown.style.display = roleDropdown.style.display === 'block' ? 'none' : 'block';
        this.querySelector('.select-arrow').style.transform = 
            roleDropdown.style.display === 'block' ? 'rotate(180deg)' : '';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!roleSelect.contains(e.target)) {
            roleDropdown.style.display = 'none';
            roleSelect.querySelector('.select-arrow').style.transform = '';
        }
    });

    // Handle option selection
    document.querySelectorAll('.select-option').forEach(option => {
        option.addEventListener('click', function() {
            const value = this.dataset.value;
            const text = this.textContent;
            
            roleSelect.querySelector('span').textContent = text;
            roleInput.value = value;
            
            document.querySelectorAll('.select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            
            roleDropdown.style.display = 'none';
            roleSelect.querySelector('.select-arrow').style.transform = '';
        });
    });

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = roleInput.value;

            if (!role) {
                showError('Please select a role');
                return;
            }

            try {
                // Clear any previous error messages
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';

                // Sign in with Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Send login data to backend
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        'email': email,
                        'role': role,
                        'uid': user.uid
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Redirect to dashboard on success
                    window.location.href = data.redirect;
                } else {
                    // Show error message
                    showError(data.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Login failed. Please check your credentials.';
                
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password';
                        break;
                }
                
                showError(errorMessage);
            }
        });
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}); 