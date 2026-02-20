# 🔌 API Reference - POC Operaton Expedição Inteligente

---

## Backend Python FastAPI (Port 8000)

### Health & Info

#### `GET /`
Retorna informações sobre a API

**Response:**
```json
{
  "message": "POC Operaton - Expedição Inteligente",
  "version": "1.0.0",
  "docs": "/docs",
  "operaton_url": "http://operaton-engine:8080"
}
```

#### `GET /health`
Verifica saúde da API

**Response:**
```json
{
  "status": "ok",
  "operaton_url": "http://operaton-engine:8080"
}
```

---

### Processos

#### `POST /api/start-process`
Inicia uma nova instância de processo de expedição

**Request:**
```json
{
  "idRomaneio": "ROM-2024-001"
}
```

**Response (201 Created):**
```json
{
  "id": "aProcessInstanceId",
  "processInstanceId": "aProcessInstanceId",
  "caseInstanceId": null,
  "message": "Processo iniciado com sucesso para romaneio ROM-2024-001"
}
```

**Errors:**
- `404` - Romaneio não encontrado
- `502` - Erro ao comunicar com Operaton
- `500` - Erro interno

---

### Tarefas

#### `GET /api/tasks`
Lista todas as tarefas disponíveis (opcionalmente filtradas)

**Query Parameters:**
- `assignee` (opcional): Filtra por assignee
- `candidate_group` (opcional): Filtra por grupo candidato

**Example:**
```
GET /api/tasks?candidate_group=EXPEDICAO
```

**Response:**
```json
[
  {
    "id": "aTaskId",
    "name": "Separar Pedido",
    "processInstanceId": "aProcessInstanceId",
    "processDefinitionId": "processo_expedicao_v1:1:xxx",
    "executionId": "anExecutionId",
    "candidateGroups": ["EXPEDICAO"],
    "formKey": "form_separacao",
    "priority": 50,
    "created": "2026-02-07T10:00:00.000+0000"
  }
]
```

#### `GET /api/task/{taskId}`
Obtém detalhes de uma tarefa específica

**Example:**
```
GET /api/task/aTaskId
```

**Response:**
```json
{
  "id": "aTaskId",
  "name": "Separar Pedido",
  "processInstanceId": "aProcessInstanceId",
  "processDefinitionId": "processo_expedicao_v1:1:xxx",
  "executionId": "anExecutionId",
  "candidateGroups": ["EXPEDICAO"],
  "formKey": "form_separacao"
}
```

#### `POST /api/task/{taskId}/complete`
Completa uma tarefa com as variáveis fornecidas

**Request:**
```json
{
  "variables": {
    "pesoReal": 505.50,
    "observacoes": "Peso confere com a nota"
  }
}
```

**Response (204 No Content):**
```json
{
  "message": "Tarefa completada com sucesso"
}
```

**Errors:**
- `404` - Tarefa não encontrada
- `502` - Erro ao comunicar com Operaton
- `500` - Erro interno

---

### Histórico e Analytics

#### `GET /api/history/process-instances`
Retorna histórico de instâncias de processos (para cálculo de KPIs)

**Response:**
```json
[
  {
    "id": "aProcessInstanceId",
    "processDefinitionId": "processo_expedicao_v1:1:xxx",
    "processDefinitionKey": "processo_expedicao_v1",
    "businessKey": null,
    "startTime": "2026-02-07T10:00:00.000+0000",
    "endTime": "2026-02-07T10:15:30.000+0000",
    "durationInMillis": 930000,
    "endActivityId": "EndEvent_1",
    "canceled": false
  }
]
```

#### `GET /api/history/activity-instances`
Retorna histórico de atividades (para cálculo de tempo por etapa)

**Query Parameters:**
- `processInstanceId` (opcional): Filtra por instância de processo

**Response:**
```json
[
  {
    "id": "anActivityInstanceId",
    "activityId": "Task_Separacao",
    "activityName": "Separar Pedido",
    "activityType": "userTask",
    "processInstanceId": "aProcessInstanceId",
    "executionId": "anExecutionId",
    "taskId": "aTaskId",
    "assignee": "joao.silva",
    "startTime": "2026-02-07T10:00:00.000+0000",
    "endTime": "2026-02-07T10:05:00.000+0000",
    "durationInMillis": 300000
  }
]
```

---

### Dados de Teste

#### `GET /api/mock-data/pedidos`
Retorna lista de romaneios fictícios (para teste do frontend Protheus)

**Response:**
```json
[
  {
    "idRomaneio": "ROM-2024-001",
    "idPedido": "PED-001",
    "pesoTeorico": 500,
    "qtdVolumes": 3,
    "itens": [
      {
        "codigoItem": "PROD-001",
        "descricao": "Camiseta Azul P",
        "qtd": 5
      }
    ]
  }
]
```

---

