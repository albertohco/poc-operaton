# Copilot Instructions for POC Operaton

A proof-of-concept for intelligent logistics orchestration using **Operaton** (Camunda 7 fork) with BPMN workflow execution and DMN business rule validation.

## Build, Test & Lint Commands

### Backend (Python/FastAPI)

```bash
# Install dependencies
pip install -r backend-python/requirements.txt

# Run backend in development
python backend-python/main.py

# No automated tests currently in the repository
# Manual testing is done via Swagger: http://localhost:8000/docs
```

**Key considerations:**
- Backend runs at `http://localhost:8000`
- Uses FastAPI 0.104.1 + Uvicorn
- No test suite exists; testing is done via Docker Compose integration
- Main entry point: `backend-python/main.py`

### Frontend (React/TypeScript + Vite)

```bash
# Frontend Operacional (task management)
cd frontend-ops
npm install
npm run dev       # Development server on :3000
npm run build     # Production build
npm run lint      # Run ESLint (may fail on style issues in POC)

# Frontend Protheus (ERP simulator)
cd frontend-protheus
npm install
npm run dev       # Development server on :3001
npm run build     # Production build
npm run lint      # Run ESLint
```

### Docker Compose (All Services)

```bash
# Start all services (recommended way to develop)
docker-compose up -d

# View logs
docker-compose logs -f backend-python
docker-compose logs -f operaton-engine

# Stop services
docker-compose down
```

**Service URLs after startup:**
- Operaton Console: `http://localhost:8080/camunda`
- Frontend Ops: `http://localhost:3000`
- Frontend Protheus: `http://localhost:3001`
- Backend API docs: `http://localhost:8000/docs`

---

## High-Level Architecture

### Core Pattern: External Task Long Polling

This codebase uses **External Tasks** (not embedded workers) with **long polling**:

1. **Operaton Engine** defines BPMN processes with `<serviceTask type="external">` elements
2. **Backend Worker** (`core/worker_engine.py`) polls `/engine-rest/external-task/fetchAndLock` every 5 seconds
3. When a task is found, the worker:
   - Locks it for 30 seconds
   - Executes the associated handler function (mapped via topic)
   - Reports success/failure back to Operaton
   - Operaton continues the flow

**Why this pattern?** Decouples Operaton from the worker—workers can be in any language/infrastructure.

### Service Topology

