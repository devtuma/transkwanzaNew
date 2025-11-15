# 🏗️ TRANSKWANZA - BLUEPRINT COMPLETO
## Recriando o Sistema do Zero - Passo a Passo

---

## 📌 VISÃO GERAL DO SISTEMA

**Nome:** TransKwanza
**Tipo:** Plataforma P2P de Remessas Internacionais
**Arquitetura:** Frontend (HTML/CSS/JS) + Backend (PHP) + MySQL
**Deploy:** Hostinger com cPanel

### Funcionalidades Principais:
1. Sistema de autenticação (tradicional + social login)
2. KYC (Know Your Customer) com upload de documentos
3. Painel administrativo para gestão
4. Câmbio P2P entre 9 moedas/países
5. Sistema anti-fraude
6. Aprovação manual de transações

### 9 Países/Moedas Suportados:
1. Brasil (BRL - R$)
2. Angola (AOA - Kz)
3. Portugal (EUR - €)
4. Estados Unidos (USD - $)
5. Cuba (CUP - $)
6. Rússia (RUB - ₽)
7. África do Sul (ZAR - R)
8. Namíbia (NAD - $)
9. Moçambique (MZN - MT)

---

## 🎨 STACK TECNOLÓGICO

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização com glassmorphism design
- **JavaScript Vanilla (ES6+)** - Sem frameworks, código nativo
- **Font Awesome 6.4.0** - Ícones
- **Google Fonts** - Tipografia

### Backend
- **PHP 7.4+** - APIs RESTful
- **PDO (PHP Data Objects)** - Conexão com banco de dados
- **JWT (JSON Web Tokens)** - Autenticação stateless
- **bcrypt** - Hash de senhas

### Banco de Dados
- **MySQL 8.0+** - Banco relacional
- **Charset:** utf8mb4_unicode_ci
- **11 tabelas** relacionadas

### Integrações Externas
- **Google OAuth 2.0** - Login social
- **Facebook Graph API** - Login social
- **Instagram Graph API** - Login social (via Facebook)
- **Apple Sign In** - Login social

### Hospedagem
- **Hostinger** - Hospedagem compartilhada
- **SSL Let's Encrypt** - Certificado HTTPS gratuito
- **cPanel/File Manager** - Gerenciamento de arquivos

---

## 📂 ESTRUTURA DE ARQUIVOS COMPLETA

```
public_html/
│
├── index.html                    # Página inicial (landing page)
├── login.html                    # Tela de login
├── cadastro.html                 # Tela de registro
├── dashboard.html                # Dashboard do usuário
├── kyc.html                      # Upload de documentos KYC
├── admin.html                    # Painel administrativo
├── paises.html                   # Informações sobre países
├── suporte.html                  # Página de suporte
├── termos.html                   # Termos de uso
├── privacidade.html              # Política de privacidade
│
├── css/
│   ├── style.css                 # Estilos globais + glassmorphism
│   ├── auth.css                  # Estilos de login/cadastro
│   ├── dashboard.css             # Estilos do dashboard
│   ├── countries.css             # Estilos da página de países
│   └── theme.css                 # Variáveis de tema (cores, fontes)
│
├── js/
│   ├── main.js                   # Utilitários globais (NotificationUtil, etc)
│   ├── auth.js                   # Lógica de login/cadastro tradicional
│   ├── dashboard.js              # Lógica do dashboard do usuário
│   ├── social-login.js           # Integração OAuth (Google, FB, Instagram, Apple)
│   ├── kyc.js                    # Upload e validação de documentos
│   ├── admin.js                  # Lógica do painel administrativo
│   ├── currency.js               # Cálculos de câmbio e conversão
│   └── theme.js                  # Troca de tema (dark/light mode)
│
├── api/
│   ├── config.php                # Configuração do banco + JWT + CORS
│   ├── auth.php                  # API de login/cadastro tradicional
│   ├── social_login.php          # API para OAuth (valida tokens)
│   ├── kyc.php                   # API de upload de documentos
│   ├── admin.php                 # API do painel admin (todas as ações)
│   ├── upload.php                # Handler genérico de upload de arquivos
│   └── proposals.php             # API de propostas de câmbio P2P
│
├── uploads/                      # Pasta de uploads (PERMISSÃO 755)
│   ├── documents/                # Documentos KYC (RG, CNH, Passaporte)
│   ├── avatars/                  # Fotos de perfil dos usuários
│   ├── payment_proofs/           # Comprovantes de pagamento
│   └── temp/                     # Arquivos temporários
│
├── .htaccess                     # Configurações Apache (HTTPS, upload limits)
│
└── database/
    └── production_schema.sql     # Schema completo do banco (11 tabelas)
```

---

## 🗄️ ARQUITETURA DO BANCO DE DADOS

### Credenciais MySQL (Hostinger):
```
Host: localhost
Database: u442547792_transkwanza
Username: u442547792_admin
Password: Life0852new2580!
Charset: utf8mb4
Collation: utf8mb4_unicode_ci
```

### 11 Tabelas do Sistema:

#### 1. **users** (Tabela principal de usuários)
**Campos principais:**
- `id` (PK, AUTO_INCREMENT)
- `name` (VARCHAR 255) - Nome completo
- `email` (VARCHAR 255, UNIQUE) - Email único
- `password` (VARCHAR 255) - Hash bcrypt
- `country` (VARCHAR 2) - Código do país (ex: BR, AO, PT)
- `phone` (VARCHAR 20) - Telefone com código internacional
- **Campos de Login Social:**
  - `google_id` (VARCHAR 255, UNIQUE) - ID do Google
  - `facebook_id` (VARCHAR 255, UNIQUE) - ID do Facebook
  - `instagram_id` (VARCHAR 255, UNIQUE) - ID do Instagram
  - `apple_id` (VARCHAR 255, UNIQUE) - ID da Apple
  - `login_method` (ENUM: 'email', 'google', 'facebook', 'instagram', 'apple')
- **Campos de KYC:**
  - `document_type` (VARCHAR 50) - RG, CPF, CNH, Passport
  - `document_number` (VARCHAR 100) - Número do documento
  - `document_front` (VARCHAR 255) - Caminho da foto frente
  - `document_back` (VARCHAR 255) - Caminho da foto verso
  - `document_selfie` (VARCHAR 255) - Caminho da selfie
  - `kyc_status` (ENUM: 'pending', 'under_review', 'approved', 'rejected')
  - `kyc_reviewed_at` (DATETIME) - Data da revisão
  - `kyc_reviewed_by` (INT) - ID do admin que aprovou/rejeitou
  - `kyc_rejection_reason` (TEXT) - Motivo da rejeição
- **Campos de Segurança:**
  - `is_admin` (TINYINT 1) - 1 = admin, 0 = usuário comum
  - `verified` (TINYINT 1) - Email verificado
  - `is_blocked` (TINYINT 1) - Conta bloqueada
  - `blocked_reason` (TEXT) - Motivo do bloqueio
  - `fraud_score` (INT) - Pontuação de risco (0-100)
