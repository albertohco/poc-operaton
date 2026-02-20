# 🏗️ Arquitetura Técnica Detalhada - POC Operaton Expedição

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose Network                       │
│                        (operaton-net)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ FRONTEND APPS  │  │   BACKEND API    │  │ WORKFLOW ENGINE  │  │
│ │                │  │                  │  │                  │  │
│ │ 🎨 frontend-   │  │ ⚙️ backend-     │  │ 🔄 operaton-    │  │
│ │    ops:3000    │  │    python:8000  │  │    engine:8080  │  │
│ │                │  │                  │  │                  │  │
│ │ + TaskList     │  │ + FastAPI REST   │  │ + BPMN Runtime  │  │
│ │ + Dashboard    │  │ + Worker Pool    │  │ + History DB    │  │
│ │ + KPI Charts   │  │ + Setup Scripts  │  │ + REST API      │  │
│ │                │  │                  │  │                  │  │
│ │ 🎨 frontend-   │  │ 📊 Regras de     │  │                  │  │
│ │    protheus    │  │    Negócio (DMN) │  │ ◀─ JDBC ──────── │  │
│ │    :3001       │  │                  │  │   (PostgreSQL)   │  │
│ │                │  │ 📝 Mock Data     │  │                  │  │
│ │ + Romaneios    │  │    (JSON)        │  │                  │  │
│ │ + Dispatcher   │  │                  │  │                  │  │
│ │                │  │ 🔌 External Task │  │                  │  │
│ │                │  │    Long Polling  │  │                  │  │
│ │                │  │                  │  │                  │  │
│ └──────────┬──────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            │                  │                     │            │
│            │                  │                     │            │
│            └──────────────────┼─────────────────────┘            │
│                               │                                  │
│                    ┌──────────▼──────────┐                       │
│                    │   PostgreSQL 15     │                       │
│                    │   (postgres-db)     │                       │
│                    │   :5432             │                       │
│                    │                     │                       │
│                    │ • operaton schema   │                       │
│                    │ • runtime tables    │                       │
│                    │ • history tables    │                       │
│                    │ • cache tables      │                       │
│                    │                     │                       │
│                    │ 💾 volumes:         │                       │
│                    │ postgres_data       │                       │
│                    └─────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend
- **Tecnologia:** React 18 + TypeScript
- **Builder:** Vite 5
- **Styling:** CSS3 puro (sem framework)
- **HTTP Client:** Axios
- **State Management:** React Hooks

### Backend
- **Tecnologia:** Python 3.11+
- **Framework Web:** FastAPI 0.104
- **Server:** Uvicorn 0.24
- **Async:** asyncio + aiohttp
- **Database Driver:** psycopg2-binary
- **Padrão de Integração:** External Task (Long Polling)

### Workflow Engine
- **Tecnologia:** Operaton (Camunda 7 Fork)
- **Linguagem de Processo:** BPMN 2.0
- **Regras de Negócio:** DMN 1.3
- **Database:** PostgreSQL
- **REST API:** /engine-rest (JAX-RS)

### Infraestrutura
- **Orquestração:** Docker Compose 3.8+
- **Container Images:**
  - postgres:15-alpine
  - operaton/operaton-bpm-platform:latest
  - node:18-alpine (para builds React)
  - python:3.11-slim (para App Python)

---

## Padrão de Integração: External Task (Long Polling)

```
┌──────────────────────────────────────────────────────────────────┐
│                   EXTERNAL TASK PATTERN                          │
└──────────────────────────────────────────────────────────────────┘

WORKFLOW:

1. Operaton executa Service Task com type="external"
   └─> Procura por tópico registrado
   └─> Cria "External Task" (tarefa aguardando execução)

2. Worker Python faz polling contínuo
   └─> A cada 5 segundos: POST /external-task/fetchAndLock
   └─> Request: workerId, maxTasks, list of topics
   └─> Response: array de tasks

3. Se tarefas disponíveis no tópico registrado
   └─> Worker faz lock na tarefa
   └─> Worker executa função de negócio mapeada
   └─> Worker reporta resultado

4. Worker reporta ao Operaton
   └─> Sucesso: POST /external-task/{taskId}/complete
   └─> Erro: POST /external-task/{taskId}/failure

5. Operaton continua fluxo baseado no resultado

VANTAGENS:
✅ Desacoplamento completo entre Operaton e Worker
✅ Workers podem rodar em qualquer lugar/linguagem
✅ Retry automático integrado
✅ Sem necessidade de callbacks
✅ Escalável horizontalmente (múltiplos workers)

FLUXO NO CÓDIGO:

Operaton                       Backend Python
    │                              │
    │   Service Task: validar_peso │
    │   └─> Cria External Task     │
    │                              │
    │   POST /fetchAndLock         │
    │<─────────────────────────────│
    │   [{ task: "validar_peso" }] │
    │─────────────────────────────>│
    │                              │
    │                    Executa:  │
    │                    BusinessRules.validar_peso()
    │                    Calcula desvio %
    │                    Valida regra DMN
    │                              │
    │   POST /external-task/complete
    │<─────────────────────────────│
    │   { divergenciaPeso: bool }  │
    │─────────────────────────────>│
    │                              │
    │   nextFlow(divergenciaPeso)  │
    │   Continua processo          │
    │                              │
```

