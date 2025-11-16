<?php
// ==================== TRANSKWANZA EXCHANGE RATES API ====================
// Sistema profissional de taxas de câmbio em tempo real
// Integração: exchangerate-api.com (1500 requests/mês grátis)
// Cache inteligente: Atualiza apenas a cada 1 hora
// Fallback: Usa última taxa conhecida se API falhar

require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? 'get_rate';

// ==================== CONFIGURAÇÃO DA API EXTERNA ====================

// exchangerate-api.com (GRATUITA - 1500 requests/mês)
// Documentação: https://www.exchangerate-api.com/docs/free
define('EXCHANGE_API_URL', 'https://open.er-api.com/v6/latest/');
define('EXCHANGE_CACHE_HOURS', 1); // Atualizar a cada 1 hora

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Obtém taxa de câmbio (com cache inteligente)
 */
function get_exchange_rate($from, $to) {
    global $pdo;

    // Validar moedas
    $from = strtoupper(trim($from));
    $to = strtoupper(trim($to));

    if (!$from || !$to) {
        return ['success' => false, 'error' => 'Moedas inválidas'];
    }

    // Se for mesma moeda, retornar 1.0
    if ($from === $to) {
        return [
            'success' => true,
            'rate' => 1.0,
            'from' => $from,
            'to' => $to,
            'cached' => false,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    }

    // 1. Verificar cache (taxa da última hora)
    $cached = get_cached_rate($from, $to);

    if ($cached) {
        $cache_age_minutes = (time() - strtotime($cached['updated_at'])) / 60;
        $cache_hours = EXCHANGE_CACHE_HOURS;

        // Se cache tem menos de X horas, usar
        if ($cache_age_minutes < ($cache_hours * 60)) {
            return [
                'success' => true,
                'rate' => (float)$cached['rate'],
                'from' => $from,
                'to' => $to,
                'cached' => true,
                'updated_at' => $cached['updated_at'],
                'cache_age_minutes' => round($cache_age_minutes, 2),
                'source' => $cached['source']
            ];
        }
    }

    // 2. Cache expirado ou não existe - buscar API externa
    $fresh_rate = fetch_rate_from_api($from, $to);

    if ($fresh_rate['success']) {
        // Salvar no banco
        save_rate_to_database($from, $to, $fresh_rate['rate'], $fresh_rate['source']);

        return [
            'success' => true,
            'rate' => $fresh_rate['rate'],
            'from' => $from,
            'to' => $to,
            'cached' => false,
            'updated_at' => date('Y-m-d H:i:s'),
            'source' => $fresh_rate['source']
        ];
    }

    // 3. API falhou - usar última taxa conhecida (fallback)
    if ($cached) {
        return [
            'success' => true,
            'rate' => (float)$cached['rate'],
            'from' => $from,
            'to' => $to,
            'cached' => true,
            'fallback' => true,
            'updated_at' => $cached['updated_at'],
            'warning' => 'API externa indisponível. Usando última taxa conhecida.',
            'source' => $cached['source']
        ];
    }

    // 4. Nenhuma taxa disponível
    return [
        'success' => false,
        'error' => 'Taxa de câmbio não disponível'
    ];
}

/**
 * Busca taxa do cache
 */
function get_cached_rate($from, $to) {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT rate, source, updated_at
        FROM exchange_rates_cache
        WHERE base_currency = ? AND target_currency = ?
    ");
    $stmt->execute([$from, $to]);

    return $stmt->fetch();
}

/**
 * Busca taxa da API externa
 */
function fetch_rate_from_api($from, $to) {
    $url = EXCHANGE_API_URL . $from;

    // Usar cURL para melhor controle de erros
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout de 10 segundos
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200 || !$response) {
        return ['success' => false, 'error' => 'API request failed'];
    }

    $data = json_decode($response, true);

    // Verificar estrutura da resposta
    if (!isset($data['rates'][$to])) {
        return ['success' => false, 'error' => 'Currency not found in API response'];
    }

    return [
        'success' => true,
        'rate' => (float)$data['rates'][$to],
        'source' => 'exchangerate-api'
    ];
}

/**
 * Salva taxa no banco de dados (histórico + cache)
 */
function save_rate_to_database($from, $to, $rate, $source) {
    global $pdo;

    try {
        // Inserir no histórico
        $stmt = $pdo->prepare("
            INSERT INTO exchange_rates
            (base_currency, target_currency, rate, source, fetched_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$from, $to, $rate, $source]);

        // Trigger atualiza cache automaticamente

        return true;
    } catch (PDOException $e) {
        error_log("Erro ao salvar taxa: " . $e->getMessage());
        return false;
    }
}

/**
 * Converte valor entre moedas
 */
