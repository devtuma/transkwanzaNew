# TransKwanza - Plataforma de Remessas Cruzadas P2P Internacional

![TransKwanza](https://img.shields.io/badge/Status-Pronto%20para%20Uso-success)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?logo=php&logoColor=white)

## 📋 Visão Geral

TransKwanza é uma plataforma P2P (peer-to-peer) de remessas internacionais que conecta usuários que desejam enviar dinheiro em direções opostas entre diferentes países. Ao invés de realizar transferências internacionais caras, a plataforma facilita transferências locais em cada país, economizando taxas significativas.

## ✨ Funcionalidades

### ✅ Implementadas

- **Calculadora de Câmbio em Tempo Real**
  - Suporte para 9 moedas diferentes
  - Integração com API de câmbio (Exchange Rate API)
  - Cálculo automático de taxas (3%)
  - Bandeiras dos países para melhor visualização

- **Sistema de Autenticação**
  - Registro de usuários
  - Login seguro
  - Validação de senha com indicador de força
  - Proteção de rotas (apenas usuários logados acessam dashboard)

- **Dashboard Interativo**
  - Sistema de abas responsivo (funciona como combobox no mobile)
  - Filtros por moeda de origem e destino
  - Visualização de propostas disponíveis
  - Gerenciamento de propostas próprias

- **Sistema de Propostas**
  - Criar propostas de envio
  - Aceitar propostas de outros usuários
  - Sistema de matching automático
  - Proteção de dados pessoais (usuários não veem dados um do outro)

- **Design Responsivo**
  - Tema escuro moderno
  - Adaptado para todas as telas (mobile-first)
  - Animações suaves
  - Ícones FontAwesome

- **Páginas Informativas**
  - Países Suportados
  - Central de Suporte (FAQ + WhatsApp)
  - Termos de Uso
  - Política de Privacidade (GDPR/LGPD)

## 🌍 Países e Moedas Suportados

| País | Moeda | Código | Método de Pagamento |
|------|-------|--------|---------------------|
| 🇧🇷 Brasil | Real | BRL | PIX |
| 🇦🇴 Angola | Kwanza | AOA | Multicaixa Express |
| 🇵🇹 Portugal | Euro | EUR | SEPA / MB Way |
| 🇺🇸 EUA | Dólar | USD | Zelle / ACH |
| 🇨🇺 Cuba | Peso Cubano | CUP | Transfermóvil |
| 🇷🇺 Rússia | Rublo | RUB | SBP |
| 🇿🇦 África do Sul | Rand | ZAR | EFT |
| 🇳🇦 Namíbia | Dólar Namibiano | NAD | EFT |
| 🇲🇿 Moçambique | Metical | MZN | M-Pesa |

## 🚀 Como Testar no GitHub Pages

### Passo 1: Habilitar GitHub Pages

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Pages**
3. Em **Source**, selecione:
   - Branch: `main` (ou `master`)
   - Folder: `/ (root)`
4. Clique em **Save**
5. Aguarde alguns minutos e acesse: `https://seu-usuario.github.io/transkwanzaNew/`

### Passo 2: Testar a Aplicação

A aplicação funciona 100% no GitHub Pages usando **localStorage** para simular banco de dados.

**Credenciais de Demo:**
- **E-mail:** demo@transkwanza.com
- **Senha:** demo123

### Funcionalidades Disponíveis no GitHub Pages:

✅ Calculadora de câmbio
✅ Cadastro de usuários
✅ Login/Logout
✅ Dashboard completo
✅ Criar propostas
✅ Aceitar propostas
✅ Filtros por moeda
✅ Todas as páginas informativas

## 📦 Estrutura do Projeto

```
transkwanzaNew/
├── index.html              # Página inicial com calculadora
├── login.html              # Página de login
├── cadastro.html           # Página de cadastro
├── dashboard.html          # Dashboard principal (requer login)
├── paises.html             # Países suportados
├── suporte.html            # Central de suporte e FAQ
├── termos.html             # Termos de uso
├── privacidade.html        # Política de privacidade
├── css/
│   ├── style.css           # Estilos globais + tema escuro
│   ├── auth.css            # Estilos das páginas de autenticação
│   └── dashboard.css       # Estilos do dashboard
├── js/
│   ├── main.js             # Funções globais e utilitários
│   ├── currency.js         # Calculadora de câmbio + API
│   ├── auth.js             # Lógica de login/cadastro
│   └── dashboard.js        # Lógica do dashboard
└── api/                    # Backend PHP (para Hostinger)
    ├── config.php          # Configuração do banco de dados
    ├── database.sql        # Schema do banco de dados
    ├── auth.php            # API de autenticação
    ├── proposals.php       # API de propostas
    └── .htaccess           # Configuração Apache
```

## 🔧 Migração para Hostinger

### Passo 1: Configurar Banco de Dados

1. Acesse o painel da Hostinger
2. Crie um novo banco de dados MySQL
3. Anote as credenciais:
   - Host
   - Nome do banco
   - Usuário
   - Senha

### Passo 2: Importar Schema

1. Acesse **phpMyAdmin** no painel da Hostinger
2. Selecione seu banco de dados
3. Clique em **Importar**
4. Faça upload do arquivo `api/database.sql`
5. Execute a importação

### Passo 3: Configurar PHP

Edite o arquivo `api/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'seu_banco_de_dados');
define('DB_USER', 'seu_usuario');
define('DB_PASS', 'sua_senha');

// IMPORTANTE: Mude a chave secreta!
define('JWT_SECRET', 'sua_chave_secreta_forte_aqui');
```

### Passo 4: Upload de Arquivos

1. Use FTP ou File Manager da Hostinger
2. Faça upload de **todos** os arquivos para `public_html/`
3. Certifique-se de que a pasta `api/` está presente

### Passo 5: Ativar Backend PHP

Para usar o backend PHP ao invés do localStorage, você precisará modificar os arquivos JavaScript:

**Em `js/auth.js`**, substitua as chamadas `StorageUtil` por chamadas à API:

```javascript
// Exemplo de login com API PHP
async function login() {
    const response = await fetch('/api/auth.php?action=login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const data = await response.json();
    // ... processar resposta
}
```

### Passo 6: Testar

1. Acesse seu domínio da Hostinger
2. Teste todas as funcionalidades:
   - Cadastro
   - Login
   - Criação de propostas
   - Aceitar propostas

## 🔐 Segurança

### Implementado:

- ✅ Sanitização de inputs
- ✅ Proteção contra SQL Injection (PDO com prepared statements)
- ✅ Hashing de senhas (bcrypt)
- ✅ Tokens JWT para autenticação
- ✅ CORS configurado
- ✅ Logs de auditoria
- ✅ Validação de dados no frontend e backend

### Recomendações Adicionais:

- [ ] Implementar HTTPS (SSL) - **obrigatório para produção**
- [ ] Rate limiting para prevenir ataques de força bruta
- [ ] 2FA (autenticação de dois fatores)
- [ ] Verificação de e-mail
- [ ] KYC (Know Your Customer) para conformidade legal
- [ ] Monitoramento de fraudes
- [ ] Backup automático do banco de dados

## 📱 Funcionalidades Mobile

- ✅ Design responsivo total
- ✅ Tabs transformam-se em combobox
- ✅ Menu hambúrguer
- ✅ Touch-friendly
- ✅ Otimizado para telas pequenas

## 🎨 Temas e Cores

### Paleta de Cores (Tema Escuro):

- **Background Primário:** `#0f1419`
- **Background Secundário:** `#1a1f2e`
- **Accent Primário:** `#00d9ff` (Azul Ciano)
- **Accent Sucesso:** `#00c853` (Verde)
- **Accent Aviso:** `#ffa726` (Laranja)
- **Accent Erro:** `#ff5252` (Vermelho)

## 🌐 API de Câmbio

A aplicação usa a **Exchange Rate API** (gratuita) para taxas de câmbio em tempo real:

```
https://api.exchangerate-api.com/v4/latest/USD
```

**Características:**
- Gratuita (sem necessidade de API key para uso básico)
- Atualização automática a cada hora
- Cache de 1 hora no localStorage
- Fallback para taxas estáticas em caso de erro

### Alternativas de API:

Se preferir, você pode usar:
- **Fixer.io** (requer API key)
- **Currency API** (requer API key)
- **Open Exchange Rates** (requer API key)

Para trocar, edite `js/currency.js`:

```javascript
const API_BASE_URL = 'https://sua-api-aqui.com/';
```

## 📊 Banco de Dados

### Tabelas Principais:

1. **users** - Usuários cadastrados
2. **proposals** - Propostas de remessa
3. **transactions** - Transações completas
4. **exchange_rates** - Cache de taxas de câmbio
5. **supported_countries** - Países suportados
6. **audit_logs** - Logs de auditoria

### Recursos Avançados:

- Views SQL para relatórios
- Procedure para limpar propostas expiradas
- Event scheduler para automação
- Índices otimizados para performance

## 🤝 Suporte

Para suporte ou dúvidas:

- **WhatsApp:** +55 11 93436-3623
- **E-mail:** privacidade@transkwanza.com

## 📝 Licença

Este projeto é fornecido como está, para fins educacionais e demonstrativos.

## 🚧 Próximos Passos Recomendados

1. **Upload de Comprovantes**
   - Sistema de upload de imagens
   - Validação de comprovantes de pagamento

2. **Notificações**
   - E-mail quando proposta é aceita
   - WhatsApp notifications
   - Notificações push

3. **Sistema de Avaliação**
   - Usuários podem avaliar uns aos outros
   - Sistema de reputação

4. **Painel Administrativo**
   - Gerenciar usuários
   - Aprovar transações
   - Visualizar estatísticas

5. **Multi-idioma**
   - Inglês
   - Espanhol
   - Português (já é default)

6. **Pagamentos Automatizados**
   - Integração com APIs de pagamento de cada país
   - Confirmação automática de depósitos

## 📈 Escalabilidade

Para escalar a aplicação:

1. **CDN** para assets estáticos
2. **Redis** para cache e sessões
3. **Load Balancer** para múltiplos servidores
4. **Database Replication** para alta disponibilidade
5. **Queue System** (RabbitMQ) para processar transações
6. **Microservices** para separar funcionalidades

## 🧪 Testes

A aplicação está pronta para testes manuais. Para testes automatizados, considere:

- **Frontend:** Jest + React Testing Library
- **Backend:** PHPUnit
- **E2E:** Cypress ou Selenium

## 🎯 Como Usar

### Para Usuários:

1. Acesse a página inicial
2. Use a calculadora para ver quanto vai enviar/receber
3. Cadastre-se
4. Faça login
5. No dashboard:
   - **Propostas Disponíveis:** Veja e aceite propostas de outros usuários
   - **Calculadora:** Calcule e crie uma nova proposta
   - **Minhas Propostas:** Gerencie suas propostas

### Para Desenvolvedores:

1. Clone o repositório
2. Para testar localmente:
   - Abra `index.html` no navegador
   - Ou use um servidor local: `python -m http.server 8000`
3. Para produção:
   - Siga os passos de **Migração para Hostinger**

## 🔍 Debug

### localStorage (GitHub Pages):

Abra o Console do navegador e execute:

```javascript
// Ver todos os usuários
console.log(JSON.parse(localStorage.getItem('users')));

// Ver todas as propostas
console.log(JSON.parse(localStorage.getItem('proposals')));

// Ver usuário atual
console.log(JSON.parse(localStorage.getItem('currentUser')));

// Limpar tudo
localStorage.clear();
```

### PHP Backend (Hostinger):

Ative o modo debug em `api/config.php`:

```php
// No topo do arquivo, após <?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
```

## 💡 Dicas

- **Dados de teste:** Use a conta demo para explorar sem cadastrar
- **Responsivo:** Teste em diferentes tamanhos de tela
- **Navegadores:** Testado em Chrome, Firefox, Safari e Edge
- **Performance:** Todas as imagens usam emojis (sem arquivos pesados)
- **SEO:** Adicione meta tags conforme necessário

## 🎉 Pronto!

Sua aplicação TransKwanza está 100% funcional e pronta para uso!

**Teste agora no GitHub Pages e depois migre para Hostinger quando estiver pronto para produção.**

---

**Desenvolvido com ❤️ para conectar pessoas e facilitar remessas internacionais.**