- **Campos de Perfil:**
  - `avatar` (VARCHAR 255) - Foto de perfil
  - `bio` (TEXT) - Biografia
  - `reputation` (DECIMAL 3,2) - Reputação (0.00 a 5.00)
  - `total_transactions` (INT) - Total de transações completadas
- **Campos de Auditoria:**
  - `created_at` (DATETIME)
  - `updated_at` (DATETIME)
  - `last_login` (DATETIME)
  - `last_ip` (VARCHAR 45) - Último IP de acesso

**Índices:**
- UNIQUE em `email`
- UNIQUE em `google_id`, `facebook_id`, `instagram_id`, `apple_id`
- INDEX em `kyc_status`
- INDEX em `is_admin`

---

#### 2. **currencies** (Moedas suportadas)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `code` (VARCHAR 3, UNIQUE) - BRL, AOA, EUR, USD, etc.
- `name` (VARCHAR 100) - Nome da moeda
- `symbol` (VARCHAR 10) - R$, Kz, €, $, ₽
- `country` (VARCHAR 2) - Código ISO do país
- `is_enabled` (TINYINT 1) - Moeda ativa/inativa
- `enabled_by` (INT) - ID do admin que habilitou/desabilitou
- `enabled_at` (DATETIME) - Data da mudança
- `created_at` (DATETIME)

**Índices:**
- UNIQUE em `code`
- INDEX em `is_enabled`

**Dados iniciais (9 moedas):**
1. BRL - Real Brasileiro - R$ - BR
2. AOA - Kwanza Angolano - Kz - AO
3. EUR - Euro - € - PT
4. USD - Dólar Americano - $ - US
5. CUP - Peso Cubano - $ - CU
6. RUB - Rublo Russo - ₽ - RU
7. ZAR - Rand Sul-Africano - R - ZA
8. NAD - Dólar Namíbio - $ - NA
9. MZN - Metical Moçambicano - MT - MZ

---

#### 3. **proposals** (Propostas de câmbio P2P)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `user_id` (FK → users.id) - Quem criou a proposta
- `type` (ENUM: 'buy', 'sell') - Comprar ou vender moeda
- `currency_from` (VARCHAR 3) - Moeda que oferece
- `currency_to` (VARCHAR 3) - Moeda que deseja
- `amount_from` (DECIMAL 15,2) - Valor oferecido
- `amount_to` (DECIMAL 15,2) - Valor desejado
- `exchange_rate` (DECIMAL 10,6) - Taxa de câmbio
- `min_amount` (DECIMAL 15,2) - Valor mínimo
- `max_amount` (DECIMAL 15,2) - Valor máximo
- `payment_method` (VARCHAR 100) - PIX, TED, Mpesa, etc.
- `status` (ENUM: 'active', 'paused', 'completed', 'cancelled')
- `expires_at` (DATETIME) - Data de expiração
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

**Índices:**
- INDEX em `user_id`
- INDEX em `status`
- INDEX em `currency_from`, `currency_to`

---

#### 4. **transactions** (Transações P2P)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `proposal_id` (FK → proposals.id) - Proposta aceita
- `sender_id` (FK → users.id) - Quem envia
- `receiver_id` (FK → users.id) - Quem recebe
- `sender_currency` (VARCHAR 3) - Moeda enviada
- `receiver_currency` (VARCHAR 3) - Moeda recebida
- `sender_amount` (DECIMAL 15,2) - Valor enviado
- `receiver_amount` (DECIMAL 15,2) - Valor recebido
- `exchange_rate` (DECIMAL 10,6) - Taxa aplicada
- `fee_percentage` (DECIMAL 5,2) - Taxa da plataforma (3%)
- `fee_amount` (DECIMAL 15,2) - Valor da taxa
- `payment_proof` (VARCHAR 255) - Comprovante de pagamento
- **Campos de Aprovação Admin:**
  - `admin_status` (ENUM: 'pending', 'approved', 'rejected') - Status admin
  - `admin_reviewed_by` (INT) - ID do admin
  - `admin_reviewed_at` (DATETIME) - Data da revisão
  - `admin_rejection_reason` (TEXT) - Motivo da rejeição
- `status` (ENUM: 'pending', 'paid', 'confirmed', 'completed', 'cancelled', 'dispute')
- `created_at` (DATETIME)
- `completed_at` (DATETIME)

**Índices:**
- INDEX em `sender_id`, `receiver_id`
- INDEX em `status`
- INDEX em `admin_status`

---

#### 5. **uploads** (Registro de arquivos enviados)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `user_id` (FK → users.id)
- `type` (ENUM: 'document', 'avatar', 'payment_proof')
- `original_name` (VARCHAR 255) - Nome original
- `stored_name` (VARCHAR 255) - Nome no servidor
- `file_path` (VARCHAR 255) - Caminho completo
- `file_size` (INT) - Tamanho em bytes
- `mime_type` (VARCHAR 100) - image/jpeg, application/pdf
- `uploaded_at` (DATETIME)

**Índices:**
- INDEX em `user_id`
- INDEX em `type`

---

#### 6. **fraud_checks** (Alertas de fraude)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `user_id` (FK → users.id)
- `check_type` (ENUM: 'duplicate_document', 'multiple_accounts', 'suspicious_activity', 'high_velocity')
- `risk_level` (ENUM: 'low', 'medium', 'high', 'critical')
- `details` (TEXT) - Descrição do alerta
- `is_resolved` (TINYINT 1) - Resolvido ou não
- `resolved_by` (INT) - ID do admin que resolveu
- `resolved_at` (DATETIME)
- `created_at` (DATETIME)

**Índices:**
- INDEX em `user_id`
- INDEX em `is_resolved`
- INDEX em `risk_level`

**Gatilhos automáticos:**
- Detecta documento duplicado (mesmo CPF/RG em usuários diferentes)
- Detecta múltiplas contas com mesmo IP
- Detecta muitas transações em curto período

---

#### 7. **messages** (Chat entre usuários)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `transaction_id` (FK → transactions.id)
- `sender_id` (FK → users.id)
- `receiver_id` (FK → users.id)
- `message` (TEXT)
- `is_read` (TINYINT 1)
- `created_at` (DATETIME)

---

#### 8. **ratings** (Avaliações entre usuários)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `transaction_id` (FK → transactions.id)
- `rater_id` (FK → users.id) - Quem avalia
- `rated_id` (FK → users.id) - Quem é avaliado
- `rating` (TINYINT) - 1 a 5 estrelas
- `comment` (TEXT)
- `created_at` (DATETIME)

**Trigger:**
- Ao inserir avaliação, atualiza `reputation` na tabela `users`

---

#### 9. **notifications** (Notificações do sistema)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `user_id` (FK → users.id)
- `type` (ENUM: 'kyc_approved', 'kyc_rejected', 'transaction_received', 'transaction_completed', etc.)
- `title` (VARCHAR 255)
- `message` (TEXT)
- `is_read` (TINYINT 1)
- `created_at` (DATETIME)

---

