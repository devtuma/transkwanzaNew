// ==================== TRANSKWANZA KYC - UPLOAD DE DOCUMENTOS ====================
// Upload e validação de documentos oficiais
// Versão: 3.0 Production

// ==================== FILE PREVIEW ====================

function handleFileSelect(input, type) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        NotificationUtil.show('Arquivo muito grande. Máximo 5MB.', 'error');
        input.value = '';
        return;
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        NotificationUtil.show('Formato não permitido. Use JPG, PNG ou PDF.', 'error');
        input.value = '';
        return;
    }

    // Atualizar UI
    const uploadBox = document.getElementById(`${type}Upload`);
    const preview = document.getElementById(`${type}Preview`);

    uploadBox.classList.add('has-file');

    // Mostrar preview
    preview.style.display = 'block';
    preview.innerHTML = '';

    if (file.type === 'application/pdf') {
        preview.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file-pdf" style="color: #ef4444;"></i>
                <strong>${file.name}</strong><br>
                <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
        `;
    } else {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="file-info">
                    <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                    <strong>${file.name}</strong><br>
                    <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

// ==================== FORM SUBMIT ====================

document.getElementById('kycForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Verificar se está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
        NotificationUtil.show('Você precisa estar logado', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Verificar arquivos obrigatórios
    const documentFront = document.getElementById('documentFront').files[0];
    const documentSelfie = document.getElementById('documentSelfie').files[0];

    if (!documentFront || !documentSelfie) {
        NotificationUtil.show('Envie todos os documentos obrigatórios', 'error');
        return;
    }

    // Preparar FormData
    const formData = new FormData();
    formData.append('document_type', document.getElementById('documentType').value);
    formData.append('document_number', document.getElementById('documentNumber').value);
    formData.append('document_front', documentFront);

    const documentBack = document.getElementById('documentBack').files[0];
    if (documentBack) {
        formData.append('document_back', documentBack);
    }

    formData.append('document_selfie', documentSelfie);

    // Desabilitar botão
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const response = await fetch('/api/kyc.php', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            NotificationUtil.show('Documentos enviados com sucesso!', 'success');

            // Atualizar status do usuário no localStorage
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.kyc_status = 'under_review';
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) {}

            // Mostrar mensagem de sucesso
            setTimeout(() => {
                const kycCard = document.querySelector('.kyc-card');
                kycCard.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-xl);">
                        <i class="fas fa-check-circle" style="font-size: 5rem; color: var(--success-color); margin-bottom: var(--spacing-lg);"></i>
                        <h2>Documentos Enviados!</h2>
                        <p style="margin: var(--spacing-md) 0;">
                            Seus documentos foram enviados com sucesso e estão em análise.<br>
                            Você receberá uma notificação quando forem aprovados.
                        </p>
                        ${data.warning ? `
                            <div class="warning-box">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Atenção:</strong> ${data.warning}
                            </div>
                        ` : ''}
                        <button onclick="window.location.href='dashboard.html'" class="btn-submit" style="margin-top: var(--spacing-lg);">
                            <i class="fas fa-arrow-right"></i>
                            Ir para Dashboard
                        </button>
                    </div>
                `;
            }, 1000);

        } else {
            NotificationUtil.show(data.error || 'Erro ao enviar documentos', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }

    } catch (error) {
        console.error('Erro ao enviar KYC:', error);
        NotificationUtil.show('Erro ao conectar com servidor', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se usuário está logado
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.email) {
        NotificationUtil.show('Você precisa estar logado', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Verificar se KYC já foi enviado
    if (user.kyc_status === 'under_review') {
        NotificationUtil.show('Seus documentos já estão em análise', 'info');
        setTimeout(() => {
            window.location.href = 'dashboard.html?tab=perfil';
        }, 2000);
        return;
    }

    // Verificar se KYC já foi aprovado
    if (user.kyc_status === 'approved' && user.verified) {
        NotificationUtil.show('Sua conta já está verificada!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    console.log(' Página KYC inicializada');
});
