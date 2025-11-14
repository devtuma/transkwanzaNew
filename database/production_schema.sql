-- ==================== TRANSKWANZA DATABASE - PRODUÇÃO COMPLETA ====================
-- Sistema P2P com Login Social, KYC, Admin Dashboard, Anti-Fraude
-- Versão: 3.0 Production Ready - Sistema Real
-- Data: 14/11/2025

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `transkwanza`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `transkwanza`;

-- ==================== TABELA: users ====================

CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) DEFAULT NULL,
  `country` VARCHAR(3) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,

  -- Login Social
  `google_id` VARCHAR(255) DEFAULT NULL UNIQUE,
  `facebook_id` VARCHAR(255) DEFAULT NULL UNIQUE,
  `instagram_id` VARCHAR(255) DEFAULT NULL UNIQUE,
  `apple_id` VARCHAR(255) DEFAULT NULL UNIQUE,
  `login_method` ENUM('email', 'google', 'facebook', 'instagram', 'apple') DEFAULT 'email',

  -- KYC / Verificação de Documento
  `document_type` VARCHAR(50) DEFAULT NULL,
  `document_number` VARCHAR(100) DEFAULT NULL,
  `document_front` VARCHAR(255) DEFAULT NULL,
  `document_back` VARCHAR(255) DEFAULT NULL,
  `document_selfie` VARCHAR(255) DEFAULT NULL,
  `kyc_status` ENUM('pending', 'under_review', 'approved', 'rejected') DEFAULT 'pending',
  `kyc_submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `kyc_reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `kyc_reviewed_by` INT(11) DEFAULT NULL,
  `kyc_rejection_reason` TEXT DEFAULT NULL,

  -- Status e Reputação
  `verified` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_admin` TINYINT(1) DEFAULT 0,
  `reputation_score` DECIMAL(3,2) DEFAULT 5.00,
  `total_transactions` INT(11) DEFAULT 0,
  `total_volume_usd` DECIMAL(15,2) DEFAULT 0.00,

  -- Segurança Anti-Fraude
  `fraud_score` INT(3) DEFAULT 0,
  `is_blocked` TINYINT(1) DEFAULT 0,
  `blocked_reason` TEXT DEFAULT NULL,
  `blocked_at` TIMESTAMP NULL DEFAULT NULL,
  `last_login_ip` VARCHAR(45) DEFAULT NULL,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_kyc_status` (`kyc_status`),
  KEY `idx_verified` (`verified`),
  KEY `idx_is_admin` (`is_admin`),
  FOREIGN KEY (`kyc_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: currencies (Gestão de Moedas) ====================

CREATE TABLE `currencies` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(3) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `symbol` VARCHAR(10) NOT NULL,
  `country_code` VARCHAR(3) NOT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `enabled_by` INT(11) DEFAULT NULL,
  `min_amount` DECIMAL(15,2) DEFAULT 1.00,
  `max_amount` DECIMAL(15,2) DEFAULT 100000.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code` (`code`),
  KEY `idx_enabled` (`is_enabled`),
  FOREIGN KEY (`enabled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Moedas iniciais
INSERT INTO `currencies` (`code`, `name`, `symbol`, `country_code`, `is_enabled`) VALUES
('USD', 'Dólar Americano', '$', 'USA', 1),
('BRL', 'Real Brasileiro', 'R$', 'BRA', 1),
('EUR', 'Euro', '€', 'EUR', 1),
('AOA', 'Kwanza Angolano', 'Kz', 'AGO', 1),
('CUP', 'Peso Cubano', '₱', 'CUB', 1),
('RUB', 'Rublo Russo', '₽', 'RUS', 1),
('ZAR', 'Rand Sul-Africano', 'R', 'ZAF', 1),
('NAD', 'Dólar Namibiano', '$', 'NAM', 1),
('MZN', 'Metical Moçambicano', 'MT', 'MOZ', 1);

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
  `status` ENUM('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'admin_review') DEFAULT 'pending',

  -- Informações bancárias
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `bank_name` VARCHAR(255) DEFAULT NULL,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `account_holder` VARCHAR(255) DEFAULT NULL,
  `pix_key` VARCHAR(255) DEFAULT NULL,

  `notes` TEXT DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,

  -- Admin
  `requires_admin_approval` TINYINT(1) DEFAULT 0,
  `admin_approved_by` INT(11) DEFAULT NULL,
  `admin_approved_at` TIMESTAMP NULL DEFAULT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_currencies` (`from_currency`, `to_currency`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
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

  -- Status e comprovantes
  `status` ENUM('initiated', 'sender_paid', 'receiver_paid', 'completed', 'disputed', 'cancelled', 'admin_review') DEFAULT 'initiated',
  `sender_payment_proof` VARCHAR(255) DEFAULT NULL,
  `receiver_payment_proof` VARCHAR(255) DEFAULT NULL,

  -- Admin / Aprovação Manual
  `requires_admin_approval` TINYINT(1) DEFAULT 1,
  `admin_approved` TINYINT(1) DEFAULT 0,
  `admin_approved_by` INT(11) DEFAULT NULL,
  `admin_approved_at` TIMESTAMP NULL DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,

  -- Conexão direta pelo admin
  `admin_connected` TINYINT(1) DEFAULT 0,
  `admin_connected_by` INT(11) DEFAULT NULL,
  `admin_payment_made` TINYINT(1) DEFAULT 0,
  `admin_payment_proof` VARCHAR(255) DEFAULT NULL,

  -- Timestamps
  `sender_paid_at` TIMESTAMP NULL DEFAULT NULL,
  `receiver_paid_at` TIMESTAMP NULL DEFAULT NULL,
  `completion_date` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_proposal` (`proposal_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_status` (`status`),
  KEY `idx_admin_approval` (`requires_admin_approval`, `admin_approved`),
  FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`admin_connected_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
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
  `upload_type` ENUM('payment_proof', 'identity_document', 'document_selfie', 'profile_avatar', 'admin_proof', 'other') DEFAULT 'other',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_transaction` (`transaction_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: fraud_checks (Anti-Fraude) ====================

CREATE TABLE `fraud_checks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `transaction_id` INT(11) DEFAULT NULL,
  `check_type` ENUM('duplicate_document', 'suspicious_ip', 'rapid_transactions', 'high_amount', 'fake_document', 'duplicate_bank_account', 'manual_review') NOT NULL,
  `risk_level` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  `details` TEXT DEFAULT NULL,
  `is_resolved` TINYINT(1) DEFAULT 0,
  `resolved_by` INT(11) DEFAULT NULL,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_transaction` (`transaction_id`),
  KEY `idx_risk` (`risk_level`, `is_resolved`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
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
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
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
  `type` ENUM('proposal_matched', 'payment_received', 'transaction_completed', 'new_message', 'rating_received', 'kyc_approved', 'kyc_rejected', 'admin_action', 'system') DEFAULT 'system',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(255) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_read` (`is_read`),
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
  `details` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABELA: admin_actions (Log de Ações Admin) ====================

CREATE TABLE `admin_actions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) NOT NULL,
  `action_type` ENUM('approve_kyc', 'reject_kyc', 'approve_transaction', 'reject_transaction', 'connect_offer', 'make_payment', 'enable_currency', 'disable_currency', 'block_user', 'unblock_user', 'other') NOT NULL,
  `target_user_id` INT(11) DEFAULT NULL,
  `target_transaction_id` INT(11) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_id`),
  KEY `idx_type` (`action_type`),
  FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`target_transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== USUÁRIO ADMIN PADRÃO ====================

INSERT INTO `users` (`name`, `email`, `password`, `country`, `is_admin`, `verified`, `kyc_status`, `login_method`) VALUES
('Administrador', 'admin@transkwanza.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQ9qdWBmSZ0nZjJwJz6YR5nZu', 'BRA', 1, 1, 'approved', 'email');
-- Senha: Admin@123 (MUDE ISSO EM PRODUÇÃO!)

-- ==================== TRIGGERS ====================

DELIMITER $$

-- Atualizar total_transactions quando transação completa
CREATE TRIGGER update_user_transactions
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users SET total_transactions = total_transactions + 1
        WHERE id = NEW.sender_id OR id = NEW.receiver_id;
    END IF;
END$$

-- Atualizar reputation_score quando recebe rating
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

-- Detectar documento duplicado (anti-fraude)
CREATE TRIGGER check_duplicate_document
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE duplicate_count INT;

    IF NEW.document_number IS NOT NULL THEN
        SELECT COUNT(*) INTO duplicate_count
        FROM users
        WHERE document_number = NEW.document_number
        AND id != NEW.id;

        IF duplicate_count > 0 THEN
            INSERT INTO fraud_checks (user_id, check_type, risk_level, details)
            VALUES (NEW.id, 'duplicate_document', 'high', CONCAT('Documento duplicado: ', NEW.document_number));

            SET NEW.fraud_score = NEW.fraud_score + 50;
        END IF;
    END IF;
END$$

DELIMITER ;

-- ==================== ÍNDICES ADICIONAIS ====================

CREATE INDEX idx_proposals_matching ON proposals(from_currency, to_currency, status);
CREATE INDEX idx_transactions_admin ON transactions(requires_admin_approval, admin_approved);
CREATE INDEX idx_users_kyc ON users(kyc_status, verified);
CREATE INDEX idx_fraud_unresolved ON fraud_checks(is_resolved, risk_level);

COMMIT;
