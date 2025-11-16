<?php
/**
 * TransKwanza - Transactions API
 *
 * Endpoints:
 * GET /api/transactions.php - Listar transações do usuário
 * GET /api/transactions.php?id=123 - Detalhes de uma transação
 * POST /api/transactions.php - Criar nova transação (quando proposta aceita)
 * PUT /api/transactions.php?id=123&action=update_status - Atualizar status
 * PUT /api/transactions.php?id=123&action=upload_proof - Upload de comprovante
 * PUT /api/transactions.php?id=123&action=cancel - Cancelar transação
 * PUT /api/transactions.php?id=123&action=dispute - Disputar transação
 */

require_once 'config.php';

// Verificar autenticação
$token = get_auth_token();
$current_user = verify_token($token);

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            get_transaction_details($id);
        } else {
            get_user_transactions();
        }
        break;

    case 'POST':
        create_transaction();
        break;

    case 'PUT':
        if (!$id) {
            json_response(['error' => 'ID não fornecido'], 400);
        }

        switch ($action) {
            case 'update_status':
                update_transaction_status($id);
                break;

            case 'upload_proof':
                upload_payment_proof($id);
                break;

            case 'cancel':
                cancel_transaction($id);
                break;

            case 'dispute':
                dispute_transaction($id);
                break;

            default:
                json_response(['error' => 'Ação inválida'], 400);
        }
        break;

    default:
        json_response(['error' => 'Método não suportado'], 405);
}

/**
 * Listar transações do usuário atual
 */
