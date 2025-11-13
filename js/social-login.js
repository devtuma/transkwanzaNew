// ==================== SOCIAL LOGIN ====================

/**
 * Social Login Handler
 * Simula login social para GitHub Pages
 * Na produção, integrar com OAuth APIs reais
 */

const SocialLogin = {
    // Google Login
    google: function() {
        NotificationUtil.show('Redirecionando para Google...', 'info');

        // Simular login Google (para demo)
        setTimeout(() => {
            const mockUser = {
                email: `user.google${Date.now()}@gmail.com`,
                name: 'Usuário Google',
                country: 'BR',
                phone: '+5511900000000',
                provider: 'google',
                verified: true,
                createdAt: new Date().toISOString()
            };

            this.completeSocialLogin(mockUser, 'Google');
        }, 1500);

        /*
        // Produção - Integrar com Google OAuth:
        const clientId = 'SEU_GOOGLE_CLIENT_ID';
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
        const scope = encodeURIComponent('email profile');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
        window.location.href = authUrl;
        */
    },

    // Facebook Login
    facebook: function() {
        NotificationUtil.show('Redirecionando para Facebook...', 'info');

        setTimeout(() => {
            const mockUser = {
                email: `user.facebook${Date.now()}@facebook.com`,
                name: 'Usuário Facebook',
                country: 'BR',
                phone: '+5511900000001',
                provider: 'facebook',
                verified: true,
                createdAt: new Date().toISOString()
            };

            this.completeSocialLogin(mockUser, 'Facebook');
        }, 1500);

        /*
        // Produção - Integrar com Facebook Login:
        const appId = 'SEU_FACEBOOK_APP_ID';
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/facebook/callback');
        const authUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=email,public_profile`;
        window.location.href = authUrl;
        */
    },

    // Instagram Login
    instagram: function() {
        NotificationUtil.show('Redirecionando para Instagram...', 'info');

        setTimeout(() => {
            const mockUser = {
                email: `user.instagram${Date.now()}@instagram.com`,
                name: 'Usuário Instagram',
                country: 'BR',
                phone: '+5511900000002',
                provider: 'instagram',
                verified: true,
                createdAt: new Date().toISOString()
            };

            this.completeSocialLogin(mockUser, 'Instagram');
        }, 1500);

        /*
        // Produção - Integrar com Instagram Basic Display API:
        const clientId = 'SEU_INSTAGRAM_CLIENT_ID';
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/instagram/callback');
        const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
        window.location.href = authUrl;
        */
    },

    // Apple Login
    apple: function() {
        NotificationUtil.show('Redirecionando para Apple...', 'info');

        setTimeout(() => {
            const mockUser = {
                email: `user.apple${Date.now()}@icloud.com`,
                name: 'Usuário Apple',
                country: 'BR',
                phone: '+5511900000003',
                provider: 'apple',
                verified: true,
                createdAt: new Date().toISOString()
            };

            this.completeSocialLogin(mockUser, 'Apple');
        }, 1500);

        /*
        // Produção - Integrar com Sign in with Apple:
        const clientId = 'SEU_APPLE_CLIENT_ID';
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/apple/callback');
        const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code id_token&scope=name email&response_mode=form_post`;
        window.location.href = authUrl;
        */
    },

    // Complete social login (comum para todos)
    completeSocialLogin: function(user, providerName) {
        // Verificar se usuário já existe
        let existingUser = StorageUtil.findUserByEmail(user.email);

        if (!existingUser) {
            // Criar novo usuário
            StorageUtil.addUser(user);
            NotificationUtil.show(`Conta criada com ${providerName}!`, 'success');
        } else {
            // Usuário já existe, fazer login
            NotificationUtil.show(`Login realizado com ${providerName}!`, 'success');
        }

        // Fazer login
        AuthUtil.setCurrentUser({
            email: user.email,
            name: user.name,
            country: user.country,
            phone: user.phone,
            provider: user.provider
        });

        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
};

// Disponibilizar globalmente
window.SocialLogin = SocialLogin;
