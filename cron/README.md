# TransKwanza - Cron Jobs

Este diretório contém scripts para tarefas agendadas (cron jobs) do TransKwanza.

## 📋 Scripts Disponíveis

### 1. `update_exchange_rates.php`

Atualiza todas as taxas de câmbio buscando da API externa (exchangerate-api.com).

**Funcionalidades:**
- ✅ Busca taxas em tempo real para todas as moedas ativas
- ✅ Salva histórico completo no banco de dados
- ✅ Atualiza cache automaticamente (via trigger SQL)
- ✅ Sistema de logs detalhado
- ✅ Limpeza automática de dados antigos (>90 dias)
- ✅ Proteção contra sobrecarga da API (delay entre chamadas)
- ✅ Tratamento robusto de erros

---

## ⚙️ Configuração

### Método 1: Cron via PHP CLI (Recomendado)

Se o servidor tem PHP CLI instalado:

```bash
# Editar crontab
crontab -e

# Adicionar linha (executar a cada 1 hora):
0 * * * * cd /var/www/html/transkwanza && /usr/bin/php cron/update_exchange_rates.php >> logs/cron_rates.log 2>&1
```

**Explicação:**
- `0 * * * *` = Executar no minuto 0 de cada hora (00:00, 01:00, 02:00, etc.)
- `cd /var/www/html/transkwanza` = Ir para o diretório do projeto
- `/usr/bin/php cron/update_exchange_rates.php` = Executar o script
- `>> logs/cron_rates.log 2>&1` = Redirecionar output para log

### Método 2: Cron via HTTP (Alternativa)

Se PHP CLI não estiver disponível, usar curl/wget:

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 * * * * curl -s "https://transkwanza.com/cron/update_exchange_rates.php?secret=SEU_SECRET_AQUI" >> /dev/null 2>&1
```

**⚠️ IMPORTANTE:** Altere `SEU_SECRET_AQUI` por uma chave secreta forte!

Para gerar uma chave segura:
```bash
openssl rand -base64 32
```

Depois, edite o arquivo `cron/update_exchange_rates.php` linha 18:
```php
define('CRON_SECRET_KEY', 'SUA_CHAVE_GERADA_AQUI');
```

### Método 3: Painel de Controle (Hostinger/cPanel)

1. Acesse o painel de controle
2. Procure por "Cron Jobs" ou "Tarefas Agendadas"
3. Adicione novo cron job:
   - **Comando:** `/usr/bin/php /home/u442547792/public_html/cron/update_exchange_rates.php`
   - **Frequência:** A cada 1 hora
   - **E-mail de notificação:** (opcional)

---

## 📊 Frequências Recomendadas

### Produção
```bash
# Atualizar taxas a cada 1 hora
0 * * * * /usr/bin/php cron/update_exchange_rates.php

# Alternativas:
# A cada 2 horas: 0 */2 * * *
# A cada 4 horas: 0 */4 * * *
# Apenas horário comercial (8h-20h): 0 8-20 * * *
```

### Desenvolvimento/Teste
```bash
# A cada 6 horas (economizar chamadas à API)
0 */6 * * * /usr/bin/php cron/update_exchange_rates.php

# Uma vez por dia às 3 AM
0 3 * * * /usr/bin/php cron/update_exchange_rates.php
```

---

## 📝 Logs

Os logs são salvos em `logs/cron_rates.log` e contêm:
- Timestamp de cada execução
- Moedas processadas
- Número de taxas salvas
- Erros encontrados
- Tempo de execução

**Exemplo de log:**
```
[2024-01-15 10:00:01] [INFO] ========== INICIANDO ATUALIZAÇÃO DE TAXAS ==========
[2024-01-15 10:00:01] [INFO] Moedas ativas: USD, BRL, EUR, AOA, CUP, RUB, ZAR, NAD, MZN
[2024-01-15 10:00:02] [INFO] Processando USD...
[2024-01-15 10:00:03] [INFO] USD: 8 taxas salvas, 0 erros
[2024-01-15 10:00:04] [INFO] Processando BRL...
[2024-01-15 10:00:05] [INFO] BRL: 8 taxas salvas, 0 erros
...
[2024-01-15 10:00:45] [INFO] ========== ATUALIZAÇÃO CONCLUÍDA ==========
[2024-01-15 10:00:45] [INFO] Moedas processadas: 9
[2024-01-15 10:00:45] [INFO] Chamadas à API: 9
[2024-01-15 10:00:45] [INFO] Taxas salvas: 72
[2024-01-15 10:00:45] [INFO] Erros: 0
[2024-01-15 10:00:45] [INFO] Tempo de execução: 44.23s
```

### Visualizar logs em tempo real:
```bash
tail -f logs/cron_rates.log
```

### Limpar logs antigos:
```bash
# Manter apenas últimas 1000 linhas
tail -n 1000 logs/cron_rates.log > logs/cron_rates_temp.log
mv logs/cron_rates_temp.log logs/cron_rates.log
```

---

## 🧪 Testar Manualmente

### Via CLI:
```bash
cd /var/www/html/transkwanza
php cron/update_exchange_rates.php
```

### Via Browser:
```
https://transkwanza.com/cron/update_exchange_rates.php?secret=SUA_CHAVE_SECRETA
```

---

## ⚠️ Troubleshooting

### Erro: "Permission denied"
```bash
chmod +x cron/update_exchange_rates.php
```

### Erro: "php: command not found"
Encontre o caminho correto do PHP:
```bash
which php
# ou
whereis php
```

Use o caminho completo no cron:
```bash
/usr/local/bin/php cron/update_exchange_rates.php
```

### Erro: "Class 'PDO' not found"
PHP CLI precisa da extensão PDO. Instale:
```bash
# Ubuntu/Debian
sudo apt-get install php-mysql

# CentOS/RHEL
sudo yum install php-mysql
```

### Cron não está executando
Verifique se o cron está rodando:
```bash
sudo service cron status
```

Verifique logs do sistema:
```bash
grep CRON /var/log/syslog
```

### API retornando erro 429 (Too Many Requests)
- Reduza a frequência do cron (executar a cada 2-4 horas)
- Aumente o `API_DELAY_MS` no script
- Considere upgrade do plano da API

---

## 📈 Monitoramento

### Verificar última atualização:
```sql
SELECT
    base_currency,
    target_currency,
    rate,
    updated_at,
    TIMESTAMPDIFF(MINUTE, updated_at, NOW()) as minutes_ago
FROM exchange_rates_cache
ORDER BY updated_at DESC
LIMIT 10;
```

### Estatísticas de execução:
```bash
# Contar execuções bem-sucedidas hoje
grep "ATUALIZAÇÃO CONCLUÍDA" logs/cron_rates.log | grep "$(date +%Y-%m-%d)" | wc -l

# Contar erros hoje
grep "ERROR" logs/cron_rates.log | grep "$(date +%Y-%m-%d)" | wc -l
```

---

## 🔒 Segurança

1. **Chave Secreta:** SEMPRE altere `CRON_SECRET_KEY` em produção
2. **Permissões:** O arquivo não deve ser executável por todos
   ```bash
   chmod 750 cron/update_exchange_rates.php
   ```
3. **Firewall:** Se usar HTTP, bloqueie acesso público e permita apenas IPs confiáveis
4. **Logs:** Não versione arquivos de log (já está no .gitignore)

---

## 📚 Referências

- **API Externa:** https://www.exchangerate-api.com/docs/free
- **Crontab Guru:** https://crontab.guru/ (gerador de expressões cron)
- **Documentação PHP CLI:** https://www.php.net/manual/en/features.commandline.php