## Operaton REST API (Port 8080)

### Engine

#### `GET /engine-rest/engine`
Verifica se o engine está disponível

**Response:**
```json
[
  {
    "name": "default",
    "version": "7.x.x"
  }
]
```

---

### Tasks

#### `GET /engine-rest/task`
Lista tarefas (com mesmo suporte a filtros que `/api/tasks`)

#### `POST /engine-rest/task/{taskId}/complete`
Completa uma tarefa diretamente no engine

---

### Process Definitions

#### `GET /engine-rest/process-definition`
Lista todas as definições de processos

#### `POST /engine-rest/process-definition/key/{processDefinitionKey}/start`
Inicia uma instância de um processo por sua chave

---

### External Tasks

#### `POST /engine-rest/external-task/fetchAndLock`
Busca e faz lock de tarefas externas (usado pelo Worker Python)

**Request:**
```json
{
  "workerId": "python-worker-1",
  "maxTasks": 5,
  "topics": [
    {
      "topicName": "validar_peso",
      "lockDuration": 30000
    }
  ]
}
```

#### `POST /engine-rest/external-task/{taskId}/complete`
Completa uma tarefa externa com variáveis

#### `POST /engine-rest/external-task/{taskId}/failure`
Reporta falha na execução de uma tarefa externa

---

### History

#### `GET /engine-rest/history/process-instance`
Histórico de instâncias de processos

#### `GET /engine-rest/history/activity-instance`
Histórico de atividades

---

## Frontend APIs (Proxy via Vite)

Os frontends acessam as APIs através de proxy configurado no `vite.config.ts`:

- `/engine-rest/*` → `http://operaton-engine:8080/engine-rest/*`
- `/api/*` → `http://backend-python:8000/api/*`

---

## Swagger/OpenAPI

### Backend Python
```
http://localhost:8000/docs
```

Acesse a documentação interativa do Swagger para testar todos os endpoints da API Python.

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado |
| 204 | No Content - Sucesso sem body |
| 400 | Bad Request - Erro nos parâmetros |
| 404 | Not Found - Recurso não encontrado |
| 500 | Server Error - Erro interno do servidor |
| 502 | Bad Gateway - Erro ao comunicar com outro serviço |

---

## Content-Type

Todas as requisições e respostas usam:
```
Content-Type: application/json
```

---

## Error Responses

### Padrão de Erro (Backend Python)

```json
{
  "detail": "Mensagem descritiva do erro"
}
```

### Padrão de Erro (Operaton Engine)

```json
{
  "type": "ErrorType",
  "message": "Mensagem descritiva do erro"
}
```

---

## Autenticação

⚠️ **A POC não implementa autenticação.** Em produção, implementar OAuth2 ou JWT.

---

## Rate Limiting

⚠️ **Rate limiting não está implementado na POC.** Em produção, implementar limites para evitar abuso.

---

## Timeouts

- Pool interval do Worker: **5 segundos**
- Lock duration: **30 segundos**
- HTTP request timeout: **10 segundos**

---

## Variáveis de Processo

### Estrutura Padrão

```json
{
  "idRomaneio": "ROM-2024-001",
  "idPedido": "PED-001",
  "pesoTeorico": 500.0,
  "pesoReal": 505.0,
  "qtdVolumes": 3,
  "statusFaturamento": "Total",
  "operadorSeparacao": "joao.silva",
  "transportadora": "Sedex",
  "observacoes": "Peso confere",
  "divergenciaPeso": false,
  "mensagem": "Peso dentro do limite"
}
```

### Variáveis Principais por Etapa

| Variável | Etapa | Tipo | Obrigatória |
|----------|-------|------|------------|
| `idRomaneio` | Toda | string | ✅ |
| `pesoTeorico` | Start | float | ✅ |
| `pesoReal` | Separação | float | ✅ |
| `divergenciaPeso` | Validação | boolean | ✅ |
| `observe acoes` | Separação | string | ❌ |
| `statusFaturamento` | Faturamento | string | ✅ |
| `transportadora` | Coleta | string | ✅ |
| `qtdVolumes` | Coleta | integer | ✅ |

---

## Examples com cURL

### Iniciar Processo
```bash
curl -X POST http://localhost:8000/api/start-process \
  -H "Content-Type: application/json" \
  -d '{
    "idRomaneio": "ROM-2024-001"
  }'
```

### Listar Tarefas do Grupo EXPEDICAO
```bash
curl -X GET "http://localhost:8000/api/tasks?candidate_group=EXPEDICAO"
```

### Completar Tarefa
```bash
curl -X POST http://localhost:8000/api/task/{taskId}/complete \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "pesoReal": 505.50
    }
  }'
```

### Obter Histórico
```bash
curl -X GET http://localhost:8000/api/history/process-instances
```

---

Última atualização: Fevereiro 2026
