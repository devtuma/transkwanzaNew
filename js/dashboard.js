// ==================== DASHBOARD FUNCTIONALITY ====================

// Global variables
let currentUser = null;
let allProposals = [];
let myProposals = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Require authentication
    AuthUtil.requireAuth();

    // Get current user
    currentUser = AuthUtil.getCurrentUser();

    // Update user info in header
    document.getElementById('userName').textContent = currentUser.name.split(' ')[0];

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Deseja realmente sair?')) {
            AuthUtil.logout();
        }
    });

    // Initialize tabs
    initializeTabs();

    // Initialize calculator
    await initializeCalculator();

    // Load proposals
    loadAllProposals();
    loadMyProposals();

    // Filters
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    // New proposal modal
    const newProposalModal = document.getElementById('newProposalModal');
    const acceptProposalModal = document.getElementById('acceptProposalModal');

    document.getElementById('createProposalBtn').addEventListener('click', async function() {
        await openNewProposalModal();
    });

    document.getElementById('closeModal').addEventListener('click', function() {
        newProposalModal.classList.remove('active');
    });

    document.getElementById('cancelModal').addEventListener('click', function() {
        newProposalModal.classList.remove('active');
    });

    document.getElementById('closeAcceptModal').addEventListener('click', function() {
        acceptProposalModal.classList.remove('active');
    });

    document.getElementById('cancelAcceptModal').addEventListener('click', function() {
        acceptProposalModal.classList.remove('active');
    });

    // Close modal on outside click
    newProposalModal.addEventListener('click', function(e) {
        if (e.target === newProposalModal) {
            newProposalModal.classList.remove('active');
        }
    });

    acceptProposalModal.addEventListener('click', function(e) {
        if (e.target === acceptProposalModal) {
            acceptProposalModal.classList.remove('active');
        }
    });

    // Form submissions
    document.getElementById('newProposalForm').addEventListener('submit', handleNewProposal);
    document.getElementById('acceptProposalForm').addEventListener('submit', handleAcceptProposal);

    // Check for pending proposal from home page
    const pendingProposal = sessionStorage.getItem('newProposal');
    if (pendingProposal) {
        sessionStorage.removeItem('newProposal');
        const data = JSON.parse(pendingProposal);

        // Switch to calculator tab
        switchTab('calculadora');

        // Set values
        document.getElementById('calcFromCurrency').value = data.fromCurrency;
        document.getElementById('calcToCurrency').value = data.toCurrency;
        document.getElementById('calcFromAmount').value = data.amount;

        // Update calculator
        updateDashboardCalculator();

        // Show modal
        setTimeout(async () => {
            await openNewProposalModal();
        }, 500);
    }
});

// ==================== TABS ====================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Remove active class from all
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Reload data if needed
    if (tabId === 'propostas-disponiveis') {
        loadAllProposals();
    } else if (tabId === 'minhas-propostas') {
        loadMyProposals();
    }
}

// ==================== CALCULATOR ====================

async function initializeCalculator() {
    const calcFromCurrency = document.getElementById('calcFromCurrency');
    const calcToCurrency = document.getElementById('calcToCurrency');
    const calcFromAmount = document.getElementById('calcFromAmount');
    const calcSwapBtn = document.getElementById('calcSwapBtn');

    console.log('💱 Dashboard calculator - usando sistema profissional de câmbio...');

    // Pré-carregar taxas principais (com cache inteligente)
    await CurrencySystem.getExchangeRate('USD', 'BRL');
    await CurrencySystem.getExchangeRate('USD', 'EUR');
    await CurrencySystem.getExchangeRate('BRL', 'USD');

    console.log('✅ Taxas REAIS carregadas (cache inteligente ativo)');

    // Initial calculation
    updateDashboardCalculator();

    // Event listeners - make them async to fetch rates when currency changes
    calcFromCurrency.addEventListener('change', async () => {
        console.log(`Dashboard: Currency changed to ${calcFromCurrency.value}`);
        await updateDashboardCalculator();
    });

    calcToCurrency.addEventListener('change', async () => {
        console.log(`Dashboard: Currency changed to ${calcToCurrency.value}`);
        await updateDashboardCalculator();
    });

    calcFromAmount.addEventListener('input', async () => {
        await updateDashboardCalculator();
    });

    calcSwapBtn.addEventListener('click', async function() {
        const temp = calcFromCurrency.value;
        calcFromCurrency.value = calcToCurrency.value;
        calcToCurrency.value = temp;
        await updateDashboardCalculator();
    });
}

