// ==================== MOBILE MENU ====================
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');

            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translateY(8px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
});

// ==================== AUTH UTILITIES ====================
const AuthUtil = {
    // Check if user is logged in
    isLoggedIn: function() {
        return localStorage.getItem('currentUser') !== null;
    },

    // Get current user
    getCurrentUser: function() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set current user
    setCurrentUser: function(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    // Logout
    logout: function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },

    // Redirect if not logged in
    requireAuth: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    },

    // Redirect if already logged in
    redirectIfLoggedIn: function() {
        if (this.isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }
};

// ==================== STORAGE UTILITIES ====================
const StorageUtil = {
    // Get all users
    getUsers: function() {
        const usersStr = localStorage.getItem('users');
        return usersStr ? JSON.parse(usersStr) : [];
    },

    // Save users
    saveUsers: function(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },

    // Add user
    addUser: function(user) {
        const users = this.getUsers();
        users.push(user);
        this.saveUsers(users);
    },

    // Find user by email
    findUserByEmail: function(email) {
        const users = this.getUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    // Get all proposals
    getProposals: function() {
        const proposalsStr = localStorage.getItem('proposals');
        return proposalsStr ? JSON.parse(proposalsStr) : [];
    },

    // Save proposals
    saveProposals: function(proposals) {
        localStorage.setItem('proposals', JSON.stringify(proposals));
    },

    // Add proposal
    addProposal: function(proposal) {
        const proposals = this.getProposals();
        proposal.id = Date.now().toString();
        proposal.createdAt = new Date().toISOString();
        proposal.status = 'pending'; // pending, matched, completed, cancelled
        proposals.push(proposal);
        this.saveProposals(proposals);
        return proposal;
    },

    // Get user proposals
    getUserProposals: function(userEmail) {
        const proposals = this.getProposals();
        return proposals.filter(p => p.userEmail === userEmail);
    },

    // Update proposal
    updateProposal: function(proposalId, updates) {
        const proposals = this.getProposals();
        const index = proposals.findIndex(p => p.id === proposalId);
        if (index !== -1) {
            proposals[index] = { ...proposals[index], ...updates };
            this.saveProposals(proposals);
            return proposals[index];
        }
        return null;
    },

    // Delete proposal
    deleteProposal: function(proposalId) {
        const proposals = this.getProposals();
        const filtered = proposals.filter(p => p.id !== proposalId);
        this.saveProposals(filtered);
    },

    // Find matching proposals
    findMatches: function(fromCurrency, toCurrency, amount) {
        const proposals = this.getProposals();
        return proposals.filter(p =>
            p.status === 'pending' &&
            p.fromCurrency === toCurrency &&
            p.toCurrency === fromCurrency &&
            Math.abs(p.amount - amount) < amount * 0.1 // 10% tolerance
        );
    }
};

// ==================== NOTIFICATION UTILITIES ====================
const NotificationUtil = {
    show: function(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            margin-left: auto;
        `;

        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto close
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    },

    getIcon: function(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },

    getColor: function(type) {
        const colors = {
            success: '#00c853',
            error: '#ff5252',
            warning: '#ffa726',
            info: '#0099ff'
        };
        return colors[type] || colors.info;
    }
};

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-content i {
        font-size: 1.5rem;
    }
`;
document.head.appendChild(style);

// ==================== FORMAT UTILITIES ====================
const FormatUtil = {
    // Format currency
    formatCurrency: function(amount, currency) {
        const locales = {
            BRL: 'pt-BR',
            USD: 'en-US',
            EUR: 'pt-PT',
            AOA: 'pt-AO',
            CUP: 'es-CU',
            RUB: 'ru-RU',
            ZAR: 'en-ZA',
            NAD: 'en-NA',
            MZN: 'pt-MZ'
        };

        const locale = locales[currency] || 'en-US';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    // Format date
    formatDate: function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get country flag
    getCountryFlag: function(currency) {
        const flags = {
            BRL: '🇧🇷',
            USD: '🇺🇸',
            EUR: '🇵🇹',
            AOA: '🇦🇴',
            CUP: '🇨🇺',
            RUB: '🇷🇺',
            ZAR: '🇿🇦',
            NAD: '🇳🇦',
            MZN: '🇲🇿'
        };
        return flags[currency] || '🌍';
    },

    // Get currency name
    getCurrencyName: function(currency) {
        const names = {
            BRL: 'Real Brasileiro',
            USD: 'Dólar Americano',
            EUR: 'Euro',
            AOA: 'Kwanza Angolano',
            CUP: 'Peso Cubano',
            RUB: 'Rublo Russo',
            ZAR: 'Rand Sul-Africano',
            NAD: 'Dólar Namibiano',
            MZN: 'Metical Moçambicano'
        };
        return names[currency] || currency;
    },

    // Get payment method
    getPaymentMethod: function(currency) {
        const methods = {
            BRL: 'PIX',
            USD: 'Zelle / ACH',
            EUR: 'SEPA / MB Way',
            AOA: 'Multicaixa Express',
            CUP: 'Transfermóvil',
            RUB: 'SBP',
            ZAR: 'EFT',
            NAD: 'EFT',
            MZN: 'M-Pesa'
        };
        return methods[currency] || 'Transferência Bancária';
    }
};

// ==================== INITIALIZE DEMO DATA ====================
function initializeDemoData() {
    // Only initialize if no users exist
    if (StorageUtil.getUsers().length === 0) {
        // Add demo users
        const demoUsers = [
            {
                email: 'demo@transkwanza.com',
                password: 'demo123',
                name: 'Usuário Demo',
                country: 'BR',
                phone: '+5511999999999',
                createdAt: new Date().toISOString()
            }
        ];

        demoUsers.forEach(user => StorageUtil.addUser(user));

        // Add demo proposals
        const demoProposals = [
            {
                userEmail: 'demo@transkwanza.com',
                fromCurrency: 'BRL',
                toCurrency: 'EUR',
                amount: 5000,
                recipientName: 'João Silva',
                recipientPhone: '+351912345678',
                recipientEmail: 'joao@email.com'
            },
            {
                userEmail: 'other@email.com',
                fromCurrency: 'EUR',
                toCurrency: 'BRL',
                amount: 950,
                recipientName: 'Maria Santos',
                recipientPhone: '+5511988887777',
                recipientEmail: 'maria@email.com'
            },
            {
                userEmail: 'other@email.com',
                fromCurrency: 'USD',
                toCurrency: 'AOA',
                amount: 1000,
                recipientName: 'António Costa',
                recipientPhone: '+244912345678',
                recipientEmail: 'antonio@email.com'
            }
        ];

        demoProposals.forEach(proposal => StorageUtil.addProposal(proposal));
    }
}

// Initialize demo data on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDemoData);
} else {
    initializeDemoData();
}