#### 10. **activity_log** (Log de atividades)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `user_id` (FK → users.id)
- `action` (VARCHAR 100) - login, logout, upload_document, create_proposal, etc.
- `description` (TEXT)
- `ip_address` (VARCHAR 45)
- `user_agent` (TEXT)
- `created_at` (DATETIME)

---

#### 11. **admin_actions** (Ações administrativas)
**Campos:**
- `id` (PK, AUTO_INCREMENT)
- `admin_id` (FK → users.id)
- `action_type` (ENUM: 'approve_kyc', 'reject_kyc', 'approve_transaction', 'reject_transaction', 'toggle_currency', 'block_user', etc.)
- `target_id` (INT) - ID do alvo (user_id, transaction_id, etc.)
- `details` (TEXT)
- `created_at` (DATETIME)

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### 1. Login Tradicional (Email/Senha)

**Fluxo:**
1. Usuário preenche email + senha em `login.html`
2. JavaScript (`auth.js`) captura o submit do formulário
3. Envia POST para `/api/auth.php?action=login`
4. PHP valida credenciais:
   - Busca usuário por email no banco
   - Verifica senha com `password_verify()`
5. Se válido:
   - Gera JWT token com `user_id` e `email`
   - Retorna JSON: `{success: true, token: "...", user: {...}}`
6. JavaScript armazena no localStorage:
   - `token` - JWT para autenticação
   - `user` - Objeto com dados do usuário
7. Redireciona baseado no status:
   - Se `kyc_status = 'pending'` → `kyc.html`
   - Se `kyc_status = 'approved'` → `dashboard.html`
   - Se `is_admin = 1` → pode acessar `admin.html`

**Tecnologias:**
- **Frontend:** Fetch API, localStorage
- **Backend:** PDO prepared statements, password_verify(), JWT
- **Segurança:** bcrypt hash, SQL injection prevention

---

### 2. Cadastro Tradicional

**Fluxo:**
1. Usuário preenche formulário em `cadastro.html`:
   - Nome, email, país, telefone, senha
2. JavaScript valida:
   - Senha mínimo 6 caracteres
   - Email formato válido
   - Senhas coincidem
3. Envia POST para `/api/auth.php?action=register`
4. PHP:
   - Verifica se email já existe
   - Gera hash da senha com `password_hash()`
   - Insere usuário no banco
   - Define `kyc_status = 'pending'`
5. Retorna usuário criado + token
6. Redireciona para `kyc.html` (precisa enviar documentos)

---

### 3. Login Social (OAuth 2.0)

#### **Providers Suportados:**
- Google OAuth 2.0
- Facebook Login
- Instagram (via Facebook Graph API)
- Apple Sign In

#### **Fluxo Genérico:**

**Fase 1: Frontend (js/social-login.js)**
1. Carregar SDK do provider (Google, Facebook, Apple)
2. Usuário clica no botão "Continuar com Google"
3. Abre popup de autenticação do provider
4. Usuário autoriza o app
5. Provider retorna `access_token` ou `id_token`

**Fase 2: Envio ao Backend**
6. JavaScript envia POST para `/api/social_login.php`:
   ```
   {
     "provider": "google",
     "access_token": "ya29.a0AfH6..."
   }
   ```

**Fase 3: Validação no Backend**
7. PHP valida token com API do provider:
   - **Google:** `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=...`
   - **Facebook:** `https://graph.facebook.com/me?access_token=...`
8. Extrai informações do usuário:
   - `id`, `email`, `name`, `picture`

**Fase 4: Criar/Atualizar Usuário**
9. Busca no banco por `google_id` (ou `facebook_id`, etc.)
10. Se NÃO existe:
    - Busca por `email` (para vincular conta existente)
    - Se existe usuário com mesmo email:
      - Atualiza `google_id` (vincula)
      - Atualiza `login_method = 'google'`
    - Se NÃO existe:
      - Cria novo usuário
      - Define `google_id`, `email`, `name`
      - Define `kyc_status = 'pending'`
      - NÃO precisa senha (login social)
11. Gera JWT token
12. Retorna: `{success: true, token: "...", user: {...}, requires_kyc: true/false}`

**Fase 5: Redirecionamento**
13. JavaScript verifica `requires_kyc`
14. Se `true` → redireciona para `kyc.html`
15. Se `false` → redireciona para `dashboard.html`

**Configurações Necessárias:**

**Google OAuth:**
- Console: https://console.cloud.google.com/
- Criar projeto
- Habilitar "Google+ API"
- Criar "OAuth 2.0 Client ID"
- Tipo: Web application
- Authorized JavaScript origins: `https://seudominio.com`
- Authorized redirect URIs: `https://seudominio.com/login.html`
- Copiar **Client ID**

**Facebook Login:**
- Console: https://developers.facebook.com/
- Criar app tipo "Consumer"
- Adicionar produto "Facebook Login"
- Valid OAuth Redirect URIs: `https://seudominio.com/login.html`
- Copiar **App ID**
- Publicar app (modo "Live")

**Apple Sign In:**
- Console: https://developer.apple.com/
- Criar "Services ID"
- Identifier: `com.transkwanza.signin`
- Return URLs: `https://seudominio.com/login.html`

**Atualizar Frontend:**
- Editar `js/social-login.js`
- Inserir Client IDs nos campos de configuração

---

## 📄 SISTEMA KYC (KNOW YOUR CUSTOMER)

### Objetivo:
Verificar identidade do usuário antes de permitir transações.

### Documentos Exigidos:
1. **Tipo de documento:** RG, CPF, CNH, Passaporte
2. **Número do documento**
3. **Foto da frente do documento**
4. **Foto da selfie com o documento** (prova de vida)
5. *Opcional:* Foto do verso

### Fluxo Completo:

**Etapa 1: Upload pelo Usuário**
1. Após cadastro/login, usuário é direcionado para `kyc.html`
2. Formulário com campos:
   - Select: Tipo de documento
   - Input: Número do documento
   - File input: Foto frente (aceita JPG, PNG, PDF)
   - File input: Foto selfie
3. JavaScript (`kyc.js`) valida:
   - Arquivo máximo 5MB
   - Formatos permitidos: image/jpeg, image/png, application/pdf
   - Mostra preview da imagem antes do upload
4. Ao submeter:
   - Cria FormData com os campos
   - Envia POST multipart/form-data para `/api/kyc.php`

**Etapa 2: Processamento no Backend**
1. PHP recebe arquivos em `$_FILES`
2. Valida:
   - Tamanho (5MB max)
   - Extensão (jpg, jpeg, png, pdf)
   - MIME type correto
3. Gera nome único para cada arquivo:
   - Formato: `{user_id}_{document_type}_{timestamp}_{random}.{ext}`
   - Exemplo: `15_rg_1699999999_a1b2c3.jpg`
4. Move arquivos para `uploads/documents/`
5. Verifica documento duplicado:
   - Query: busca outros usuários com mesmo `document_number`
   - Se encontrar → cria alerta em `fraud_checks`
6. Atualiza usuário:
   - `document_type`, `document_number`
   - `document_front`, `document_selfie` (caminhos)
   - `kyc_status = 'under_review'`