async function updateDashboardCalculator() {
    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const fromAmount = parseFloat(document.getElementById('calcFromAmount').value) || 0;

    if (!fromAmount || fromAmount <= 0) {
        document.getElementById('calcToAmount').value = '0.00';
        return;
    }

    try {
        // Usar sistema profissional de câmbio (taxas REAIS!)
        const calculation = await CurrencySystem.calculateWithFee(fromAmount, fromCurrency, toCurrency);

        if (calculation.success) {
            // Mostrar valor FINAL (já com taxa de 3% deduzida)
            document.getElementById('calcToAmount').value = calculation.finalAmount;

            const rateDisplay = document.getElementById('calcExchangeRate');
            if (rateDisplay) {
                const formattedRate = calculation.rate.toFixed(6).replace(/\.?0+$/, '');
                const cacheStatus = calculation.cached ? '(cache)' : '(tempo real)';
                rateDisplay.innerHTML = `
                    <strong>Taxa:</strong> 1 ${fromCurrency} = ${formattedRate} ${toCurrency} ${cacheStatus}<br>
                    <small>Taxa TransKwanza: ${calculation.feePercentage}% = ${CurrencySystem.formatCurrency(calculation.feeAmount, toCurrency)}</small><br>
                    <small>Atualizado: ${calculation.updated_at || 'agora'}</small>
                `;
            }
        } else {
            // Erro ao buscar taxa
            document.getElementById('calcToAmount').value = '0.00';
            const rateDisplay = document.getElementById('calcExchangeRate');
            if (rateDisplay) {
                rateDisplay.innerHTML = `<span style="color:red">❌ ${calculation.error}</span>`;
            }
        }
    } catch (error) {
        console.error('Erro ao calcular:', error);
        document.getElementById('calcToAmount').value = '0.00';
    }
}

// ==================== API INTEGRATION ====================

/**
 * Helper para fazer requisições autenticadas
 */
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

/**
 * Buscar todas as propostas disponíveis (exceto as do usuário)
 */
async function fetchAllProposals(filters = {}) {
    const params = new URLSearchParams();

    if (filters.from_currency) {
        params.append('from_currency', filters.from_currency);
    }
    if (filters.to_currency) {
        params.append('to_currency', filters.to_currency);
    }

    const url = `/api/proposals.php${params.toString() ? '?' + params.toString() : ''}`;
    const data = await apiRequest(url);

    return data.proposals || [];
}

/**
 * Buscar propostas do usuário atual
 */
async function fetchMyProposals() {
    const data = await apiRequest('/api/proposals.php?user=me');
    return data.proposals || [];
}

/**
 * Criar nova proposta
 */
async function createProposal(proposalData) {
    const data = await apiRequest('/api/proposals.php', {
        method: 'POST',
        body: JSON.stringify(proposalData)
    });

    return data;
}

/**
 * Aceitar proposta (criar match)
 */
async function acceptProposal(proposalId, recipientData) {
    const data = await apiRequest(`/api/proposals.php?id=${proposalId}&action=accept`, {
        method: 'POST',
        body: JSON.stringify(recipientData)
    });

    return data;
}

/**
 * Deletar proposta
 */
async function deleteProposalAPI(proposalId) {
    const data = await apiRequest(`/api/proposals.php?id=${proposalId}`, {
        method: 'DELETE'
    });

    return data;
}

// ==================== PROPOSALS ====================

async function loadAllProposals() {
    try {
        // Buscar da API REAL
        allProposals = await fetchAllProposals();
        renderProposals(allProposals);
    } catch (error) {
        console.error('Erro ao carregar propostas:', error);
        NotificationUtil.show('Erro ao carregar propostas: ' + error.message, 'error');
        allProposals = [];
        renderProposals([]);
    }
}

async function loadMyProposals() {
    try {
        // Buscar da API REAL
        myProposals = await fetchMyProposals();
        renderMyProposals(myProposals);
    } catch (error) {
        console.error('Erro ao carregar suas propostas:', error);
        NotificationUtil.show('Erro ao carregar suas propostas: ' + error.message, 'error');
        myProposals = [];
        renderMyProposals([]);
    }
}

