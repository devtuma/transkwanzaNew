-- TransKwanza Database Schema
-- Execute este script no seu banco de dados MySQL da Hostinger

CREATE DATABASE IF NOT EXISTS transkwanza_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE transkwanza_db;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    country VARCHAR(2) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de propostas
CREATE TABLE IF NOT EXISTS proposals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    status ENUM('pending', 'matched', 'completed', 'cancelled') DEFAULT 'pending',
    matched_with_user_id INT NULL,
    matched_with_email VARCHAR(255) NULL,
    match_recipient_name VARCHAR(255) NULL,
    match_recipient_email VARCHAR(255) NULL,
    match_recipient_phone VARCHAR(255) NULL,
    matched_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_email (user_email),
    INDEX idx_status (status),
    INDEX idx_currencies (from_currency, to_currency),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de transações (registro completo)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    receiver_user_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(15, 8) NOT NULL,
    sender_proof_url VARCHAR(500) NULL,
    receiver_proof_url VARCHAR(500) NULL,
    status ENUM('pending', 'sender_paid', 'both_paid', 'completed', 'cancelled') DEFAULT 'pending',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_user_id),
    INDEX idx_receiver (receiver_user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de taxas de câmbio (cache)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15, 8) NOT NULL,
    source VARCHAR(50) DEFAULT 'api',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_currencies (base_currency, target_currency),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de países suportados
CREATE TABLE IF NOT EXISTS supported_countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir países suportados
INSERT INTO supported_countries (country_code, country_name, currency_code, currency_name, payment_method) VALUES
('BR', 'Brasil', 'BRL', 'Real', 'PIX'),
('AO', 'Angola', 'AOA', 'Kwanza', 'Multicaixa Express'),
('PT', 'Portugal', 'EUR', 'Euro', 'SEPA / MB Way'),
('US', 'Estados Unidos', 'USD', 'Dólar', 'Zelle / ACH'),
('CU', 'Cuba', 'CUP', 'Peso Cubano', 'Transfermóvil'),
('RU', 'Rússia', 'RUB', 'Rublo', 'SBP'),
('ZA', 'África do Sul', 'ZAR', 'Rand', 'EFT'),
('NA', 'Namíbia', 'NAD', 'Dólar Namibiano', 'EFT'),
('MZ', 'Moçambique', 'MZN', 'Metical', 'M-Pesa');

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_values TEXT NULL,
    new_values TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Views úteis
CREATE OR REPLACE VIEW v_active_proposals AS
SELECT
    p.*,
    u.name as user_name,
    u.country as user_country
FROM proposals p
JOIN users u ON p.user_id = u.id
WHERE p.status = 'pending';

CREATE OR REPLACE VIEW v_transaction_summary AS
SELECT
    DATE(t.created_at) as date,
    t.from_currency,
    t.to_currency,
    COUNT(*) as total_transactions,
    SUM(t.amount) as total_amount,
    SUM(t.fee) as total_fees
FROM transactions t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at), t.from_currency, t.to_currency;

-- Procedure para limpar propostas expiradas (24 horas)
DELIMITER //

CREATE PROCEDURE clean_expired_proposals()
BEGIN
    UPDATE proposals
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE status = 'pending'
      AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
END //

DELIMITER ;

-- Event para executar limpeza automaticamente (execute uma vez por hora)
-- Nota: Certifique-se de que o event scheduler está ativo: SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS clean_expired_proposals_event
ON SCHEDULE EVERY 1 HOUR
DO CALL clean_expired_proposals();

-- Usuário demo para testes (senha: demo123)
-- Senha hasheada com password_hash('demo123', PASSWORD_BCRYPT)
INSERT INTO users (name, email, password, country, phone, verified) VALUES
('Usuário Demo', 'demo@transkwanza.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'BR', '+5511999999999', TRUE)
ON DUPLICATE KEY UPDATE email=email;