```
Docker Network (operaton-net)
│
├─ PostgreSQL 15 (postgres-db:5432)
│  └─ Stores all Operaton runtime & history data
│
├─ Operaton Engine (operaton-engine:8080)
│  └─ Interprets BPMN/DMN, manages process instances
│
├─ Backend Python (backend-python:8000)
│  ├─ FastAPI HTTP server with `/api/*` endpoints
│  ├─ External Task Worker (long polling)
│  └─ Setup scripts to create users/groups at startup
│
├─ Frontend Ops (frontend-ops:3000)
│  └─ React UI for task management & dashboard
│
└─ Frontend Protheus (frontend-protheus:3001)
   └─ React UI simulating ERP (dispatch waybills)
```

### Process Flow (End-to-End)

```
1. User releases waybill (ROM-2024-001) in Protheus
   → POST /api/start-process { idRomaneio }
   → Backend calls Operaton REST API to start process instance

2. Operaton creates "Separar Pedido" (Pick) User Task
   → Assigned to EXPEDICAO group

3. João (EXPEDICAO) completes task in Ops frontend
   → Frontend posts form data to complete task
   → Task variables updated: pesoReal, observacoes

4. Operaton triggers Service Task "Validar Peso"
   → External Task created with topic="validar_peso"

5. Worker polls and finds task
   → Calls BusinessRules.validar_peso()
   → Calculates weight deviation %
   → Returns divergenciaPeso (bool)

6. Operaton gateway evaluates divergenciaPeso
   → If true: redirect to "Corrigir Divergência"
   → If false: proceed to "Faturar" (Invoice)

7. Process continues with Financeiro and Gate tasks
   → Final completion stored in history
```

---

## Key Conventions

### 1. **Task Topic Naming**

External tasks are registered by topic. Mapping lives in `backend-python/domain/tasks.py`:

```python
handlers = {
    "validar_peso": BusinessRules.validar_peso,
    "outro_topico": BusinessRules.outro_handler,
}
```

**Convention:** Topic names are snake_case and match BPMN `<servicetask><topic>` value.

### 2. **Process Variables Lifecycle**

Variables flow through the process as dictionaries:

```
BPMN Input → Service Task → BusinessRules function → return dict
   ↓
Operaton stores variables in runtime
   ↓
Frontend reads variables when rendering forms
   ↓
User submits form → new variables added
   ↓
Cycle repeats in next task
```

**Key variables in this POC:**
- `pesoTeorico`, `pesoReal` → Weight validation
- `divergenciaPeso` → Gateway condition
- `numeroNF`, `statusFaturamento` → Invoice data
- `transportadora`, `qtdVolumes` → Shipping data

### 3. **Frontend Form Pattern**

Dynamic forms bind to task data. Examples:
- `FormSeparacao.tsx` → reads `pesoTeorico`, captures `pesoReal`
- `FormFaturamento.tsx` → captures `numeroNF`, `statusFaturamento`
- `FormColeta.tsx` → captures `transportadora`, `qtdVolumes`

Pattern: Component fetches task from Operaton, renders form, posts completion with variables.

### 4. **User Groups & Permissions**

Auto-created at startup via `core/setup_operaton.py`:

```
EXPEDICAO  → João Silva (joao.silva)      → Picking task
FINANCEIRO → Maria Santos (maria.santos)  → Invoicing task
GATE       → José Porteiro (jose.porteiro) → Collection task
```

BPMN tasks use `<humanPerformer><resourceAssignmentExpression><formalExpression>GROUPNAME</formalExpression>` to assign.

### 5. **DMN Business Rules**

Located in `bpm/regras_expedicao.dmn`. The weight validation rule:
- **Input:** `pesoTeorico`, `pesoReal`
- **Calculation:** `abs(pesoTeorico - pesoReal) / pesoTeorico`
- **Rule:** Allow ±3% deviation
- **Output:** `divergenciaPeso` (boolean), `mensagem` (string)

**Note:** This POC implements the logic in Python (`tasks.py`), not executed by Operaton's DMN engine directly.

### 6. **Vite Proxy Configuration**

Frontend proxies requests to backend/engine:

```typescript
// vite.config.ts
proxy: {
  '/engine-rest': 'http://localhost:8080',  // Operaton
  '/api': 'http://localhost:8000'            // Backend Python
}
```

In Docker: proxies use container names (`http://operaton-engine:8080`, `http://backend-python:8000`).

### 7. **Logging Pattern**

All modules use Python's `logging` module:

```python
logger = logging.getLogger(__name__)
logger.info(f"Task completed: {task_id}")
```

Backend logs go to Docker Compose stdout (visible via `docker-compose logs`).

### 8. **Error Handling for External Tasks**

Worker wraps handlers in try-catch. On error:

```python
# In worker_engine.py
try:
    result = handler(task_variables)
    # Report success
except Exception as e:
    # POST to /external-task/{taskId}/failure
    # Operaton retries or escalates
```

BPMN can define retry behavior on failure.

---

## File Organization

```
.
├── bpm/
│   ├── bpm/poc_expedicao_v1.bpmn        # BPMN process definition (deploy via Console)
│   └── bpm/regras_expedicao.dmn      # DMN rules (reference only in this POC)
│
├── backend-python/
│   ├── main.py                 # FastAPI app & endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── core/
│   │   ├── worker_engine.py    # Generic External Task Worker
│   │   └── setup_operaton.py   # Creates users/groups on startup
│   └── domain/
│       ├── tasks.py            # BusinessRules class with handlers
│       └── mock_data.json      # Fake waybill data for testing
│
├── frontend-ops/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── TaskList.tsx    # Main task view
│   │   │   └── Dashboard.tsx   # KPI metrics & heatmap
│   │   ├── components/
│   │   │   └── DynamicForms/   # Task-specific forms
│   │   └── services/
│   │       └── operatonApi.ts  # HTTP client for Operaton
│   └── vite.config.ts
│
└── frontend-protheus/
    ├── src/
    │   └── services/
    │       └── backendApi.ts    # HTTP client for backend
    └── vite.config.ts
```

### Modifying Processes

**To add a new task type:**

1. Create form component in `frontend-ops/src/components/DynamicForms/FormMyTask.tsx`
2. Update BPMN file (deploy via Operaton Console at `localhost:8080/camunda`)
3. Register handler in `backend-python/domain/tasks.py`:
   ```python
   handlers = {
       "my_topic": BusinessRules.my_handler,
   }
   ```
4. Implement handler method in `BusinessRules` class
5. Assign task to group in BPMN

---

## Common Development Tasks

### Running a Single Frontend

```bash
cd frontend-ops
npm install
npm run dev
# Frontend proxies to localhost:8000 (backend) and localhost:8080 (Operaton)
# Operaton and Backend must be running separately (or via Docker Compose)
```

### Testing a Process Manually

1. Start Docker Compose: `docker-compose up -d`
2. Wait 30-40 seconds for startup
3. Deploy BPMN: Open `http://localhost:8080/camunda` → Cockpit → Upload `bpm/expedicao.bpmn`
4. Visit `http://localhost:3001` → click "Liberar para Expedição" on a waybill
5. Visit `http://localhost:3000` → select a user → complete tasks
6. View metrics in Dashboard tab

### Viewing Worker Logs

```bash
docker-compose logs -f backend-python

# Look for:
# "Handler registrado para tópico: validar_peso"
# "External Task recebida: ..." 
# "Task completa: ..."
```

### Accessing Database

```bash
docker-compose exec postgres-db psql -U camunda -d operaton

# Useful queries:
# SELECT * FROM act_ru_task;  -- Runtime tasks
# SELECT * FROM act_ru_variable;  -- Process variables
# SELECT * FROM act_hi_procinst;  -- Process history
```

---

## Important Implementation Details

- **External tasks are NOT removed from queue on error**—Operaton retries automatically
- **Worker thread is daemon**—doesn't block app shutdown
- **No persistent storage of custom data**—all state lives in Operaton's PostgreSQL
- **Forms are dynamically rendered** based on task variables
- **Dashboard metrics query** `act_hi_*` (history) tables, not runtime
- **Mock data is in-memory** (`mock_data.json`), loaded at startup; doesn't persist

---

## When to Use This Architecture

✅ **Good for:**
- Distributed teams (workers/engine decoupled)
- Microservices integration (workers in any tech stack)
- Long-running processes (polling tolerates latency)
- Complex branching logic (BPMN visual modeling)

❌ **Not ideal for:**
- Real-time critical tasks (<1s response)
- High-frequency polling (DB load with many workers)
- Simple linear workflows (BPMN overkill)

---

## Quick Reference

| Task | Command |
|------|---------|
| Start all services | `docker-compose up -d` |
| Check service health | `docker-compose ps` |
| View backend logs | `docker-compose logs -f backend-python` |
| Deploy BPMN | Visit `http://localhost:8080/camunda` → Cockpit |
| API docs | `http://localhost:8000/docs` |
| Start frontend dev | `cd frontend-ops && npm run dev` |
| Stop services | `docker-compose down` |
| Reset DB | `docker-compose down -v` (deletes volumes) |

---

## MCP Server Configuration

MCP (Model Context Protocol) servers are configured in `.github/mcp-config.json`:

### Available MCP Servers

1. **Playwright** – E2E testing framework
   - Use for automating frontend tests across React apps
   - Can interact with frontends at localhost:3000 and localhost:3001

2. **PostgreSQL** – Database introspection
   - Points to the Operaton database (localhost:5432)
   - Useful for querying `act_ru_*` and `act_hi_*` tables
   - Default user: `camunda`, password: `camunda123`

3. **Docker** – Container management
   - Check container status: `docker-compose ps`
   - View logs across services
   - Manage startup/shutdown

To use MCP servers, ensure they're properly configured in your Copilot CLI settings or IDE integration.

---

**Last updated:** February 2026  
**Architecture version:** 1.0
