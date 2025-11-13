<?php
/**
 * TransKwanza - Proposals API
 *
 * Endpoints:
 * GET /api/proposals.php - Listar todas propostas disponíveis
 * GET /api/proposals.php?user=me - Listar propostas do usuário
 * POST /api/proposals.php - Criar nova proposta
 * PUT /api/proposals.php?id=123 - Atualizar proposta
 * DELETE /api/proposals.php?id=123 - Deletar proposta
 * POST /api/proposals.php?id=123&action=accept - Aceitar proposta
 */

require_once 'config.php';

// Verificar autenticação para todas as rotas
$token = get_auth_token();
$current_user = verify_token($token);

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        if (isset($_GET['user']) && $_GET['user'] === 'me') {
            get_user_proposals();
        } else {
            get_all_proposals();
        }
        break;

    case 'POST':
        if ($id && $action === 'accept') {
            accept_proposal($id);
        } else {
            create_proposal();
        }
        break;

    case 'PUT':
        if (!$id) {
            json_response(['error' => 'ID não fornecido'], 400);
        }
        update_proposal($id);
        break;

    case 'DELETE':
        if (!$id) {
            json_response(['error' => 'ID não fornecido'], 400);
        }
        delete_proposal($id);
        break;

    default:
        json_response(['error' => 'Método não suportado'], 405);
}

/**
 * Listar todas as propostas disponíveis (exceto as do usuário atual)
 */
function get_all_proposals() {
    global $pdo, $current_user;

    $from_currency = $_GET['from_currency'] ?? null;
    $to_currency = $_GET['to_currency'] ?? null;

    $sql = '
        SELECT
            p.id,
            p.user_email,
            p.from_currency,
            p.to_currency,
            p.amount,
            p.status,
            p.created_at
        FROM proposals p
        WHERE p.status = "pending"
          AND p.user_email != ?
    ';

    $params = [$current_user['email']];

    if ($from_currency) {
        $sql .= ' AND p.from_currency = ?';
        $params[] = $from_currency;
    }

    if ($to_currency) {
        $sql .= ' AND p.to_currency = ?';
        $params[] = $to_currency;
    }

    $sql .= ' ORDER BY p.created_at DESC LIMIT 100';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $proposals = $stmt->fetchAll();

    json_response([
        'success' => true,
        'proposals' => $proposals
    ]);
}

/**
 * Listar propostas do usuário atual
 */
