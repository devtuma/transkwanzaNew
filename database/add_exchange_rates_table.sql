-- ==================== TABELA DE TAXAS DE CÂMBIO DINÂMICAS ====================
-- Armazena taxas atualizadas em tempo real via API externa
-- Histórico completo para análises e compliance

CREATE TABLE IF NOT EXISTS `exchange_rates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `base_currency` VARCHAR(3) NOT NULL,
  `target_currency` VARCHAR(3) NOT NULL,
  `rate` DECIMAL(18,8) NOT NULL COMMENT 'Taxa de câmbio (8 casas decimais para precisão)',
  `source` VARCHAR(50) NOT NULL DEFAULT 'exchangerate-api' COMMENT 'Fonte da taxa',
  `fetched_at` DATETIME NOT NULL COMMENT 'Quando a taxa foi obtida',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pair_fetch` (`base_currency`, `target_currency`, `fetched_at`),
  INDEX `idx_currencies` (`base_currency`, `target_currency`),
  INDEX `idx_fetched_at` (`fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de cache de taxas (apenas a mais recente de cada par)
CREATE TABLE IF NOT EXISTS `exchange_rates_cache` (
  `base_currency` VARCHAR(3) NOT NULL,
  `target_currency` VARCHAR(3) NOT NULL,
  `rate` DECIMAL(18,8) NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'exchangerate-api',
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`base_currency`, `target_currency`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger para atualizar cache automaticamente
DELIMITER $$
CREATE TRIGGER `update_exchange_rate_cache`
AFTER INSERT ON `exchange_rates`
FOR EACH ROW
BEGIN
  INSERT INTO `exchange_rates_cache`
    (`base_currency`, `target_currency`, `rate`, `source`, `updated_at`)
  VALUES
    (NEW.base_currency, NEW.target_currency, NEW.rate, NEW.source, NEW.fetched_at)
  ON DUPLICATE KEY UPDATE
    `rate` = NEW.rate,
    `source` = NEW.source,
    `updated_at` = NEW.fetched_at;
END$$
DELIMITER ;

-- Índices adicionais para performance
CREATE INDEX `idx_rate_date` ON `exchange_rates` (`base_currency`, `target_currency`, `fetched_at` DESC);
