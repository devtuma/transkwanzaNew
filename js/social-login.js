// ==================== TRANSKWANZA SOCIAL LOGIN - PRODUÇÃO ====================
// Login com Google, Facebook, Instagram, Apple - REAL APIs
// Versão: 3.0 Production Ready

const SocialLogin = {
    // ==================== CONFIGURAÇÃO ====================
    // IMPORTANTE: Altere com suas chaves reais em produção!

    config: {
        google: {
            clientId: '405120175674-rmd1b1lhmo78d54ogeqthpeeu8dr083t.apps.googleusercontent.com'
        },
        facebook: {
            appId: 'SEU_FACEBOOK_APP_ID'
        },
        apple: {
            clientId: 'com.transkwanza.signin'
        }
    },

    sdksLoaded: {
        google: false,
        facebook: false,
        apple: false
    },

    // ==================== INICIALIZAÇÃO ====================

    init: function() {
        console.log('🔐 Inicializando Social Login...');
        this.loadGoogleSDK();
        this.loadFacebookSDK();
        this.loadAppleSDK();
    },

    // ==================== GOOGLE ====================

    loadGoogleSDK: function() {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('✓ Google SDK carregado');
            this.sdksLoaded.google = true;
            this.initializeGoogle();
        };
        document.head.appendChild(script);
    },

    initializeGoogle: function() {
        if (typeof google === 'undefined') return;

        google.accounts.id.initialize({
            client_id: this.config.google.clientId,
            callback: this.handleGoogleResponse.bind(this)
        });
    },

    google: function() {
        if (!this.sdksLoaded.google || typeof google === 'undefined') {
            NotificationUtil.show('Google SDK não carregado. Aguarde...', 'warning');
            return;
        }

        google.accounts.id.prompt();
    },

    handleGoogleResponse: async function(response) {
        console.log('📧 Processando login Google...');

        try {
            const result = await fetch('/api/social_login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google',
                    access_token: response.credential
                })
            });

            const data = await result.json();

            if (data.success) {
                this.handleLoginSuccess(data);
            } else {
                NotificationUtil.show(data.error || 'Erro ao fazer login com Google', 'error');
            }
        } catch (error) {
            console.error('Erro Google login:', error);
            NotificationUtil.show('Erro ao conectar com servidor', 'error');
        }
    },

    // ==================== FACEBOOK ====================

    loadFacebookSDK: function() {
        window.fbAsyncInit = () => {
            FB.init({
                appId: this.config.facebook.appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            console.log('✓ Facebook SDK carregado');
            this.sdksLoaded.facebook = true;
        };

        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    },

    facebook: async function() {
        if (!this.sdksLoaded.facebook || typeof FB === 'undefined') {
            NotificationUtil.show('Facebook SDK não carregado. Aguarde...', 'warning');
            return;
        }

        FB.login(async (response) => {
            if (response.authResponse) {
                console.log('📘 Processando login Facebook...');

                try {
                    const result = await fetch('/api/social_login.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            provider: 'facebook',
                            access_token: response.authResponse.accessToken
                        })
                    });

                    const data = await result.json();

                    if (data.success) {
                        this.handleLoginSuccess(data);
                    } else {
                        NotificationUtil.show(data.error || 'Erro ao fazer login com Facebook', 'error');
                    }
                } catch (error) {
                    console.error('Erro Facebook login:', error);
                    NotificationUtil.show('Erro ao conectar com servidor', 'error');
                }
            } else {
                console.log('Login Facebook cancelado');
            }
        }, {scope: 'public_profile,email'});
    },

    // ==================== INSTAGRAM ====================

    instagram: async function() {
        if (!this.sdksLoaded.facebook || typeof FB === 'undefined') {
            NotificationUtil.show('Instagram SDK não carregado. Aguarde...', 'warning');
            return;
        }

        FB.login(async (response) => {
            if (response.authResponse) {
                console.log('📸 Processando login Instagram...');

                try {
                    const result = await fetch('/api/social_login.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            provider: 'instagram',
                            access_token: response.authResponse.accessToken
                        })
                    });

                    const data = await result.json();

                    if (data.success) {
                        this.handleLoginSuccess(data);
                    } else {
                        NotificationUtil.show(data.error || 'Erro ao fazer login com Instagram', 'error');
                    }
                } catch (error) {
                    console.error('Erro Instagram login:', error);
                    NotificationUtil.show('Erro ao conectar com servidor', 'error');
                }
            }
        }, {scope: 'instagram_basic,public_profile,email'});
    },

    // ==================== APPLE ====================

    loadAppleSDK: function() {
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('✓ Apple SDK carregado');
            this.sdksLoaded.apple = true;
            this.initializeApple();
        };
        document.head.appendChild(script);
    },

    initializeApple: function() {
        if (typeof AppleID === 'undefined') return;

        AppleID.auth.init({
            clientId: this.config.apple.clientId,
            scope: 'name email',
            redirectURI: window.location.origin + '/login.html',
            usePopup: true
        });

        document.addEventListener('AppleIDSignInOnSuccess', this.handleAppleSuccess.bind(this));
        document.addEventListener('AppleIDSignInOnFailure', this.handleAppleFailure.bind(this));
    },

    apple: function() {
        if (!this.sdksLoaded.apple || typeof AppleID === 'undefined') {
            NotificationUtil.show('Apple SDK não carregado. Aguarde...', 'warning');
            return;
        }

        try {
            AppleID.auth.signIn();
        } catch (error) {
            console.error('Erro Apple login:', error);
            NotificationUtil.show('Erro ao iniciar login com Apple', 'error');
        }
    },

    handleAppleSuccess: async function(event) {
        console.log(' Processando login Apple...');

        try {
            const result = await fetch('/api/social_login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'apple',
                    access_token: event.detail.authorization.id_token
                })
            });

            const data = await result.json();

            if (data.success) {
                this.handleLoginSuccess(data);
            } else {
                NotificationUtil.show(data.error || 'Erro ao fazer login com Apple', 'error');
            }
        } catch (error) {
            console.error('Erro Apple login:', error);
            NotificationUtil.show('Erro ao conectar com servidor', 'error');
        }
    },

    handleAppleFailure: function(event) {
        console.error('Apple login falhou:', event.detail);
    },

    // ==================== SUCESSO ====================

    handleLoginSuccess: function(data) {
        console.log('✅ Login realizado com sucesso!', data);

        // Salvar token e dados do usuário
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Mostrar notificação
        NotificationUtil.show(data.message || 'Login realizado!', 'success');

        // Redirecionar baseado no status
        setTimeout(() => {
            if (data.requires_kyc) {
                // Novo usuário - precisa enviar KYC
                NotificationUtil.show('Complete seu cadastro enviando documento oficial', 'info');
                window.location.href = 'kyc.html';
            } else if (data.user.kyc_status === 'pending' || data.user.kyc_status === 'under_review') {
                // KYC em análise
                window.location.href = 'dashboard.html?tab=perfil';
            } else if (data.user.kyc_status === 'rejected') {
                // KYC rejeitado
                NotificationUtil.show('Documento recusado. Envie novamente.', 'warning');
                window.location.href = 'kyc.html';
            } else if (data.user.verified && data.user.kyc_status === 'approved') {
                // Tudo OK - ir para dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Qualquer outro caso
                window.location.href = 'dashboard.html';
            }
        }, 1500);
    }
};

// ==================== INICIALIZAR ====================

document.addEventListener('DOMContentLoaded', function() {
    SocialLogin.init();
});

// Disponibilizar globalmente
window.SocialLogin = SocialLogin;
