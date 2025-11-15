# ✅ Próximos Passos - Hostinger

## Banco de Dados Configurado

**Status:** ✅ Banco de dados criado com 11 tabelas
**Nome:** u442547792_transkwanza
**Usuário:** u442547792_admin
**Senha:** Life0852new2580!

---

## Passo 1: Upload dos Arquivos para Hostinger

### 1.1 Estrutura de Pastas no Hostinger

Você precisa fazer upload de TODOS os arquivos para o `public_html` (ou a pasta do seu domínio):

```
public_html/
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
│   └── (todos os arquivos CSS)
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
│   ├── config.php ✅ (já configurado)
│   ├── social_login.php
│   ├── kyc.php
│   ├── admin.php
│   └── upload.php
├── uploads/
│   ├── documents/
│   ├── avatars/
│   ├── payment_proofs/
│   └── temp/
└── database/
    └── production_schema.sql
```

### 1.2 Como Fazer Upload

**Opção A - File Manager (Gerenciador de Arquivos):**
1. Acesse o painel da Hostinger
2. Vá em **"Arquivos" → "Gerenciador de Arquivos"**
3. Navegue até `public_html`
4. Clique em **"Upload"** e envie TODOS os arquivos mantendo a estrutura de pastas

**Opção B - FTP (Recomendado para muitos arquivos):**
1. Use um cliente FTP como FileZilla
2. Conecte usando as credenciais FTP da Hostinger
3. Arraste e solte todos os arquivos para `public_html`

---

## Passo 2: Configurar Permissões das Pastas de Upload

No **Gerenciador de Arquivos** da Hostinger, configure as permissões:

1. Clique com botão direito na pasta `uploads/`
2. Selecione **"Permissões"**
3. Defina como **755** (rwxr-xr-x)
4. Marque **"Aplicar a subpastas"**
5. Confirmar

**Pastas que precisam de permissão 755:**
- `uploads/`
- `uploads/documents/`
- `uploads/avatars/`
- `uploads/payment_proofs/`
- `uploads/temp/`

---

## Passo 3: Configurar Login Social (OAuth)

### 3.1 Google OAuth

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto: **"TransKwanza"**
3. Vá em **"APIs & Services" → "Credentials"**
4. Clique em **"Create Credentials" → "OAuth client ID"**
5. Tipo: **Web application**
6. **Authorized JavaScript origins:**
   ```
   https://seudominio.com
   ```
7. **Authorized redirect URIs:**
   ```
   https://seudominio.com/login.html
   https://seudominio.com/cadastro.html
   ```
8. Copie o **Client ID** (exemplo: `123456789-abc.apps.googleusercontent.com`)

### 3.2 Facebook Login

1. Acesse: https://developers.facebook.com/
2. Vá em **"Meus Apps" → "Criar App"**
3. Tipo: **"Consumidor"**
4. Nome: **"TransKwanza"**
5. Em **"Facebook Login" → "Configurações"**:
   - **Valid OAuth Redirect URIs:**
     ```
     https://seudominio.com/login.html
     https://seudominio.com/cadastro.html
     ```
6. Copie o **App ID** (exemplo: `1234567890123456`)

### 3.3 Instagram (usa a API do Facebook)

Instagram usa o mesmo App ID do Facebook. Não precisa configuração separada para login básico.

### 3.4 Apple Sign In

1. Acesse: https://developer.apple.com/account/
2. Vá em **"Certificates, IDs & Profiles"**
3. Crie um **"Services ID"**
4. Identifier: `com.transkwanza.signin`
5. Configure as **Return URLs:**
   ```
   https://seudominio.com/login.html
   https://seudominio.com/cadastro.html
   ```

### 3.5 Atualizar js/social-login.js

Edite o arquivo `js/social-login.js` (linhas 11-17) com suas credenciais:

```javascript
config: {
    google: {
        clientId: 'SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
    },
    facebook: {
        appId: 'SEU_FACEBOOK_APP_ID'
    },
    apple: {
        clientId: 'com.transkwanza.signin',
        redirectURI: 'https://seudominio.com/login.html'
    }
}
```

**⚠️ IMPORTANTE:** Substitua `SEU_GOOGLE_CLIENT_ID` e `SEU_FACEBOOK_APP_ID` pelas suas credenciais reais.

---

## Passo 4: Configurar SSL/HTTPS

**OBRIGATÓRIO para login social funcionar!**

1. No painel Hostinger, vá em **"SSL"**
2. Ative o **SSL gratuito** para seu domínio
3. Certifique-se que está ativo (cadeado verde)
4. Force HTTPS no `.htaccess`:

Crie/edite o arquivo `public_html/.htaccess`:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# PHP Configuration
php_value upload_max_filesize 10M
php_value post_max_size 10M
php_value max_execution_time 300
```

---

## Passo 5: Testar o Sistema

### 5.1 Teste de Banco de Dados

Crie um arquivo `public_html/test_db.php`:

```php
<?php
require_once 'api/config.php';

