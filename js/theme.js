// ==================== THEME SYSTEM ====================

const ThemeManager = {
    // Get current theme
    getTheme: function() {
        return localStorage.getItem('theme') || 'dark';
    },

    // Set theme
    setTheme: function(theme) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon();
    },

    // Toggle theme
    toggle: function() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    // Update icon
    updateThemeIcon: function() {
        const theme = this.getTheme();
        const sunIcon = document.querySelector('.theme-icon-sun');
        const moonIcon = document.querySelector('.theme-icon-moon');

        if (sunIcon && moonIcon) {
            if (theme === 'light') {
                sunIcon.style.opacity = '1';
                moonIcon.style.opacity = '0.3';
            } else {
                sunIcon.style.opacity = '0.3';
                moonIcon.style.opacity = '1';
            }
        }
    },

    // Initialize
    init: function() {
        const savedTheme = this.getTheme();
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Add event listener to toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Update icon on load
        this.updateThemeIcon();
    }
};

// Initialize theme on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Make it global
window.ThemeManager = ThemeManager;