async function applyFilters() {
    const fromCurrency = document.getElementById('filterFromCurrency').value;
    const toCurrency = document.getElementById('filterToCurrency').value;

    try {
        // Buscar com filtros direto da API (mais eficiente!)
        const filters = {};

        if (fromCurrency) {
            filters.from_currency = fromCurrency;
        }

        if (toCurrency) {
            filters.to_currency = toCurrency;
        }

        allProposals = await fetchAllProposals(filters);
        renderProposals(allProposals);
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        NotificationUtil.show('Erro ao filtrar propostas: ' + error.message, 'error');
    }
}

function renderProposals(proposals) {
    const container = document.getElementById('proposalsList');

    if (proposals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhuma proposta encontrada</h3>
                <p>Ajuste os filtros ou crie uma nova proposta</p>
            </div>
        `;
        return;
    }

    container.innerHTML = proposals.map(proposal => `
        <div class="proposal-card">
            <div class="proposal-header">
                <div class="proposal-currencies">
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.from_currency)}
                        ${proposal.from_currency}
                    </div>
                    <i class="fas fa-arrow-right currency-arrow"></i>
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.to_currency)}
                        ${proposal.to_currency}
                    </div>
                </div>
                <span class="proposal-status status-${proposal.status}">
                    ${getStatusLabel(proposal.status)}
                </span>
            </div>

            <div class="proposal-amount">
                ${FormatUtil.formatCurrency(proposal.from_amount || proposal.amount, proposal.from_currency)}
            </div>

            <div class="proposal-details">
                <div class="detail-row">
                    <span>Enviado de:</span>
                    <strong>${FormatUtil.getCurrencyName(proposal.from_currency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Recebido em:</span>
                    <strong>${FormatUtil.getCurrencyName(proposal.to_currency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Método de pagamento:</span>
                    <strong>${FormatUtil.getPaymentMethod(proposal.from_currency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Criado em:</span>
                    <strong>${FormatUtil.formatDate(proposal.created_at || proposal.createdAt)}</strong>
                </div>
            </div>

            <div class="proposal-actions">
                <button class="btn-accept" onclick="openAcceptProposalModal('${proposal.id}')">
                    <i class="fas fa-handshake"></i>
                    Aceitar
                </button>
            </div>
        </div>
    `).join('');
}

function renderMyProposals(proposals) {
    const container = document.getElementById('myProposalsList');

    if (proposals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Você ainda não tem propostas</h3>
                <p>Crie sua primeira proposta na aba Calculadora</p>
            </div>
        `;
        return;
    }

    container.innerHTML = proposals.map(proposal => `
        <div class="proposal-card">
            <div class="proposal-header">
                <div class="proposal-currencies">
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.from_currency)}
                        ${proposal.from_currency}
                    </div>
                    <i class="fas fa-arrow-right currency-arrow"></i>
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.to_currency)}
                        ${proposal.to_currency}
                    </div>
                </div>
                <span class="proposal-status status-${proposal.status}">
                    ${getStatusLabel(proposal.status)}
                </span>
            </div>

            <div class="proposal-amount">
                ${FormatUtil.formatCurrency(proposal.from_amount || proposal.amount, proposal.from_currency)}
            </div>

            <div class="proposal-details">
                <div class="detail-row">
                    <span>Destinatário:</span>
                    <strong>${proposal.recipient_name || proposal.recipientName}</strong>
                </div>
                <div class="detail-row">
                    <span>Telefone:</span>
                    <strong>${proposal.recipient_phone || proposal.recipientPhone}</strong>
                </div>
                <div class="detail-row">
                    <span>Criado em:</span>
                    <strong>${FormatUtil.formatDate(proposal.created_at || proposal.createdAt)}</strong>
                </div>
                ${proposal.exchange_rate ? `
                    <div class="detail-row">
                        <span>Taxa de câmbio:</span>
                        <strong>1 ${proposal.from_currency} = ${parseFloat(proposal.exchange_rate).toFixed(6)} ${proposal.to_currency}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Valor a receber:</span>
                        <strong>${FormatUtil.formatCurrency(proposal.to_amount, proposal.to_currency)}</strong>
                    </div>
                ` : ''}
            </div>

            <div class="proposal-actions">
                ${proposal.status === 'pending' ? `
                    <button class="btn-delete" onclick="deleteProposal('${proposal.id}')">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                ` : `
                    <button class="btn-view" onclick="viewProposal('${proposal.id}')">
                        <i class="fas fa-eye"></i>
                        Ver detalhes
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Aguardando',
        matched: 'Conectado',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
}

// ==================== NEW PROPOSAL MODAL ====================

async function openNewProposalModal() {
    const modal = document.getElementById('newProposalModal');
    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const fromAmount = parseFloat(document.getElementById('calcFromAmount').value);

    if (!fromAmount || fromAmount <= 0) {
        NotificationUtil.show('Digite um valor válido', 'error');
        return;
    }

    // Usar sistema profissional com taxas REAIS
    const calculation = await CurrencySystem.calculateWithFee(fromAmount, fromCurrency, toCurrency);

    if (!calculation.success) {
        NotificationUtil.show('Erro ao obter taxa de câmbio: ' + calculation.error, 'error');
        return;
    }

    // Update modal fields
    document.getElementById('modalFromCurrency').textContent = `${FormatUtil.getCountryFlag(fromCurrency)} ${fromCurrency}`;
    document.getElementById('modalFromAmount').textContent = CurrencySystem.formatCurrency(fromAmount, fromCurrency);
    document.getElementById('modalToCurrency').textContent = `${FormatUtil.getCountryFlag(toCurrency)} ${toCurrency}`;
    document.getElementById('modalToAmount').textContent = CurrencySystem.formatCurrency(calculation.finalAmount, toCurrency);
    document.getElementById('modalPaymentMethod').textContent = FormatUtil.getPaymentMethod(toCurrency);

    // Mostrar taxa e detalhes
    const modalRate = document.getElementById('modalRate');
    if (modalRate) {
        modalRate.innerHTML = `
            Taxa: 1 ${fromCurrency} = ${calculation.rate.toFixed(6)} ${toCurrency}<br>
            <small>Taxa TransKwanza (${calculation.feePercentage}%): ${CurrencySystem.formatCurrency(calculation.feeAmount, toCurrency)}</small>
        `;
    }

    // Clear form
    document.getElementById('newProposalForm').reset();

    // Show modal
    modal.classList.add('active');
}

async function handleNewProposal(e) {
    e.preventDefault();

    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const amount = parseFloat(document.getElementById('calcFromAmount').value);
    const recipientName = document.getElementById('recipientName').value.trim();
    const recipientEmail = document.getElementById('recipientEmail').value.trim();
    const recipientPhone = document.getElementById('recipientPhone').value.trim();

    // Validações
    if (!amount || amount <= 0) {
        NotificationUtil.show('Valor inválido', 'error');
        return;
    }

    if (!recipientName || !recipientEmail || !recipientPhone) {
        NotificationUtil.show('Preencha todos os campos', 'error');
        return;
    }

    try {
        // Criar proposta via API REAL
        const proposalData = {
            from_currency: fromCurrency,
            to_currency: toCurrency,
            amount: amount,
            recipient_name: recipientName,
            recipient_email: recipientEmail,
            recipient_phone: recipientPhone
        };

        const response = await createProposal(proposalData);

        // Close modal
        document.getElementById('newProposalModal').classList.remove('active');

        // Show success message com informações da taxa
        let message = 'Proposta criada com sucesso!';
        if (response.rate_info) {
            message += `<br><small>Taxa: ${response.rate_info.exchange_rate.toFixed(6)} | Você receberá: ${FormatUtil.formatCurrency(response.rate_info.to_amount, toCurrency)}</small>`;
        }
        NotificationUtil.show(message, 'success');

        // Reload my proposals
        await loadMyProposals();

        // Switch to my proposals tab
        switchTab('minhas-propostas');

    } catch (error) {
        console.error('Erro ao criar proposta:', error);
        NotificationUtil.show('Erro ao criar proposta: ' + error.message, 'error');
    }
}

// ==================== ACCEPT PROPOSAL MODAL ====================

function openAcceptProposalModal(proposalId) {
    const modal = document.getElementById('acceptProposalModal');
    const proposal = allProposals.find(p => p.id == proposalId);

    if (!proposal) {
        NotificationUtil.show('Proposta não encontrada', 'error');
        return;
    }

    // Update modal fields
    document.getElementById('acceptFromCurrency').textContent = `${FormatUtil.getCountryFlag(proposal.from_currency)} ${proposal.from_currency}`;
    document.getElementById('acceptFromAmount').textContent = FormatUtil.formatCurrency(proposal.from_amount || proposal.amount, proposal.from_currency);
    document.getElementById('acceptProposalId').value = proposalId;

    // Clear form
    document.getElementById('acceptProposalForm').reset();

    // Show modal
    modal.classList.add('active');
}

async function handleAcceptProposal(e) {
    e.preventDefault();

    const proposalId = document.getElementById('acceptProposalId').value;
    const recipientName = document.getElementById('acceptRecipientName').value.trim();
    const recipientEmail = document.getElementById('acceptRecipientEmail').value.trim();
    const recipientPhone = document.getElementById('acceptRecipientPhone').value.trim();

    // Validações
    if (!recipientName || !recipientEmail || !recipientPhone) {
        NotificationUtil.show('Preencha todos os campos', 'error');
        return;
    }

    try {
        // Aceitar proposta via API REAL
        const recipientData = {
            recipient_name: recipientName,
            recipient_email: recipientEmail,
            recipient_phone: recipientPhone
        };

        await acceptProposal(proposalId, recipientData);

        // Close modal
        document.getElementById('acceptProposalModal').classList.remove('active');

        // Show success message
        NotificationUtil.show('Proposta aceita! Aguarde instruções de pagamento.', 'success');

        // Reload proposals
        await loadAllProposals();

    } catch (error) {
        console.error('Erro ao aceitar proposta:', error);
        NotificationUtil.show('Erro ao aceitar proposta: ' + error.message, 'error');
    }
}

// ==================== PROPOSAL ACTIONS ====================

async function deleteProposal(proposalId) {
    if (!confirm('Deseja realmente excluir esta proposta?')) {
        return;
    }

    try {
        await deleteProposalAPI(proposalId);
        NotificationUtil.show('Proposta excluída', 'success');
        await loadMyProposals();
    } catch (error) {
        console.error('Erro ao excluir proposta:', error);
        NotificationUtil.show('Erro ao excluir proposta: ' + error.message, 'error');
    }
}

function viewProposal(proposalId) {
    const proposal = myProposals.find(p => p.id == proposalId);

    if (!proposal) {
        NotificationUtil.show('Proposta não encontrada', 'error');
        return;
    }

    let message = `
        <strong>Proposta #${proposal.id}</strong><br><br>
        <strong>De:</strong> ${FormatUtil.getCountryFlag(proposal.from_currency)} ${proposal.from_currency} ${FormatUtil.formatCurrency(proposal.from_amount || proposal.amount, proposal.from_currency)}<br>
        <strong>Para:</strong> ${FormatUtil.getCountryFlag(proposal.to_currency)} ${proposal.to_currency}<br>
        <strong>Status:</strong> ${getStatusLabel(proposal.status)}<br>
        <strong>Destinatário:</strong> ${proposal.recipient_name || proposal.recipientName}<br>
        <strong>Criado em:</strong> ${FormatUtil.formatDate(proposal.created_at || proposal.createdAt)}
    `;

    if (proposal.exchange_rate) {
        message += `<br><strong>Taxa:</strong> 1 ${proposal.from_currency} = ${parseFloat(proposal.exchange_rate).toFixed(6)} ${proposal.to_currency}`;
        message += `<br><strong>Valor a receber:</strong> ${FormatUtil.formatCurrency(proposal.to_amount, proposal.to_currency)}`;
    }

    if (proposal.status === 'matched') {
        message += `<br><br><strong>🎉 Proposta conectada!</strong><br>Aguarde instruções de pagamento.`;
        if (proposal.matched_with_email) {
            message += `<br><small>Conectado com: ${proposal.matched_with_email}</small>`;
        }
    }

    NotificationUtil.show(message, 'info');
}

// Make functions global
window.openAcceptProposalModal = openAcceptProposalModal;
window.deleteProposal = deleteProposal;
window.viewProposal = viewProposal;