7. Cria registro em `uploads` para rastreabilidade
8. Cria notificação para admins
9. Retorna: `{success: true, message: "Documentos enviados!"}`

**Etapa 3: Revisão pelo Admin**
1. Admin acessa `admin.html`
2. Clica na aba "KYC Pendente"
3. JavaScript (`admin.js`) chama `/api/admin.php?action=pending_kyc`
4. PHP retorna lista de usuários com `kyc_status = 'under_review'`:
   ```json
   {
     "success": true,
     "users": [
       {
         "id": 15,
         "name": "João Silva",
         "email": "joao@email.com",
         "document_type": "RG",
         "document_number": "12.345.678-9",
         "document_front": "uploads/documents/15_rg_...",
         "document_selfie": "uploads/documents/15_selfie_..."
       }
     ]
   }
   ```
5. Admin visualiza os documentos (imagens)
6. Decide:
   - **Aprovar:** Clica em botão "Aprovar"
   - **Rejeitar:** Clica em "Rejeitar" e informa motivo

**Etapa 4: Aprovação**
1. JavaScript envia POST para `/api/admin.php?action=approve_kyc`
   ```json
   {"user_id": 15}
   ```
2. PHP:
   - Atualiza usuário:
     - `kyc_status = 'approved'`
     - `verified = 1`
     - `kyc_reviewed_at = NOW()`
     - `kyc_reviewed_by = {admin_id}`
   - Cria notificação para o usuário:
     - type: 'kyc_approved'
     - message: "Documentos aprovados! Você já pode fazer transações."
   - Registra ação em `admin_actions`
3. Retorna: `{success: true}`
4. Usuário pode agora criar propostas e fazer transações

**Etapa 5: Rejeição**
1. JavaScript envia POST para `/api/admin.php?action=reject_kyc`
   ```json
   {
     "user_id": 15,
     "reason": "Documento ilegível"
   }
   ```
2. PHP:
   - Atualiza usuário:
     - `kyc_status = 'rejected'`
     - `kyc_rejection_reason = "{reason}"`
   - Cria notificação para o usuário
3. Usuário precisa enviar documentos novamente

---

## 🛡️ SISTEMA ANTI-FRAUDE

### Verificações Automáticas:

#### 1. Documento Duplicado
**Quando:** Upload de documento no KYC
**Lógica:**
- Query: `SELECT COUNT(*) FROM users WHERE document_number = ? AND id != ?`
- Se COUNT > 0 → documento já usado por outro usuário
- **Ação:**
  - Inserir em `fraud_checks`:
    - check_type: 'duplicate_document'
    - risk_level: 'high'
    - details: "Documento {numero} já cadastrado"
  - Aumentar `fraud_score` do usuário em +30

#### 2. Múltiplas Contas Mesmo IP
**Quando:** Cadastro ou login
**Lógica:**
- Registrar IP em `last_ip` na tabela users
- Query: `SELECT COUNT(*) FROM users WHERE last_ip = ? AND id != ?`
- Se COUNT > 3 → suspeita de múltiplas contas
- **Ação:**
  - fraud_checks: 'multiple_accounts', risk_level: 'medium'
  - fraud_score +20

#### 3. Transações de Alta Velocidade
**Quando:** Criação de transação
**Lógica:**
- Contar transações do usuário nas últimas 24h
- Query: `SELECT COUNT(*) FROM transactions WHERE sender_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
- Se COUNT > 10 → comportamento suspeito
- **Ação:**
  - fraud_checks: 'high_velocity', risk_level: 'medium'
  - fraud_score +15

#### 4. Pontuação de Fraude (Fraud Score)
**Lógica:**
- 0-30: Risco baixo (verde)
- 31-60: Risco médio (amarelo)
- 61-100: Risco alto (vermelho)
- Se fraud_score >= 80:
  - Bloquear usuário automaticamente
  - `is_blocked = 1`
  - `blocked_reason = "Pontuação de fraude muito alta"`

### Gestão de Alertas pelo Admin:

1. Admin acessa aba "Fraudes" em `admin.html`
2. Lista todos registros de `fraud_checks` onde `is_resolved = 0`
3. Admin analisa cada alerta:
   - Visualiza detalhes do usuário
   - Verifica histórico
   - Decide ação:
     - **Resolver alerta:** Marca como falso positivo
     - **Bloquear usuário:** Impede novos logins/transações
     - **Rejeitar KYC:** Se documento suspeito

---

## 🎛️ PAINEL ADMINISTRATIVO

### Funcionalidades do Admin:

#### 1. Estatísticas (Dashboard)
**Endpoint:** `/api/admin.php?action=stats`
**Retorna:**
- Total de usuários
- Usuários verificados
- KYC pendentes
- Transações pendentes
- Volume total transacionado
- Taxa arrecadada

**Query:**
```sql
SELECT
  COUNT(*) as total_users,
  SUM(verified = 1) as verified_users,
  SUM(kyc_status = 'under_review') as pending_kyc
FROM users;

