# 📦 POC Operaton Expedição Inteligente

Prova de Conceito de orquestração logística utilizando **Operaton** (Camunda 7 Fork), substituindo um "Processo de Sombras" (papel e Excel) por um fluxo orquestrado digitalmente com visibilidade, KPIs e validação de regras de negócio.

---

## 🎯 Objetivos da POC

- ✅ Digitalizar processo manual de expedição
- ✅ Orquestrar fluxo com Operaton (BPMN)
- ✅ Validar regras de negócio automaticamente (DMN)
- ✅ Fornecer métricas de produtividade em tempo real
- ✅ Eliminar gargalos e melhorar visibilidade

---

## 🏗️ Arquitetura da Solução

### Componentes Principais

| Serviço | Porta | Tecnologia | Descrição |
|---------|-------|-----------|-----------|
| **operaton-engine** | 8080 | Operaton/Camunda 7 | Motor de orquestração BPMN |
| **postgres-db** | 5432 | PostgreSQL 15 | Persistência de dados |
| **backend-python** | 8000 | FastAPI/Python 3.11+ | API REST e Workers |
| **frontend-ops** | 3000 | React/Vite/TypeScript | Interface Operacional |
| **frontend-protheus** | 3001 | React/Vite/TypeScript | Simulador ERP |

### Padrão de Integração: External Task (Long Polling)

```
Operaton Engine     <------> Backend Python Worker
      │                              │
      │  Fetch & Lock Tasks          │
      └──────────────────────────────┘
             (Long Polling)
```

---

## 📋 Fluxo de Processo

```
Start (API REST)
    ↓
[Separar Pedido] (User Task - EXPEDICAO)
    ↓
[Validar Peso] (Service Task - Worker)
    ↓
    ├─→ Desvio > 3%? SIM ─→ [Corrigir Divergência] → Loop back
    │
    └─→ Desvio ≤ 3%? NÃO → [Faturar] (User Task - FINANCEIRO)
         ↓
      [Conferir e Coletar] (User Task - GATE)
         ↓
       End (Sucesso)
```

### Regra de Negócio (DMN)

- **Entrada:** `pesoTeorico`, `pesoReal`
- **Cálculo:** Desvio percentual = |pesoTeorico - pesoReal| / pesoTeorico
- **Regra:** Permitir desvio de **± 3%**
- **Saída:** `divergenciaPeso` (boolean) + `mensagem` (string)

---

## 🚀 Como Executar

### Pré-requisitos

- Docker e Docker Compose instalados
- Git para clonar o repositório
- Editor de código (VS Code recomendado)

### 1. Clonar o Repositório

```bash
cd ~/poc-operaton
```

### 2. Iniciar os Serviços com Docker Compose

```bash
docker-compose up -d
```

Este comando irá:
- Iniciar banco de dados PostgreSQL
- Iniciar Operaton Engine
- Iniciar Backend Python (FastAPI)
- Construir e iniciar frontend-ops
- Construir e iniciar frontend-protheus

**Aguarde 30-40 segundos para todos os serviços ficarem prontos.**

### 3. Verificar Status dos Contêineres

```bash
docker-compose ps
```

Todos os contêineres devem estar em status `Up`.

### 4. Acessar as Interfaces

| Interface | URL | Descrição |
|-----------|-----|-----------|
| **Operaton Console** | http://localhost:8080/camunda | Admin e Deploy de BPMNs |
| **Frontend Operacional** | http://localhost:3000 | Dashboard e Tarefas |
| **Frontend Protheus** | http://localhost:3001 | Simulador ERP |
| **Backend API** | http://localhost:8000/docs | Swagger Documentation |

---

## 👥 Usuários Padrão para Teste

O sistema cria automaticamente 3 usuários (sem senha) no boot:

| Usuário | Grupo | Permissões |
|---------|-------|-----------|
| `joao.silva` | EXPEDICAO | Separar pedidos |
| `maria.santos` | FINANCEIRO | Faturar pedidos |
| `jose.porteiro` | GATE | Conferir e coletar |

