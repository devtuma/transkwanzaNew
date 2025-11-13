// ==================== CURRENCY CALCULATOR ====================

// Exchange rate cache
let exchangeRates = {};
let lastUpdate = null;

// Constants
const TRANSKWANZA_FEE = 0.03; // 3%
const CACHE_DURATION = 5 * 1000; // Cache for only 5 seconds (force fresh data)
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

// Check if we need to fetch new rates
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

async function fetchExchangeRates(baseCurrency = 'USD', showNotification = false, forceUpdate = false) {
    // Check if we need to update (unless forced)
    if (!forceUpdate && !needsUpdate(baseCurrency)) {
        console.log(`Using cached rates for ${baseCurrency} (${Math.floor((new Date() - lastUpdate) / 1000)}s old)`);
        return exchangeRates[baseCurrency];
    }

    console.log(`🔄 Fetching fresh exchange rates for ${baseCurrency}...`);
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

async function updateCalculator() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;

    // Fetch rates for both currencies if needed
    await fetchExchangeRates(fromCurrency);
    await fetchExchangeRates(toCurrency);

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
    updateLastUpdateDisplay();
}

function updateLastUpdateDisplay() {
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

// Manual refresh function - FORCE new data from API
async function refreshRates() {
    console.log('🔄 Manual refresh triggered - forcing API requests...');

    // Force update for all main currencies
    await fetchExchangeRates('USD', true, true);  // true = show notification, true = force update
    await fetchExchangeRates('BRL', true, true);
    await fetchExchangeRates('EUR', true, true);
    await fetchExchangeRates('AOA', false, true);
    await fetchExchangeRates('CUP', false, true);
    await fetchExchangeRates('RUB', false, true);
    await fetchExchangeRates('ZAR', false, true);
    await fetchExchangeRates('NAD', false, true);
    await fetchExchangeRates('MZN', false, true);

    // Update the calculator display
    await updateCalculator();

    console.log('✅ All exchange rates refreshed from API');
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

    console.log('📊 Initializing calculator - loading ALL exchange rates...');

    // Fetch initial rates for ALL currencies (force fresh data on page load)
    await fetchExchangeRates('USD', false, true);
    await fetchExchangeRates('BRL', false, true);
    await fetchExchangeRates('EUR', false, true);
    await fetchExchangeRates('AOA', false, true);
    await fetchExchangeRates('CUP', false, true);
    await fetchExchangeRates('RUB', false, true);
    await fetchExchangeRates('ZAR', false, true);
    await fetchExchangeRates('NAD', false, true);
    await fetchExchangeRates('MZN', false, true);

    console.log('✅ All exchange rates loaded from API');

    // Initial calculation
    await updateCalculator();

    // Event listeners - make them async to fetch rates when currency changes
    fromCurrency.addEventListener('change', async () => {
        console.log(`Currency changed to: ${fromCurrency.value}`);
        await updateCalculator();
    });

    toCurrency.addEventListener('change', async () => {
        console.log(`Currency changed to: ${toCurrency.value}`);
        await updateCalculator();
    });

    fromAmount.addEventListener('input', async () => {
        await updateCalculator();
    });

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
        console.log('⏰ Auto-updating exchange rates (every 30s)...');

        // Fetch all currencies
        await fetchExchangeRates('USD', false);
        await fetchExchangeRates('BRL', false);
        await fetchExchangeRates('EUR', false);
        await fetchExchangeRates('AOA', false);
        await fetchExchangeRates('CUP', false);
        await fetchExchangeRates('RUB', false);
        await fetchExchangeRates('ZAR', false);
        await fetchExchangeRates('NAD', false);
        await fetchExchangeRates('MZN', false);

        await updateCalculator();
        console.log('✅ Auto-update completed');
    }, UPDATE_INTERVAL);
});

// ==================== EXPORT FOR OTHER MODULES ====================
window.CurrencyUtil = {
    fetchExchangeRates,
    getExchangeRate,
    calculateExchange,
    updateCalculator,
    refreshRates,
    updateLastUpdateDisplay
};