SELECT COUNT(*) as pending_transactions
FROM transactions
WHERE admin_status = 'pending';
```

---

#### 2. Gerenciar KYC
**Endpoints:**
- `/api/admin.php?action=pending_kyc` - Lista usuários aguardando
- `/api/admin.php?action=approve_kyc` - Aprovar
- `/api/admin.php?action=reject_kyc` - Rejeitar

**Ações:**
- Visualizar documentos enviados
- Aprovar identidade
- Rejeitar com motivo
- Histórico de revisões

---

#### 3. Gerenciar Transações
**Endpoints:**
- `/api/admin.php?action=pending_transactions` - Lista transações
- `/api/admin.php?action=approve_transaction` - Aprovar
- `/api/admin.php?action=reject_transaction` - Rejeitar

**Lógica:**
- Todas transações iniciam com `admin_status = 'pending'`
- Admin revisa comprovante de pagamento
- Verifica dados do remetente/destinatário
- Aprova ou rejeita
- Ao aprovar:
  - `admin_status = 'approved'`
  - `status` pode avançar para 'completed'
  - Libera fundos

---

#### 4. Gerenciar Moedas
**Endpoints:**
- `/api/admin.php?action=currencies` - Lista todas
- `/api/admin.php?action=toggle_currency` - Habilitar/Desabilitar

**Lógica:**
- Admin pode desabilitar uma moeda temporariamente
- Exemplo: Se AOA (Kwanza) tiver problemas de câmbio
- Ao desabilitar:
  - `is_enabled = 0`
  - Usuários não podem criar novas propostas com AOA
  - Propostas existentes continuam ativas
- Registra em `admin_actions`:
  - action_type: 'toggle_currency'
  - details: "Desabilitou AOA - Motivo: Volatilidade"

---

#### 5. Conectar Ofertas Manualmente
**Endpoint:** `/api/admin.php?action=connect_offer`
**Uso:**
- Admin vê 2 propostas compatíveis:
  - Usuário A quer vender BRL e comprar USD
  - Usuário B quer vender USD e comprar BRL
- Admin cria transação manualmente entre eles
- Notifica ambos usuários

---

#### 6. Fazer Pagamento Direto
**Endpoint:** `/api/admin.php?action=make_payment`
**Uso:**
- Em casos especiais (reembolso, correção)
- Admin cria transação direta
- Define valores manualmente
- Isenta taxa se necessário

---

#### 7. Bloquear/Desbloquear Usuários
**Endpoints:**
- `/api/admin.php?action=block_user`
- `/api/admin.php?action=unblock_user`

**Lógica:**
- Marca `is_blocked = 1`
- Usuário não pode fazer login
- Todas propostas/transações ativas são canceladas

---

#### 8. Resolver Alertas de Fraude
**Endpoint:** `/api/admin.php?action=resolve_fraud`
**Lógica:**
- Marca alerta como `is_resolved = 1`
- Registra `resolved_by` e `resolved_at`
- Opcionalmente reduz `fraud_score` do usuário

---

## 🔄 FLUXO COMPLETO DE UMA TRANSAÇÃO P2P

### Passo 1: Criar Proposta
1. **Usuário A** (verificado) acessa dashboard
2. Clica em "Criar Proposta"
3. Preenche:
   - Tipo: "Vender"
   - Moeda origem: BRL (Real)
   - Moeda destino: AOA (Kwanza)
   - Valor: R$ 1.000,00
   - Taxa de câmbio: 1 BRL = 150 AOA
   - Método de pagamento: PIX
4. JavaScript envia POST para `/api/proposals.php?action=create`
5. PHP insere na tabela `proposals`:
   - `user_id = A`
   - `type = 'sell'`
   - `currency_from = 'BRL'`
   - `currency_to = 'AOA'`
   - `amount_from = 1000.00`
   - `amount_to = 150000.00` (1000 × 150)
   - `status = 'active'`

### Passo 2: Buscar Propostas
1. **Usuário B** acessa dashboard
2. Filtra propostas:
   - Moeda origem: AOA
   - Moeda destino: BRL
3. JavaScript chama `/api/proposals.php?action=search`
4. PHP retorna propostas ativas que combinam
5. Usuário B vê a proposta do Usuário A

### Passo 3: Aceitar Proposta
1. Usuário B clica em "Aceitar Proposta"
2. JavaScript envia POST para `/api/proposals.php?action=accept`
3. PHP:
   - Cria registro em `transactions`:
     - `proposal_id`
     - `sender_id = A`
     - `receiver_id = B`
     - `sender_amount = 1000.00`
     - `receiver_amount = 150000.00`
     - `fee_percentage = 3` (taxa da plataforma)
     - `fee_amount = 30.00` (3% de 1000)
     - `status = 'pending'`
     - `admin_status = 'pending'`
   - Atualiza proposta: `status = 'completed'`
   - Cria notificações para A e B

### Passo 4: Pagamento
1. **Usuário A** recebe notificação
2. Acessa detalhes da transação
3. Vê dados de pagamento do Usuário B (PIX, conta bancária)
4. Faz transferência de R$ 1.000,00
5. Faz upload do comprovante:
   - JavaScript envia para `/api/upload.php?type=payment_proof`
   - Arquivo salvo em `uploads/payment_proofs/`
6. Marca transação como "Pago":
   - `status = 'paid'`

### Passo 5: Confirmação
1. **Usuário B** recebe notificação
2. Verifica que recebeu R$ 1.000,00 na conta
3. Confirma recebimento:
   - `status = 'confirmed'`

### Passo 6: Aprovação Admin
1. **Admin** acessa painel
2. Aba "Transações Pendentes"
3. Vê a transação com:
   - Dados de A e B
   - Comprovante de pagamento
4. Analisa comprovante
5. Aprova:
   - JavaScript chama `/api/admin.php?action=approve_transaction`
   - `admin_status = 'approved'`
   - `status = 'completed'`

### Passo 7: Finalização
1. PHP executa:
   - Atualiza `completed_at = NOW()`
   - Incrementa `total_transactions` de A e B
   - Cria notificações de conclusão
   - Solicita avaliação mútua
2. **Usuário B** agora deve pagar Kz 150.000,00 ao Usuário A
3. Após pagamento, transação está completa
4. Sistema de avaliação é ativado

### Passo 8: Avaliação
1. A e B avaliam um ao outro (1-5 estrelas)
2. Comentários opcionais
3. Atualiza `reputation` de ambos
4. Registro em tabela `ratings`

---

## 🎨 DESIGN E UX

### Estilo Visual: Glassmorphism
**Características:**
- Fundo com gradiente
- Cards semi-transparentes com backdrop-blur
- Bordas sutis com border-radius
- Sombras suaves (box-shadow)
- Efeito de vidro fosco

**Implementação CSS:**
```
Fundo: linear-gradient com cores suaves
Cards: background rgba(255,255,255,0.1)
Blur: backdrop-filter: blur(10px)
Bordas: border 1px solid rgba(255,255,255,0.2)
Sombras: box-shadow 0 8px 32px rgba(0,0,0,0.1)
```

### Cores do Sistema:
- **Primária:** Azul (#3498db, #2980b9)
- **Secundária:** Verde (#2ecc71) - sucesso
- **Erro:** Vermelho (#e74c3c)
- **Aviso:** Amarelo (#f39c12)
- **Neutro:** Cinza (#95a5a6, #7f8c8d)

### Tipografia:
- **Família:** Inter, Poppins, ou Roboto (Google Fonts)
- **Títulos:** 24-32px, weight 600-700
- **Corpo:** 14-16px, weight 400
- **Botões:** 14px, weight 500, uppercase

### Responsividade:
- **Desktop:** 1200px+
- **Tablet:** 768px - 1199px
- **Mobile:** até 767px
- Usar CSS Grid e Flexbox
- Media queries para breakpoints

### Componentes Reutilizáveis:

1. **Notification System (NotificationUtil)**
   - Toast messages no canto superior direito
   - 3 tipos: success (verde), error (vermelho), info (azul)
   - Auto-close após 4 segundos
   - Animação de slide-in

2. **Loading Spinner**
   - Exibir durante requisições AJAX
   - Overlay com fundo escuro semi-transparente
   - Spinner SVG ou CSS animation

3. **Modal/Dialog**
   - Confirmar ações (deletar, bloquear)
   - Exibir detalhes
   - Fundo escuro overlay
   - Fechar ao clicar fora ou no X

4. **Cards de Proposta**
   - Mostra moedas, valores, taxa
   - Badge de status (ativa, pausada)
   - Botão de ação (aceitar, editar, deletar)

5. **Tabelas Responsivas**
   - Em mobile, transformar em cards
   - Ordenação por coluna
   - Paginação

---

## 🔌 APIs E ENDPOINTS

### Estrutura de Resposta Padrão:
```json
// Sucesso
{
  "success": true,
  "data": {...},
  "message": "Operação realizada com sucesso"
}

