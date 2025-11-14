// ==================== TRANSKWANZA CURRENCY CALCULATOR ====================
// Sistema de câmbio real-time para remessas P2P
// Pronto para produção no Hostinger

// ==================== CONFIGURATION ====================

// Exchange rate cache
let exchangeRates = {};
let lastUpdate = null;

// Constants
const TRANSKWANZA_FEE = 0.03; // Taxa TransKwanza: 3%
const CACHE_DURATION = 5 * 60 * 1000; // Cache válido por 5 minutos
const UPDATE_INTERVAL = 10 * 60 * 1000; // Auto-update a cada 10 minutos

// API Configuration - Multiple sources for reliability
const API_SOURCES = {
    primary: 'https://api.exchangerate.host/latest?base=',
    fallback: 'https://api.frankfurter.app/latest?from=',
    legacy: 'https://api.exchangerate-api.com/v4/latest/'
};

// Fallback rates (updated from real market data - 14/11/2025)
// Used only if all APIs fail
const FALLBACK_RATES = {
    USD: 1.0,       // Base currency
    BRL: 5.80,      // Real Brasileiro
    EUR: 0.94,      // Euro (1 EUR ≈ 6.17 BRL)
    AOA: 920.0,     // Kwanza Angolano
    CUP: 24.0,      // Peso Cubano
    RUB: 97.0,      // Rublo Russo
    ZAR: 18.10,     // Rand Sul-Africano
    NAD: 18.10,     // Dólar Namibiano
    MZN: 63.90      // Metical Moçambicano
};

// ==================== CORE FUNCTIONS ====================

/**
 * Check if we need to fetch new rates
 * @param {string} baseCurrency - Currency code
 * @returns {boolean} True if update needed
 */
function needsUpdate(baseCurrency) {
    // If we don't have rates for this currency, fetch
    if (!exchangeRates[baseCurrency]) {
        return true;
    }

    // If lastUpdate is null, fetch
    if (!lastUpdate) {
        return true;
    }

    // If cache is older than CACHE_DURATION, fetch
    const now = new Date();
    const timeDiff = now - lastUpdate;
    if (timeDiff > CACHE_DURATION) {
        return true;
    }

    return false;
}

/**
 * Fetch exchange rates from APIs
 * @param {string} baseCurrency - Base currency code (USD, BRL, EUR, etc)
 * @param {boolean} showNotification - Show success notification
 * @param {boolean} forceUpdate - Force update even if cache is valid
 * @returns {Promise<Object>} Exchange rates object
 */
