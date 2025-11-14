<?php
// ==================== TRANSKWANZA KYC API ====================
// Upload e validação de documentos oficiais
// Versão: 3.0 Production

require_once 'config.php';

// Verificar autenticação
$user = get_auth_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Método não permitido'], 405);
}

// ==================== VERIFICAR SE JÁ TEM KYC APROVADO ====================

global $pdo;

$stmt = $pdo->prepare("SELECT kyc_status FROM users WHERE id = ?");
$stmt->execute([$user['id']]);
$current_status = $stmt->fetchColumn();

if ($current_status === 'approved') {
    json_response(['error' => 'KYC já aprovado'], 400);
}

// ==================== VALIDAR ARQUIVOS ====================

$required_files = ['document_front'];
$optional_files = ['document_back', 'document_selfie'];

foreach ($required_files as $field) {
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => "Arquivo obrigatório: $field"], 400);
    }
}

// ==================== PROCESSAR UPLOADS ====================

$uploaded_files = [];

try {
    $upload_dir = '../uploads/documents/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    foreach (array_merge($required_files, $optional_files) as $field) {
        if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES[$field];

            // Validar tamanho (5MB máx)
            if ($file['size'] > 5 * 1024 * 1024) {
                json_response(['error' => "$field muito grande (máx 5MB)"], 400);
            }

            // Validar tipo
            $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime_type = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mime_type, $allowed_types)) {
                json_response(['error' => "$field deve ser JPG, PNG ou PDF"], 400);
            }

            // Gerar nome único
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'doc_' . $user['id'] . '_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $upload_dir . $filename;

            // Mover arquivo
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                json_response(['error' => "Erro ao salvar $field"], 500);
            }

            $uploaded_files[$field] = 'uploads/documents/' . $filename;

            // Salvar no banco uploads
            $stmt = $pdo->prepare("
                INSERT INTO uploads (user_id, file_name, file_path, file_type, file_size, upload_type)
                VALUES (?, ?, ?, ?, ?, 'identity_document')
            ");
            $stmt->execute([
                $user['id'],
                $filename,
                $uploaded_files[$field],
                $mime_type,
                $file['size']
            ]);
        }
    }

    // ==================== ATUALIZAR USUÁRIO ====================

    $document_type = $_POST['document_type'] ?? 'ID';
    $document_number = $_POST['document_number'] ?? '';

    $stmt = $pdo->prepare("
        UPDATE users
        SET document_type = ?,
            document_number = ?,
            document_front = ?,
            document_back = ?,
            document_selfie = ?,
            kyc_status = 'under_review',
            kyc_submitted_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $document_type,
        $document_number,
        $uploaded_files['document_front'] ?? null,
        $uploaded_files['document_back'] ?? null,
        $uploaded_files['document_selfie'] ?? null,
        $user['id']
    ]);

    // ==================== DETECÇÃO DE FRAUDE ====================

    // Verificar documento duplicado
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM users
        WHERE document_number = ? AND id != ?
    ");
    $stmt->execute([$document_number, $user['id']]);
    $duplicate_count = $stmt->fetchColumn();

    if ($duplicate_count > 0) {
        // Alerta de fraude
        $stmt = $pdo->prepare("
            INSERT INTO fraud_checks (user_id, check_type, risk_level, details)
            VALUES (?, 'duplicate_document', 'high', ?)
        ");
        $stmt->execute([
            $user['id'],
            'Documento duplicado: ' . $document_number
        ]);

        // Aumentar fraud_score
        $stmt = $pdo->prepare("
            UPDATE users SET fraud_score = fraud_score + 50 WHERE id = ?
        ");
        $stmt->execute([$user['id']]);
    }

    // Log
    $stmt = $pdo->prepare("
        INSERT INTO activity_log (user_id, action, details)
        VALUES (?, 'kyc_submitted', ?)
    ");
    $stmt->execute([
        $user['id'],
        'Documentos enviados: ' . implode(', ', array_keys($uploaded_files))
    ]);

    // Notificar admins
    $stmt = $pdo->prepare("
        SELECT id FROM users WHERE is_admin = 1
    ");
    $stmt->execute();
    $admins = $stmt->fetchAll();

    foreach ($admins as $admin) {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, 'system', 'Novo KYC para revisar', 'Usuário {$user['name']} enviou documentos', '/admin.html?tab=kyc')
        ");
        $stmt->execute([$admin['id']]);
    }

    json_response([
        'success' => true,
        'message' => 'Documentos enviados com sucesso! Aguarde aprovação do administrador.',
        'files' => $uploaded_files,
        'warning' => $duplicate_count > 0 ? 'Documento já cadastrado anteriormente' : null
    ]);

} catch (PDOException $e) {
    // Deletar arquivos se falhar
    foreach ($uploaded_files as $filepath) {
        if (file_exists('../' . $filepath)) {
            unlink('../' . $filepath);
        }
    }

    error_log("Erro KYC: " . $e->getMessage());
    json_response(['error' => 'Erro ao processar documentos'], 500);
}
