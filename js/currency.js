// ==================== TRANSKWANZA CURRENCY CALCULATOR - PRODUÇÃO ====================
// Sistema profissional de câmbio em tempo real
// Usa API backend com cache inteligente e taxas REAIS
// Versão: 4.0 Professional

// ==================== CONFIGURAÇÃO ====================

const CurrencySystem = {
    // Cache local (frontend)
    cache: {
        rates: {},
        lastUpdate: null,
        cacheDuration: 5 * 60 * 1000 // 5 minutos
    },

    // Configurações
    config: {
        apiEndpoint: '/api/exchange_rates.php',
        transkwanzaFee: 0.03, // 3% taxa da plataforma
        updateInterval: 10 * 60 * 1000 // Atualizar a cada 10 minutos
    },

    // ==================== FUNÇÕES PRINCIPAIS ====================

    /**
     * Obtém taxa de câmbio (com cache)
     */
    async getExchangeRate(from, to) {
        // Validação
        from = from.toUpperCase();
        to = to.toUpperCase();

        if (from === to) {
            return {
                success: true,
                rate: 1.0,
                from: from,
                to: to,
                cached: false
            };
        }

        // Chave de cache
        const cacheKey = `${from}_${to}`;

        // Verificar cache local
        const cached = this.getCachedRate(cacheKey);
        if (cached) {
            return cached;
        }

        // Buscar do backend
        try {
            const response = await fetch(
                `${this.config.apiEndpoint}?action=get_rate&from=${from}&to=${to}`
            );

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            if (data.success) {
                // Salvar no cache local
                this.saveCacheRate(cacheKey, data);
                return data;
            } else {
                throw new Error(data.error || 'Taxa não disponível');
            }
        } catch (error) {
            console.error('Erro ao buscar taxa:', error);

            // Tentar retornar taxa em cache mesmo se expirada
            const staleCache = this.cache.rates[cacheKey];
            if (staleCache) {
                staleCache.warning = 'Usando taxa em cache (pode estar desatualizada)';
                return staleCache;
            }

            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Converte valor entre moedas
     */
    async convertCurrency(amount, from, to) {
        try {
            const response = await fetch(
                `${this.config.apiEndpoint}?action=convert&amount=${amount}&from=${from}&to=${to}`
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro na conversão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Obtém múltiplas taxas de uma vez
     */
    async getMultipleRates(baseCurrency, targetCurrencies) {
        try {
            const targets = targetCurrencies.join(',');
            const response = await fetch(
                `${this.config.apiEndpoint}?action=get_multiple&base=${baseCurrency}&targets=${targets}`
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar taxas múltiplas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Força atualização de todas as taxas (apenas admin)
     */
    async forceUpdateAll() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(
                `${this.config.apiEndpoint}?action=update_all`,
                {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                }
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao atualizar taxas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Obtém histórico de uma taxa
     */
    async getRateHistory(from, to, days = 30) {
        try {
            const response = await fetch(
                `${this.config.apiEndpoint}?action=history&from=${from}&to=${to}&days=${days}`
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // ==================== CACHE ====================

    /**
     * Verifica e retorna taxa do cache local
     */
    getCachedRate(cacheKey) {
        const cached = this.cache.rates[cacheKey];

        if (!cached) {
            return null;
        }

        // Verificar se cache ainda é válido
        const now = Date.now();
        const cacheAge = now - this.cache.lastUpdate;

        if (cacheAge < this.cache.cacheDuration) {
            console.log(`✓ Usando cache local para ${cacheKey} (${Math.floor(cacheAge/1000)}s)`);
            return cached;
        }

        return null;
    },

    /**
     * Salva taxa no cache local
     */
    saveCacheRate(cacheKey, data) {
        this.cache.rates[cacheKey] = data;
        this.cache.lastUpdate = Date.now();
    },

    /**
     * Limpa cache local
     */
    clearCache() {
        this.cache.rates = {};
        this.cache.lastUpdate = null;
        console.log('Cache limpo');
    },

    // ==================== CALCULADORA ====================

    /**
     * Calcula conversão com taxa da plataforma
     */
    async calculateWithFee(amount, from, to) {
        const rateData = await this.getExchangeRate(from, to);

        if (!rateData.success) {
            return rateData;
        }

        const convertedAmount = amount * rateData.rate;
        const feeAmount = convertedAmount * this.config.transkwanzaFee;
        const finalAmount = convertedAmount - feeAmount;

        return {
            success: true,
            amount: parseFloat(amount),
            from: from,
            to: to,
            rate: rateData.rate,
            convertedAmount: convertedAmount.toFixed(2),
            feePercentage: (this.config.transkwanzaFee * 100).toFixed(1),
            feeAmount: feeAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2),
            cached: rateData.cached || false,
            updated_at: rateData.updated_at
        };
    },

    // ==================== UI HELPERS ====================

    /**
     * Formata moeda para exibição
     */
    formatCurrency(amount, currencyCode, locale = 'pt-BR') {
        const currencySymbols = {
            'BRL': 'R$',
            'USD': '$',
            'EUR': '€',
            'AOA': 'Kz',
            'CUP': '$',
            'RUB': '₽',
            'ZAR': 'R',
            'NAD': '$',
            'MZN': 'MT'
        };

        const symbol = currencySymbols[currencyCode] || currencyCode;
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);

        return `${symbol} ${formatted}`;
    },

    /**
     * Atualiza display de taxa na UI
     */
    updateRateDisplay(elementId, rateData) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (rateData.success) {
            const cacheStatus = rateData.cached ? '(cache)' : '(tempo real)';
            const warning = rateData.warning ? `⚠️ ${rateData.warning}` : '';

            element.innerHTML = `
                <strong>Taxa:</strong> 1 ${rateData.from} = ${rateData.rate.toFixed(6)} ${rateData.to}
                <small>${cacheStatus}</small>
                <br>
                <small>Atualizado: ${rateData.updated_at}</small>
                ${warning ? `<br><small class="warning">${warning}</small>` : ''}
            `;
        } else {
            element.innerHTML = `
                <span class="error">❌ ${rateData.error}</span>
            `;
        }
    },

    /**
     * Botão de atualizar taxas
     */
    async refreshRates(buttonId, showNotification = true) {
        const button = document.getElementById(buttonId);

        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        }

        // Limpar cache
        this.clearCache();

        // Buscar novas taxas (exemplo com BRL)
        const result = await this.getExchangeRate('USD', 'BRL');

        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar Taxas';
        }

        if (showNotification && typeof NotificationUtil !== 'undefined') {
            if (result.success) {
                NotificationUtil.show('Taxas atualizadas com sucesso!', 'success');
            } else {
                NotificationUtil.show('Erro ao atualizar taxas: ' + result.error, 'error');
            }
        }

        return result;
    },

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa sistema de câmbio
     */
    init() {
        console.log('💱 Sistema de câmbio profissional inicializado');
        console.log('📊 API backend:', this.config.apiEndpoint);
        console.log('💰 Taxa da plataforma:', (this.config.transkwanzaFee * 100) + '%');

        // Auto-atualizar taxas a cada X minutos
        setInterval(() => {
            console.log('🔄 Auto-refresh de taxas');
            this.clearCache();
        }, this.config.updateInterval);
    }
};

// ==================== CALCULADORA DE CONVERSÃO (UI) ====================

/**
 * Calculadora interativa na página
 */
const CurrencyCalculator = {
    elements: {
        amountInput: null,
        fromCurrency: null,
        toCurrency: null,
        resultDisplay: null,
        rateDisplay: null,
        calculateBtn: null
    },

    init(config = {}) {
        this.elements.amountInput = document.getElementById(config.amountInputId || 'calcAmount');
        this.elements.fromCurrency = document.getElementById(config.fromCurrencyId || 'calcFrom');
        this.elements.toCurrency = document.getElementById(config.toCurrencyId || 'calcTo');
        this.elements.resultDisplay = document.getElementById(config.resultDisplayId || 'calcResult');
        this.elements.rateDisplay = document.getElementById(config.rateDisplayId || 'calcRate');
        this.elements.calculateBtn = document.getElementById(config.calculateBtnId || 'calculateBtn');

        if (!this.elements.amountInput) {
            console.log('Calculadora não encontrada na página');
            return;
        }

        // Event listeners
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.addEventListener('click', () => this.calculate());
        }

        // Calcular ao digitar (com debounce)
        let timeout;
        this.elements.amountInput?.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.calculate(), 500);
        });

        this.elements.fromCurrency?.addEventListener('change', () => this.calculate());
        this.elements.toCurrency?.addEventListener('change', () => this.calculate());

        console.log('✓ Calculadora de câmbio inicializada');
    },

    async calculate() {
        const amount = parseFloat(this.elements.amountInput?.value || 0);
        const from = this.elements.fromCurrency?.value;
        const to = this.elements.toCurrency?.value;

        if (!amount || amount <= 0) {
            this.elements.resultDisplay.innerHTML = '<p>Digite um valor</p>';
            return;
        }

        if (!from || !to) {
            this.elements.resultDisplay.innerHTML = '<p>Selecione as moedas</p>';
            return;
        }

        // Mostrar loading
        this.elements.resultDisplay.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

        // Calcular
        const result = await CurrencySystem.calculateWithFee(amount, from, to);

        if (result.success) {
            this.elements.resultDisplay.innerHTML = `
                <div class="conversion-result">
                    <h3>${CurrencySystem.formatCurrency(amount, from)}</h3>
                    <i class="fas fa-arrow-down"></i>
                    <h2>${CurrencySystem.formatCurrency(result.finalAmount, to)}</h2>
                    <div class="conversion-details">
                        <p><strong>Taxa:</strong> 1 ${from} = ${result.rate.toFixed(6)} ${to}</p>
                        <p><strong>Valor convertido:</strong> ${CurrencySystem.formatCurrency(result.convertedAmount, to)}</p>
                        <p><strong>Taxa TransKwanza (${result.feePercentage}%):</strong> ${CurrencySystem.formatCurrency(result.feeAmount, to)}</p>
                        <p class="final"><strong>Você recebe:</strong> ${CurrencySystem.formatCurrency(result.finalAmount, to)}</p>
                    </div>
                    <small>Atualizado: ${result.updated_at} ${result.cached ? '(cache)' : '(tempo real)'}</small>
                </div>
            `;
        } else {
            this.elements.resultDisplay.innerHTML = `
                <div class="conversion-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erro: ${result.error}</p>
                </div>
            `;
        }
    }
};

// ==================== INICIALIZAÇÃO AUTOMÁTICA ====================

document.addEventListener('DOMContentLoaded', () => {
    CurrencySystem.init();

    // Tentar inicializar calculadora (se existir na página)
    CurrencyCalculator.init();
});

// Exportar para uso global
window.CurrencySystem = CurrencySystem;
window.CurrencyCalculator = CurrencyCalculator;