function get_user_transactions() {
    global $pdo, $current_user;

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$current_user['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['error' => 'Usuário não encontrado'], 404);
    }

    $user_id = $user['id'];

    // Buscar transações onde usuário é sender OU receiver
    $stmt = $pdo->prepare('
        SELECT
            t.*,
            p.from_currency,
            p.to_currency,
            sender.name as sender_name,
            sender.email as sender_email,
            receiver.name as receiver_name,
            receiver.email as receiver_email,
            CASE
                WHEN t.sender_id = ? THEN "sent"
                WHEN t.receiver_id = ? THEN "received"
            END as user_role
        FROM transactions t
        INNER JOIN proposals p ON t.proposal_id = p.id
        INNER JOIN users sender ON t.sender_id = sender.id
        INNER JOIN users receiver ON t.receiver_id = receiver.id
        WHERE t.sender_id = ? OR t.receiver_id = ?
        ORDER BY t.created_at DESC
        LIMIT 100
    ');

    $stmt->execute([$user_id, $user_id, $user_id, $user_id]);
    $transactions = $stmt->fetchAll();

    json_response([
        'success' => true,
        'transactions' => $transactions
    ]);
}

/**
 * Obter detalhes de uma transação específica
 */
function get_transaction_details($id) {
    global $pdo, $current_user;

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$current_user['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['error' => 'Usuário não encontrado'], 404);
    }

    $user_id = $user['id'];

    // Buscar transação e verificar permissão
    $stmt = $pdo->prepare('
        SELECT
            t.*,
            p.from_currency,
            p.to_currency,
            p.from_amount as proposal_from_amount,
            p.to_amount as proposal_to_amount,
            p.recipient_name,
            p.recipient_email,
            p.recipient_phone,
            p.match_recipient_name,
            p.match_recipient_email,
            p.match_recipient_phone,
            sender.name as sender_name,
            sender.email as sender_email,
            sender.phone as sender_phone,
            receiver.name as receiver_name,
            receiver.email as receiver_email,
            receiver.phone as receiver_phone,
            CASE
                WHEN t.sender_id = ? THEN "sender"
                WHEN t.receiver_id = ? THEN "receiver"
                ELSE NULL
            END as user_role
        FROM transactions t
        INNER JOIN proposals p ON t.proposal_id = p.id
        INNER JOIN users sender ON t.sender_id = sender.id
        INNER JOIN users receiver ON t.receiver_id = receiver.id
        WHERE t.id = ?
          AND (t.sender_id = ? OR t.receiver_id = ?)
    ');

    $stmt->execute([$user_id, $user_id, $id, $user_id, $user_id]);
    $transaction = $stmt->fetch();

    if (!$transaction) {
        json_response(['error' => 'Transação não encontrada ou sem permissão'], 404);
    }

    json_response([
        'success' => true,
        'transaction' => $transaction
    ]);
}

/**
 * Criar nova transação (quando proposta é aceita)
 */
function create_transaction() {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, ['proposal_id']);

    $proposal_id = (int)$data['proposal_id'];

    try {
        // Buscar proposta
        $stmt = $pdo->prepare('
            SELECT p.*, u.id as proposer_user_id
            FROM proposals p
            INNER JOIN users u ON p.user_email = u.email
            WHERE p.id = ?
        ');
        $stmt->execute([$proposal_id]);
        $proposal = $stmt->fetch();

        if (!$proposal) {
            json_response(['error' => 'Proposta não encontrada'], 404);
        }

        // Verificar se proposta está "matched"
        if ($proposal['status'] !== 'matched') {
            json_response(['error' => 'Proposta deve estar no status "matched"'], 400);
        }

        // Buscar ID do usuário atual (quem aceitou)
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $current_user_record = $stmt->fetch();

        if (!$current_user_record) {
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $matcher_id = $current_user_record['id'];
        $proposer_id = $proposal['proposer_user_id'];

        // Determinar sender e receiver
        // O proposer envia from_currency, o matcher envia to_currency
        $sender_id = $proposer_id;
        $receiver_id = $matcher_id;
        $sender_amount = $proposal['from_amount'];
        $receiver_amount = $proposal['to_amount'];
        $sender_currency = $proposal['from_currency'];
        $receiver_currency = $proposal['to_currency'];

        // Verificar se transação já existe para esta proposta
        $stmt = $pdo->prepare('SELECT id FROM transactions WHERE proposal_id = ?');
        $stmt->execute([$proposal_id]);
        if ($stmt->fetch()) {
            json_response(['error' => 'Transação já existe para esta proposta'], 400);
        }

        // Criar transação
        $stmt = $pdo->prepare('
            INSERT INTO transactions (
                proposal_id,
                sender_id,
                receiver_id,
                sender_amount,
                receiver_amount,
                sender_currency,
                receiver_currency,
                exchange_rate,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "initiated")
        ');

        $stmt->execute([
            $proposal_id,
            $sender_id,
            $receiver_id,
            $sender_amount,
            $receiver_amount,
            $sender_currency,
            $receiver_currency,
            $proposal['exchange_rate']
        ]);

        $transaction_id = $pdo->lastInsertId();

        // Atualizar status da proposta
        $stmt = $pdo->prepare('UPDATE proposals SET status = "in_progress" WHERE id = ?');
        $stmt->execute([$proposal_id]);

        // Buscar transação criada
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Transação iniciada com sucesso',
            'transaction' => $transaction
        ], 201);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao criar transação', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Atualizar status da transação
 */
function update_transaction_status($id) {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, ['status']);

    $new_status = $data['status'];

    // Validar status
    $allowed_statuses = ['sender_paid', 'receiver_paid', 'completed'];
    if (!in_array($new_status, $allowed_statuses)) {
        json_response(['error' => 'Status inválido'], 400);
    }

    try {
        // Buscar ID do usuário
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        if (!$user) {
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $user_id = $user['id'];

        // Buscar transação
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $transaction = $stmt->fetch();

        if (!$transaction) {
            json_response(['error' => 'Transação não encontrada'], 404);
        }

        // Verificar permissão (apenas sender ou receiver podem atualizar)
        if ($transaction['sender_id'] != $user_id && $transaction['receiver_id'] != $user_id) {
            json_response(['error' => 'Sem permissão para atualizar esta transação'], 403);
        }

        // Lógica de atualização de status
        if ($new_status === 'sender_paid') {
            // Apenas sender pode marcar como sender_paid
            if ($transaction['sender_id'] != $user_id) {
                json_response(['error' => 'Apenas o remetente pode confirmar pagamento enviado'], 403);
            }

            if ($transaction['status'] !== 'initiated') {
                json_response(['error' => 'Transação deve estar no status "initiated"'], 400);
            }

        } elseif ($new_status === 'receiver_paid') {
            // Apenas receiver pode marcar como receiver_paid
            if ($transaction['receiver_id'] != $user_id) {
                json_response(['error' => 'Apenas o destinatário pode confirmar pagamento enviado'], 403);
            }

            if ($transaction['status'] !== 'sender_paid') {
                json_response(['error' => 'Remetente deve confirmar pagamento primeiro'], 400);
            }

        } elseif ($new_status === 'completed') {
            // Ambos precisam ter confirmado pagamento
            if ($transaction['status'] !== 'receiver_paid') {
                json_response(['error' => 'Ambas as partes devem confirmar pagamento'], 400);
            }
        }

        // Atualizar status
        $completion_date = ($new_status === 'completed') ? 'NOW()' : 'NULL';

        $stmt = $pdo->prepare("
            UPDATE transactions
            SET status = ?,
                completion_date = $completion_date,
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$new_status, $id]);

        // Se completada, atualizar proposta e incrementar contador de transações dos usuários
        if ($new_status === 'completed') {
            $stmt = $pdo->prepare('UPDATE proposals SET status = "completed" WHERE id = ?');
            $stmt->execute([$transaction['proposal_id']]);

            $stmt = $pdo->prepare('
                UPDATE users
                SET total_transactions = total_transactions + 1
                WHERE id = ? OR id = ?
            ');
            $stmt->execute([$transaction['sender_id'], $transaction['receiver_id']]);
        }

        // Buscar transação atualizada
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $updated_transaction = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Status atualizado com sucesso',
            'transaction' => $updated_transaction
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao atualizar status', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Upload de comprovante de pagamento
 */
function upload_payment_proof($id) {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, ['proof_url']);

    $proof_url = $data['proof_url'];

    try {
        // Buscar ID do usuário
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        if (!$user) {
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $user_id = $user['id'];

        // Buscar transação
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $transaction = $stmt->fetch();

        if (!$transaction) {
            json_response(['error' => 'Transação não encontrada'], 404);
        }

        // Verificar qual campo atualizar (sender ou receiver)
        if ($transaction['sender_id'] == $user_id) {
            $field = 'sender_payment_proof';
        } elseif ($transaction['receiver_id'] == $user_id) {
            $field = 'receiver_payment_proof';
        } else {
            json_response(['error' => 'Sem permissão para fazer upload'], 403);
        }

        // Atualizar comprovante
        $stmt = $pdo->prepare("
            UPDATE transactions
            SET $field = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$proof_url, $id]);

        // Buscar transação atualizada
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $updated_transaction = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Comprovante enviado com sucesso',
            'transaction' => $updated_transaction
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao fazer upload', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Cancelar transação
 */
function cancel_transaction($id) {
    global $pdo, $current_user;

    try {
        // Buscar ID do usuário
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        if (!$user) {
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $user_id = $user['id'];

        // Buscar transação
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $transaction = $stmt->fetch();

        if (!$transaction) {
            json_response(['error' => 'Transação não encontrada'], 404);
        }

        // Verificar permissão
        if ($transaction['sender_id'] != $user_id && $transaction['receiver_id'] != $user_id) {
            json_response(['error' => 'Sem permissão para cancelar'], 403);
        }

        // Apenas transações "initiated" podem ser canceladas
        if ($transaction['status'] !== 'initiated') {
            json_response(['error' => 'Apenas transações iniciadas podem ser canceladas'], 400);
        }

        // Cancelar transação
        $stmt = $pdo->prepare('
            UPDATE transactions
            SET status = "cancelled",
                updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$id]);

        // Atualizar proposta de volta para "matched"
        $stmt = $pdo->prepare('UPDATE proposals SET status = "matched" WHERE id = ?');
        $stmt->execute([$transaction['proposal_id']]);

        json_response([
            'success' => true,
            'message' => 'Transação cancelada'
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao cancelar transação', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Disputar transação
 */
function dispute_transaction($id) {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, ['reason']);

    $reason = $data['reason'];

    try {
        // Buscar ID do usuário
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        if (!$user) {
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $user_id = $user['id'];

        // Buscar transação
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$id]);
        $transaction = $stmt->fetch();

        if (!$transaction) {
            json_response(['error' => 'Transação não encontrada'], 404);
        }

        // Verificar permissão
        if ($transaction['sender_id'] != $user_id && $transaction['receiver_id'] != $user_id) {
            json_response(['error' => 'Sem permissão'], 403);
        }

        // Não pode disputar transações completadas ou canceladas
        if ($transaction['status'] === 'completed' || $transaction['status'] === 'cancelled') {
            json_response(['error' => 'Não pode disputar transações completadas ou canceladas'], 400);
        }

        // Atualizar para disputed
        $stmt = $pdo->prepare('
            UPDATE transactions
            SET status = "disputed",
                updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$id]);

        // TODO: Criar registro de disputa em tabela separada
        // TODO: Notificar administradores

        json_response([
            'success' => true,
            'message' => 'Disputa aberta. Um administrador irá revisar.',
            'dispute_reason' => $reason
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao disputar transação', 'message' => $e->getMessage()], 500);
    }
}
