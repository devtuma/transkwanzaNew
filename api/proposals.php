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
    $from_amount = (float)$data['amount'];
    $recipient_name = trim($data['recipient_name']);
    $recipient_email = trim($data['recipient_email']);
    $recipient_phone = trim($data['recipient_phone']);

    // Validações
    if ($from_currency === $to_currency) {
        json_response(['error' => 'Moedas de origem e destino devem ser diferentes'], 400);
    }

    if ($from_amount <= 0) {
        json_response(['error' => 'Valor deve ser maior que zero'], 400);
    }

    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'E-mail do destinatário inválido'], 400);
    }

    try {
        // BUSCAR TAXA DE CÂMBIO REAL (sistema dinâmico)
        $rate_data = get_current_exchange_rate($from_currency, $to_currency);

        if (!$rate_data['success']) {
            json_response([
                'error' => 'Taxa de câmbio não disponível',
                'details' => $rate_data['error'] ?? 'Erro desconhecido'
            ], 503);
        }

        $exchange_rate = $rate_data['rate'];
        $to_amount = $from_amount * $exchange_rate;
        $fee_amount = $to_amount * TRANSKWANZA_FEE; // 3%

        // Buscar user_id
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $user = $stmt->fetch();

        // Criar proposta COM TAXA REAL
        $stmt = $pdo->prepare('
            INSERT INTO proposals (
                user_id,
                user_email,
                from_currency,
                to_currency,
                from_amount,
                to_amount,
                exchange_rate,
                fee_amount,
                recipient_name,
                recipient_email,
                recipient_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        $stmt->execute([
            $user['id'],
            $current_user['email'],
            $from_currency,
            $to_currency,
            $from_amount,
            $to_amount,
            $exchange_rate,
            $fee_amount,
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
            'message' => 'Proposta criada com sucesso com taxa REAL',
            'proposal' => $proposal,
            'rate_info' => [
                'exchange_rate' => $exchange_rate,
                'from_amount' => $from_amount,
                'to_amount' => $to_amount,
                'fee_amount' => $fee_amount,
                'cached' => $rate_data['cached'] ?? false,
                'updated_at' => $rate_data['updated_at'] ?? null
            ]
        ], 201);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao criar proposta', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Obtém taxa de câmbio atual do sistema dinâmico
 * Chama o exchange_rates.php internamente
 */
function get_current_exchange_rate($from, $to) {
    global $pdo;

    // Tentar buscar do cache (última hora)
    $stmt = $pdo->prepare("
        SELECT rate, updated_at, source
        FROM exchange_rates_cache
        WHERE base_currency = ? AND target_currency = ?
    ");
    $stmt->execute([$from, $to]);
    $cached = $stmt->fetch();

    if ($cached) {
        $cache_age = time() - strtotime($cached['updated_at']);
        // Cache válido por 1 hora
        if ($cache_age < 3600) {
            return [
                'success' => true,
                'rate' => (float)$cached['rate'],
                'cached' => true,
                'updated_at' => $cached['updated_at'],
                'source' => $cached['source']
            ];
        }
    }

    // Cache expirado ou não existe - buscar da API externa
    $url = 'https://open.er-api.com/v6/latest/' . urlencode($from);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200 && $response) {
        $data = json_decode($response, true);

        if (isset($data['rates'][$to])) {
            $rate = (float)$data['rates'][$to];

            // Salvar no banco
            try {
                // Histórico
                $stmt = $pdo->prepare("
                    INSERT INTO exchange_rates
                    (base_currency, target_currency, rate, source, fetched_at)
                    VALUES (?, ?, ?, 'exchangerate-api', NOW())
                ");
                $stmt->execute([$from, $to, $rate]);

                // Trigger atualiza cache automaticamente
            } catch (PDOException $e) {
                // Se falhar ao salvar, continua (taxa ainda é válida)
                error_log("Erro ao salvar taxa: " . $e->getMessage());
            }

            return [
                'success' => true,
                'rate' => $rate,
                'cached' => false,
                'updated_at' => date('Y-m-d H:i:s'),
                'source' => 'exchangerate-api'
            ];
        }
    }

    // API falhou - usar última taxa conhecida (fallback)
    if ($cached) {
        return [
            'success' => true,
            'rate' => (float)$cached['rate'],
            'cached' => true,
            'fallback' => true,
            'updated_at' => $cached['updated_at'],
            'warning' => 'API externa indisponível. Usando última taxa conhecida.'
        ];
    }

    // Nenhuma taxa disponível
    return [
        'success' => false,
        'error' => 'Taxa de câmbio não disponível'
    ];
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
    $amount_changed = false;
    $new_from_amount = null;

    // Se amount mudar, precisamos recalcular TUDO
    if (isset($data['amount'])) {
        $new_from_amount = (float)$data['amount'];

        if ($new_from_amount <= 0) {
            json_response(['error' => 'Valor deve ser maior que zero'], 400);
        }

        $amount_changed = true;
    }

    if (isset($data['recipient_name'])) {
        $updates[] = 'recipient_name = ?';
        $params[] = trim($data['recipient_name']);
    }

    if (isset($data['recipient_email'])) {
        $email = trim($data['recipient_email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['error' => 'E-mail do destinatário inválido'], 400);
        }
        $updates[] = 'recipient_email = ?';
        $params[] = $email;
    }

    if (isset($data['recipient_phone'])) {
        $updates[] = 'recipient_phone = ?';
        $params[] = trim($data['recipient_phone']);
    }

    // Se valor mudou, recalcular com taxa ATUAL
    if ($amount_changed) {
        $rate_data = get_current_exchange_rate($proposal['from_currency'], $proposal['to_currency']);

        if (!$rate_data['success']) {
            json_response([
                'error' => 'Taxa de câmbio não disponível para recalcular',
                'details' => $rate_data['error'] ?? 'Erro desconhecido'
            ], 503);
        }

        $exchange_rate = $rate_data['rate'];
        $to_amount = $new_from_amount * $exchange_rate;
        $fee_amount = $to_amount * TRANSKWANZA_FEE;

        // Adicionar campos recalculados
        $updates[] = 'from_amount = ?';
        $params[] = $new_from_amount;

        $updates[] = 'to_amount = ?';
        $params[] = $to_amount;

        $updates[] = 'exchange_rate = ?';
        $params[] = $exchange_rate;

        $updates[] = 'fee_amount = ?';
        $params[] = $fee_amount;
    }

    if (empty($updates)) {
        json_response(['error' => 'Nenhum campo para atualizar'], 400);
    }

    try {
        // Adicionar updated_at
        $updates[] = 'updated_at = NOW()';

        $sql = 'UPDATE proposals SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $params[] = $id;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Buscar proposta atualizada
        $stmt = $pdo->prepare('SELECT * FROM proposals WHERE id = ?');
        $stmt->execute([$id]);
        $updated_proposal = $stmt->fetch();

        $response = [
            'success' => true,
            'message' => 'Proposta atualizada com sucesso',
            'proposal' => $updated_proposal
        ];

        // Se recalculou, incluir informações da taxa
        if ($amount_changed) {
            $response['rate_recalculated'] = true;
            $response['rate_info'] = [
                'exchange_rate' => $exchange_rate,
                'from_amount' => $new_from_amount,
                'to_amount' => $to_amount,
                'fee_amount' => $fee_amount,
                'cached' => $rate_data['cached'] ?? false,
                'updated_at' => $rate_data['updated_at'] ?? null
            ];
        }

        json_response($response);

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
 * Aceitar proposta (criar match E transação automaticamente)
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
        SELECT p.*, u.id as proposer_user_id
        FROM proposals p
        INNER JOIN users u ON p.user_email = u.email
        WHERE p.id = ? AND p.status = "pending" AND p.user_email != ?
    ');

    $stmt->execute([$id, $current_user['email']]);
    $proposal = $stmt->fetch();

    if (!$proposal) {
        json_response(['error' => 'Proposta não encontrada ou não está disponível'], 404);
    }

    try {
        // Iniciar transação SQL
        $pdo->beginTransaction();

        // Buscar user_id do matcher (quem está aceitando)
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$current_user['email']]);
        $matcher = $stmt->fetch();

        if (!$matcher) {
            $pdo->rollBack();
            json_response(['error' => 'Usuário não encontrado'], 404);
        }

        $matcher_id = $matcher['id'];
        $proposer_id = $proposal['proposer_user_id'];

        // 1. Atualizar proposta com match
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
            $matcher_id,
            $current_user['email'],
            trim($data['recipient_name']),
            trim($data['recipient_email']),
            trim($data['recipient_phone']),
            $id
        ]);

        // 2. Criar transação automaticamente
        // O proposer envia from_currency, o matcher envia to_currency
        $sender_id = $proposer_id;
        $receiver_id = $matcher_id;
        $sender_amount = $proposal['from_amount'];
        $receiver_amount = $proposal['to_amount'];
        $sender_currency = $proposal['from_currency'];
        $receiver_currency = $proposal['to_currency'];

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
            $id,
            $sender_id,
            $receiver_id,
            $sender_amount,
            $receiver_amount,
            $sender_currency,
            $receiver_currency,
            $proposal['exchange_rate']
        ]);

        $transaction_id = $pdo->lastInsertId();

        // 3. Atualizar status da proposta para "in_progress"
        $stmt = $pdo->prepare('UPDATE proposals SET status = "in_progress" WHERE id = ?');
        $stmt->execute([$id]);

        // Commit transação SQL
        $pdo->commit();

        // Buscar proposta e transação atualizadas
        $stmt = $pdo->prepare('SELECT * FROM proposals WHERE id = ?');
        $stmt->execute([$id]);
        $updated_proposal = $stmt->fetch();

        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch();

        json_response([
            'success' => true,
            'message' => 'Proposta aceita e transação iniciada com sucesso',
            'proposal' => $updated_proposal,
            'transaction' => $transaction
        ]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        json_response(['error' => 'Erro ao aceitar proposta', 'message' => $e->getMessage()], 500);
    }
}