try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $result = $stmt->fetch();
    echo json_encode([
        'status' => 'success',
        'message' => 'Conexão OK!',
        'total_users' => $result['total']
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
```

Acesse: `https://seudominio.com/test_db.php`

**Resultado esperado:**
```json
{
  "status": "success",
  "message": "Conexão OK!",
  "total_users": 0
}
```

**✅ Se der erro**, verifique as credenciais no `api/config.php`.

### 5.2 Criar Primeiro Usuário Admin

No **phpMyAdmin** da Hostinger:

1. Selecione o banco `u442547792_transkwanza`
2. Clique na tabela `users`
3. Clique em **"Inserir"**
4. Preencha:

```sql
INSERT INTO users (name, email, password, is_admin, verified, kyc_status, created_at)
VALUES (
    'Admin TransKwanza',
    'admin@transkwanza.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1,
    1,
    'approved',
    NOW()
);
```

**Senha padrão:** `password`
(Mude depois no painel admin!)

### 5.3 Testar Login

1. Acesse: `https://seudominio.com/login.html`
2. Login: `admin@transkwanza.com`
3. Senha: `password`
4. Deve redirecionar para o **Dashboard**

### 5.4 Testar Painel Admin

1. Acesse: `https://seudominio.com/admin.html`
2. Deve mostrar as estatísticas
3. Teste as abas: KYC, Transações, Moedas, Fraudes

### 5.5 Testar Login Social

1. Vá em: `https://seudominio.com/cadastro.html`
2. Clique em **"Continuar com Google"**
3. Faça login com sua conta Google
4. Deve criar o usuário e redirecionar para **KYC**

### 5.6 Testar KYC

1. Após login social, você estará em: `https://seudominio.com/kyc.html`
2. Preencha os dados:
   - Tipo de documento: RG
   - Número: 123456789
   - Upload foto frente do documento
   - Upload selfie
3. Clique em **"Enviar Documentos"**
4. Deve mostrar: **"Documentos enviados! Aguarde aprovação."**

### 5.7 Testar Aprovação de KYC

1. Como admin, vá em: `https://seudominio.com/admin.html`
2. Clique na aba **"KYC Pendente"**
3. Deve aparecer o usuário que enviou documentos
4. Clique em **"Aprovar"**
5. O usuário poderá fazer transações

---

## Passo 6: Inserir Moedas e Taxas

No **phpMyAdmin**, insira as 9 moedas suportadas:

```sql
INSERT INTO currencies (code, name, symbol, country, is_enabled) VALUES
('BRL', 'Real Brasileiro', 'R$', 'BR', 1),
('AOA', 'Kwanza Angolano', 'Kz', 'AO', 1),
('EUR', 'Euro', '€', 'PT', 1),
('USD', 'Dólar Americano', '$', 'US', 1),
('CUP', 'Peso Cubano', '$', 'CU', 1),
('RUB', 'Rublo Russo', '₽', 'RU', 1),
('ZAR', 'Rand Sul-Africano', 'R', 'ZA', 1),
('NAD', 'Dólar Namíbio', '$', 'NA', 1),
('MZN', 'Metical Moçambicano', 'MT', 'MZ', 1);
```

---

## Passo 7: Segurança Final

### 7.1 Proteger Arquivos Sensíveis

Edite `.htaccess` e adicione:

```apache
# Proteger arquivos de banco de dados
<Files "production_schema.sql">
    Order Allow,Deny
    Deny from all
</Files>

# Proteger arquivos de configuração
<Files "config.php">
    Order Allow,Deny
    Deny from all
</Files>

# Permitir apenas acesso via PHP aos arquivos da API
<FilesMatch "\.(php)$">
    Order Allow,Deny
    Allow from all
</FilesMatch>
```

### 7.2 Deletar Arquivo de Teste

```bash
rm public_html/test_db.php
```

### 7.3 Desabilitar Erros em Produção

No `api/config.php`, adicione no topo (após `<?php`):

```php
// Desabilitar exibição de erros em produção
error_reporting(0);
ini_set('display_errors', 0);
```

---

## ✅ Checklist Final

- [ ] Todos os arquivos enviados para Hostinger
- [ ] Permissões das pastas `uploads/` = 755
- [ ] SSL/HTTPS ativado
- [ ] `.htaccess` configurado
- [ ] Google OAuth configurado
- [ ] Facebook OAuth configurado
- [ ] `js/social-login.js` atualizado com Client IDs
- [ ] Teste de conexão com banco de dados OK
- [ ] Usuário admin criado
- [ ] Login testado com sucesso
- [ ] Painel admin funcionando
- [ ] Login social testado
- [ ] KYC testado
- [ ] Moedas inseridas no banco
- [ ] Arquivo `test_db.php` deletado
- [ ] Erros PHP desabilitados

---

## 🚀 Sistema Pronto!

Após completar todos os passos, seu sistema TransKwanza estará **100% funcional** em produção com:

✅ Login tradicional (email/senha)
✅ Login social (Google, Facebook, Instagram, Apple)
✅ Sistema KYC com upload de documentos
✅ Painel administrativo completo
✅ Aprovação manual de transações
✅ Gerenciamento de moedas
✅ Sistema anti-fraude
✅ Segurança robusta

---

## 📞 Suporte

Se encontrar algum erro, verifique:

1. **Logs de erro PHP:** Hostinger → Arquivos → Logs
2. **Console do navegador:** F12 → Console
3. **Network:** F12 → Network (veja se as chamadas `/api/` retornam 200)

**Erros comuns:**

- **500 Internal Server Error:** Verifique permissões e credenciais do banco
- **CORS Error:** Verifique headers no `api/config.php`
- **Login social não funciona:** Verifique SSL e credenciais OAuth
- **Upload falha:** Verifique permissões da pasta `uploads/`
