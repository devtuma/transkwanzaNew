<?php
/**
 * TransKwanza API Configuration
 *
 * Para usar este backend PHP na Hostinger:
 * 1. Crie um banco de dados MySQL no painel da Hostinger
 * 2. Execute o arquivo database.sql para criar as tabelas
 * 3. Atualize as credenciais abaixo com seus dados
 * 4. Descomente as linhas necessárias no JavaScript (instruções no README)
 */

// Configurações de CORS (permitir requisições do frontend)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Headers de Segurança (Produção)
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
// header('Strict-Transport-Security: max-age=31536000; includeSubDomains'); // Descomentar quando HTTPS ativo

// Se for requisição OPTIONS, retornar imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurações do Banco de Dados
// Credenciais do MySQL Hostinger
define('DB_HOST', 'localhost');
define('DB_NAME', 'u442547792_transkwanza');
define('DB_USER', 'u442547792_admin');
define('DB_PASS', 'Life0852new2580!');
define('DB_CHARSET', 'utf8mb4');

// Tentar conectar ao banco de dados
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro de conexão com banco de dados',
        'message' => $e->getMessage()
    ]);
    exit();
}

// Configurações gerais
define('JWT_SECRET', 'TKZ_2024_Pr0d_S3cur3_K3y_L1f30852n3w2580_H0st1ng3r'); // Chave JWT secreta
define('TRANSKWANZA_FEE', 0.03); // 3%

// Funções auxiliares
function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function get_json_input() {
    return json_decode(file_get_contents('php://input'), true);
}

function validate_required_fields($data, $required_fields) {
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            json_response([
                'error' => "Campo obrigatório: {$field}"
            ], 400);
        }
    }
}

// Função para gerar token JWT simples
function generate_token($user_id, $email) {
    $payload = [
        'user_id' => $user_id,
        'email' => $email,
        'exp' => time() + (7 * 24 * 60 * 60) // 7 dias
    ];

    $base64_payload = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $base64_payload, JWT_SECRET);

    return $base64_payload . '.' . $signature;
}

// Função para verificar token JWT
function verify_token($token) {
    if (!$token) {
        json_response(['error' => 'Token não fornecido'], 401);
    }

    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        json_response(['error' => 'Token inválido'], 401);
    }

    list($base64_payload, $signature) = $parts;

    // Verificar assinatura
    $expected_signature = hash_hmac('sha256', $base64_payload, JWT_SECRET);
    if ($signature !== $expected_signature) {
        json_response(['error' => 'Token inválido'], 401);
    }

    // Decodificar payload
    $payload = json_decode(base64_decode($base64_payload), true);

    // Verificar expiração
    if ($payload['exp'] < time()) {
        json_response(['error' => 'Token expirado'], 401);
    }

    return $payload;
}

// Função para obter token do header
function get_auth_token() {
    $headers = getallheaders();

    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

// ==================== SEGURANÇA: RATE LIMITING ====================

/**
 * Verificar rate limit (proteção contra brute force e DDoS)
 *
 * @param string $identifier Identificador único (IP, email, user_id)
 * @param int $max_requests Máximo de requisições permitidas
 * @param int $window_seconds Janela de tempo em segundos
 * @return bool True se dentro do limite, False se excedido
 */
function check_rate_limit($identifier, $max_requests = 60, $window_seconds = 60) {
    global $pdo;

    // Criar tabela se não existir (primeira execução)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rate_limits (
                identifier VARCHAR(255) PRIMARY KEY,
                requests INT DEFAULT 0,
                window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_window (window_start)
            ) ENGINE=MEMORY
        ");
    } catch (PDOException $e) {
        // Tabela já existe ou erro - continuar
    }

    try {
        // Buscar registro atual
        $stmt = $pdo->prepare("
            SELECT requests, window_start, TIMESTAMPDIFF(SECOND, window_start, NOW()) as elapsed
            FROM rate_limits
            WHERE identifier = ?
        ");
        $stmt->execute([$identifier]);
        $limit = $stmt->fetch();

        if (!$limit) {
            // Primeira requisição - criar registro
            $stmt = $pdo->prepare("
                INSERT INTO rate_limits (identifier, requests, window_start)
                VALUES (?, 1, NOW())
                ON DUPLICATE KEY UPDATE requests = 1, window_start = NOW()
            ");
            $stmt->execute([$identifier]);
            return true;
        }

        $elapsed = (int)$limit['elapsed'];

        // Se janela expirou, resetar
        if ($elapsed >= $window_seconds) {
            $stmt = $pdo->prepare("
                UPDATE rate_limits
                SET requests = 1, window_start = NOW()
                WHERE identifier = ?
            ");
            $stmt->execute([$identifier]);
            return true;
        }

        // Dentro da janela - verificar limite
        if ($limit['requests'] >= $max_requests) {
            // Limite excedido
            return false;
        }

        // Incrementar contador
        $stmt = $pdo->prepare("
            UPDATE rate_limits
            SET requests = requests + 1
            WHERE identifier = ?
        ");
        $stmt->execute([$identifier]);
        return true;

    } catch (PDOException $e) {
        // Em caso de erro, permitir (fail-open)
        error_log("Rate limit error: " . $e->getMessage());
        return true;
    }
}

/**
 * Aplicar rate limit e retornar 429 se excedido
 */
function enforce_rate_limit($identifier, $max_requests = 60, $window_seconds = 60) {
    if (!check_rate_limit($identifier, $max_requests, $window_seconds)) {
        http_response_code(429);
        echo json_encode([
            'error' => 'Too Many Requests',
            'message' => 'Você excedeu o limite de requisições. Tente novamente em alguns segundos.',
            'retry_after' => $window_seconds
        ]);
        exit();
    }
}

// ==================== SEGURANÇA: LOGGING ====================

/**
 * Log de eventos de segurança
 */
function security_log($event, $details = [], $user_id = null) {
    global $pdo;

    try {
        // Criar tabela se não existir
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS security_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event VARCHAR(100) NOT NULL,
                user_id INT NULL,
                ip VARCHAR(45) NOT NULL,
                user_agent TEXT,
                details JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_event (event),
                INDEX idx_user (user_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB
        ");

        // Inserir log
        $stmt = $pdo->prepare("
            INSERT INTO security_logs (event, user_id, ip, user_agent, details)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $event,
            $user_id,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            json_encode($details)
        ]);

    } catch (PDOException $e) {
        // Silenciosamente falhar (não bloquear requisição)
        error_log("Security log error: " . $e->getMessage());
    }
}