**No Frontend Ops (http://localhost:3000)**, use o seletor de usuários na parte superior para trocar entre eles.

---

## 🔄 Fluxo Prático de Teste

### Passo 1: Simular Envio de Romaneio
1. Acesse http://localhost:3001 (Frontend Protheus)
2. Veja os 3 romaneios fictícios
3. Clique em **"Liberar para Expedição"** em qualquer um deles
4. Aguarde mensagem de sucesso

### Passo 2: Executar Tarefas de Expedição
1. Acesse http://localhost:3000 (Frontend Ops)
2. Selecione usuário **João Silva (EXPEDICAO)**
3. Veja a tarefa **"Separar Pedido"** aparecer na lista
4. Digite um peso qualquer (maior que 0)
5. Clique em **"✓ Confirmar Separação"**

### Passo 3: Validação Automática (Weight Validation)
- O Worker Python valida o peso automaticamente
- Se desvio > 3%: Redireciona para **"Corrigir Divergência"**
- Se desvio ≤ 3%: Segue para **"Faturar"**

### Passo 4: Faturamento
1. Mude para usuário **Maria Santos (FINANCEIRO)**
2. Complete a tarefa **"Faturar Pedido"**
3. Digite número da NF e selecione status

### Passo 5: Gate (Coleta)
1. Mude para usuário **José Porteiro (GATE)**
2. Complete a tarefa **"Conferir e Coletar"**
3. Selecione transportadora e quantidade de volumes

### Passo 6: Acompanhar Métricas
1. Volte ao Frontend Ops
2. Clique em **"📊 Dashboard"**
3. Veja KPIs e mapa de calor das etapas

---

## 📂 Estrutura de Diretórios

```
/poc-operaton-expedicao
├── docker-compose.yml              # Orquestração dos serviços
├── README.md                       # Este arquivo
├── bpm/
│   ├── expedicao.bpmn              # Definição do processo BPMN
│   └── validacao_peso.dmn          # Regra de negócio DMN
├── backend-python/
│   ├── main.py                     # Entrypoint FastAPI
│   ├── requirements.txt            # Dependências Python
│   ├── Dockerfile
│   ├── core/
│   │   ├── worker_engine.py        # Long Polling Worker
│   │   └── setup_operaton.py       # Setup automático (users/groups)
│   └── domain/
│       ├── tasks.py                # Regras de negócio
│       └── mock_data.json          # Massa de dados
├── frontend-ops/
│   ├── package.json
│   ├── vite.config.ts              # Proxy para Engine e Backend
│   ├── src/
│   │   ├── App.tsx                 # App principal
│   │   ├── pages/
│   │   │   ├── TaskList.tsx        # Lista de tarefas
│   │   │   └── Dashboard.tsx       # Dashboard KPIs
│   │   ├── components/
│   │   │   └── DynamicForms/
│   │   │       ├── FormSeparacao.tsx
│   │   │       ├── FormFaturamento.tsx
│   │   │       ├── FormColeta.tsx
│   │   │       └── FormCorrecao.tsx
│   │   └── services/
│   │       ├── operatonApi.ts      # Client Operaton
│   │       └── dashboardApi.ts     # Serviço KPIs
│   └── Dockerfile
└── frontend-protheus/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx                 # Simulador ERP
    │   └── services/
    │       └── backendApi.ts       # Client Backend
    └── Dockerfile
```

---

## 🛠️ Troubleshooting

### Contêineres não iniciam

```bash
# Verifique logs
docker-compose logs operaton-engine
docker-compose logs backend-python
```

### Operaton não reconhece BPMN/DMN

Os arquivos BPMN e DMN precisam ser **deployados** manualmente via Operaton Console:

1. Acesse http://localhost:8080/camunda
2. Vá para **Cockpit** → **Processes**
3. Deploy via upload ou via API REST

### Backend não consegue conectar ao Operaton

Verifique se ambos estão na mesma rede Docker:

```bash
docker network inspect operaton-net
```

### Frontend não consegue conectar ao Backend

Verifique o `vite.config.ts` - proxy must point to `http://backend-python:8000`

---

## 🔑 Variáveis de Ambiente (Opscionais)

Crie um arquivo `.env` na raiz do projeto:

```env
# Backend
OPERATON_ENGINE_URL=http://operaton-engine:8080
DATABASE_URL=postgresql://camunda:camunda123@postgres-db:5432/operaton

# Frontend
REACT_APP_OPERATON_URL=http://localhost:8080
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 📊 Métricas e KPIs

O Dashboard fornece:

- **Total de Processos:** Contagem de instâncias iniciadas
- **Processos Completos:** % de processos finalizados
- **Tempo Médio por Etapa:** Duração esperada de cada atividade
- **Mapa de Calor:** Identifica gargalos (vermelho = > 30s)

---

## 🔗 Endpoints da API

### Backend Python (FastAPI)

```
GET  http://localhost:8000/health
POST http://localhost:8000/api/start-process
GET  http://localhost:8000/docs  (Swagger)
```

### Operaton Engine (REST)

```
GET  http://localhost:8080/engine-rest/engine
GET  http://localhost:8080/engine-rest/task
POST http://localhost:8080/engine-rest/task/{taskId}/complete
GET  http://localhost:8080/engine-rest/history/process-instance
```

---

## 🧹 Parar e Limpar

```bash
# Parar todos os serviços
docker-compose down

# Remover volumes permanentemente (CUIDADO!)
docker-compose down -v
```

---

## 📚 Recursos e Documentação

- **Operaton:** https://docs.operaton.org/
- **Camunda BPMN:** https://docs.camunda.org/manual/7.18/reference/bpmn20/
- **DMN:** https://docs.camunda.org/manual/7.18/reference/dmn/
- **FastAPI:** https://fastapi.tiangolo.com/
- **React:** https://react.dev/

---

## 👨‍💻 Desenvolvedor

**Caso de Uso:** POC de Orquestração de Processos de Expedição  
**Versão:** 1.0.0  
**Data:** Fevereiro 2026

---

## 📝 Notas Técnicas

### Segurança (Não Implementada na POC)

Para produção, implementar:
- ✋ Autenticação OAuth2/JWT
- 🔐 Validação de CORS
- 📋 Rate limiting
- 🛡️ HTTPS/TLS

### Performance

- O Worker usa **poll_interval de 5 segundos**
- Máximo 5 tasks por fetch
- Lock duration: 30 segundos
- Recomenda-se múltiplos workers em produção

### Banco de Dados

- PostgreSQL 15 com volume Docker
- Dados persistem entre restarts
- Use `POSTGRES_PASSWORD` segura em produção

---

## 🤝 Contribuições e Feedback

Para reportar bugs ou sugerir melhorias, abra uma issue.

---

**Boa exploração! 🚀**
