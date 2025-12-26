# Caching Proxy Tool

Um proxy de cache HTTP em memória construído com Node.js que intercepta requisições GET e armazena as respostas em cache para melhorar a performance e reduzir a carga no servidor de origem.

## Índice

- [Características](#-características)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Headers HTTP](#-headers-http)
- [Cache e TTL](#-cache-e-ttl)
- [Tratamento de Erros](#-tratamento-de-erros)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Exemplos](#-exemplos)
- [Limitações](#-limitações)
- [Desenvolvimento](#-desenvolvimento)

## Características

- **Cache em memória**: Armazena respostas em RAM para acesso rápido
- **TTL configurável**: Time-to-live de 60 segundos por padrão
- **Suporte a query strings**: Diferentes queries são cacheadas separadamente
- **Headers informativos**: Indica se a resposta veio do cache via `X-Cache-Status`
- **Timeout automático**: Proteção contra requisições travadas (30 segundos)

## Instalação

### Pré-requisitos

- Node.js 18+ (com suporte a ES Modules)

### Instalação Local

```bash
# Clone o repositório
git clone https://github.com/johnliradev/caching-proxy-tool
cd caching-proxy-tool

# Instale as dependências
npm install
```

## Uso

### Iniciando o Servidor Proxy

```bash
# Usando npx (se instalado localmente)
npx caching-proxy start --port 3000 --origin https://api.example.com

# Ou usando node diretamente
node cli.js start --port 3000 --origin https://api.example.com
```

### Opções de Linha de Comando

```bash
# Formato completo
caching-proxy start --port <porta> --origin <url-origem>

# Formato com igual
caching-proxy start --port=3000 --origin=https://api.example.com

# Ver ajuda
caching-proxy --help
# ou
caching-proxy -h
```

### Parâmetros

| Parâmetro  | Descrição                            | Obrigatório | Exemplo                   |
| ---------- | ------------------------------------ | ----------- | ------------------------- |
| `--port`   | Porta onde o proxy irá escutar       | Sim         | `3000`                    |
| `--origin` | URL base da API que será proxificada | Sim         | `https://api.example.com` |

### Validações

O CLI valida automaticamente:

- Porta deve ser um número entre 1 e 65535
- Origin deve ser uma URL válida
- Ambos os parâmetros são obrigatórios

## Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ GET /products
       ▼
┌─────────────────┐
│  Caching Proxy  │
│   (localhost)   │
└──────┬───────────┘
       │
       ├─► Verifica Cache
       │   ├─► Cache HIT → Retorna dados do cache
       │   └─► Cache MISS → Faz fetch na API original
       │                      └─► Salva no cache
       │                          └─► Retorna dados
       ▼
┌─────────────────┐
│  API Original   │
│  (origin URL)   │
└─────────────────┘
```

### Fluxo de Requisição

1. **Cliente faz requisição** → `GET http://localhost:3000/products`
2. **Proxy recebe requisição** → Verifica se é GET (único método suportado)
3. **Verifica cache** → Busca no Map usando `pathname + query string` como chave
4. **Cache HIT** → Retorna dados do cache imediatamente
5. **Cache MISS** → Faz fetch na API original
6. **Salva no cache** → Armazena resposta para próximas requisições
7. **Retorna dados** → Envia resposta ao cliente

## Funcionalidades

### Métodos HTTP Suportados

- ✅ **GET**: Totalmente suportado com cache
- ❌ **POST/PUT/DELETE/PATCH**: Retorna `405 Method Not Allowed`

### Cache Inteligente

- **Chave de cache**: Combina `pathname + query string`

  - `/products` e `/products?page=1` são caches diferentes
  - `/users?id=123` e `/users?id=456` são caches diferentes

- **TTL (Time To Live)**: 60 segundos por padrão
  - Após expirar, a próxima requisição busca dados frescos
  - Entrada expirada é automaticamente removida do cache

### Performance

- **Cache HIT**: Resposta em < 1ms (memória RAM)
- **Cache MISS**: Tempo depende da API original + overhead do proxy
- **Timeout**: 30 segundos para evitar requisições travadas

### Logs

O proxy gera logs detalhados:

```
Request took 2ms / STATUS 200 / X-Cache: HIT
Request took 245ms / STATUS 200 / X-Cache: MISS
```

## Headers HTTP

### Headers Enviados pelo Proxy

| Header           | Valor            | Descrição                                                     |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| `X-Cache-Status` | `HIT` ou `MISS`  | Indica se a resposta veio do cache                            |
| `Content-Type`   | Tipo do conteúdo | Repassado da API original ou `application/json` como fallback |

### Headers Repassados

O proxy repassa automaticamente o `Content-Type` da resposta original, mantendo a compatibilidade com diferentes formatos (JSON, XML, HTML, etc.).

## Cache e TTL

### Estrutura do Cache

Cada entrada no cache contém:

```javascript
{
  data: string,              // Corpo da resposta
  contentType: string,        // Tipo de conteúdo
  statusCode: number,         // Código HTTP
  timestamp: number,          // Timestamp de criação (Date.now())
  ttl: 60000                 // Time-to-live em milissegundos (60s)
}
```

### Comportamento do TTL

1. **Primeira requisição**: Cache MISS → Busca na API → Salva no cache
2. **Requisições subsequentes** (dentro de 60s): Cache HIT → Retorna do cache
3. **Após 60 segundos**: TTL expirado → Cache MISS → Busca nova → Atualiza cache

### Limpeza Automática

- Entradas expiradas são removidas automaticamente quando acessadas
- Cache é limpo quando o servidor é reiniciado (memória volátil)

## Tratamento de Erros

### Códigos HTTP Retornados

| Código    | Situação              | Descrição                         |
| --------- | --------------------- | --------------------------------- |
| `200`     | Sucesso               | Requisição processada com sucesso |
| `405`     | Method Not Allowed    | Método HTTP diferente de GET      |
| `500`     | Internal Server Error | Erro genérico no fetch            |
| `504`     | Gateway Timeout       | Timeout de 30 segundos excedido   |
| `4xx/5xx` | Erro da API           | Código repassado da API original  |

### Cenários de Erro

1. **API original retorna erro** (4xx/5xx):

   - Código HTTP é repassado ao cliente
   - Dados não são salvos no cache

2. **Timeout na requisição** (30s):

   - Retorna `504 Gateway Timeout`
   - Log de erro é gerado

3. **Erro de rede/conexão**:

   - Retorna `500 Internal Server Error`
   - Log de erro detalhado

4. **Dados nulos**:
   - Retorna mensagem "Error fetching data"
   - Status code apropriado é enviado

## Estrutura do Projeto

```
caching-tool/
├── cli.js                 # Interface de linha de comando
├── package.json           # Configurações e dependências
├── package-lock.json      # Lock file das dependências
├── README.md              # Documentação (este arquivo)
└── src/
    ├── main.js            # Servidor HTTP principal
    └── functions/
        ├── cache.js       # Gerenciamento de cache em memória
        └── get-data.js    # Lógica de busca de dados (cache + fetch)
```

## Exemplos

### Exemplo 1: Proxy para API JSON

```bash
# Iniciar proxy
caching-proxy start --port 3000 --origin https://dummyjson.com

# Fazer requisição
curl http://localhost:3000/products

# Primeira requisição (Cache MISS)
# Response Headers:
# X-Cache-Status: MISS
# Content-Type: application/json

# Segunda requisição (Cache HIT - dentro de 60s)
# Response Headers:
# X-Cache-Status: HIT
# Content-Type: application/json
```

### Exemplo 2: Com Query Strings

```bash
# Requisições diferentes são cacheadas separadamente
curl http://localhost:3000/products?page=1
curl http://localhost:3000/products?page=2
curl http://localhost:3000/products?limit=10

# Cada uma terá seu próprio cache
```

### Exemplo 3: Verificando Cache Status

```bash
# Usando curl para ver headers
curl -I http://localhost:3000/products

# Response:
# HTTP/1.1 200 OK
# X-Cache-Status: HIT
# Content-Type: application/json
```

### Exemplo 4: Monitorando Logs

```bash
# Iniciar proxy e observar logs
caching-proxy start --port 3000 --origin https://api.example.com

# Logs aparecerão no console:
# Getting data from Cache...
# Retrivied Data from Cache
# Request took 2ms / STATUS 200 / X-Cache: HIT
```

**Nota**: Este é um proxy de cache simples e educacional. Para uso em produção, considere soluções mais robustas como Varnish, Nginx com cache, ou Redis.