// Erro
{
  "success": false,
  "error": "Mensagem de erro",
  "code": 400
}
```

### /api/auth.php
**GET ?action=check**
- Verifica se token JWT é válido
- Retorna dados do usuário logado

**POST ?action=register**
- Body: {name, email, password, country, phone}
- Cria usuário
- Retorna token + usuário

**POST ?action=login**
- Body: {email, password}
- Valida credenciais
- Retorna token + usuário

**POST ?action=logout**
- Invalida token (se usando blacklist)

---

### /api/social_login.php
**POST ?provider=google**
- Body: {access_token}
- Valida token com Google API
- Cria/atualiza usuário
- Retorna token + usuário

**POST ?provider=facebook**
- Body: {access_token}
- Valida token com Facebook Graph API
- Retorna token + usuário

**POST ?provider=instagram**
- Body: {access_token}
- Usa Facebook Graph API
- Retorna token + usuário

**POST ?provider=apple**
- Body: {id_token}
- Valida token com Apple API
- Retorna token + usuário

---

### /api/kyc.php
**POST /**
- Headers: Authorization Bearer {token}
- Body: FormData (multipart/form-data)
  - document_type
  - document_number
  - document_front (file)
  - document_selfie (file)
- Faz upload de documentos
- Atualiza kyc_status
- Retorna sucesso

**GET ?action=status**
- Retorna status do KYC do usuário logado

---

### /api/admin.php
**Autenticação:** Todas requerem `is_admin = 1`

**GET ?action=stats**
- Retorna estatísticas do sistema

**GET ?action=pending_kyc**
- Lista usuários com kyc_status='under_review'

**POST ?action=approve_kyc**
- Body: {user_id}
- Aprova KYC

**POST ?action=reject_kyc**
- Body: {user_id, reason}
- Rejeita KYC

**GET ?action=pending_transactions**
- Lista transações com admin_status='pending'

**POST ?action=approve_transaction**
- Body: {transaction_id}
- Aprova transação

**POST ?action=reject_transaction**
- Body: {transaction_id, reason}
- Rejeita transação

**GET ?action=currencies**
- Lista todas moedas

**POST ?action=toggle_currency**
- Body: {code, enable: true/false}
- Habilita/desabilita moeda

**POST ?action=connect_offer**
- Body: {proposal_id_1, proposal_id_2}
- Conecta 2 propostas manualmente

**POST ?action=make_payment**
- Body: {sender_id, receiver_id, amount, currency}
- Cria pagamento direto

**POST ?action=block_user**
- Body: {user_id, reason}
- Bloqueia usuário

**POST ?action=unblock_user**
- Body: {user_id}
- Desbloqueia usuário

**GET ?action=fraud_alerts**
- Lista alertas de fraude não resolvidos

**POST ?action=resolve_fraud**
- Body: {fraud_id}
- Marca alerta como resolvido

---

### /api/proposals.php
**GET ?action=search**
- Params: currency_from, currency_to, min_amount, max_amount
- Retorna propostas ativas

**POST ?action=create**
- Body: {type, currency_from, currency_to, amount_from, exchange_rate, payment_method}
- Cria proposta

**POST ?action=accept**
- Body: {proposal_id}
- Aceita proposta e cria transação

**PUT ?action=update**
- Body: {proposal_id, ...campos}
- Atualiza proposta

**DELETE ?action=delete**
- Body: {proposal_id}
- Deleta proposta

---

### /api/upload.php
**POST ?type=avatar**
- Body: FormData com arquivo
- Faz upload de foto de perfil
- Retorna URL

**POST ?type=payment_proof**
- Body: FormData com arquivo
- Faz upload de comprovante
- Retorna URL

---

## 🔒 SEGURANÇA

### 1. Senhas
- **Hash:** bcrypt (password_hash() com PASSWORD_BCRYPT)
- **Salt:** Gerado automaticamente pelo bcrypt
- **Rounds:** 10 (padrão)
- **Nunca** armazenar senha em texto plano

### 2. JWT (JSON Web Tokens)
- **Estrutura:** {header}.{payload}.{signature}
- **Payload:** {user_id, email, exp}
- **Expiração:** 7 dias
- **Secret:** String aleatória de 64+ caracteres
- **Validação:** Verificar assinatura e expiração em toda requisição

### 3. SQL Injection
- **PDO Prepared Statements:** Sempre usar placeholders (?)
- **Nunca** concatenar variáveis em queries
- Exemplo seguro:
  ```
  $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
  $stmt->execute([$email]);
  ```

### 4. XSS (Cross-Site Scripting)
- **Frontend:** Usar textContent em vez de innerHTML quando possível
- **Backend:** Sanitizar inputs com htmlspecialchars()
- **Headers:** Content-Security-Policy

### 5. CSRF (Cross-Site Request Forgery)
- **Tokens CSRF:** Gerar token único por sessão
- **SameSite Cookies:** Configurar cookies com SameSite=Strict

### 6. Upload de Arquivos
- **Validação de tipo:** Verificar MIME type E extensão
- **Tamanho máximo:** 5MB
- **Rename:** Sempre renomear arquivos (não confiar no nome original)
- **Pasta segura:** Armazenar fora de public_html se possível
- **Permissões:** 644 para arquivos, 755 para pastas

### 7. HTTPS
- **Obrigatório:** Forçar HTTPS via .htaccess
- **HSTS:** Header Strict-Transport-Security
- **SSL:** Let's Encrypt (gratuito)

### 8. CORS
- **Headers:**
  - Access-Control-Allow-Origin: * (desenvolvimento) ou domínio específico (produção)
  - Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  - Access-Control-Allow-Headers: Content-Type, Authorization

### 9. Rate Limiting
- Limitar requisições por IP
- Exemplo: 100 requests por 15 minutos
- Implementar com Redis ou banco de dados

### 10. Logs e Auditoria
- Registrar todas ações sensíveis em `activity_log`
- Logar tentativas de login falhas
- Monitorar padrões suspeitos

---

## 📱 RESPONSIVIDADE

### Breakpoints:
```
Mobile: até 576px
Tablet: 577px - 992px
Desktop: 993px+
```

### Estratégia:
1. **Mobile First:** Desenvolver para mobile primeiro
2. **Media Queries:** Adicionar estilos para telas maiores
3. **Flexbox/Grid:** Layout flexível
4. **Viewport Meta:** `<meta name="viewport" content="width=device-width, initial-scale=1">`

### Adaptações:
- **Tabelas:** Transformar em cards verticais no mobile
- **Navegação:** Menu hamburger no mobile
- **Formulários:** Campos 100% width no mobile
- **Botões:** Tamanho mínimo 44x44px (touch friendly)
- **Imagens:** max-width: 100%, height: auto

---

## 🚀 DEPLOY NO HOSTINGER

### Pré-requisitos:
1. Conta Hostinger ativa
2. Domínio configurado
3. Banco MySQL criado
4. SSL ativo

### Passos:

1. **Criar Banco de Dados:**
   - cPanel → MySQL Databases
   - Criar banco: `u442547792_transkwanza`
   - Criar usuário: `u442547792_admin`
   - Senha: `Life0852new2580!`
   - Adicionar usuário ao banco (All Privileges)
   - phpMyAdmin → Importar `production_schema.sql`

2. **Upload de Arquivos:**
   - Via File Manager ou FTP
   - Enviar todos arquivos para `public_html/`
   - Manter estrutura de pastas

3. **Configurar Permissões:**
   - `uploads/` → 755 (recursivo)
   - Arquivos PHP → 644
   - Pastas → 755

4. **Ativar SSL:**
   - Hostinger → SSL → Instalar SSL gratuito
   - Aguardar propagação (5-10min)

5. **Configurar .htaccess:**
   - Forçar HTTPS
   - Aumentar limites de upload
   - Proteger arquivos sensíveis

6. **Inserir Dados Iniciais:**
   - 9 moedas (INSERT em `currencies`)
   - Usuário admin (INSERT em `users`)

7. **Configurar OAuth:**
   - Google Cloud Console → Criar projeto
   - Facebook Developers → Criar app
   - Atualizar Client IDs em `js/social-login.js`

8. **Testar:**
   - Conexão com banco (`test_conexao.php`)
   - Login admin
   - Upload de documentos
   - APIs funcionando

---

## 🧪 TESTES

### Testes Manuais Essenciais:

1. **Autenticação:**
   - Cadastro com email/senha
   - Login com email/senha
   - Login com Google
   - Login com Facebook
   - Logout

2. **KYC:**
   - Upload de documentos
   - Validação de tamanho/tipo
   - Aprovação pelo admin
   - Rejeição pelo admin

3. **Propostas:**
   - Criar proposta de venda
   - Criar proposta de compra
   - Buscar propostas
   - Aceitar proposta

4. **Transações:**
   - Fluxo completo de transação
   - Upload de comprovante
   - Confirmação
   - Aprovação admin

5. **Admin:**
   - Acesso ao painel
   - Estatísticas
   - Gerenciar KYC
   - Gerenciar transações
   - Habilitar/desabilitar moedas
   - Alertas de fraude

6. **Segurança:**
   - Tentar acessar admin sem permissão
   - Upload de arquivo inválido
   - SQL injection básico (deve falhar)
   - XSS básico (deve falhar)

---

## 📊 MÉTRICAS E MONITORAMENTO

### KPIs do Sistema:
- Total de usuários registrados
- Taxa de verificação KYC (aprovados/total)
- Número de transações por dia
- Volume transacionado por moeda
- Taxa média de câmbio
- Taxa de fraude detectada
- Tempo médio de aprovação KYC
- Tempo médio de aprovação de transação

### Logs a Manter:
- Logins (sucesso e falha)
- Cadastros
- Uploads de documentos
- Transações criadas
- Transações completadas
- Ações administrativas
- Alertas de fraude
- Erros do sistema

---

## 🔄 MELHORIAS FUTURAS

### Fase 2:
1. **Gateway de Pagamento:**
   - Integrar Stripe/PayPal
   - Processar pagamentos diretos na plataforma
   - Escrow (custódia de valores)

2. **Chat em Tempo Real:**
   - WebSocket para mensagens instantâneas
   - Notificações push

3. **App Mobile:**
   - React Native ou Flutter
   - Mesmas APIs

4. **Sistema de Reputação:**
   - Badges de confiabilidade
   - Usuários verificados (selo azul)
   - Histórico de transações

5. **Múltiplos Idiomas:**
   - i18n (internacionalização)
   - Português, Inglês, Francês, Russo

6. **Taxa Dinâmica:**
   - Integrar API de câmbio real (exchangerate-api.com)
   - Atualizar taxas a cada hora

7. **Verificação 2FA:**
   - Autenticação de dois fatores
   - SMS ou Google Authenticator

8. **Relatórios Avançados:**
   - Gráficos de volume
   - Exportar em PDF/Excel
   - Análise de tendências

---

## 📝 CHECKLIST DE RECRIAÇÃO

### Etapa 1: Estrutura Base
- [ ] Criar pasta do projeto
- [ ] Criar estrutura de arquivos (HTML, CSS, JS, API)
- [ ] Configurar .htaccess
- [ ] Criar arquivo de configuração (config.php)

### Etapa 2: Banco de Dados
- [ ] Criar banco MySQL no Hostinger
- [ ] Criar schema das 11 tabelas
- [ ] Definir relacionamentos (Foreign Keys)
- [ ] Criar índices
- [ ] Inserir 9 moedas
- [ ] Criar usuário admin inicial

### Etapa 3: Backend (APIs)
- [ ] config.php (conexão PDO, JWT, CORS)
- [ ] auth.php (login/cadastro tradicional)
- [ ] social_login.php (OAuth)
- [ ] kyc.php (upload de documentos)
- [ ] admin.php (todas ações admin)
- [ ] upload.php (handler genérico)
- [ ] proposals.php (CRUD de propostas)

### Etapa 4: Frontend - Estrutura
- [ ] index.html (landing page)
- [ ] login.html (formulário de login)
- [ ] cadastro.html (formulário de registro)
- [ ] dashboard.html (painel do usuário)
- [ ] kyc.html (upload de documentos)
- [ ] admin.html (painel administrativo)

### Etapa 5: Frontend - Estilos
- [ ] style.css (global + glassmorphism)
- [ ] auth.css (login/cadastro)
- [ ] dashboard.css (dashboard)
- [ ] theme.css (variáveis de cor)
- [ ] Responsividade mobile

### Etapa 6: Frontend - JavaScript
- [ ] main.js (NotificationUtil, utilitários)
- [ ] auth.js (lógica login/cadastro)
- [ ] social-login.js (OAuth SDKs)
- [ ] kyc.js (upload + validação)
- [ ] admin.js (painel admin)
- [ ] dashboard.js (dashboard usuário)
- [ ] currency.js (cálculos de câmbio)

### Etapa 7: Integrações
- [ ] Configurar Google OAuth (Client ID)
- [ ] Configurar Facebook Login (App ID)
- [ ] Configurar Apple Sign In
- [ ] Atualizar social-login.js com credenciais

### Etapa 8: Upload e Deploy
- [ ] Criar pastas uploads/ (4 subpastas)
- [ ] Configurar permissões (755)
- [ ] Upload via FTP/File Manager
- [ ] Ativar SSL/HTTPS
- [ ] Testar conexão com banco
- [ ] Testar login admin

### Etapa 9: Testes
- [ ] Testar cadastro/login tradicional
- [ ] Testar login social (Google, Facebook)
- [ ] Testar upload de documentos KYC
- [ ] Testar aprovação/rejeição pelo admin
- [ ] Testar criação de propostas
- [ ] Testar fluxo completo de transação
- [ ] Testar sistema anti-fraude
- [ ] Testar em mobile

### Etapa 10: Segurança Final
- [ ] Deletar arquivos de teste
- [ ] Desabilitar erros PHP em produção
- [ ] Configurar rate limiting
- [ ] Revisar permissões de arquivos
- [ ] Verificar HTTPS funcionando
- [ ] Backup do banco de dados

---

## 🎯 INSTRUÇÕES PARA NOVA CONVERSA COM CLAUDE CODE

Quando iniciar uma nova conversa para recriar o sistema, siga este roteiro:

### 1. Apresentação do Projeto
```
Olá! Preciso criar um sistema P2P de remessas internacionais chamado TransKwanza.
Tenho um documento completo com toda a arquitetura (TranskwanzaStepByStep.md).