---

## Fluxo de Dados do Processo

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO COMPLETO DE UM ROMANEIO - PONTA A PONTA                  │
└─────────────────────────────────────────────────────────────────┘

1. DISPARO (Frontend Protheus)
   ┌────────────────────────────────┐
   │ Usuario: "Liberar para Exp."   │
   │ ROM-2024-001 → [POST] click    │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ POST /api/start-process        │
   │ { "idRomaneio": "ROM-..." }    │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Backend Python:                │
   │ 1. Busca dados em mock_data    │
   │ 2. Carrega variaveis           │
   │ 3. POST Operaton:              │
   │    /process-definition/...     │
   │    /start                      │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Operaton:                      │
   │ ✅ Cria ProcessInstance        │
   │ ✅ Executa StartEvent          │
   │ ✅ Cria User Task:             │
   │    "Separar Pedido"            │
   │    Assigned to: EXPEDICAO      │
   └────────┬───────────────────────┘
            │
            
2. SEPARAÇÃO (Frontend Ops - João)
   ┌────────────────────────────────┐
   │ Frontend Ops:                  │
   │ GET /engine-rest/task          │
   │ candidateGroup=EXPEDICAO       │
   │ ✅ "Separar Pedido" appears    │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ FormSeparacao Component:       │
   │ Input: pesoReal = 505          │
   │ Input: observacoes = "ok"      │
   │ Click: "Confirmar"             │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ POST /api/task/{taskId}/       │
   │ complete                       │
   │ {                              │
   │   variables: {                 │
   │     pesoReal: 505,             │
   │     observacoes: "ok"          │
   │   }                            │
   │ }                              │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Operaton:                      │
   │ ✅ Completa User Task          │
   │ ✅ Atualiza variaveis          │
   │ ✅ Fluxo continua              │
   │ ✅ Executa Service Task:       │
   │    "Validar Peso"              │
   │    topic: "validar_peso"       │
   │    creates External Task       │
   └────────┬───────────────────────┘
            │
            
3. VALIDAÇÃO (Backend Python - Worker)
   ┌────────────────────────────────┐
   │ Worker Python:                 │
   │ Polling loop (5s)              │
   │ POST /external-task/fetchAndLock
   │ ✅ External Task detectada     │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ BusinessRules.validar_peso():  │
   │                                │
   │ pesoTeorico = 500              │
   │ pesoReal = 505                 │
   │ desvio = |500-505|/500 = 1%    │
   │ divergenciaPeso = 1% > 3%?     │
   │ divergenciaPeso = false        │
   │ mensagem = "Peso dentro..."    │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ POST /external-task/{taskId}/  │
   │ complete                       │
   │ {                              │
   │   divergenciaPeso: false,      │
   │   mensagem: "..."              │
   │ }                              │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Operaton:                      │
   │ ✅ External Task completa      │
   │ ✅ Atualiza variaveis          │
   │ ✅ Valida Gateway              │
   │    divergenciaPeso = false?    │
   │    → Caminho: Faturamento      │
   │       (não Correção)           │
   │ ✅ Proxima User Task: Faturar  │
   │    Assigned to: FINANCEIRO     │
   └────────┬───────────────────────┘
            │
            
4. FATURAMENTO (Frontend Ops - Maria)
   ┌────────────────────────────────┐
   │ Frontend Ops:                  │
   │ GET /engine-rest/task          │
   │ candidateGroup=FINANCEIRO      │
   │ ✅ "Faturar Pedido" appears    │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ FormFaturamento Component:     │
   │ Input: nf = "NF-2024-001"      │
   │ Select: status = "Total"       │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ POST /api/task/{taskId}/       │
   │ complete                       │
   │ {                              │
   │   variables: {                 │
   │     numeroNF: "NF-2024-001",   │
   │     statusFaturamento: "Total" │
   │   }                            │
   │ }                              │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Operaton:                      │
   │ ✅ Completa User Task          │
   │ ✅ Próxima: Conferir e Coletar │
   │    Assigned to: GATE           │
   └────────┬───────────────────────┘
            │
            
