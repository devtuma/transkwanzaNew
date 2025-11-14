# 🗄️ TransKwanza - Setup de Banco de Dados para Produção

## ⚠️ IMPORTANTE: Sistema P2P COMPLETO Requer Banco de Dados

Para funcionar com **transações reais** e **comprovantes de pagamento**, o TransKwanza PRECISA de:

✅ Banco de dados MySQL
✅ Backend PHP
✅ Upload de arquivos

---

## 📋 O Que Precisa de Banco de Dados?

### ❌ O que localStorage NÃO pode fazer:

- ❌ **Guardar imagens** de comprovantes de pagamento
- ❌ **Sincronizar dados** entre diferentes usuários
- ❌ **Fazer matching** de propostas (Usuário A ↔ Usuário B)
- ❌ **Histórico permanente** de transações
- ❌ **Sistema de reputação** e avaliações
- ❌ **Chat** entre usuários
- ❌ **Upload de documentos** (KYC/Verificação)

### ✅ O que o Banco de Dados FAZ:

- ✅ Armazena usuários com dados seguros (senhas hash)
- ✅ Gerencia propostas de câmbio entre usuários
- ✅ Registra transações P2P completas
- ✅ Guarda comprovantes de pagamento (referência)
- ✅ Sistema de chat/mensagens
- ✅ Notificações em tempo real
- ✅ Histórico completo de atividades
- ✅ Sistema de reputação/ratings

---

## 🚀 PASSO A PASSO - Setup no Hostinger

### 1️⃣ Criar Banco de Dados MySQL

**No hPanel da Hostinger:**

1. Login: https://hpanel.hostinger.com
2. **Websites** → Seu domínio → **Databases** → **MySQL Databases**
3. Clique em **"Create Database"**
   - Nome: `transkwanza` (ou outro nome)
   - Usuário: será criado automaticamente
   - Senha: **GUARDE ESTA SENHA!**
4. Clique em **"Create"**

**Anote as informações:**
```
Host: localhost
Database: u123456789_transkwanza (exemplo)
Username: u123456789_transkuser (exemplo)
Password: SuaSenhaAqui123!
```

---

### 2️⃣ Executar Script SQL

**Opção A: Via phpMyAdmin (Recomendado)**

1. No hPanel → **Databases** → **phpMyAdmin**
2. Login com as credenciais do banco
3. Selecione o banco `transkwanza` no menu lateral
4. Clique na aba **"SQL"**
5. Abra o arquivo `/database/schema.sql`
6. **Copie TODO o conteúdo** do arquivo
7. **Cole** na área de texto do phpMyAdmin
8. Clique em **"Go"** (ou "Executar")

**Resultado esperado:**
```
✓ Database created
✓ 8 tables created (users, proposals, transactions, messages, uploads, ratings, notifications, activity_log)
✓ 2 views created
✓ 2 triggers created
✓ 4 test users inserted
✓ 4 test proposals inserted
```

**Opção B: Via Terminal SSH (Avançado)**

```bash
mysql -u seu_usuario -p transkwanza < database/schema.sql
```

---

### 3️⃣ Configurar API PHP

**Editar `/api/config.php`:**

```php
// Linha 26-29: Alterar com SEUS dados do Hostinger
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_transkwanza');    // SEU banco
define('DB_USER', 'u123456789_transkuser');     // SEU usuário
define('DB_PASS', 'SuaSenhaAqui123!');          // SUA senha
```

**IMPORTANTE:** Também altere o JWT_SECRET (linha 54):
```php
define('JWT_SECRET', 'CRIE_UMA_CHAVE_SECRETA_AQUI_' . bin2hex(random_bytes(16)));
```

Ou gere uma chave aleatória:
```php
define('JWT_SECRET', 'TK_' . bin2hex(random_bytes(32)));
```

---

### 4️⃣ Testar Conexão com Banco

**Criar arquivo de teste: `/api/test.php`**

```php
<?php
require_once 'config.php';

try {
    global $pdo;
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $result = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'Conexão com banco OK!',
        'users_count' => $result['total']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
```

**Testar:**
- Acesse: `https://seudominio.com/api/test.php`
- Deve retornar: `{"success":true,"message":"Conexão com banco OK!","users_count":4}`

---

### 5️⃣ Configurar Permissões de Upload

**No File Manager do Hostinger:**

1. Vá para `/public_html/uploads/`
2. Clique com botão direito → **Permissions**
3. Defina: **755** (rwxr-xr-x)
4. Marque **"Apply to subdirectories"**
5. Clique em **"Change"**

**Estrutura de diretórios:**
```
uploads/
├── payment_proofs/   (comprovantes de pagamento)
├── documents/        (documentos de identidade)
├── avatars/          (fotos de perfil)
└── temp/             (uploads temporários)
```

---

### 6️⃣ Criar .htaccess para Segurança

**Criar `/uploads/.htaccess`:**

```apache
# Prevenir execução de scripts
<FilesMatch "\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$">
    deny from all
</FilesMatch>

# Permitir apenas imagens e PDFs
<FilesMatch "\.(jpg|jpeg|png|gif|pdf)$">
    allow from all
</FilesMatch>

# Desabilitar listagem de diretórios
Options -Indexes

# Adicionar headers de segurança
Header set X-Content-Type-Options "nosniff"
```

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais:

**1. `users`** - Usuários do sistema
- id, name, email, password (hash), country, phone
- verified, reputation_score, total_transactions
- created_at, updated_at

**2. `proposals`** - Propostas de câmbio
- id, user_id, from_currency, to_currency
- from_amount, to_amount, exchange_rate, fee_amount
- status (pending, matched, in_progress, completed, cancelled)
- payment_method, bank_name, account_number