function convert_currency($amount, $from, $to) {
    $rate_data = get_exchange_rate($from, $to);

    if (!$rate_data['success']) {
        return $rate_data;
    }

    $converted_amount = $amount * $rate_data['rate'];

    return [
        'success' => true,
        'amount' => (float)$amount,
        'from' => $from,
        'to' => $to,
        'rate' => $rate_data['rate'],
        'converted_amount' => round($converted_amount, 2),
        'cached' => $rate_data['cached'] ?? false,
        'updated_at' => $rate_data['updated_at']
    ];
}

/**
 * Obtém taxas de múltiplas moedas de uma vez
 */
function get_multiple_rates($base, $targets) {
    $rates = [];

    foreach ($targets as $target) {
        $rate_data = get_exchange_rate($base, $target);

        if ($rate_data['success']) {
            $rates[$target] = [
                'rate' => $rate_data['rate'],
                'cached' => $rate_data['cached'] ?? false,
                'updated_at' => $rate_data['updated_at']
            ];
        }
    }

    return [
        'success' => true,
        'base' => $base,
        'rates' => $rates
    ];
}

/**
 * Atualiza todas as taxas das moedas suportadas
 */
function update_all_rates() {
    global $pdo;

    // Buscar moedas ativas
    $stmt = $pdo->query("SELECT code FROM currencies WHERE is_enabled = 1");
    $currencies = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $updated = 0;
    $failed = 0;

    // Atualizar todas as combinações
    foreach ($currencies as $from) {
        foreach ($currencies as $to) {
            if ($from === $to) continue;

            $fresh_rate = fetch_rate_from_api($from, $to);

            if ($fresh_rate['success']) {
                save_rate_to_database($from, $to, $fresh_rate['rate'], $fresh_rate['source']);
                $updated++;
            } else {
                $failed++;
            }

            // Pequeno delay para não sobrecarregar API
            usleep(100000); // 0.1 segundo
        }
    }

    return [
        'success' => true,
        'updated' => $updated,
        'failed' => $failed,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * Obtém histórico de uma taxa
 */
function get_rate_history($from, $to, $days = 30) {
    global $pdo;

    $stmt = $pdo->prepare("
        SELECT rate, fetched_at, source
        FROM exchange_rates
        WHERE base_currency = ? AND target_currency = ?
        AND fetched_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY fetched_at DESC
        LIMIT 100
    ");
    $stmt->execute([$from, $to, $days]);

    $history = $stmt->fetchAll();

    return [
        'success' => true,
        'from' => $from,
        'to' => $to,
        'days' => $days,
        'history' => $history
    ];
}

// ==================== ROTEAMENTO ====================

switch ($action) {
    case 'get_rate':
        // GET /api/exchange_rates.php?action=get_rate&from=BRL&to=USD
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        if (!$from || !$to) {
            json_response(['error' => 'Parâmetros from e to obrigatórios'], 400);
        }

        $result = get_exchange_rate($from, $to);
        json_response($result);
        break;

    case 'convert':
        // GET /api/exchange_rates.php?action=convert&amount=100&from=BRL&to=USD
        $amount = $_GET['amount'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        if (!$amount || !$from || !$to) {
            json_response(['error' => 'Parâmetros amount, from e to obrigatórios'], 400);
        }

        $result = convert_currency($amount, $from, $to);
        json_response($result);
        break;

    case 'get_multiple':
        // GET /api/exchange_rates.php?action=get_multiple&base=USD&targets=BRL,EUR,AOA
        $base = $_GET['base'] ?? null;
        $targets = $_GET['targets'] ?? null;

        if (!$base || !$targets) {
            json_response(['error' => 'Parâmetros base e targets obrigatórios'], 400);
        }

        $targets_array = explode(',', $targets);
        $result = get_multiple_rates($base, $targets_array);
        json_response($result);
        break;

    case 'update_all':
        // GET /api/exchange_rates.php?action=update_all
        // Apenas admin pode executar
        $token = get_auth_token();
        if (!$token) {
            json_response(['error' => 'Token obrigatório'], 401);
        }

        $payload = verify_token($token);

        // Verificar se é admin
        $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
        $stmt->execute([$payload['user_id']]);
        $user = $stmt->fetch();

        if (!$user || !$user['is_admin']) {
            json_response(['error' => 'Apenas administradores'], 403);
        }

        $result = update_all_rates();
        json_response($result);
        break;

    case 'history':
        // GET /api/exchange_rates.php?action=history&from=BRL&to=USD&days=30
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $days = $_GET['days'] ?? 30;

        if (!$from || !$to) {
            json_response(['error' => 'Parâmetros from e to obrigatórios'], 400);
        }

        $result = get_rate_history($from, $to, $days);
        json_response($result);
        break;

    default:
        json_response(['error' => 'Ação inválida'], 400);
}