5. COLETA (Frontend Ops - José)
   ┌────────────────────────────────┐
   │ Frontend Ops:                  │
   │ GET /engine-rest/task          │
   │ candidateGroup=GATE            │
   │ ✅ "Conferir e Coletar" appears│
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ FormColeta Component:          │
   │ Input: transportadora = Sedex  │
   │ Input: qtdVolumes = 3          │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ POST /api/task/{taskId}/       │
   │ complete                       │
   │ {                              │
   │   variables: {                 │
   │     transportadora: "Sedex",   │
   │     qtdVolumes: 3              │
   │   }                            │
   │ }                              │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ Operaton:                      │
   │ ✅ Completa User Task          │
   │ ✅ Executa EndEvent            │
   │ ✅ Process Instance concluído  │
   │ ✅ Dados persistidos no DB     │
   └────────────────────────────────┘
   
6. MÉTRICAS (Dashboard)
   ┌────────────────────────────────┐
   │ Frontend Ops - Dashboard:      │
   │ GET /api/history/process-...   │
   │ GET /api/history/activity-...  │
   │                                │
   │ Calcula:                       │
   │ • Total de processos: 1        │
   │ • Completos: 1 (100%)          │
   │ • Tempo total: 15 min          │
   │ • Etapa mais lenta: ?          │
   │                                │
   │ Renderiza:                     │
   │ ✅ KPIs (cards)                │
   │ ✅ Heatmap (tabela de etapas)  │
   └────────────────────────────────┘
```

---

## Estrutura de Banco de Dados

```
PostgreSQL (operaton database)
│
├── OPERATON SCHEMA (Auto-criado pelo Engine)
│   │
│   ├── ACT_RE_* (Repository - Definições)
│   │   ├── ACT_RE_PROCDEF (Process Definitions)
│   │   ├── ACT_RE_DEPLOYMENT
│   │   ├── ACT_RE_BYTEARRAY
│   │   └── ...
│   │
│   ├── ACT_RU_* (Runtime - Execução)
│   │   ├── ACT_RU_PROCESS_INSTANCE
│   │   ├── ACT_RU_EXECUTION
│   │   ├── ACT_RU_TASK
│   │   ├── ACT_RU_VARIABLE
│   │   ├── ACT_RU_EXTERNAL_TASK
│   │   ├── ACT_RU_EVENT_SUBSCR
│   │   └── ...
│   │
│   ├── ACT_HI_* (History - Auditoria)
│   │   ├── ACT_HI_PROCINST
│   │   ├── ACT_HI_ACTINST
│   │   ├── ACT_HI_TASKINST
│   │   ├── ACT_HI_VARINST
│   │   └── ...
│   │
│   └── ACT_GE_* (General)
│       ├── ACT_GE_BYTEARRAY
│       └── ACT_GE_PROPERTY
│
└── USER SCHEMA (Para aplicações customizadas)
    ├── romaneios (Opcional - para cache)
    └── metricas_custom (Opcional)

DADOS EXEMPLO:

ACT_RU_PROCESS_INSTANCE (Runtime)
├─ id: "acd09b73-f4c1-11ed-a9fb..."
├─ proc_def_key_: "processo_expedicao_v1"
├─ business_key_: "ROM-2024-001"
├─ start_time_: 2026-02-07 10:00:00
├─ state_: "ACTIVE"
└─ ...

ACT_RU_VARIABLE (Variáveis do Processo)
├─ id: "..."
├─ name_: "pesoTeorico"
├─ double_val_: 500.0
├─ proc_inst_id_: "acd09b73..."
└─ ...

ACT_HI_PROCINST (Histórico)
├─ id_: "acd09b73..."
├─ start_time_: 2026-02-07 10:00:00
├─ end_time_: 2026-02-07 10:15:00
├─ duration_: 900000 (ms)
└─ ...

ACT_HI_ACTINST (Histórico de Atividades)
├─ id_: "xyz789..."
├─ activity_id_: "Task_Separacao"
├─ activity_name_: "Separar Pedido"
├─ start_time_: 2026-02-07 10:00:00
├─ end_time_: 2026-02-07 10:05:00
├─ duration_: 300000 (ms)
└─ ...
```

---

## Componentes de Software

### 1. Operaton Engine
```
Responsabilidades:
• Interpretar e executar BPMN
• Gerenciar estado do processo
• Criar/atualizar/deletar tarefas
• Manter histórico completo
• Fornecer REST API
• Persistir dados no PostgreSQL

Configuração:
• DB_DRIVER: org.postgresql.Driver
• DB_URL: jdbc:postgresql://postgres-db:5432/operaton
• DB_USERNAME: camunda
• DB_PASSWORD: camunda123
```

### 2. Backend Python (FastAPI)
```
Responsabilidades:
• Expor REST API para frontends
• Implementar Worker de polling
• Executar regras de negócio DMN
• Setup automático de usuários
• Servir dados fictícios para testes

