-- ==================== TRANSKWANZA DATABASE SCHEMA ====================
-- Sistema P2P de Remessas com Banco de Dados Completo
-- Versão: 2.0 Production
-- Data: 14/11/2025

-- ==================== CONFIGURAÇÃO ====================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ==================== CRIAR DATABASE ====================

CREATE DATABASE IF NOT EXISTS `transkwanza`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `transkwanza`;

-- ==================== TABELA: users ====================

CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `country` VARCHAR(3) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `verified` TINYINT(1) DEFAULT 0,
  `reputation_score` DECIMAL(3,2) DEFAULT 5.00,
  `total_transactions` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_country` (`country`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: proposals ====================

CREATE TABLE `proposals` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `from_currency` VARCHAR(3) NOT NULL,
  `to_currency` VARCHAR(3) NOT NULL,
  `from_amount` DECIMAL(12,2) NOT NULL,
  `to_amount` DECIMAL(12,2) NOT NULL,
  `exchange_rate` DECIMAL(10,6) NOT NULL,
  `fee_amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('pending', 'matched', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `bank_name` VARCHAR(255) DEFAULT NULL,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_currencies` (`from_currency`, `to_currency`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: transactions ====================

CREATE TABLE `transactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `proposal_id` INT(11) NOT NULL,
  `sender_id` INT(11) NOT NULL,
  `receiver_id` INT(11) NOT NULL,
  `sender_amount` DECIMAL(12,2) NOT NULL,
  `receiver_amount` DECIMAL(12,2) NOT NULL,
  `sender_currency` VARCHAR(3) NOT NULL,
  `receiver_currency` VARCHAR(3) NOT NULL,
  `exchange_rate` DECIMAL(10,6) NOT NULL,
  `status` ENUM('initiated', 'sender_paid', 'receiver_paid', 'completed', 'disputed', 'cancelled') DEFAULT 'initiated',
  `sender_payment_proof` VARCHAR(255) DEFAULT NULL,
  `receiver_payment_proof` VARCHAR(255) DEFAULT NULL,
  `completion_date` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_proposal` (`proposal_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: messages ====================

CREATE TABLE `messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` INT(11) NOT NULL,
  `sender_id` INT(11) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction` (`transaction_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: uploads ====================

CREATE TABLE `uploads` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `transaction_id` INT(11) DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` INT(11) NOT NULL,
  `upload_type` ENUM('payment_proof', 'identity_document', 'profile_avatar', 'other') DEFAULT 'other',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_transaction` (`transaction_id`),
  KEY `idx_type` (`upload_type`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: ratings ====================

CREATE TABLE `ratings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` INT(11) NOT NULL,
  `rater_id` INT(11) NOT NULL,
  `rated_id` INT(11) NOT NULL,
  `rating` TINYINT(1) NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rating` (`transaction_id`, `rater_id`),
  KEY `idx_rated` (`rated_id`),
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rater_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rated_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: notifications ====================

CREATE TABLE `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `type` ENUM('proposal_matched', 'payment_received', 'transaction_completed', 'new_message', 'rating_received', 'system') DEFAULT 'system',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(255) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_read` (`is_read`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: activity_log ====================

CREATE TABLE `activity_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `entity_id` INT(11) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DADOS DE EXEMPLO (TESTE) ====================

-- Usuário de teste (senha: "senha123" - hash MD5 simples para teste)
INSERT INTO `users` (`name`, `email`, `password`, `country`, `phone`, `verified`, `reputation_score`, `total_transactions`) VALUES
('João Silva', 'joao@test.com', '82dc3e03258f5c270cb3c04c5f87d968', 'BRA', '+5511999999999', 1, 4.85, 12),
('Maria Santos', 'maria@test.com', '82dc3e03258f5c270cb3c04c5f87d968', 'BRA', '+5521988888888', 1, 4.92, 8),
('Pedro Costa', 'pedro@test.com', '82dc3e03258f5c270cb3c04c5f87d968', 'PRT', '+351912345678', 1, 5.00, 15),
('Ana Oliveira', 'ana@test.com', '82dc3e03258f5c270cb3c04c5f87d968', 'AGO', '+244923456789', 0, 5.00, 0);

-- Propostas de teste
INSERT INTO `proposals` (`user_id`, `from_currency`, `to_currency`, `from_amount`, `to_amount`, `exchange_rate`, `fee_amount`, `status`, `payment_method`, `bank_name`) VALUES
(1, 'BRL', 'USD', 5800.00, 970.00, 0.1724, 174.00, 'pending', 'PIX', 'Banco do Brasil'),
(2, 'USD', 'BRL', 1000.00, 5626.00, 5.80, 30.00, 'pending', 'Bank Transfer', 'Itaú'),
(3, 'EUR', 'BRL', 500.00, 2996.50, 6.17, 15.00, 'matched', 'SEPA', 'Santander'),
(1, 'BRL', 'EUR', 6170.00, 970.00, 0.1621, 185.10, 'completed', 'PIX', 'Bradesco');

-- Transação de teste
INSERT INTO `transactions` (`proposal_id`, `sender_id`, `receiver_id`, `sender_amount`, `receiver_amount`, `sender_currency`, `receiver_currency`, `exchange_rate`, `status`) VALUES
(3, 3, 1, 500.00, 2996.50, 'EUR', 'BRL', 6.17, 'sender_paid');

-- ==================== VIEWS ÚTEIS ====================

-- View: Propostas ativas com informações do usuário
CREATE OR REPLACE VIEW `active_proposals_view` AS
SELECT
    p.id,
    p.user_id,
    u.name as user_name,
    u.reputation_score,
    u.total_transactions,
    p.from_currency,
    p.to_currency,
    p.from_amount,
    p.to_amount,
    p.exchange_rate,
    p.fee_amount,
    p.status,
    p.payment_method,
    p.created_at
FROM proposals p
INNER JOIN users u ON p.user_id = u.id
WHERE p.status IN ('pending', 'matched')
ORDER BY p.created_at DESC;

-- View: Estatísticas de usuário
CREATE OR REPLACE VIEW `user_stats_view` AS
SELECT
    u.id,
    u.name,
    u.email,
    u.country,
    u.reputation_score,
    u.total_transactions,
    COUNT(DISTINCT p.id) as active_proposals,
    COUNT(DISTINCT t.id) as active_transactions,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_transactions
FROM users u
LEFT JOIN proposals p ON u.id = p.user_id AND p.status IN ('pending', 'matched')
LEFT JOIN transactions t ON (u.id = t.sender_id OR u.id = t.receiver_id)
GROUP BY u.id;

-- ==================== TRIGGERS ====================

-- Trigger: Atualizar total_transactions quando transação completa
DELIMITER $$
CREATE TRIGGER update_user_transactions
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users SET total_transactions = total_transactions + 1
        WHERE id = NEW.sender_id OR id = NEW.receiver_id;
    END IF;
END$$
DELIMITER ;

-- Trigger: Atualizar reputation_score quando recebe rating
DELIMITER $$
CREATE TRIGGER update_user_reputation
AFTER INSERT ON ratings
FOR EACH ROW
BEGIN
    UPDATE users
    SET reputation_score = (
        SELECT AVG(rating)
        FROM ratings
        WHERE rated_id = NEW.rated_id
    )
    WHERE id = NEW.rated_id;
END$$
DELIMITER ;

-- ==================== ÍNDICES ADICIONAIS ====================

CREATE INDEX idx_proposals_matching ON proposals(from_currency, to_currency, status);
CREATE INDEX idx_transactions_active ON transactions(status, created_at);
CREATE INDEX idx_messages_unread ON messages(transaction_id, is_read);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at);

-- ==================== FIM ====================

COMMIT;
