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

    document.getElementById('createProposalBtn').addEventListener('click', function() {
        openNewProposalModal();
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
        setTimeout(() => {
            openNewProposalModal();
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

    // Fetch rates
    await CurrencyUtil.fetchExchangeRates('USD');
    await CurrencyUtil.fetchExchangeRates('BRL');
    await CurrencyUtil.fetchExchangeRates('EUR');

    // Initial calculation
    updateDashboardCalculator();

    // Event listeners
    calcFromCurrency.addEventListener('change', updateDashboardCalculator);
    calcToCurrency.addEventListener('change', updateDashboardCalculator);
    calcFromAmount.addEventListener('input', updateDashboardCalculator);

    calcSwapBtn.addEventListener('click', function() {
        const temp = calcFromCurrency.value;
        calcFromCurrency.value = calcToCurrency.value;
        calcToCurrency.value = temp;
        updateDashboardCalculator();
    });
}

function updateDashboardCalculator() {
    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const fromAmount = parseFloat(document.getElementById('calcFromAmount').value) || 0;

    const calculation = CurrencyUtil.calculateExchange(fromAmount, fromCurrency, toCurrency);

    document.getElementById('calcToAmount').value = calculation.convertedAmount.toFixed(2);

    const rateDisplay = document.getElementById('calcExchangeRate');
    if (rateDisplay) {
        rateDisplay.textContent = `1 ${fromCurrency} = ${calculation.rate.toFixed(4)} ${toCurrency}`;
    }
}

// ==================== PROPOSALS ====================

function loadAllProposals() {
    allProposals = StorageUtil.getProposals().filter(p =>
        p.status === 'pending' && p.userEmail !== currentUser.email
    );

    renderProposals(allProposals);
}

function loadMyProposals() {
    myProposals = StorageUtil.getUserProposals(currentUser.email);
    renderMyProposals(myProposals);
}

function applyFilters() {
    const fromCurrency = document.getElementById('filterFromCurrency').value;
    const toCurrency = document.getElementById('filterToCurrency').value;

    let filtered = allProposals;

    if (fromCurrency) {
        filtered = filtered.filter(p => p.fromCurrency === fromCurrency);
    }

    if (toCurrency) {
        filtered = filtered.filter(p => p.toCurrency === toCurrency);
    }

    renderProposals(filtered);
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
                        ${FormatUtil.getCountryFlag(proposal.fromCurrency)}
                        ${proposal.fromCurrency}
                    </div>
                    <i class="fas fa-arrow-right currency-arrow"></i>
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.toCurrency)}
                        ${proposal.toCurrency}
                    </div>
                </div>
                <span class="proposal-status status-${proposal.status}">
                    ${getStatusLabel(proposal.status)}
                </span>
            </div>

            <div class="proposal-amount">
                ${FormatUtil.formatCurrency(proposal.amount, proposal.fromCurrency)}
            </div>

            <div class="proposal-details">
                <div class="detail-row">
                    <span>Enviado de:</span>
                    <strong>${FormatUtil.getCurrencyName(proposal.fromCurrency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Recebido em:</span>
                    <strong>${FormatUtil.getCurrencyName(proposal.toCurrency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Método de pagamento:</span>
                    <strong>${FormatUtil.getPaymentMethod(proposal.fromCurrency)}</strong>
                </div>
                <div class="detail-row">
                    <span>Criado em:</span>
                    <strong>${FormatUtil.formatDate(proposal.createdAt)}</strong>
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
                        ${FormatUtil.getCountryFlag(proposal.fromCurrency)}
                        ${proposal.fromCurrency}
                    </div>
                    <i class="fas fa-arrow-right currency-arrow"></i>
                    <div class="currency-badge">
                        ${FormatUtil.getCountryFlag(proposal.toCurrency)}
                        ${proposal.toCurrency}
                    </div>
                </div>
                <span class="proposal-status status-${proposal.status}">
                    ${getStatusLabel(proposal.status)}
                </span>
            </div>

            <div class="proposal-amount">
                ${FormatUtil.formatCurrency(proposal.amount, proposal.fromCurrency)}
            </div>

            <div class="proposal-details">
                <div class="detail-row">
                    <span>Destinatário:</span>
                    <strong>${proposal.recipientName}</strong>
                </div>
                <div class="detail-row">
                    <span>Telefone:</span>
                    <strong>${proposal.recipientPhone}</strong>
                </div>
                <div class="detail-row">
                    <span>Criado em:</span>
                    <strong>${FormatUtil.formatDate(proposal.createdAt)}</strong>
                </div>
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

function openNewProposalModal() {
    const modal = document.getElementById('newProposalModal');
    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const fromAmount = parseFloat(document.getElementById('calcFromAmount').value);

    const calculation = CurrencyUtil.calculateExchange(fromAmount, fromCurrency, toCurrency);

    // Update modal fields
    document.getElementById('modalFromCurrency').textContent = `${FormatUtil.getCountryFlag(fromCurrency)} ${fromCurrency}`;
    document.getElementById('modalFromAmount').textContent = FormatUtil.formatCurrency(fromAmount, fromCurrency);
    document.getElementById('modalToCurrency').textContent = `${FormatUtil.getCountryFlag(toCurrency)} ${toCurrency}`;
    document.getElementById('modalToAmount').textContent = FormatUtil.formatCurrency(calculation.convertedAmount, toCurrency);
    document.getElementById('modalPaymentMethod').textContent = FormatUtil.getPaymentMethod(toCurrency);

    // Clear form
    document.getElementById('newProposalForm').reset();

    // Show modal
    modal.classList.add('active');
}

function handleNewProposal(e) {
    e.preventDefault();

    const fromCurrency = document.getElementById('calcFromCurrency').value;
    const toCurrency = document.getElementById('calcToCurrency').value;
    const amount = parseFloat(document.getElementById('calcFromAmount').value);
    const recipientName = document.getElementById('recipientName').value.trim();
    const recipientEmail = document.getElementById('recipientEmail').value.trim();
    const recipientPhone = document.getElementById('recipientPhone').value.trim();

    // Create proposal
    const proposal = {
        userEmail: currentUser.email,
        fromCurrency,
        toCurrency,
        amount,
        recipientName,
        recipientEmail,
        recipientPhone
    };

    StorageUtil.addProposal(proposal);

    // Close modal
    document.getElementById('newProposalModal').classList.remove('active');

    // Show success message
    NotificationUtil.show('Proposta criada com sucesso!', 'success');

    // Switch to my proposals tab
    switchTab('minhas-propostas');
}

// ==================== ACCEPT PROPOSAL MODAL ====================

function openAcceptProposalModal(proposalId) {
    const modal = document.getElementById('acceptProposalModal');
    const proposal = StorageUtil.getProposals().find(p => p.id === proposalId);

    if (!proposal) {
        NotificationUtil.show('Proposta não encontrada', 'error');
        return;
    }

    // Update modal fields
    document.getElementById('acceptFromCurrency').textContent = `${FormatUtil.getCountryFlag(proposal.fromCurrency)} ${proposal.fromCurrency}`;
    document.getElementById('acceptFromAmount').textContent = FormatUtil.formatCurrency(proposal.amount, proposal.fromCurrency);
    document.getElementById('acceptProposalId').value = proposalId;

    // Clear form
    document.getElementById('acceptProposalForm').reset();

    // Show modal
    modal.classList.add('active');
}

function handleAcceptProposal(e) {
    e.preventDefault();

    const proposalId = document.getElementById('acceptProposalId').value;
    const recipientName = document.getElementById('acceptRecipientName').value.trim();
    const recipientEmail = document.getElementById('acceptRecipientEmail').value.trim();
    const recipientPhone = document.getElementById('acceptRecipientPhone').value.trim();

    // Update proposal
    StorageUtil.updateProposal(proposalId, {
        status: 'matched',
        matchedWith: currentUser.email,
        matchRecipientName: recipientName,
        matchRecipientEmail: recipientEmail,
        matchRecipientPhone: recipientPhone,
        matchedAt: new Date().toISOString()
    });

    // Close modal
    document.getElementById('acceptProposalModal').classList.remove('active');

    // Show success message
    NotificationUtil.show('Proposta aceita! Aguarde instruções de pagamento.', 'success');

    // Reload proposals
    loadAllProposals();
}

// ==================== PROPOSAL ACTIONS ====================

function deleteProposal(proposalId) {
    if (!confirm('Deseja realmente excluir esta proposta?')) {
        return;
    }

    StorageUtil.deleteProposal(proposalId);
    NotificationUtil.show('Proposta excluída', 'success');
    loadMyProposals();
}

function viewProposal(proposalId) {
    const proposal = StorageUtil.getProposals().find(p => p.id === proposalId);

    if (!proposal) {
        NotificationUtil.show('Proposta não encontrada', 'error');
        return;
    }

    let message = `
        <strong>Proposta #${proposal.id.substring(0, 8)}</strong><br><br>
        <strong>De:</strong> ${FormatUtil.getCountryFlag(proposal.fromCurrency)} ${proposal.fromCurrency} ${FormatUtil.formatCurrency(proposal.amount, proposal.fromCurrency)}<br>
        <strong>Para:</strong> ${FormatUtil.getCountryFlag(proposal.toCurrency)} ${proposal.toCurrency}<br>
        <strong>Status:</strong> ${getStatusLabel(proposal.status)}<br>
        <strong>Destinatário:</strong> ${proposal.recipientName}<br>
        <strong>Criado em:</strong> ${FormatUtil.formatDate(proposal.createdAt)}
    `;

    if (proposal.status === 'matched') {
        message += `<br><br><strong>🎉 Proposta conectada!</strong><br>Aguarde instruções de pagamento.`;
    }

    NotificationUtil.show(message, 'info');
}

// Make functions global
window.openAcceptProposalModal = openAcceptProposalModal;
window.deleteProposal = deleteProposal;
window.viewProposal = viewProposal;
