// ==================== AUTH PAGES FUNCTIONALITY ====================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('cadastro.html')) {
        AuthUtil.redirectIfLoggedIn();
    }

    // ==================== LOGIN PAGE ====================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const togglePassword = document.getElementById('togglePassword');

        // Toggle password visibility
        if (togglePassword) {
            togglePassword.addEventListener('click', function() {
                const passwordInput = document.getElementById('password');
                const icon = this.querySelector('i');

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }

        // Handle login form submission
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            // Find user
            const user = StorageUtil.findUserByEmail(email);

            if (!user) {
                NotificationUtil.show('Usuário não encontrado', 'error');
                return;
            }

            if (user.password !== password) {
                NotificationUtil.show('Senha incorreta', 'error');
                return;
            }

            // Save current user
            AuthUtil.setCurrentUser({
                email: user.email,
                name: user.name,
                country: user.country,
                phone: user.phone
            });

            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }

            NotificationUtil.show('Login realizado com sucesso!', 'success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        });

        // Social login placeholders
        const socialButtons = document.querySelectorAll('.btn-social');
        socialButtons.forEach(button => {
            button.addEventListener('click', function() {
                NotificationUtil.show('Login social em desenvolvimento', 'info');
            });
        });
    }

    // ==================== REGISTER PAGE ====================
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const passwordStrength = document.getElementById('passwordStrength');

        // Toggle password visibility
        if (togglePassword) {
            togglePassword.addEventListener('click', function() {
                const icon = this.querySelector('i');

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }

        if (toggleConfirmPassword) {
            toggleConfirmPassword.addEventListener('click', function() {
                const icon = this.querySelector('i');

                if (confirmPasswordInput.type === 'password') {
                    confirmPasswordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    confirmPasswordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }

        // Password strength indicator
        if (passwordInput && passwordStrength) {
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                const strength = calculatePasswordStrength(password);

                passwordStrength.className = 'password-strength';
                if (strength > 0) {
                    passwordStrength.classList.add(
                        strength < 40 ? 'weak' :
                        strength < 70 ? 'medium' : 'strong'
                    );
                }
            });
        }

        // Handle register form submission
        cadastroForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const country = document.getElementById('country').value;
            const phone = document.getElementById('phone').value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const acceptTerms = document.getElementById('acceptTerms').checked;

            // Validations
            if (!acceptTerms) {
                NotificationUtil.show('Você precisa aceitar os termos de uso', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                NotificationUtil.show('As senhas não coincidem', 'error');
                return;
            }

            if (password.length < 6) {
                NotificationUtil.show('A senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }

            // Check if user already exists
            const existingUser = StorageUtil.findUserByEmail(email);
            if (existingUser) {
                NotificationUtil.show('Este e-mail já está cadastrado', 'error');
                return;
            }

            // Create user
            const newUser = {
                name,
                email,
                country,
                phone,
                password,
                createdAt: new Date().toISOString(),
                verified: false
            };

            StorageUtil.addUser(newUser);

            NotificationUtil.show('Conta criada com sucesso!', 'success');

            setTimeout(() => {
                // Auto login
                AuthUtil.setCurrentUser({
                    email: newUser.email,
                    name: newUser.name,
                    country: newUser.country,
                    phone: newUser.phone
                });

                window.location.href = 'dashboard.html';
            }, 1000);
        });

        // Social login placeholders
        const socialButtons = document.querySelectorAll('.btn-social');
        socialButtons.forEach(button => {
            button.addEventListener('click', function() {
                NotificationUtil.show('Cadastro social em desenvolvimento', 'info');
            });
        });
    }
});

// ==================== PASSWORD STRENGTH CALCULATOR ====================
function calculatePasswordStrength(password) {
    if (password.length === 0) return 0;

    let strength = 0;

    // Length
    strength += Math.min(password.length * 4, 40);

    // Lowercase
    if (/[a-z]/.test(password)) strength += 10;

    // Uppercase
    if (/[A-Z]/.test(password)) strength += 10;

    // Numbers
    if (/[0-9]/.test(password)) strength += 10;

    // Special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;

    // Variety
    const uniqueChars = new Set(password).size;
    strength += Math.min(uniqueChars * 2, 20);

    return Math.min(strength, 100);
}
