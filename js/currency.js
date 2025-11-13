// ==================== CURRENCY CALCULATOR ====================

// Exchange rate cache
let exchangeRates = {};
let lastUpdate = null;

// Constants
const TRANSKWANZA_FEE = 0.03; // 3%
const CACHE_DURATION = 30 * 1000; // 30 seconds for real-time updates
const UPDATE_INTERVAL = 30 * 1000; // Update every 30 seconds

// API Configuration - Multiple sources for accuracy
// Primary: exchangerate.host (updated with ECB, Fed, etc data)
// Fallback: frankfurter.app (European Central Bank data)
const API_SOURCES = {
    primary: 'https://api.exchangerate.host/latest?base=',
    fallback: 'https://api.frankfurter.app/latest?from=',
    legacy: 'https://api.exchangerate-api.com/v4/latest/'
};

// Alternative: Use static rates as fallback (relative to USD)
// Updated to match Google Finance rates more accurately
const FALLBACK_RATES = {
    USD: 1.0,       // Base
    BRL: 5.05,      // Real Brasileiro
    EUR: 0.92,      // Euro
    AOA: 925.0,     // Kwanza Angolano
    CUP: 24.0,      // Peso Cubano
    RUB: 92.0,      // Rublo Russo
    ZAR: 18.20,     // Rand Sul-Africano
    NAD: 18.20,     // Dólar Namibiano
    MZN: 63.80      // Metical Moçambicano
};

// ==================== EXCHANGE RATE FUNCTIONS ====================

async function fetchExchangeRates(baseCurrency = 'USD', showNotification = false) {
    try {
        // Show loading indicator on both buttons
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

        // Try multiple API sources for better accuracy
        let data = null;
        let lastError = null;

        // Try primary API (exchangerate.host - most accurate, similar to Google Finance)
        try {
            const response = await fetch(`${API_SOURCES.primary}${baseCurrency}`);
            if (response.ok) {
                data = await response.json();
                // Check if data has rates property
                if (!data.rates) {
                    throw new Error('Invalid data format from primary API');
                }
                console.log(`✓ Using primary API (exchangerate.host) for ${baseCurrency}`);
            }
        } catch (error) {
            console.warn('Primary API failed, trying fallback...', error);
            lastError = error;
        }

        // Try fallback API (frankfurter.app) if primary fails
        if (!data) {
            try {
                const response = await fetch(`${API_SOURCES.fallback}${baseCurrency}`);
                if (response.ok) {
                    data = await response.json();
                    // Check if data has rates property
                    if (!data.rates) {
                        throw new Error('Invalid data format from fallback API');
                    }
                    console.log(`✓ Using fallback API (frankfurter.app) for ${baseCurrency}`);
                }
            } catch (error) {
                console.warn('Fallback API failed, trying legacy...', error);
                lastError = error;
            }
        }

        // Try legacy API as last resort
        if (!data) {
            const response = await fetch(`${API_SOURCES.legacy}${baseCurrency}`);
            if (!response.ok) {
                throw lastError || new Error('All API sources failed');
            }
            data = await response.json();
            console.log(`✓ Using legacy API (exchangerate-api.com) for ${baseCurrency}`);
        }

        if (!data || !data.rates) {
            throw new Error('Failed to fetch exchange rates from all sources');
        }

        // Store rates and update time
        exchangeRates[baseCurrency] = data.rates;
        lastUpdate = new Date();

        // Cache in localStorage
        localStorage.setItem('exchangeRates', JSON.stringify({
            rates: exchangeRates,
            lastUpdate: lastUpdate.toISOString()
        }));

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
        console.error('Error fetching exchange rates:', error);

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

        // Try to use cached rates
        const cached = localStorage.getItem('exchangeRates');
        if (cached) {
            const parsed = JSON.parse(cached);
            exchangeRates = parsed.rates;
            lastUpdate = new Date(parsed.lastUpdate);
            return exchangeRates[baseCurrency] || FALLBACK_RATES;
        }

        // Use fallback rates
        console.warn('Using fallback rates');
        if (showNotification && typeof NotificationUtil !== 'undefined') {
            NotificationUtil.show('Erro ao atualizar. Usando taxas em cache.', 'warning');
        }
        return FALLBACK_RATES;
    }
}