Especificações:
- Stack: HTML/CSS/JS + PHP + MySQL
- 9 países/moedas suportados
- Login tradicional + OAuth (Google/Facebook/Instagram/Apple)
- Sistema KYC com upload de documentos
- Painel administrativo
- Sistema anti-fraude
- Deploy: Hostinger

Vamos criar etapa por etapa, começando pelo banco de dados.
```

### 2. Solicitar Criação do Banco
```
Etapa 1: Banco de Dados

Crie o schema completo do MySQL com 11 tabelas:
1. users (com campos de social login e KYC)
2. currencies (9 moedas pré-cadastradas)
3. proposals
4. transactions
5. uploads
6. fraud_checks
7. messages
8. ratings
9. notifications
10. activity_log
11. admin_actions

Use as credenciais:
- Database: u442547792_transkwanza
- Username: u442547792_admin
- Password: Life0852new2580!

Inclua foreign keys, índices e os INSERTs iniciais das 9 moedas e do admin.
```

### 3. Criar Backend
```
Etapa 2: Backend (APIs em PHP)

Crie os seguintes arquivos na pasta api/:

1. config.php
   - Conexão PDO com MySQL
   - Configuração JWT
   - Headers CORS
   - Funções auxiliares

2. auth.php
   - Login/cadastro tradicional
   - Validação com bcrypt
   - Geração de JWT

