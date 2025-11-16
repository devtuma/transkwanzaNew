<?php
/**
 * TransKwanza - Health Check: Exchange Rates
 *
 * Verifica se as taxas de câmbio estão atualizadas e funcionando corretamente
 *
 * Uso:
 * php cron/check_rates_health.php
 * ou
 * https://transkwanza.com/cron/check_rates_health.php?secret=YOUR_SECRET
 */

// Permitir CLI ou HTTP com chave
$is_cli = (php_sapi_name() === 'cli');

if (!$is_cli) {
    $secret = $_GET['secret'] ?? '';
    define('HEALTH_SECRET_KEY', 'transkwanza_health_2024'); // MUDAR!

    if ($secret !== HEALTH_SECRET_KEY) {
        http_response_code(403);
        die(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
    }

    header('Content-Type: application/json');
}

require_once dirname(__DIR__) . '/api/config.php';

$health = [
    'status' => 'healthy',
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => []
];

try {
    // 1. Verificar conexão com banco de dados
    $check = ['name' => 'Database Connection', 'status' => 'ok'];
    try {
        $pdo->query('SELECT 1');
    } catch (PDOException $e) {
        $check['status'] = 'error';
        $check['error'] = $e->getMessage();
        $health['status'] = 'unhealthy';
    }
    $health['checks'][] = $check;

    // 2. Verificar se tabelas existem
    $check = ['name' => 'Exchange Rates Tables', 'status' => 'ok'];
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'exchange_rates%'");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($tables) < 2) {
            $check['status'] = 'warning';
            $check['message'] = 'Missing tables: exchange_rates or exchange_rates_cache';
            $health['status'] = 'degraded';
        }
    } catch (PDOException $e) {
        $check['status'] = 'error';
        $check['error'] = $e->getMessage();
        $health['status'] = 'unhealthy';
    }
    $health['checks'][] = $check;

    // 3. Verificar idade das taxas em cache
    $check = ['name' => 'Cache Freshness', 'status' => 'ok'];
    try {
        $stmt = $pdo->query("
            SELECT
                COUNT(*) as total,
                MAX(updated_at) as latest_update,
                TIMESTAMPDIFF(MINUTE, MAX(updated_at), NOW()) as minutes_ago
            FROM exchange_rates_cache
        ");
        $cache_stats = $stmt->fetch();

        $check['data'] = [
            'total_rates' => (int)$cache_stats['total'],
            'latest_update' => $cache_stats['latest_update'],
            'minutes_ago' => (int)$cache_stats['minutes_ago']
        ];

        // Alertar se taxas têm mais de 2 horas
        if ($cache_stats['minutes_ago'] > 120) {
            $check['status'] = 'warning';
            $check['message'] = 'Rates are ' . $cache_stats['minutes_ago'] . ' minutes old';
            $health['status'] = 'degraded';
        }

        // Erro se taxas têm mais de 24 horas
        if ($cache_stats['minutes_ago'] > 1440) {
            $check['status'] = 'error';
            $check['message'] = 'Rates are critically outdated';
            $health['status'] = 'unhealthy';
        }

    } catch (PDOException $e) {
        $check['status'] = 'error';
        $check['error'] = $e->getMessage();
        $health['status'] = 'unhealthy';
    }
    $health['checks'][] = $check;

    // 4. Verificar histórico (últimas 24 horas)
    $check = ['name' => 'Historical Data', 'status' => 'ok'];
    try {
        $stmt = $pdo->query("
            SELECT COUNT(*) as count
            FROM exchange_rates
            WHERE fetched_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $history_count = $stmt->fetchColumn();

        $check['data'] = [
            'updates_last_24h' => (int)$history_count
        ];

        if ($history_count < 10) {
            $check['status'] = 'warning';
            $check['message'] = 'Very few updates in last 24 hours';
            $health['status'] = 'degraded';
        }

    } catch (PDOException $e) {
        $check['status'] = 'error';
        $check['error'] = $e->getMessage();
    }
    $health['checks'][] = $check;

    // 5. Testar API externa (sample)
    $check = ['name' => 'External API', 'status' => 'ok'];
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://open.er-api.com/v6/latest/USD');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request apenas

        curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $check['data'] = ['http_code' => $http_code];

        if ($http_code !== 200) {
            $check['status'] = 'error';
            $check['message'] = 'API returned HTTP ' . $http_code;
            $health['status'] = 'unhealthy';
        }

    } catch (Exception $e) {
        $check['status'] = 'error';
        $check['error'] = $e->getMessage();
        $health['status'] = 'unhealthy';
    }
    $health['checks'][] = $check;

    // 6. Verificar moedas ativas
    $check = ['name' => 'Active Currencies', 'status' => 'ok'];
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM currencies WHERE is_enabled = 1");
        $active_currencies = $stmt->fetchColumn();

        $check['data'] = ['count' => (int)$active_currencies];

        if ($active_currencies < 3) {
            $check['status'] = 'warning';
            $check['message'] = 'Very few active currencies';
        }

    } catch (PDOException $e) {
        // Tabela pode não existir
        $check['status'] = 'info';
        $check['message'] = 'Currencies table not found (using hardcoded list)';
    }
    $health['checks'][] = $check;

} catch (Exception $e) {
    $health['status'] = 'error';
    $health['error'] = $e->getMessage();
}

// Output
if ($is_cli) {
    echo "=== TransKwanza Exchange Rates Health Check ===" . PHP_EOL;
    echo "Status: " . strtoupper($health['status']) . PHP_EOL;
    echo "Time: " . $health['timestamp'] . PHP_EOL;
    echo PHP_EOL;

    foreach ($health['checks'] as $check) {
        $status_emoji = [
            'ok' => '✅',
            'warning' => '⚠️',
            'error' => '❌',
            'info' => 'ℹ️'
        ];

        echo $status_emoji[$check['status']] . " " . $check['name'] . ": " . strtoupper($check['status']) . PHP_EOL;

        if (isset($check['message'])) {
            echo "   → " . $check['message'] . PHP_EOL;
        }

        if (isset($check['data'])) {
            foreach ($check['data'] as $key => $value) {
                echo "   • " . $key . ": " . $value . PHP_EOL;
            }
        }

        if (isset($check['error'])) {
            echo "   ERROR: " . $check['error'] . PHP_EOL;
        }

        echo PHP_EOL;
    }

    // Código de saída
    exit($health['status'] === 'healthy' ? 0 : 1);

} else {
    echo json_encode($health, JSON_PRETTY_PRINT);
}