function get_user_proposals() {
    global $pdo, $current_user;

    $stmt = $pdo->prepare('
        SELECT
            p.id,
            p.from_currency,
            p.to_currency,
            p.amount,
            p.recipient_name,
            p.recipient_email,
            p.recipient_phone,
            p.status,
            p.matched_with_email,
            p.match_recipient_name,
            p.match_recipient_phone,
            p.matched_at,
            p.created_at,
            p.updated_at
        FROM proposals p
        WHERE p.user_email = ?
        ORDER BY p.created_at DESC
    ');

    $stmt->execute([$current_user['email']]);
    $proposals = $stmt->fetchAll();

    json_response([
        'success' => true,
        'proposals' => $proposals
    ]);
}

/**
 * Criar nova proposta
 */
function create_proposal() {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, [
        'from_currency',
        'to_currency',
        'amount',
        'recipient_name',
        'recipient_email',
        'recipient_phone'
    ]);

    $from_currency = strtoupper($data['from_currency']);
    $to_currency = strtoupper($data['to_currency']);
    $amount = (float)$data['amount'];
    $recipient_name = trim($data['recipient_name']);
    $recipient_email = trim($data['recipient_email']);
    $recipient_phone = trim($data['recipient_phone']);

    // Validações
    if ($from_currency === $to_currency) {
        json_response(['error' => 'Moedas de origem e destino devem ser diferentes'], 400);
    }

    if ($amount <= 0) {
        json_response(['error' => 'Valor deve ser maior que zero'], 400);
    }

    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'E-mail do destinatário inválido'], 400);
    }

    try {
        // Buscar user_id
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        // Criar proposta
        $stmt = $pdo->prepare('
            INSERT INTO proposals (
                user_id,
                user_email,
                from_currency,
                to_currency,
                amount,
                recipient_name,
                recipient_email,
                recipient_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');

        $stmt->execute([
            $user['id'],
            $current_user['email'],
            $from_currency,
            $to_currency,
            $amount,
            $recipient_name,
            $recipient_email,
            $recipient_phone
        ]);

        $proposal_id = $pdo->lastInsertId();

        // Buscar proposta criada
        $stmt = $pdo->prepare('SELECT * FROM proposals WHERE id = ?');
        $stmt->execute([$proposal_id]);
        $proposal = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Proposta criada com sucesso',
            'proposal' => $proposal
        ], 201);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao criar proposta', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Atualizar proposta
 */
function update_proposal($id) {
    global $pdo, $current_user;

    $data = get_json_input();

    // Verificar se proposta existe e pertence ao usuário
    $stmt = $pdo->prepare('
        SELECT * FROM proposals
        WHERE id = ? AND user_email = ? AND status = "pending"
    ');

    $stmt->execute([$id, $current_user['email']]);
    $proposal = $stmt->fetch();

    if (!$proposal) {
        json_response(['error' => 'Proposta não encontrada ou não pode ser editada'], 404);
    }

    // Atualizar campos permitidos
    $updates = [];
    $params = [];

    if (isset($data['amount'])) {
        $updates[] = 'amount = ?';
        $params[] = (float)$data['amount'];
    }

    if (isset($data['recipient_name'])) {
        $updates[] = 'recipient_name = ?';
        $params[] = trim($data['recipient_name']);
    }

    if (isset($data['recipient_email'])) {
        $updates[] = 'recipient_email = ?';
        $params[] = trim($data['recipient_email']);
    }

    if (isset($data['recipient_phone'])) {
        $updates[] = 'recipient_phone = ?';
        $params[] = trim($data['recipient_phone']);
    }

    if (empty($updates)) {
        json_response(['error' => 'Nenhum campo para atualizar'], 400);
    }

    try {
        $sql = 'UPDATE proposals SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $params[] = $id;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Buscar proposta atualizada
        $stmt = $pdo->prepare('SELECT * FROM proposals WHERE id = ?');
        $stmt->execute([$id]);
        $updated_proposal = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Proposta atualizada com sucesso',
            'proposal' => $updated_proposal
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao atualizar proposta', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Deletar proposta
 */
function delete_proposal($id) {
    global $pdo, $current_user;

    // Verificar se proposta existe e pertence ao usuário
    $stmt = $pdo->prepare('
        SELECT * FROM proposals
        WHERE id = ? AND user_email = ? AND status = "pending"
    ');

    $stmt->execute([$id, $current_user['email']]);
    $proposal = $stmt->fetch();

    if (!$proposal) {
        json_response(['error' => 'Proposta não encontrada ou não pode ser excluída'], 404);
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM proposals WHERE id = ?');
        $stmt->execute([$id]);

        json_response([
            'success' => true,
            'message' => 'Proposta excluída com sucesso'
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao excluir proposta', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Aceitar proposta (criar match)
 */
function accept_proposal($id) {
    global $pdo, $current_user;

    $data = get_json_input();

    validate_required_fields($data, [
        'recipient_name',
        'recipient_email',
        'recipient_phone'
    ]);

    // Verificar se proposta existe e está disponível
    $stmt = $pdo->prepare('
        SELECT * FROM proposals
        WHERE id = ? AND status = "pending" AND user_email != ?
    ');

    $stmt->execute([$id, $current_user['email']]);
    $proposal = $stmt->fetch();

    if (!$proposal) {
        json_response(['error' => 'Proposta não encontrada ou não está disponível'], 404);
    }

    try {
        // Buscar user_id
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        // Atualizar proposta com match
        $stmt = $pdo->prepare('
            UPDATE proposals SET
                status = "matched",
                matched_with_user_id = ?,
                matched_with_email = ?,
                match_recipient_name = ?,
                match_recipient_email = ?,
                match_recipient_phone = ?,
                matched_at = NOW()
            WHERE id = ?
        ');

        $stmt->execute([
            $user['id'],
            $current_user['email'],
            trim($data['recipient_name']),
            trim($data['recipient_email']),
            trim($data['recipient_phone']),
            $id
        ]);

        // Buscar proposta atualizada
        $stmt = $pdo->prepare('SELECT * FROM proposals WHERE id = ?');
        $stmt->execute([$id]);
        $updated_proposal = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Proposta aceita com sucesso',
            'proposal' => $updated_proposal
        ]);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao aceitar proposta', 'message' => $e->getMessage()], 500);
    }
}