**3. `transactions`** - Transações P2P
- id, proposal_id, sender_id, receiver_id
- sender_amount, receiver_amount, currencies, rate
- status (initiated, sender_paid, receiver_paid, completed, disputed)
- **sender_payment_proof**, **receiver_payment_proof** 👈 IMAGENS
- completion_date

**4. `uploads`** - Arquivos enviados
- id, user_id, transaction_id
- file_name, file_path, file_type, file_size
- upload_type (payment_proof, identity_document, profile_avatar)

**5. `messages`** - Chat entre usuários
- id, transaction_id, sender_id, message, is_read

**6. `ratings`** - Avaliações
- id, transaction_id, rater_id, rated_id, rating (1-5), comment

**7. `notifications`** - Notificações
- id, user_id, type, title, message, link, is_read

**8. `activity_log`** - Log de atividades
- id, user_id, action, entity_type, entity_id, ip_address

---

## 🔄 Fluxo Completo de Transação

### 1. Usuário A cria proposta
```sql
INSERT INTO proposals (user_id, from_currency, to_currency, amount, ...)
VALUES (1, 'USD', 'BRL', 1000, ...)
```

### 2. Sistema faz matching com Usuário B
```sql
UPDATE proposals SET status = 'matched', matched_with_user_id = 2
WHERE id = 123
```

### 3. Cria transação P2P
```sql
INSERT INTO transactions (proposal_id, sender_id, receiver_id, ...)
VALUES (123, 1, 2, ...)
```

### 4. Usuário A envia comprovante
**Frontend:**
```javascript
const formData = new FormData();
formData.append('file', comprovanteFile);
formData.append('type', 'payment_proof');
formData.append('transaction_id', 456);

fetch('/api/upload.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
})
```

**Backend atualiza:**
```sql
UPDATE transactions
SET sender_payment_proof = '/uploads/payment_proofs/file_123.jpg',
    status = 'sender_paid'
WHERE id = 456
```

### 5. Usuário B confirma recebimento
```sql
UPDATE transactions
SET receiver_payment_proof = '/uploads/payment_proofs/file_124.jpg',
    status = 'receiver_paid'
WHERE id = 456
```

### 6. Sistema marca como completo
```sql
UPDATE transactions
SET status = 'completed', completion_date = NOW()
WHERE id = 456
```

### 7. Usuários avaliam um ao outro
```sql
INSERT INTO ratings (transaction_id, rater_id, rated_id, rating, comment)
VALUES (456, 1, 2, 5, 'Excelente!')
```

### 8. Atualiza reputação (trigger automático)
```sql
-- Trigger atualiza automaticamente:
UPDATE users
SET reputation_score = AVG(ratings.rating)
WHERE id = 2
```

---

## 🧪 Testar Sistema Completo

### Teste 1: Criar Usuário

**Frontend (login.html):**
```javascript
fetch('/api/auth.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'register',
        name: 'Teste User',
        email: 'teste@test.com',
        password: 'senha123',
        country: 'BRA',
        phone: '+5511999999999'
    })
})
```

**Verificar no banco:**
```sql
SELECT * FROM users WHERE email = 'teste@test.com'
```

### Teste 2: Criar Proposta

```javascript
fetch('/api/proposals.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
        from_currency: 'USD',
        to_currency: 'BRL',
        amount: 1000
    })
})
```

### Teste 3: Upload de Comprovante

```javascript
const input = document.getElementById('fileInput');
const file = input.files[0];

const formData = new FormData();
formData.append('file', file);
formData.append('type', 'payment_proof');
formData.append('transaction_id', 123);

fetch('/api/upload.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
})
.then(r => r.json())
.then(data => {
    console.log('Upload sucesso!', data.data.url);
    // Mostrar comprovante: <img src="${data.data.url}">
})
```

---

## ✅ Checklist de Produção

Antes de colocar no ar:

- [ ] Banco de dados MySQL criado no Hostinger
- [ ] Script `/database/schema.sql` executado
- [ ] Credenciais atualizadas em `/api/config.php`
- [ ] JWT_SECRET alterado para valor único
- [ ] Teste `/api/test.php` retorna sucesso
- [ ] Pasta `/uploads/` existe com permissões 755
- [ ] `.htaccess` configurado em `/uploads/`
- [ ] Teste de upload funciona
- [ ] Teste de login/cadastro funciona
- [ ] Teste de criação de proposta funciona

---

## 🔒 Segurança

### ✅ Já Implementado:

- Senhas com hash bcrypt (cost 12)
- JWT para autenticação
- Prepared statements (anti-SQL injection)
- Validação de tipo de arquivo
- Limite de tamanho de arquivo (5MB)
- CORS configurado
- Sanitização de inputs
- Activity log de ações

### 📝 Recomendações Adicionais:

1. **SSL/HTTPS** (gratuito no Hostinger)
2. **Rate limiting** para evitar spam
3. **Backup diário** do banco de dados
4. **Monitoramento** de uploads
5. **Validação adicional** de imagens (evitar malware)

---

## 🎯 Resumo

**Sem Banco de Dados:**
- ✅ Calculadora funciona
- ❌ Não guarda comprovantes
- ❌ Não sincroniza usuários
- ❌ Dados se perdem ao limpar cache

**Com Banco de Dados:**
- ✅ Sistema P2P COMPLETO
- ✅ Comprovantes salvos
- ✅ Matching de propostas
- ✅ Histórico permanente
- ✅ Chat entre usuários
- ✅ Sistema de reputação
- ✅ **PRONTO PARA PRODUÇÃO REAL!**

---

**Versão:** 2.0 Production Ready
**Data:** 14/11/2025
**Status:** ✅ Pronto para Deploy com Banco de Dados