3. social_login.php
   - Validação de tokens OAuth
   - Integração Google, Facebook, Instagram, Apple
   - Criação/atualização de usuário

4. kyc.php
   - Upload de documentos (FormData)
   - Validação de tipo/tamanho
   - Detecção de duplicados
   - Atualização de kyc_status

5. admin.php
   - Todas as ações do painel admin
   - Estatísticas, aprovação KYC/transações, etc.

6. upload.php
   - Handler genérico de upload

7. proposals.php
   - CRUD de propostas de câmbio
```

### 4. Criar Frontend - HTML
```
Etapa 3: Páginas HTML

Crie os arquivos HTML com estrutura semântica:

1. index.html - Landing page
2. login.html - Formulário de login + botões social
3. cadastro.html - Formulário de registro + botões social
4. dashboard.html - Dashboard do usuário
5. kyc.html - Upload de documentos (3 campos de arquivo)
6. admin.html - Painel admin com 5 abas (Stats, KYC, Transactions, Currencies, Fraud)

Use Font Awesome 6.4.0 para ícones.
```

### 5. Criar Frontend - CSS
```
Etapa 4: Estilos CSS

Crie os arquivos de estilo:

1. style.css
   - Reset CSS
   - Estilos globais
   - Glassmorphism design (backdrop-blur, transparência)
   - Layout responsivo

2. auth.css
   - Estilos de login/cadastro
   - Botões de social login

3. dashboard.css
   - Layout do dashboard
   - Cards de propostas

4. theme.css
   - Variáveis CSS (cores, fontes)
   - Suporte dark/light mode

Paleta de cores:
- Primária: #3498db
- Sucesso: #2ecc71
- Erro: #e74c3c
```

### 6. Criar Frontend - JavaScript
```
Etapa 5: Lógica JavaScript

Crie os módulos JS:

1. main.js
   - NotificationUtil (toast messages)
   - Funções auxiliares globais

2. auth.js
   - Lógica de login/cadastro tradicional
   - Fetch API para /api/auth.php

3. social-login.js
   - Carregar SDKs (Google, Facebook, Apple)
   - Callbacks de autenticação
   - Envio de tokens para backend
   - Redirecionamento baseado em kyc_status

4. kyc.js
   - Validação de arquivos (5MB, JPG/PNG/PDF)
   - Preview de imagens
   - FormData upload para /api/kyc.php

5. admin.js
   - Tabs do painel admin
   - Funções de aprovar/rejeitar KYC
   - Funções de aprovar/rejeitar transações
   - Toggle de moedas

6. dashboard.js
   - Exibir propostas
   - Criar/editar propostas
   - Aceitar propostas

Use ES6+ (async/await, arrow functions, template literals).
```

### 7. Configurar OAuth
```
Etapa 6: Integração OAuth

1. Google:
   - Vou criar o projeto no Google Cloud Console
   - Você me ensina onde inserir o Client ID em social-login.js

2. Facebook:
   - Vou criar o app no Facebook Developers
   - Você me ensina onde inserir o App ID

Aguarde que vou configurar e te passo as credenciais.
```

### 8. Deploy
```
Etapa 7: Deploy no Hostinger

1. Crie estrutura de pastas completa
2. Inclua .htaccess com:
   - Force HTTPS
   - Upload limits
   - Proteção de arquivos sensíveis

3. Crie pastas uploads/ com permissão 755:
   - uploads/documents/
   - uploads/avatars/
   - uploads/payment_proofs/
   - uploads/temp/

Vou fazer upload via File Manager.
```

### 9. Teste
```
Etapa 8: Testes

Crie um arquivo test_conexao.php para testar:
- Conexão com MySQL
- Verificar se admin existe
- Verificar se 9 moedas estão inseridas

Depois vamos testar:
1. Login admin
2. Painel admin
3. Upload KYC
4. Aprovação KYC
```

---

## 💡 DICAS IMPORTANTES

### Para o Claude Code:
1. **Seja específico:** Sempre cite qual etapa você está (ex: "Etapa 2: Backend")
2. **Um arquivo por vez:** Peça para criar 1-2 arquivos por mensagem
3. **Revise antes de prosseguir:** Teste cada componente antes de avançar
4. **Use o blueprint:** Referencie este documento sempre que tiver dúvida
5. **Pergunte quando necessário:** Se algo não ficar claro, peça esclarecimentos

### Ordem Recomendada:
1. Banco de dados (foundation)
2. Backend config.php (conexão)
3. Backend auth.php (essencial)
4. Frontend login.html + auth.js (testar login)
5. Backend kyc.php
6. Frontend kyc.html + kyc.js (testar upload)
7. Backend admin.php
8. Frontend admin.html + admin.js (testar painel)
9. Social login (por último, pois depende de config externa)

### Troubleshooting:
- **Erro 500:** Verificar logs PHP no Hostinger
- **CORS:** Verificar headers em config.php
- **Upload falha:** Verificar permissões 755
- **Login não funciona:** Verificar senha bcrypt e JWT

---

## ✅ CONCLUSÃO

Este documento contém **TUDO** necessário para recriar o TransKwanza do zero:

- ✅ Arquitetura completa (11 tabelas, 7 APIs, 10+ páginas)
- ✅ Tecnologias e decisões de design
- ✅ Fluxos de dados detalhados
- ✅ Especificações de segurança
- ✅ Instruções de deploy
- ✅ Roteiro para conversa com Claude Code

**Use este documento como sua "bíblia" de desenvolvimento.**

Boa sorte na recriação! 🚀

---

**Última atualização:** 2024-11-15
**Versão:** 1.0
**Autor:** Claude Code Assistant
