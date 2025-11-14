<?php
// ==================== TRANSKWANZA ADMIN API ====================
// Dashboard do Gestor - Todas as operações administrativas
// Versão: 3.0 Production

require_once 'config.php';

// ==================== VERIFICAR SE É ADMIN ====================

$admin = get_auth_user();

if (!$admin['is_admin']) {
    json_response(['error' => 'Acesso negado. Apenas administradores.'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// ==================== ROTAS ====================

switch ($action) {
    case 'stats':
        get_admin_stats();
        break;

    case 'pending_kyc':
        get_pending_kyc();
        break;

    case 'approve_kyc':
        approve_kyc($admin['id']);
        break;

    case 'reject_kyc':
        reject_kyc($admin['id']);
        break;

    case 'pending_transactions':
        get_pending_transactions();
        break;

    case 'approve_transaction':
        approve_transaction($admin['id']);
        break;

    case 'reject_transaction':
        reject_transaction($admin['id']);
        break;

    case 'currencies':
        manage_currencies($admin['id']);
        break;

    case 'toggle_currency':
        toggle_currency($admin['id']);
        break;

    case 'available_offers':
        get_available_offers();
        break;

    case 'connect_offer':
        connect_offer($admin['id']);
        break;

    case 'make_payment':
        admin_make_payment($admin['id']);
        break;

    case 'block_user':
        block_user($admin['id']);
        break;

    case 'unblock_user':
        unblock_user($admin['id']);
        break;

    case 'fraud_alerts':
        get_fraud_alerts();
        break;

    case 'resolve_fraud':
        resolve_fraud($admin['id']);
        break;

    default:
        json_response(['error' => 'Ação inválida'], 400);
}

// ==================== ESTATÍSTICAS DO SISTEMA ====================

function get_admin_stats() {
    global $pdo;

    $stats = [];

    // Total de usuários
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $stats['total_users'] = $stmt->fetchColumn();

    // Usuários verificados
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE verified = 1");
    $stats['verified_users'] = $stmt->fetchColumn();

    // KYC pendentes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE kyc_status = 'pending' AND kyc_submitted_at IS NOT NULL");
    $stats['pending_kyc'] = $stmt->fetchColumn();

    // Transações pendentes de aprovação
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM transactions WHERE requires_admin_approval = 1 AND admin_approved = 0");
    $stats['pending_transactions'] = $stmt->fetchColumn();

    // Total de transações
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM transactions");
    $stats['total_transactions'] = $stmt->fetchColumn();

    // Transações completadas hoje
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM transactions WHERE DATE(completion_date) = CURDATE()");
    $stats['transactions_today'] = $stmt->fetchColumn();

    // Volume total (USD)
    $stmt = $pdo->query("SELECT SUM(total_volume_usd) as volume FROM users");
    $stats['total_volume_usd'] = (float)$stmt->fetchColumn();

    // Alertas de fraude não resolvidos
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM fraud_checks WHERE is_resolved = 0");
    $stats['fraud_alerts'] = $stmt->fetchColumn();

    // Moedas ativas
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM currencies WHERE is_enabled = 1");
    $stats['active_currencies'] = $stmt->fetchColumn();

    json_response(['success' => true, 'stats' => $stats]);
}

// ==================== KYC / VERIFICAÇÃO DE DOCUMENTOS ====================

function get_pending_kyc() {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT id, name, email, country, document_type, document_number,
               document_front, document_back, document_selfie,
               kyc_submitted_at, fraud_score
        FROM users
        WHERE kyc_status = 'pending' AND kyc_submitted_at IS NOT NULL
        ORDER BY kyc_submitted_at ASC
    ");
    $stmt->execute();
    $users = $stmt->fetchAll();

    json_response(['success' => true, 'users' => $users]);
}

function approve_kyc($admin_id) {
    global $pdo;
    $input = get_json_input();
    $user_id = $input['user_id'] ?? null;

    if (!$user_id) {
        json_response(['error' => 'user_id obrigatório'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Atualizar status do usuário
        $stmt = $pdo->prepare("
            UPDATE users
            SET kyc_status = 'approved',
                verified = 1,
                kyc_reviewed_at = NOW(),
                kyc_reviewed_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$admin_id, $user_id]);

        // Criar notificação
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'kyc_approved', 'Documento aprovado!', 'Seu documento foi aprovado. Você já pode realizar transações.')
        ");
        $stmt->execute([$user_id]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_user_id, description)
            VALUES (?, 'approve_kyc', ?, 'KYC aprovado')
        ");
        $stmt->execute([$admin_id, $user_id]);

        $pdo->commit();

        json_response(['success' => true, 'message' => 'KYC aprovado com sucesso']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao aprovar KYC: " . $e->getMessage());
        json_response(['error' => 'Erro ao aprovar KYC'], 500);
    }
}

function reject_kyc($admin_id) {
    global $pdo;
    $input = get_json_input();
    $user_id = $input['user_id'] ?? null;
    $reason = $input['reason'] ?? 'Documento inválido ou ilegível';

    if (!$user_id) {
        json_response(['error' => 'user_id obrigatório'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Atualizar status do usuário
        $stmt = $pdo->prepare("
            UPDATE users
            SET kyc_status = 'rejected',
                kyc_rejection_reason = ?,
                kyc_reviewed_at = NOW(),
                kyc_reviewed_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$reason, $admin_id, $user_id]);

        // Criar notificação
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'kyc_rejected', 'Documento recusado', ?)
        ");
        $stmt->execute([$user_id, $reason]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_user_id, description)
            VALUES (?, 'reject_kyc', ?, ?)
        ");
        $stmt->execute([$admin_id, $user_id, 'KYC rejeitado: ' . $reason]);

        $pdo->commit();

        json_response(['success' => true, 'message' => 'KYC rejeitado']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao rejeitar KYC: " . $e->getMessage());
        json_response(['error' => 'Erro ao rejeitar KYC'], 500);
    }
}

// ==================== TRANSAÇÕES ====================

function get_pending_transactions() {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT t.*,
               u1.name as sender_name, u1.email as sender_email,
               u2.name as receiver_name, u2.email as receiver_email
        FROM transactions t
        INNER JOIN users u1 ON t.sender_id = u1.id
        INNER JOIN users u2 ON t.receiver_id = u2.id
        WHERE t.requires_admin_approval = 1 AND t.admin_approved = 0
        ORDER BY t.created_at ASC
    ");
    $stmt->execute();
    $transactions = $stmt->fetchAll();

    json_response(['success' => true, 'transactions' => $transactions]);
}

function approve_transaction($admin_id) {
    global $pdo;
    $input = get_json_input();
    $transaction_id = $input['transaction_id'] ?? null;
    $notes = $input['notes'] ?? '';

    if (!$transaction_id) {
        json_response(['error' => 'transaction_id obrigatório'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Atualizar transação
        $stmt = $pdo->prepare("
            UPDATE transactions
            SET admin_approved = 1,
                admin_approved_by = ?,
                admin_approved_at = NOW(),
                admin_notes = ?,
                status = 'completed',
                completion_date = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$admin_id, $notes, $transaction_id]);

        // Buscar detalhes da transação
        $stmt = $pdo->prepare("SELECT sender_id, receiver_id FROM transactions WHERE id = ?");
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch();

        // Notificar ambos os usuários
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, 'transaction_completed', 'Transação aprovada!', 'Sua transação foi aprovada pelo administrador.', '/dashboard.html?transaction={$transaction_id}')
        ");
        $stmt->execute([$transaction['sender_id']]);
        $stmt->execute([$transaction['receiver_id']]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_transaction_id, description)
            VALUES (?, 'approve_transaction', ?, ?)
        ");
        $stmt->execute([$admin_id, $transaction_id, 'Transação aprovada: ' . $notes]);

        $pdo->commit();

        json_response(['success' => true, 'message' => 'Transação aprovada']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao aprovar transação: " . $e->getMessage());
        json_response(['error' => 'Erro ao aprovar transação'], 500);
    }
}

function reject_transaction($admin_id) {
    global $pdo;
    $input = get_json_input();
    $transaction_id = $input['transaction_id'] ?? null;
    $reason = $input['reason'] ?? 'Transação suspeita';

    if (!$transaction_id) {
        json_response(['error' => 'transaction_id obrigatório'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Atualizar transação
        $stmt = $pdo->prepare("
            UPDATE transactions
            SET status = 'cancelled',
                admin_notes = ?
            WHERE id = ?
        ");
        $stmt->execute([$reason, $transaction_id]);

        // Buscar detalhes
        $stmt = $pdo->prepare("SELECT sender_id, receiver_id FROM transactions WHERE id = ?");
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch();

        // Notificar usuários
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'admin_action', 'Transação cancelada', ?)
        ");
        $stmt->execute([$transaction['sender_id'], $reason]);
        $stmt->execute([$transaction['receiver_id'], $reason]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_transaction_id, description)
            VALUES (?, 'reject_transaction', ?, ?)
        ");
        $stmt->execute([$admin_id, $transaction_id, 'Transação rejeitada: ' . $reason]);

        $pdo->commit();

        json_response(['success' => true, 'message' => 'Transação cancelada']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao rejeitar transação: " . $e->getMessage());
        json_response(['error' => 'Erro ao rejeitar transação'], 500);
    }
}

// ==================== GESTÃO DE MOEDAS ====================

function manage_currencies($admin_id) {
    global $pdo;

    $stmt = $pdo->query("
        SELECT * FROM currencies
        ORDER BY code ASC
    ");
    $currencies = $stmt->fetchAll();

    json_response(['success' => true, 'currencies' => $currencies]);
}

function toggle_currency($admin_id) {
    global $pdo;
    $input = get_json_input();
    $currency_code = $input['code'] ?? null;
    $enable = $input['enable'] ?? true;

    if (!$currency_code) {
        json_response(['error' => 'code obrigatório'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE currencies
            SET is_enabled = ?, enabled_by = ?
            WHERE code = ?
        ");
        $stmt->execute([$enable ? 1 : 0, $admin_id, $currency_code]);

        // Log admin
        $action = $enable ? 'enable_currency' : 'disable_currency';
        $description = ($enable ? 'Habilitou' : 'Desabilitou') . ' moeda: ' . $currency_code;

        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, description)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$admin_id, $action, $description]);

        json_response([
            'success' => true,
            'message' => $enable ? 'Moeda habilitada' : 'Moeda desabilitada'
        ]);

    } catch (PDOException $e) {
        error_log("Erro ao alternar moeda: " . $e->getMessage());
        json_response(['error' => 'Erro ao alternar moeda'], 500);
    }
}

// ==================== CONECTAR OFERTAS ====================

function get_available_offers() {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT p.*, u.name as user_name, u.email as user_email, u.reputation_score
        FROM proposals p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
    ");
    $stmt->execute();
    $offers = $stmt->fetchAll();

    json_response(['success' => true, 'offers' => $offers]);
}

function connect_offer($admin_id) {
    global $pdo;
    $input = get_json_input();
    $offer_id = $input['offer_id'] ?? null;
    $receiver_id = $input['receiver_id'] ?? null;

    if (!$offer_id || !$receiver_id) {
        json_response(['error' => 'offer_id e receiver_id obrigatórios'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Buscar proposta
        $stmt = $pdo->prepare("SELECT * FROM proposals WHERE id = ?");
        $stmt->execute([$offer_id]);
        $proposal = $stmt->fetch();

        if (!$proposal) {
            json_response(['error' => 'Proposta não encontrada'], 404);
        }

        // Criar transação
        $stmt = $pdo->prepare("
            INSERT INTO transactions (
                proposal_id, sender_id, receiver_id,
                sender_amount, receiver_amount,
                sender_currency, receiver_currency,
                exchange_rate, status,
                admin_connected, admin_connected_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'initiated', 1, ?)
        ");

        $stmt->execute([
            $offer_id,
            $proposal['user_id'],
            $receiver_id,
            $proposal['from_amount'],
            $proposal['to_amount'],
            $proposal['from_currency'],
            $proposal['to_currency'],
            $proposal['exchange_rate'],
            $admin_id
        ]);

        $transaction_id = $pdo->lastInsertId();

        // Atualizar proposta
        $stmt = $pdo->prepare("
            UPDATE proposals
            SET status = 'matched'
            WHERE id = ?
        ");
        $stmt->execute([$offer_id]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_transaction_id, description)
            VALUES (?, 'connect_offer', ?, 'Conectou oferta manualmente')
        ");
        $stmt->execute([$admin_id, $transaction_id]);

        $pdo->commit();

        json_response([
            'success' => true,
            'message' => 'Oferta conectada com sucesso',
            'transaction_id' => $transaction_id
        ]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao conectar oferta: " . $e->getMessage());
        json_response(['error' => 'Erro ao conectar oferta'], 500);
    }
}

// ==================== PAGAMENTO DIRETO PELO ADMIN ====================

function admin_make_payment($admin_id) {
    global $pdo;
    $input = get_json_input();
    $transaction_id = $input['transaction_id'] ?? null;
    $payment_proof = $input['payment_proof'] ?? null; // URL do comprovante

    if (!$transaction_id) {
        json_response(['error' => 'transaction_id obrigatório'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Atualizar transação
        $stmt = $pdo->prepare("
            UPDATE transactions
            SET admin_payment_made = 1,
                admin_payment_proof = ?,
                status = 'completed',
                completion_date = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$payment_proof, $transaction_id]);

        // Log admin
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_transaction_id, description)
            VALUES (?, 'make_payment', ?, 'Realizou pagamento direto')
        ");
        $stmt->execute([$admin_id, $transaction_id]);

        $pdo->commit();

        json_response([
            'success' => true,
            'message' => 'Pagamento registrado com sucesso'
        ]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao registrar pagamento: " . $e->getMessage());
        json_response(['error' => 'Erro ao registrar pagamento'], 500);
    }
}

// ==================== BLOQUEAR/DESBLOQUEAR USUÁRIO ====================

function block_user($admin_id) {
    global $pdo;
    $input = get_json_input();
    $user_id = $input['user_id'] ?? null;
    $reason = $input['reason'] ?? 'Atividade suspeita';

    if (!$user_id) {
        json_response(['error' => 'user_id obrigatório'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE users
            SET is_blocked = 1, blocked_reason = ?, blocked_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$reason, $user_id]);

        // Log
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_user_id, description)
            VALUES (?, 'block_user', ?, ?)
        ");
        $stmt->execute([$admin_id, $user_id, 'Bloqueado: ' . $reason]);

        json_response(['success' => true, 'message' => 'Usuário bloqueado']);

    } catch (PDOException $e) {
        error_log("Erro ao bloquear usuário: " . $e->getMessage());
        json_response(['error' => 'Erro ao bloquear usuário'], 500);
    }
}

function unblock_user($admin_id) {
    global $pdo;
    $input = get_json_input();
    $user_id = $input['user_id'] ?? null;

    if (!$user_id) {
        json_response(['error' => 'user_id obrigatório'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE users
            SET is_blocked = 0, blocked_reason = NULL, blocked_at = NULL
            WHERE id = ?
        ");
        $stmt->execute([$user_id]);

        // Log
        $stmt = $pdo->prepare("
            INSERT INTO admin_actions (admin_id, action_type, target_user_id, description)
            VALUES (?, 'unblock_user', ?, 'Desbloqueado')
        ");
        $stmt->execute([$admin_id, $user_id]);

        json_response(['success' => true, 'message' => 'Usuário desbloqueado']);

    } catch (PDOException $e) {
        error_log("Erro ao desbloquear usuário: " . $e->getMessage());
        json_response(['error' => 'Erro ao desbloquear usuário'], 500);
    }
}

// ==================== ALERTAS DE FRAUDE ====================

function get_fraud_alerts() {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT f.*, u.name as user_name, u.email as user_email
        FROM fraud_checks f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.is_resolved = 0
        ORDER BY f.risk_level DESC, f.created_at DESC
    ");
    $stmt->execute();
    $alerts = $stmt->fetchAll();

    json_response(['success' => true, 'alerts' => $alerts]);
}

function resolve_fraud($admin_id) {
    global $pdo;
    $input = get_json_input();
    $fraud_id = $input['fraud_id'] ?? null;

    if (!$fraud_id) {
        json_response(['error' => 'fraud_id obrigatório'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE fraud_checks
            SET is_resolved = 1, resolved_by = ?, resolved_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$admin_id, $fraud_id]);

        json_response(['success' => true, 'message' => 'Alerta resolvido']);

    } catch (PDOException $e) {
        error_log("Erro ao resolver alerta: " . $e->getMessage());
        json_response(['error' => 'Erro ao resolver alerta'], 500);
    }
}
