<?php
/**
 * TransKwanza - Authentication API
 *
 * Endpoints:
 * POST /api/auth.php?action=register - Criar nova conta
 * POST /api/auth.php?action=login - Fazer login
 * GET /api/auth.php?action=verify - Verificar token
 * POST /api/auth.php?action=logout - Fazer logout
 */

require_once 'config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        register();
        break;
    case 'login':
        login();
        break;
    case 'verify':
        verify();
        break;
    case 'logout':
        logout();
        break;
    default:
        json_response(['error' => 'Ação não especificada'], 400);
}

/**
 * Registrar novo usuário
 */
function register() {
    global $pdo;

    $data = get_json_input();

    // Validar campos obrigatórios
    validate_required_fields($data, ['name', 'email', 'password', 'country', 'phone']);

    $name = trim($data['name']);
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    $country = strtoupper($data['country']);
    $phone = trim($data['phone']);

    // Validações
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'E-mail inválido'], 400);
    }

    if (strlen($password) < 6) {
        json_response(['error' => 'Senha deve ter no mínimo 6 caracteres'], 400);
    }

    // Verificar se e-mail já existe
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        json_response(['error' => 'Este e-mail já está cadastrado'], 400);
    }

    // Criar usuário
    try {
        $hashed_password = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare('
            INSERT INTO users (name, email, password, country, phone)
            VALUES (?, ?, ?, ?, ?)
        ');

        $stmt->execute([$name, $email, $hashed_password, $country, $phone]);

        $user_id = $pdo->lastInsertId();

        // Gerar token
        $token = generate_token($user_id, $email);

        // Log de auditoria
        log_audit($user_id, 'CREATE', 'users', $user_id, null, json_encode([
            'name' => $name,
            'email' => $email,
            'country' => $country
        ]));

        json_response([
            'success' => true,
            'message' => 'Conta criada com sucesso',
            'token' => $token,
            'user' => [
                'id' => $user_id,
                'name' => $name,
                'email' => $email,
                'country' => $country,
                'phone' => $phone
            ]
        ], 201);

    } catch (PDOException $e) {
        json_response(['error' => 'Erro ao criar conta', 'message' => $e->getMessage()], 500);
    }
}

/**
 * Fazer login
 */
function login() {
    global $pdo;

    $data = get_json_input();

    validate_required_fields($data, ['email', 'password']);

    $email = trim(strtolower($data['email']));
    $password = $data['password'];

    // SEGURANÇA: Rate limiting por IP (máximo 5 tentativas de login por minuto)
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    enforce_rate_limit('login_' . $ip, 5, 60);

    // SEGURANÇA: Rate limiting por email (máximo 3 tentativas por 5 minutos)
    enforce_rate_limit('login_email_' . $email, 3, 300);

    // Buscar usuário
    $stmt = $pdo->prepare('
        SELECT id, name, email, password, country, phone, verified
        FROM users
        WHERE email = ?
    ');

    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // SEGURANÇA: Log de tentativa de login com email inexistente
        security_log('login_failed_user_not_found', ['email' => $email]);
        json_response(['error' => 'Usuário não encontrado'], 404);
    }

    // Verificar senha
    if (!password_verify($password, $user['password'])) {
        // SEGURANÇA: Log de tentativa de login com senha incorreta
        security_log('login_failed_wrong_password', ['email' => $email], $user['id']);
        json_response(['error' => 'Senha incorreta'], 401);
    }

    // SEGURANÇA: Log de login bem-sucedido
    security_log('login_success', ['email' => $email], $user['id']);

    // Gerar token
    $token = generate_token($user['id'], $user['email']);

    // Log de auditoria
    log_audit($user['id'], 'LOGIN', 'users', $user['id'], null, null);

    json_response([
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'country' => $user['country'],
            'phone' => $user['phone'],
            'verified' => (bool)$user['verified']
        ]
    ]);
}

/**
 * Verificar token
 */
function verify() {
    $token = get_auth_token();
    $payload = verify_token($token);

    global $pdo;

    // Buscar dados do usuário
    $stmt = $pdo->prepare('
        SELECT id, name, email, country, phone, verified
        FROM users
        WHERE id = ? AND email = ?
    ');

    $stmt->execute([$payload['user_id'], $payload['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['error' => 'Usuário não encontrado'], 404);
    }

    json_response([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'country' => $user['country'],
            'phone' => $user['phone'],
            'verified' => (bool)$user['verified']
        ]
    ]);
}

/**
 * Logout (para auditoria)
 */
function logout() {
    $token = get_auth_token();
    $payload = verify_token($token);

    // Log de auditoria
    log_audit($payload['user_id'], 'LOGOUT', 'users', $payload['user_id'], null, null);

    json_response([
        'success' => true,
        'message' => 'Logout realizado com sucesso'
    ]);
}

/**
 * Função auxiliar para log de auditoria
 */
function log_audit($user_id, $action, $table_name, $record_id, $old_values, $new_values) {
    global $pdo;

    try {
        $stmt = $pdo->prepare('
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');

        $stmt->execute([
            $user_id,
            $action,
            $table_name,
            $record_id,
            $old_values,
            $new_values,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    } catch (PDOException $e) {
        // Não interromper o fluxo se log falhar
        error_log("Erro ao criar log de auditoria: " . $e->getMessage());
    }
}