function getExchangeRate(from, to) {
    // If same currency, return 1
    if (from === to) return 1;

    // Try to get from cache
    if (exchangeRates[from] && exchangeRates[from][to]) {
        return exchangeRates[from][to];
    }

    // Calculate using USD as base
    if (exchangeRates['USD']) {
        const fromToUSD = from === 'USD' ? 1 : (1 / exchangeRates['USD'][from]);
        const toToUSD = to === 'USD' ? 1 : (1 / exchangeRates['USD'][to]);
        return toToUSD / fromToUSD;
    }

    // Fallback calculation
    const fromRate = FALLBACK_RATES[from] || 1;
    const toRate = FALLBACK_RATES[to] || 1;
    return toRate / fromRate;
}

function calculateExchange(amount, from, to) {
    const rate = getExchangeRate(from, to);
    const amountAfterFee = amount * (1 - TRANSKWANZA_FEE);
    const convertedAmount = amountAfterFee * rate;

    return {
        originalAmount: amount,
        fee: amount * TRANSKWANZA_FEE,
        amountAfterFee: amountAfterFee,
        rate: rate,
        convertedAmount: convertedAmount
    };
}

// ==================== UI FUNCTIONS ====================

function updateCalculator() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;

    const calculation = calculateExchange(fromAmount, fromCurrency, toCurrency);

    // Update to amount
    document.getElementById('toAmount').value = calculation.convertedAmount.toFixed(2);

    // Update exchange rate display (show more decimals for accuracy)
    const rateDisplay = document.getElementById('exchangeRate');
    if (rateDisplay) {
        // Use up to 4 decimal places, but remove trailing zeros
        const formattedRate = calculation.rate.toFixed(4).replace(/\.?0+$/, '');
        rateDisplay.textContent = `1 ${fromCurrency} = ${formattedRate} ${toCurrency}`;
    }

    // Update last update time (both home page and dashboard)
    const updateDisplays = ['lastUpdate', 'calcLastUpdate'];
    updateDisplays.forEach(displayId => {
        const lastUpdateDisplay = document.getElementById(displayId);
        if (lastUpdateDisplay && lastUpdate) {
            // Format: "DD/MM/YYYY HH:MM"
            const day = String(lastUpdate.getDate()).padStart(2, '0');
            const month = String(lastUpdate.getMonth() + 1).padStart(2, '0');
            const year = lastUpdate.getFullYear();
            const hours = String(lastUpdate.getHours()).padStart(2, '0');
            const minutes = String(lastUpdate.getMinutes()).padStart(2, '0');

            lastUpdateDisplay.textContent = `Última atualização: ${day}/${month}/${year} ${hours}:${minutes}`;
        }
    });
}

function swapCurrencies() {
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');

    // Swap values
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;

    // Update calculator
    updateCalculator();
}

// Manual refresh function
async function refreshRates() {
    await fetchExchangeRates('USD', true);
    await fetchExchangeRates('BRL', true);
    await fetchExchangeRates('EUR', true);
    updateCalculator();
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on a page with calculator
    const fromCurrency = document.getElementById('fromCurrency');
    if (!fromCurrency) return;

    const toCurrency = document.getElementById('toCurrency');
    const fromAmount = document.getElementById('fromAmount');
    const swapBtn = document.getElementById('swapBtn');
    const sendBtn = document.getElementById('sendBtn');

    // Fetch initial rates
    await fetchExchangeRates('USD');
    await fetchExchangeRates('BRL');
    await fetchExchangeRates('EUR');

    // Initial calculation
    updateCalculator();

    // Event listeners
    fromCurrency.addEventListener('change', updateCalculator);
    toCurrency.addEventListener('change', updateCalculator);
    fromAmount.addEventListener('input', updateCalculator);

    if (swapBtn) {
        swapBtn.addEventListener('click', swapCurrencies);
    }

    // Refresh buttons (home page and dashboard)
    const refreshBtn = document.getElementById('refreshRatesBtn');
    const dashboardRefreshBtn = document.getElementById('dashboardRefreshRatesBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshRates);
    }
    if (dashboardRefreshBtn) {
        dashboardRefreshBtn.addEventListener('click', refreshRates);
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            // Check if user is logged in
            if (!AuthUtil.isLoggedIn()) {
                NotificationUtil.show('Faça login para criar uma proposta', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }

            // Store proposal data and redirect to dashboard
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

    // Auto-refresh rates every 30 seconds (real-time)
    setInterval(async () => {
        console.log('Auto-updating exchange rates...');
        await fetchExchangeRates('USD', false);
        await fetchExchangeRates('BRL', false);
        await fetchExchangeRates('EUR', false);
        updateCalculator();
    }, UPDATE_INTERVAL);
});

// ==================== EXPORT FOR OTHER MODULES ====================
window.CurrencyUtil = {
    fetchExchangeRates,
    getExchangeRate,
    calculateExchange,
    updateCalculator,
    refreshRates
};