Componentes:
• main.py: Entrypoint, endpoints HTTP
• core/worker_engine.py: Long polling
• core/setup_operaton.py: Setup automático
• domain/tasks.py: Regras de negócio
• domain/mock_data.json: Dados de teste
```

### 3. Frontend Operacional (React)
```
Responsabilidades:
• Listar tarefas por grupo do usuário
• Renderizar formas dinâmicas
• Submeter dados ao Operaton
• Exibir dashboard com KPIs
• Visualizar heatmap de gargalos

Páginas:
• TaskList.tsx: Kanban/List de tarefas
• Dashboard.tsx: KPIs + Heatmap

Formulários:
• FormSeparacao: Peso real + obs
• FormFaturamento: NF + status
• FormColeta: Transportadora + volumes
• FormCorrecao: Observações correção
```

### 4. Frontend Protheus (React)
```
Responsabilidades:
• Simular interfaces ERP
• Exibir lista de romaneios
• Disparar processos ao clicar
• Feedback de sucesso/erro

Componentes:
• App.tsx: Interface principal
• backendApi.ts: Cliente HTTP
```

---

## Fluxo de Requisições HTTP

```
1. BROWSER → FRONTEND OPS/PROTHEUS
   ├─ React App carrega
   ├─ CSS/JS bundle via Vite
   └─ Listen para eventos do usuário

2. FRONTEND OPS/PROTHEUS → VITE PROXY (localhost:3000|3001)
   ├─ Requisições /engine-rest/* redirecionam para Operaton
   ├─ Requisições /api/* redirecionam para Backend Python
   └─ Vite Dev Server intercept

3. VITE PROXY → BACKEND PYTHON (8000) | OPERATON ENGINE (8080)
   ├─ HTTP requests com JSON
   ├─ Handlers roteiam para código
   └─ Responses retornam ao proxy

4. VITE PROXY → BROWSER
   ├─ Dados parsados como JSON
   ├─ React re-renderiza
   └─ UI atualizada

5. BACKEND PYTHON → OPERATON ENGINE (Interno)
   ├─ Worker faz polling /external-task/fetchAndLock
   ├─ Operaton responde com tarefas
   ├─ Worker executa lógica
   └─ Worker reporta via /external-task/{taskId}/complete

6. OPERATON ENGINE → POSTGRESQL
   ├─ INSERT/UPDATE em tabelas runtime
   ├─ INSERT em tabelas histórico
   └─ Commits transações
```

---

## Segurança (Notas)

### Implementado
- ✅ CORS middleware no FastAPI
- ✅ Logging de operações
- ✅ Error handling genéricos

### NÃO Implementado (POC)
- ❌ Autenticação (OAuth2, JWT)
- ❌ Autorização (RBAC)
- ❌ Criptografia em trânsito (HTTPS)
- ❌ Validação de entrada
- ❌ Rate limiting
- ❌ Secrets management

### Para Produção
```
1. Habilitar HTTPS/TLS
2. Implementar OAuth2 no FastAPI
3. Usar secrets manager (Vault, AWS Secrets)
4. Adicionar WAF/API Gateway
5. Implementar rate limiting
6. Adicionar validação Pydantic rigorosa
7. Configurar RBAC robusto
8. Audit logging
9. Encryption at rest (DB)
10. Network segmentation
```

---

## Performance e Escalabilidade

### Limitações Atuais
- Single worker instance
- Single backend instance
- Backend executado síncrono
- Sem cache

### Recomendações para Produção
```
HORIZONTALIZAÇÃO:
• Deploy múltiplos workers Python
• Load balancer (nginx, HAProxy)
• Multiple Operaton instances com cluster
• Database replication (PostgreSQL HA)

CACHE:
• Redis para cache de tarefas
• Memcached para sessions
• Browser cache p/ assets estáticos

ASYNC:
• Converter endpoints para async/await
• Worker pool com ProcessPoolExecutor
• Message queue (RabbitMQ) p/ jobs

MONITORING:
• Prometheus metrics
• Grafana dashboards
• ELK stack for logs
• APM (Application Performance Monitoring)

TESTING:
• Unit tests (pytest)
• Integration tests
• Load testing (Apache JMeter, k6)
• Performance profiling
```

---

## Deployment (Docker)

```
DOCKERFILE baseados em:
• python:3.11-slim (Backend)
• node:18-alpine (Frontend build)
• operaton/operaton-bpm-platform (Engine)
• postgres:15-alpine (Database)

VOLUMES:
• postgres_data: Persistência de banco

NETWORKS:
• operaton-net: bridge para comunicação

HEALTHCHECKS:
• PostgreSQL: pg_isready
• Operaton: curl /engine-rest/engine
• Backend: HTTP 200 /health
• Frontend: HTTP 200 /
```

---

Arquitetura versão: 1.0  
Última atualização: Fevereiro 2026
