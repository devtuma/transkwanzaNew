<?php
// ==================== TRANSKWANZA SOCIAL LOGIN API ====================
// Login com Google, Facebook, Instagram, Apple
// Versão: 3.0 Production

require_once 'config.php';

$input = get_json_input();
$provider = $input['provider'] ?? null;
$access_token = $input['access_token'] ?? null;

if (!$provider || !$access_token) {
    json_response(['error' => 'Provider e access_token obrigatórios'], 400);
}

// ==================== VALIDAR TOKEN DO PROVIDER ====================

$user_info = null;

switch ($provider) {
    case 'google':
        $user_info = verify_google_token($access_token);
        break;
    case 'facebook':
        $user_info = verify_facebook_token($access_token);
        break;
    case 'instagram':
        $user_info = verify_instagram_token($access_token);
        break;
    case 'apple':
        $user_info = verify_apple_token($access_token);
        break;
    default:
        json_response(['error' => 'Provider inválido'], 400);
}

if (!$user_info) {
    json_response(['error' => 'Token inválido'], 401);
}

// ==================== VERIFICAR SE USUÁRIO JÁ EXISTE ====================

try {
    global $pdo;

    // Verificar por email OU provider_id
    $provider_id_field = $provider . '_id';

    $stmt = $pdo->prepare("
        SELECT * FROM users
        WHERE email = ? OR $provider_id_field = ?
    ");
    $stmt->execute([$user_info['email'], $user_info['id']]);
    $existing_user = $stmt->fetch();

    if ($existing_user) {
        // ==================== USUÁRIO EXISTE ====================

        // Atualizar provider_id se não estava setado
        if (!$existing_user[$provider_id_field]) {
            $stmt = $pdo->prepare("
                UPDATE users
                SET $provider_id_field = ?, login_method = ?
                WHERE id = ?
            ");
            $stmt->execute([$user_info['id'], $provider, $existing_user['id']]);
        }

        // Verificar se está bloqueado
        if ($existing_user['is_blocked']) {
            json_response([
                'error' => 'Conta bloqueada',
                'reason' => $existing_user['blocked_reason']
            ], 403);
        }

        // Atualizar último login
        $stmt = $pdo->prepare("
            UPDATE users
            SET last_login_ip = ?, last_login_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$_SERVER['REMOTE_ADDR'], $existing_user['id']]);

        // Log
        $stmt = $pdo->prepare("
            INSERT INTO activity_log (user_id, action, ip_address)
            VALUES (?, 'social_login', ?)
        ");
        $stmt->execute([$existing_user['id'], $_SERVER['REMOTE_ADDR']]);

        // Gerar token
        $token = generate_token($existing_user['id'], $existing_user['email']);

        json_response([
            'success' => true,
            'message' => 'Login realizado com sucesso',
            'token' => $token,
            'user' => [
                'id' => $existing_user['id'],
                'name' => $existing_user['name'],
                'email' => $existing_user['email'],
                'verified' => (bool)$existing_user['verified'],
                'kyc_status' => $existing_user['kyc_status'],
                'is_admin' => (bool)$existing_user['is_admin']
            ]
        ]);

    } else {
        // ==================== CRIAR NOVO USUÁRIO ====================

        $stmt = $pdo->prepare("
            INSERT INTO users (
                name, email, $provider_id_field, login_method,
                country, avatar, kyc_status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ");

        $stmt->execute([
            $user_info['name'],
            $user_info['email'],
            $user_info['id'],
            $provider,
            'BRA', // Padrão, usuário pode alterar
            $user_info['picture'] ?? null
        ]);

        $new_user_id = $pdo->lastInsertId();

        // Log
        $stmt = $pdo->prepare("
            INSERT INTO activity_log (user_id, action, ip_address, details)
            VALUES (?, 'social_register', ?, ?)
        ");
        $stmt->execute([
            $new_user_id,
            $_SERVER['REMOTE_ADDR'],
            'Cadastro via ' . $provider
        ]);

        // Notificação
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'system', 'Bem-vindo!', 'Complete seu cadastro enviando documento oficial para verificação.')
        ");
        $stmt->execute([$new_user_id]);

        // Gerar token
        $token = generate_token($new_user_id, $user_info['email']);

        json_response([
            'success' => true,
            'message' => 'Cadastro realizado! Envie documento oficial para verificação.',
            'token' => $token,
            'user' => [
                'id' => $new_user_id,
                'name' => $user_info['name'],
                'email' => $user_info['email'],
                'verified' => false,
                'kyc_status' => 'pending',
                'is_admin' => false
            ],
            'requires_kyc' => true
        ], 201);
    }

} catch (PDOException $e) {
    error_log("Erro social login: " . $e->getMessage());
    json_response(['error' => 'Erro ao processar login'], 500);
}

// ==================== FUNÇÕES DE VERIFICAÇÃO ====================

function verify_google_token($token) {
    $url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' . $token;
    $response = @file_get_contents($url);

    if (!$response) return null;

    $data = json_decode($response, true);

    if (!isset($data['email'])) return null;

    return [
        'id' => $data['sub'] ?? $data['user_id'],
        'email' => $data['email'],
        'name' => $data['name'] ?? $data['email'],
        'picture' => $data['picture'] ?? null
    ];
}

function verify_facebook_token($token) {
    $url = 'https://graph.facebook.com/me?fields=id,name,email,picture&access_token=' . $token;
    $response = @file_get_contents($url);

    if (!$response) return null;

    $data = json_decode($response, true);

    if (!isset($data['email'])) return null;

    return [
        'id' => $data['id'],
        'email' => $data['email'],
        'name' => $data['name'],
        'picture' => $data['picture']['data']['url'] ?? null
    ];
}

function verify_instagram_token($token) {
    // Instagram Graph API
    $url = 'https://graph.instagram.com/me?fields=id,username&access_token=' . $token;
    $response = @file_get_contents($url);

    if (!$response) return null;

    $data = json_decode($response, true);

    if (!isset($data['id'])) return null;

    // Instagram não fornece email diretamente, usar username
    return [
        'id' => $data['id'],
        'email' => $data['username'] . '@instagram.transkwanza.local', // Email temporário
        'name' => $data['username'],
        'picture' => null
    ];
}

function verify_apple_token($token) {
    // Apple Sign In - JWT token
    // Requer validação mais complexa (chave pública da Apple)
    // Aqui uma versão simplificada

    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        $payload = json_decode(base64_decode($parts[1]), true);

        if (!$payload) return null;

        return [
            'id' => $payload['sub'],
            'email' => $payload['email'] ?? null,
            'name' => $payload['email'] ?? 'Usuário Apple',
            'picture' => null
        ];
    } catch (Exception $e) {
        return null;
    }
}
