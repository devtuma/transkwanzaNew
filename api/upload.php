<?php
// ==================== TRANSKWANZA FILE UPLOAD API ====================
// API para upload de comprovantes de pagamento e documentos
// Versão: 2.0 Production

require_once 'config.php';

// Configurações de upload
define('UPLOAD_PATH', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_TYPES', [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'application/pdf' => 'pdf'
]);

// ==================== VERIFICAR AUTENTICAÇÃO ====================

$token = get_auth_token();
if (!$token) {
    json_response(['error' => 'Token de autenticação não fornecido'], 401);
}

$payload = verify_token($token);
$user_id = $payload['user_id'];

// ==================== PROCESSAR UPLOAD ====================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Método não permitido'], 405);
}

// Verificar se arquivo foi enviado
if (!isset($_FILES['file'])) {
    json_response(['error' => 'Nenhum arquivo enviado'], 400);
}

$file = $_FILES['file'];
$upload_type = $_POST['type'] ?? 'other'; // payment_proof, document, avatar

// Validar tipo de upload
$valid_types = ['payment_proof', 'document', 'avatar', 'other'];
if (!in_array($upload_type, $valid_types)) {
    json_response(['error' => 'Tipo de upload inválido'], 400);
}

// Verificar erros de upload
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'Arquivo muito grande (limite do servidor)',
        UPLOAD_ERR_FORM_SIZE => 'Arquivo muito grande (limite do formulário)',
        UPLOAD_ERR_PARTIAL => 'Upload parcial',
        UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
        UPLOAD_ERR_NO_TMP_DIR => 'Diretório temporário não encontrado',
        UPLOAD_ERR_CANT_WRITE => 'Erro ao escrever arquivo',
        UPLOAD_ERR_EXTENSION => 'Extensão bloqueada'
    ];

    $error_message = $errors[$file['error']] ?? 'Erro desconhecido';
    json_response(['error' => $error_message], 400);
}

// Verificar tamanho do arquivo
if ($file['size'] > MAX_FILE_SIZE) {
    json_response([
        'error' => 'Arquivo muito grande',
        'max_size' => '5MB',
        'received_size' => round($file['size'] / 1024 / 1024, 2) . 'MB'
    ], 400);
}

// Verificar tipo de arquivo
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!isset(ALLOWED_TYPES[$mime_type])) {
    json_response([
        'error' => 'Tipo de arquivo não permitido',
        'allowed' => 'JPG, PNG, PDF',
        'received' => $mime_type
    ], 400);
}

// Criar diretórios se não existirem
$upload_dir = UPLOAD_PATH;
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$subdirs = [
    'payment_proof' => 'payment_proofs',
    'document' => 'documents',
    'avatar' => 'avatars',
    'other' => 'temp'
];

$subdir = $subdirs[$upload_type];
$full_path = $upload_dir . $subdir;

if (!file_exists($full_path)) {
    mkdir($full_path, 0755, true);
}

// Gerar nome único para o arquivo
$extension = ALLOWED_TYPES[$mime_type];
$filename = uniqid('file_' . time() . '_') . '.' . $extension;
$filepath = $full_path . '/' . $filename;

// Mover arquivo para destino final
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    json_response(['error' => 'Erro ao salvar arquivo'], 500);
}

// Salvar informações no banco de dados
try {
    global $pdo;

    $stmt = $pdo->prepare("
        INSERT INTO uploads (
            user_id,
            transaction_id,
            file_name,
            file_path,
            file_type,
            file_size,
            upload_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    $transaction_id = $_POST['transaction_id'] ?? null;

    $stmt->execute([
        $user_id,
        $transaction_id,
        $filename,
        $subdir . '/' . $filename,
        $mime_type,
        $file['size'],
        $upload_type
    ]);

    $upload_id = $pdo->lastInsertId();

    // Se for comprovante de pagamento, atualizar transação
    if ($upload_type === 'payment_proof' && $transaction_id) {
        $stmt = $pdo->prepare("
            SELECT sender_id, receiver_id FROM transactions WHERE id = ?
        ");
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch();

        if ($transaction) {
            // Verificar se usuário é sender ou receiver
            $field = ($transaction['sender_id'] == $user_id)
                ? 'sender_payment_proof'
                : 'receiver_payment_proof';

            $status = ($transaction['sender_id'] == $user_id)
                ? 'sender_paid'
                : 'receiver_paid';

            $stmt = $pdo->prepare("
                UPDATE transactions
                SET $field = ?, status = ?
                WHERE id = ?
            ");
            $stmt->execute([$filepath, $status, $transaction_id]);

            // Criar notificação para o outro usuário
            $other_user_id = ($transaction['sender_id'] == $user_id)
                ? $transaction['receiver_id']
                : $transaction['sender_id'];

            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, type, title, message, link)
                VALUES (?, 'payment_received', 'Comprovante recebido', 'O outro usuário enviou o comprovante de pagamento', '/dashboard.html?transaction={$transaction_id}')
            ");
            $stmt->execute([$other_user_id]);
        }
    }

    // URL pública do arquivo
    $file_url = '/uploads/' . $subdir . '/' . $filename;

    json_response([
        'success' => true,
        'message' => 'Arquivo enviado com sucesso',
        'data' => [
            'id' => $upload_id,
            'filename' => $filename,
            'url' => $file_url,
            'type' => $upload_type,
            'size' => $file['size'],
            'mime_type' => $mime_type
        ]
    ], 201);

} catch (PDOException $e) {
    // Se falhar no banco, deletar arquivo
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    error_log("Erro ao salvar upload no banco: " . $e->getMessage());
    json_response(['error' => 'Erro ao processar upload'], 500);
}