async function fetchExchangeRates(baseCurrency = 'USD', showNotification = false, forceUpdate = false) {
    // Check if we need to update (unless forced)
    if (!forceUpdate && !needsUpdate(baseCurrency)) {
        const cacheAge = Math.floor((new Date() - lastUpdate) / 1000);
        console.log(`✓ Using cached rates for ${baseCurrency} (${cacheAge}s old)`);
        return exchangeRates[baseCurrency];
    }

    console.log(`🔄 Fetching fresh exchange rates for ${baseCurrency}...`);

    try {
        // Show loading indicator
        const refreshBtn = document.getElementById('refreshRatesBtn');
        const dashboardRefreshBtn = document.getElementById('dashboardRefreshRatesBtn');

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        if (dashboardRefreshBtn) {
            dashboardRefreshBtn.disabled = true;
            dashboardRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        let data = null;
        let lastError = null;

        // Try primary API (exchangerate.host)
        try {
            const response = await fetch(`${API_SOURCES.primary}${baseCurrency}`);
            if (response.ok) {
                data = await response.json();
                if (data.rates) {
                    console.log(`✓ Primary API (exchangerate.host) - ${baseCurrency}`);
                } else {
                    throw new Error('Invalid data format');
                }
            }
        } catch (error) {
            console.warn('⚠ Primary API failed:', error.message);
            lastError = error;
        }

        // Try fallback API (frankfurter.app)
        if (!data) {
            try {
                const response = await fetch(`${API_SOURCES.fallback}${baseCurrency}`);
                if (response.ok) {
                    data = await response.json();
                    if (data.rates) {
                        console.log(`✓ Fallback API (frankfurter.app) - ${baseCurrency}`);
                    } else {
                        throw new Error('Invalid data format');
                    }
                }
            } catch (error) {
                console.warn('⚠ Fallback API failed:', error.message);
                lastError = error;
            }
        }

        // Try legacy API (exchangerate-api.com)
        if (!data) {
            try {
                const response = await fetch(`${API_SOURCES.legacy}${baseCurrency}`);
                if (response.ok) {
                    data = await response.json();
                    if (data.rates) {
                        console.log(`✓ Legacy API (exchangerate-api.com) - ${baseCurrency}`);
                    } else {
                        throw new Error('Invalid data format');
                    }
                }
            } catch (error) {
                console.warn('⚠ Legacy API failed:', error.message);
                lastError = error;
            }
        }

        // If all APIs failed, throw error
        if (!data || !data.rates) {
            throw lastError || new Error('All API sources failed');
        }

        // Store rates and update time
        exchangeRates[baseCurrency] = data.rates;
        lastUpdate = new Date();

        // Save to localStorage for persistence
        try {
            localStorage.setItem('exchangeRates', JSON.stringify({
                rates: exchangeRates,
                lastUpdate: lastUpdate.toISOString()
            }));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }

        // Restore refresh buttons
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
        if (dashboardRefreshBtn) {
            dashboardRefreshBtn.disabled = false;
            dashboardRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }

        // Show notification if requested
        if (showNotification && typeof NotificationUtil !== 'undefined') {
            NotificationUtil.show('Taxas de câmbio atualizadas!', 'success');
        }

        return data.rates;

    } catch (error) {
        console.error('❌ Error fetching exchange rates:', error);

        // Restore refresh buttons
        const refreshBtn = document.getElementById('refreshRatesBtn');
        const dashboardRefreshBtn = document.getElementById('dashboardRefreshRatesBtn');

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
        if (dashboardRefreshBtn) {
            dashboardRefreshBtn.disabled = false;
            dashboardRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }

        // Try to load from localStorage cache
        try {
            const cached = localStorage.getItem('exchangeRates');
            if (cached) {
                const parsed = JSON.parse(cached);
                exchangeRates = parsed.rates;
                lastUpdate = new Date(parsed.lastUpdate);
                console.log('📦 Using localStorage cache');

                if (exchangeRates[baseCurrency]) {
                    return exchangeRates[baseCurrency];
                }
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }

        // Use fallback rates as last resort
        console.warn('⚠ Using fallback rates (static data)');
        if (showNotification && typeof NotificationUtil !== 'undefined') {
            NotificationUtil.show('Usando taxas em cache. Verifique sua conexão.', 'warning');
        }

        return FALLBACK_RATES;
    }
}

/**
 * Get exchange rate between two currencies
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @returns {number} Exchange rate
 */
function getExchangeRate(from, to) {
    // Same currency = 1:1
    if (from === to) return 1;

    // Try direct conversion from cache
    if (exchangeRates[from] && exchangeRates[from][to]) {
        return exchangeRates[from][to];
    }

    // Calculate using USD as base
    if (exchangeRates['USD']) {
        const fromToUSD = from === 'USD' ? 1 : (1 / exchangeRates['USD'][from]);
        const toToUSD = to === 'USD' ? 1 : (1 / exchangeRates['USD'][to]);
        return toToUSD / fromToUSD;
    }

    // Fallback calculation using static rates
    const fromRate = FALLBACK_RATES[from] || 1;
    const toRate = FALLBACK_RATES[to] || 1;
    return toRate / fromRate;
}

/**
 * Calculate exchange with TransKwanza fee
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @returns {Object} Calculation details
 */
function calculateExchange(amount, from, to) {
    const rate = getExchangeRate(from, to);
    const fee = amount * TRANSKWANZA_FEE;
    const amountAfterFee = amount - fee;
    const convertedAmount = amountAfterFee * rate;

    return {
        originalAmount: amount,
        fee: fee,
        amountAfterFee: amountAfterFee,
        rate: rate,
        convertedAmount: convertedAmount
    };
}

// ==================== UI FUNCTIONS ====================

/**
 * Update calculator display
 */
async function updateCalculator() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;

    // Fetch rates if needed (uses cache if available)
    await fetchExchangeRates(fromCurrency);
    await fetchExchangeRates(toCurrency);

    const calculation = calculateExchange(fromAmount, fromCurrency, toCurrency);

    // Update converted amount
    document.getElementById('toAmount').value = calculation.convertedAmount.toFixed(2);

    // Update exchange rate display
    const rateDisplay = document.getElementById('exchangeRate');
    if (rateDisplay) {
        const formattedRate = calculation.rate.toFixed(4).replace(/\.?0+$/, '');
        rateDisplay.textContent = `1 ${fromCurrency} = ${formattedRate} ${toCurrency}`;
    }

    // Update last update timestamp
    updateLastUpdateDisplay();
}

/**
 * Update "last update" display in UI
 */
function updateLastUpdateDisplay() {
    const updateDisplays = ['lastUpdate', 'calcLastUpdate'];

    updateDisplays.forEach(displayId => {
        const element = document.getElementById(displayId);
        if (element && lastUpdate) {
            const day = String(lastUpdate.getDate()).padStart(2, '0');
            const month = String(lastUpdate.getMonth() + 1).padStart(2, '0');
            const year = lastUpdate.getFullYear();
            const hours = String(lastUpdate.getHours()).padStart(2, '0');
            const minutes = String(lastUpdate.getMinutes()).padStart(2, '0');

            element.textContent = `Última atualização: ${day}/${month}/${year} ${hours}:${minutes}`;
        }
    });
}

/**
 * Swap source and target currencies
 */
function swapCurrencies() {
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');

    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;

    updateCalculator();
}

/**
 * Manual refresh - force update all rates
 */
async function refreshRates() {
    console.log('🔄 Manual refresh - updating all currencies...');

    // Force update for all currencies
    await fetchExchangeRates('USD', true, true);
    await fetchExchangeRates('BRL', false, true);
    await fetchExchangeRates('EUR', false, true);
    await fetchExchangeRates('AOA', false, true);
    await fetchExchangeRates('CUP', false, true);
    await fetchExchangeRates('RUB', false, true);
    await fetchExchangeRates('ZAR', false, true);
    await fetchExchangeRates('NAD', false, true);
    await fetchExchangeRates('MZN', false, true);

    // Update calculator display
    await updateCalculator();

    console.log('✅ All rates refreshed successfully');
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on a page with calculator
    const fromCurrency = document.getElementById('fromCurrency');
    if (!fromCurrency) return;

    const toCurrency = document.getElementById('toCurrency');
    const fromAmount = document.getElementById('fromAmount');
    const swapBtn = document.getElementById('swapBtn');
    const sendBtn = document.getElementById('sendBtn');

    console.log('📊 Initializing TransKwanza Calculator...');

    // Try to load cached rates from localStorage
    try {
        const cached = localStorage.getItem('exchangeRates');
        if (cached) {
            const parsed = JSON.parse(cached);
            const cacheTime = new Date(parsed.lastUpdate);
            const cacheAge = new Date() - cacheTime;

            // Use cache if less than 5 minutes old
            if (cacheAge < CACHE_DURATION) {
                exchangeRates = parsed.rates;
                lastUpdate = cacheTime;
                console.log(`📦 Loaded cache (${Math.floor(cacheAge / 1000)}s old)`);
            } else {
                console.log('🗑️ Cache expired, fetching fresh data...');
            }
        }
    } catch (e) {
        console.warn('Failed to load cache:', e);
    }

    // Fetch initial rates for main currencies
    await fetchExchangeRates('USD', false, false);
    await fetchExchangeRates('BRL', false, false);
    await fetchExchangeRates('EUR', false, false);

    console.log('✅ Calculator initialized');

    // Initial calculation
    await updateCalculator();

    // Event listeners
    fromCurrency.addEventListener('change', async () => {
        console.log(`Currency changed: ${fromCurrency.value}`);
        await updateCalculator();
    });

    toCurrency.addEventListener('change', async () => {
        console.log(`Currency changed: ${toCurrency.value}`);
        await updateCalculator();
    });

    fromAmount.addEventListener('input', async () => {
        await updateCalculator();
    });

    if (swapBtn) {
        swapBtn.addEventListener('click', swapCurrencies);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshRatesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshRates);
    }

    // Dashboard refresh button
    const dashboardRefreshBtn = document.getElementById('dashboardRefreshRatesBtn');
    if (dashboardRefreshBtn) {
        dashboardRefreshBtn.addEventListener('click', refreshRates);
    }

    // Send button (create proposal)
    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            if (!AuthUtil.isLoggedIn()) {
                NotificationUtil.show('Faça login para criar uma proposta', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }

            const proposalData = {
                fromCurrency: fromCurrency.value,
                toCurrency: toCurrency.value,
                amount: parseFloat(fromAmount.value),
                calculation: calculateExchange(
                    parseFloat(fromAmount.value),
                    fromCurrency.value,
                    toCurrency.value
                )
            };

            sessionStorage.setItem('newProposal', JSON.stringify(proposalData));
            window.location.href = 'dashboard.html?tab=minhas-propostas&action=new';
        });
    }

    // Auto-refresh every 10 minutes
    setInterval(async () => {
        console.log('⏰ Auto-refresh (10 min interval)');

        // Force update all currencies
        await fetchExchangeRates('USD', false, true);
        await fetchExchangeRates('BRL', false, true);
        await fetchExchangeRates('EUR', false, true);
        await fetchExchangeRates('AOA', false, true);
        await fetchExchangeRates('CUP', false, true);
        await fetchExchangeRates('RUB', false, true);
        await fetchExchangeRates('ZAR', false, true);
        await fetchExchangeRates('NAD', false, true);
        await fetchExchangeRates('MZN', false, true);

        await updateCalculator();
        console.log('✅ Auto-refresh complete');
    }, UPDATE_INTERVAL);
});

// ==================== EXPORTS ====================

window.CurrencyUtil = {
    fetchExchangeRates,
    getExchangeRate,
    calculateExchange,
    updateCalculator,
    refreshRates,
    updateLastUpdateDisplay
};
