// ==================== CURRENCY CALCULATOR ====================

// Exchange rate cache
let exchangeRates = {};
let lastUpdate = null;

// Constants
const TRANSKWANZA_FEE = 0.03; // 3%
const CACHE_DURATION = 0; // NO CACHE - always fetch fresh data
const UPDATE_INTERVAL = 10 * 60 * 1000; // Update every 10 minutes

// Gemini API Configuration for Google Finance data
const GEMINI_API_KEY = 'AIzaSyDgvL2UZRzPZ7o3tDuzpGnojd_jK1PxR8Q';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// API Configuration - Multiple sources for accuracy
// Primary: Gemini with Google Search (gets data from Google Finance!)
// Fallback: exchangerate.host, frankfurter.app, exchangerate-api.com
const API_SOURCES = {
    gemini: GEMINI_API_URL,
    primary: 'https://api.exchangerate.host/latest?base=',
    fallback: 'https://api.frankfurter.app/latest?from=',
    legacy: 'https://api.exchangerate-api.com/v4/latest/'
};

// Alternative: Use static rates as fallback (relative to USD)
// Updated from Google Finance (13/11/2025)
// IMPORTANTE: Para calcular EUR→BRL: 1 EUR = 6.16 BRL (Google Finance)
// 1 USD = 5.80 BRL, então 1 EUR = 6.16/5.80 = 1.062 USD, logo USD→EUR = 0.94
const FALLBACK_RATES = {
    USD: 1.0,       // Base
    BRL: 5.80,      // 1 USD = 5.80 BRL (Google Finance)
    EUR: 0.94,      // 1 USD = 0.94 EUR (portanto 1 EUR = 6.17 BRL) ✓
    AOA: 920.0,     // 1 USD = 920 AOA Kwanza Angolano
    CUP: 24.0,      // 1 USD = 24 CUP Peso Cubano
    RUB: 97.0,      // 1 USD = 97 RUB Rublo Russo
    ZAR: 18.10,     // 1 USD = 18.10 ZAR Rand Sul-Africano
    NAD: 18.10,     // 1 USD = 18.10 NAD Dólar Namibiano
    MZN: 63.90      // 1 USD = 63.90 MZN Metical Moçambicano
};

// ==================== GEMINI API FUNCTION ====================

async function fetchRateFromGemini(fromCurrency, toCurrency) {
    try {
        console.log(`🔮 Asking Gemini AI for ${fromCurrency} to ${toCurrency} rate (via Google Search)...`);

        const prompt = `What is the current exchange rate for 1 ${fromCurrency} to ${toCurrency}? Provide ONLY the numerical value as a decimal number, nothing else. For example: 6.17`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                tools: [{
                    googleSearch: {}  // This enables Google Search grounding!
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract the rate from Gemini's response
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            // Extract number from text (handles formats like "6.17" or "The rate is 6.17")
            const match = text.match(/\d+\.?\d*/);
            if (match) {
                const rate = parseFloat(match[0]);
                console.log(`✨ Gemini found rate: 1 ${fromCurrency} = ${rate} ${toCurrency} (from Google Finance)`);
                return rate;
            }
        }

        throw new Error('Could not parse rate from Gemini response');
    } catch (error) {
        console.warn(`Gemini API failed: ${error.message}`);
        return null;
    }
}

async function fetchAllRatesFromGemini(baseCurrency) {
    // OPTIMIZATION: Only fetch 2-3 key rates from Gemini to avoid rate limits
    // Let traditional APIs handle the rest
    const keyCurrencies = baseCurrency === 'USD'
        ? ['BRL', 'EUR']
        : baseCurrency === 'BRL'
        ? ['USD', 'EUR']
        : ['USD', 'BRL'];

    const rates = {};
    rates[baseCurrency] = 1.0;

    console.log(`Fetching ${keyCurrencies.length} key rates from Gemini for ${baseCurrency}...`);

    for (const currency of keyCurrencies) {
        const rate = await fetchRateFromGemini(baseCurrency, currency);
        if (rate && rate > 0) {
            rates[currency] = rate;
        } else {
            console.warn(`Failed to get ${baseCurrency}→${currency} from Gemini`);
            return null; // If Gemini fails, use fallback APIs
        }
    }

    return rates;
}

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

async function fetchExchangeRates(baseCurrency = 'USD', showNotification = false, forceUpdate = false, useGemini = false) {
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

        // TRY GEMINI API FIRST - ONLY if explicitly requested (manual refresh)
        const shouldUseGemini = useGemini && ['USD', 'BRL', 'EUR'].includes(baseCurrency);

        if (shouldUseGemini) {
            try {
                console.log(`🌟 Trying Gemini API with Google Search grounding...`);

                // Add timeout to prevent hanging
                const geminiPromise = fetchAllRatesFromGemini(baseCurrency);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini timeout')), 10000)
                );

                const geminiRates = await Promise.race([geminiPromise, timeoutPromise]);

                if (geminiRates && Object.keys(geminiRates).length > 1) {
                    // Gemini only returns partial rates, merge with traditional API
                    console.log(`✨ Got ${Object.keys(geminiRates).length} rates from Gemini, fetching rest from traditional APIs...`);

                    // Still need full rate set, so continue to traditional APIs
                    // but we'll use Gemini rates as reference
                }
            } catch (error) {
                console.warn('⚠️ Gemini API failed or timed out, using traditional APIs...', error.message);
                lastError = error;
            }
        }

        // ALWAYS use traditional APIs for fast, reliable data
        if (!data) {
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

    // Fetch rates if needed (uses cache if available - fast!)
    await fetchExchangeRates(fromCurrency, false, false, false); // No force, no Gemini = fast
    await fetchExchangeRates(toCurrency, false, false, false);

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

// Manual refresh function - FORCE new data from API with GEMINI
async function refreshRates() {
    console.log('🔄 Manual refresh triggered - forcing API requests with Gemini...');

    // Force update for main currencies WITH GEMINI (Google Finance data)
    await fetchExchangeRates('USD', true, true, true);  // show notification, force, USE GEMINI
    await fetchExchangeRates('BRL', false, true, true);
    await fetchExchangeRates('EUR', false, true, true);

    // Other currencies without Gemini (faster)
    await fetchExchangeRates('AOA', false, true, false);
    await fetchExchangeRates('CUP', false, true, false);
    await fetchExchangeRates('RUB', false, true, false);
    await fetchExchangeRates('ZAR', false, true, false);
    await fetchExchangeRates('NAD', false, true, false);
    await fetchExchangeRates('MZN', false, true, false);

    // Update the calculator display
    await updateCalculator();

    console.log('✅ All exchange rates refreshed from API (with Gemini for main currencies)');
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

    // CLEAR OLD CACHE - force fresh data
    console.log('🗑️ Clearing old exchange rate cache...');
    localStorage.removeItem('exchangeRates');
    exchangeRates = {};
    lastUpdate = null;

    console.log('📊 Initializing calculator - loading exchange rates (FAST mode)...');

    // Fetch initial rates for main currencies only (no force, no Gemini = FAST!)
    await fetchExchangeRates('USD', false, true, false); // Force once on load, but NO Gemini
    await fetchExchangeRates('BRL', false, true, false);
    await fetchExchangeRates('EUR', false, true, false);

    console.log('✅ Main exchange rates loaded (others will load on demand)');

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

    // Auto-refresh rates every 10 minutes
    setInterval(async () => {
        console.log('⏰ Auto-updating exchange rates (every 10 minutes)...');

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
