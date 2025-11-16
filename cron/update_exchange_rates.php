<?php
/**
 * TransKwanza - Cron Job: Atualizar Taxas de Câmbio
 *
 * Este script deve ser executado periodicamente via cron para manter
 * as taxas de câmbio atualizadas.
 *
 * Configuração do cron (atualizar a cada 1 hora):
 * 0 * * * * cd /path/to/transkwanza && /usr/bin/php cron/update_exchange_rates.php >> logs/cron_rates.log 2>&1
 *
 * Ou via wget/curl (se PHP CLI não disponível):
 * 0 * * * * curl -s http://transkwanza.com/cron/update_exchange_rates.php?secret=YOUR_SECRET_KEY >> /dev/null 2>&1
 */

// Permitir execução via CLI ou via HTTP com chave secreta
$is_cli = (php_sapi_name() === 'cli');

if (!$is_cli) {
    // Se não for CLI, exigir chave secreta
    $secret = $_GET['secret'] ?? '';
    define('CRON_SECRET_KEY', 'transkwanza_cron_2024_secure'); // MUDAR EM PRODUÇÃO!

    if ($secret !== CRON_SECRET_KEY) {
        http_response_code(403);
        die('Unauthorized');
    }
}

// Incluir configuração do banco
require_once dirname(__DIR__) . '/api/config.php';

// Configurações
define('LOG_FILE', dirname(__DIR__) . '/logs/cron_rates.log');
define('MAX_EXECUTION_TIME', 300); // 5 minutos
define('API_DELAY_MS', 100); // 100ms entre chamadas (não sobrecarregar API)

set_time_limit(MAX_EXECUTION_TIME);

/**
 * Log com timestamp
 */
function log_message($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] [$level] $message" . PHP_EOL;

    // Criar diretório de logs se não existir
    $log_dir = dirname(LOG_FILE);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    // Escrever no arquivo
    file_put_contents(LOG_FILE, $log_entry, FILE_APPEND);

    // Também imprimir se for CLI
    global $is_cli;
    if ($is_cli) {
        echo $log_entry;
    }
}

/**
 * Buscar taxas de câmbio da API externa
 */
function fetch_rate_from_api($from) {
    $url = 'https://open.er-api.com/v6/latest/' . urlencode($from);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'TransKwanza/1.0');

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($http_code !== 200 || !$response) {
        return [
            'success' => false,
            'error' => $error ?: "HTTP $http_code"
        ];
    }

    $data = json_decode($response, true);

    if (!isset($data['rates']) || !is_array($data['rates'])) {
        return [
            'success' => false,
            'error' => 'Invalid API response format'
        ];
    }

    return [
        'success' => true,
        'rates' => $data['rates'],
        'base' => $data['base'] ?? $from,
        'time_last_update' => $data['time_last_update_unix'] ?? time()
    ];
}

/**
 * Salvar taxas no banco de dados
 */
function save_rates_to_database($from, $rates) {
    global $pdo;

    $saved = 0;
    $errors = 0;

    foreach ($rates as $to => $rate) {
        if ($from === $to) {
            continue; // Pular conversão para mesma moeda
        }

        try {
            // Inserir no histórico
            $stmt = $pdo->prepare("
                INSERT INTO exchange_rates
                (base_currency, target_currency, rate, source, fetched_at)
                VALUES (?, ?, ?, 'exchangerate-api', NOW())
            ");
            $stmt->execute([$from, $to, $rate]);

            // Trigger atualiza cache automaticamente
            $saved++;

        } catch (PDOException $e) {
            $errors++;
            log_message("Erro ao salvar $from → $to: " . $e->getMessage(), 'ERROR');
        }
    }

    return ['saved' => $saved, 'errors' => $errors];
}

/**
 * Obter moedas ativas do banco
 */
function get_active_currencies() {
    global $pdo;

    try {
        // Tentar buscar da tabela currencies
        $stmt = $pdo->query("
            SELECT code
            FROM currencies
            WHERE is_enabled = 1
            ORDER BY code
        ");

        $currencies = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($currencies)) {
            return $currencies;
        }
    } catch (PDOException $e) {
        // Tabela currencies pode não existir
        log_message("Tabela currencies não encontrada, usando lista padrão", 'WARNING');
    }

    // Fallback: Lista hardcoded das moedas principais
    return ['USD', 'BRL', 'EUR', 'AOA', 'CUP', 'RUB', 'ZAR', 'NAD', 'MZN'];
}

/**
 * Limpar logs antigos (manter últimos 30 dias)
 */
function cleanup_old_logs() {
    global $pdo;

    try {
        $stmt = $pdo->exec("
            DELETE FROM exchange_rates
            WHERE fetched_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ");

        if ($stmt > 0) {
            log_message("Removidos $stmt registros antigos do histórico", 'INFO');
        }
    } catch (PDOException $e) {
        log_message("Erro ao limpar logs antigos: " . $e->getMessage(), 'ERROR');
    }
}

// ==================== EXECUÇÃO PRINCIPAL ====================

log_message('========== INICIANDO ATUALIZAÇÃO DE TAXAS ==========');

$start_time = microtime(true);
$total_saved = 0;
$total_errors = 0;
$currencies_processed = 0;
$api_calls = 0;

try {
    // 1. Obter moedas ativas
    $currencies = get_active_currencies();
    log_message("Moedas ativas: " . implode(', ', $currencies));

    // 2. Atualizar taxas para cada moeda base
    foreach ($currencies as $base_currency) {
        log_message("Processando $base_currency...");

        // Buscar taxas da API
        $result = fetch_rate_from_api($base_currency);
        $api_calls++;

        if (!$result['success']) {
            log_message("Erro ao buscar $base_currency: " . $result['error'], 'ERROR');
            $total_errors++;
            continue;
        }

        // Salvar no banco
        $save_result = save_rates_to_database($base_currency, $result['rates']);
        $total_saved += $save_result['saved'];
        $total_errors += $save_result['errors'];
        $currencies_processed++;

        log_message("$base_currency: {$save_result['saved']} taxas salvas, {$save_result['errors']} erros");

        // Delay para não sobrecarregar API
        usleep(API_DELAY_MS * 1000);
    }

    // 3. Limpar logs antigos (executar 1x por dia)
    $hour = (int)date('H');
    if ($hour === 3) { // Executar às 3 AM
        cleanup_old_logs();
    }

} catch (Exception $e) {
    log_message("ERRO FATAL: " . $e->getMessage(), 'ERROR');
    $total_errors++;
}

// ==================== RELATÓRIO FINAL ====================

$end_time = microtime(true);
$duration = round($end_time - $start_time, 2);

log_message("========== ATUALIZAÇÃO CONCLUÍDA ==========");
log_message("Moedas processadas: $currencies_processed");
log_message("Chamadas à API: $api_calls");
log_message("Taxas salvas: $total_saved");
log_message("Erros: $total_errors");
log_message("Tempo de execução: {$duration}s");
log_message("===========================================");

// Retornar código de saída
if ($total_errors > 0) {
    exit(1); // Erro
} else {
    exit(0); // Sucesso
}
