# ⚡ Quick Reference - POC Operaton

## 🚀 Start/Stop

```bash
# Iniciar
cd /home/local_us/poc-operaton
docker-compose up -d

# Parar
docker-compose down

# Logs
docker-compose logs -f [service-name]

# Ver status
docker-compose ps
```

---

## 🔗 URLs Principais

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Operaton Console | http://localhost:8080/camunda | Admin, Deploy BPMN |
| Frontend Ops | http://localhost:3000 | Tarefas + Dashboard |
| Frontend Protheus | http://localhost:3001 | Simulador ERP |
| Backend API | http://localhost:8000/docs | Swagger |
| PostgreSQL | localhost:5432 | Banco de dados |

---

## 👥 Usuários Padrão

| Usuário | Grupo | Senha |
|---------|-------|-------|
| `joao.silva` | EXPEDICAO | (sem senha) |
| `maria.santos` | FINANCEIRO | (sem senha) |
| `jose.porteiro` | GATE | (sem senha) |

---

## 🔄 Fluxo do Processo

```
1. Romaneio criado (Protheus)
2. Separar Pedido (João - EXPEDICAO)
3. Validar Peso (Worker Python)
   ├─> Desvio > 3%? → Corrigir → Loop
   └─> Desvio ≤ 3%? → Faturar
4. Faturar Pedido (Maria - FINANCEIRO)
5. Conferir e Coletar (José - GATE)
6. Fim
```

---

## 📊 KPIs Dashboard

- **Total**: Todos os processos
- **Completos**: % de conclusão
- **Sem Completar**: Em andamento
- **Tempo Médio**: Duração total
- **Gargalos**: Etapas > 30s (vermelho)

---

## 🔌 Principais Endpoints

### Start Process
```bash
POST /api/start-process
{
  "idRomaneio": "ROM-2024-001"
}
```

### Get Tasks
```bash
GET /api/tasks?candidate_group=EXPEDICAO
```

### Complete Task
```bash
POST /api/task/{taskId}/complete
{
  "variables": {
    "pesoReal": 505,
    "observacoes": "ok"
  }
}
```

### History
```bash
GET /api/history/process-instances
GET /api/history/activity-instances
```

---

## 📁 Estrutura Importante

```
poc-operaton/
├── docker-compose.yml      ← Orquestração
├── README.md              ← Guia completo
├── API_REFERENCE.md       ← Endpoints
├── ARCHITECTURE.md        ← Detalhamento técnico
├── bpm/
│   ├── expedicao.bpmn     ← Fluxo BPMN
│   └── validacao_peso.dmn ← Regras DMN
├── backend-python/
│   ├── main.py            ← FastAPI (348 l.)
│   ├── core/
│   │   ├── worker_engine.py      (181 l.)
│   │   └── setup_operaton.py     (139 l.)
│   └── domain/
│       ├── tasks.py              (115 l.)
│       └── mock_data.json
└── frontend-ops/
    └── src/
        ├── pages/
        │   ├── TaskList.tsx      (150 l.)
        │   └── Dashboard.tsx     (190 l.)
        └── components/DynamicForms/
            ├── FormSeparacao.tsx
            ├── FormFaturamento.tsx
            ├── FormColeta.tsx
            └── FormCorrecao.tsx
```

---

## 🐘 Variáveis do Processo

```json
{
  "idRomaneio": "string",
  "idPedido": "string",
  "pesoTeorico": "float",
  "pesoReal": "float",
  "qtdVolumes": "int",
  "statusFaturamento": "string (Total|Parcial)",
  "operadorSeparacao": "string",
  "transportadora": "string",
  "observacoes": "string",
  "divergenciaPeso": "boolean",
  "mensagem": "string"
}
```

---

## 🔧 Configurações Importantes

### Tolerância de Peso
**Arquivo:** `domain/tasks.py`  
**Campo:** `TOLERANCE_PERCENT = 3.0`

### Poll Interval
**Arquivo:** `main.py`  
**Padrão:** 5 segundos

### Lock Duration
**Arquivo:** `main.py`  
**Padrão:** 30 segundos

### Database
**URL:** `postgresql://camunda:camunda123@postgres-db:5432/operaton`  
**Driver:** psycopg2-binary

---

## 📝 Teste Rápido (5 min)

1. **Terminal 1:** `docker-compose up -d`
2. **Aguarde:** 40 segundos
3. **Browser:** http://localhost:3001
4. **Click:** "Liberar para Expedição"
5. **Browser:** http://localhost:3000
6. **Select:** João Silva
7. **Action:** Preencha "Separar Pedido"
8. **Observe:** Dashboard mostra KPIs

---

## 🐛 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Container não inicia | `docker-compose logs` |
| Tarefas não aparecem | Deploy BPMN no Console |
| 502 Bad Gateway | Aguarde Operaton ficar ready |
| Formulários vazios | Verifique formKey no BPMN |
| Erro de peso | Valores numéricos só |

---

## 📚 Arquivos de Documentação

| Arquivo | Conteúdo | Linhas |
|---------|----------|--------|
| README.md | Guia completo + test steps | 400+ |
| CHECKLIST.md | Verificação de implementação | 300+ |
| API_REFERENCE.md | Endpoints + exemplos cURL | 400+ |
| ARCHITECTURE.md | Diagramas + detalhes técnicos | 600+ |
| SUMMARY.md | Este sumário executivo | 450+ |
| QUICK_REFERENCE.md | Este arquivo (referência rápida) | - |

---

## 🔐 Credenciais (POC - NÃO PRODUÇÃO)

```
PostgreSQL:
  User: camunda
  Pass: camunda123
  DB: operaton

Operaton API:
  No auth (POC mode)

Frontend:
  No auth (selecione usuário no dropdown)
```

---

## 📊 Stack Versions

```
- Docker Compose: 3.8+
- PostgreSQL: 15-alpine
- Operaton: latest (Camunda 7)
- Python: 3.11+
- FastAPI: 0.104.1
- React: 18.2.0
- TypeScript: 5.2.2
- Vite: 5.0.0
- Node: 18+
```

---

## ⚙️ Variáveis de Ambiente (Opcional)

```bash
# .env (raiz do projeto)
OPERATON_ENGINE_URL=http://operaton-engine:8080
DATABASE_URL=postgresql://camunda:camunda123@postgres-db:5432/operaton
REACT_APP_OPERATON_URL=http://localhost:8080
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🚀 Comandos Úteis

```bash
# Listar containers
docker ps

# Build frontend-ops
docker build -t frontend-ops frontend-ops/

# Rebuild sem cache
docker-compose build --no-cache

# Executar comando no container
docker-compose exec backend-python python domain/tasks.py

# Ver logs em tempo real
docker-compose logs -f backend-python

# Remover tudo (inclui volumes!)
docker-compose down -v

# Restart um serviço
docker-compose restart backend-python

# Ver recursos utilizados
docker stats
```

---

## 💾 Volumes e Persistência

```
postgres_data:
  └─> /var/lib/postgresql/data
  └─> Persiste entre restarts
  └─> Remove com: docker-compose down -v
```

---

## 🔄 Health Checks Status

```
postgres-db:
  test: pg_isready -U camunda -d operaton
  interval: 10s
  
operaton-engine:
  test: curl -f http://localhost:8080/engine-rest/engine
  interval: 10s
```

---

## 📱 Responsiveness

- ✅ Frontend Ops: Desktop e tablet
- ✅ Frontend Protheus: Mobile-first
- ✅ Dashboard: Grid responsivo
- ✅ Formulários: Full width

---

## 🎨 Temas CSS

- **Frontend Ops:** Azul escuro (#1e3a8a) + tons neutros
- **Frontend Protheus:** Roxo gradiente (#667eea → #764ba2)
- **Dark mode:** Não implementado
- **Accessibility:** Basic (WCAG 2.0 AA)

---

## 📞 Contatos para Instâncias

| Instância | Host | Port |
|-----------|------|------|
| Operaton Engine | localhost | 8080 |
| Backend API | localhost | 8000 |
| Frontend Ops | localhost | 3000 |
| Frontend Protheus | localhost | 3001 |
| PostgreSQL | localhost | 5432 |
| Docker Network | operaton-net | - |

---

## ⏱️ Timeouts Padrão

- HTTP requests: 10s
- Database: 5s
- Poll interval: 5s
- Lock duration: 30s
- Startup healthcheck: 30x10s = 5min

---

## 🎯 Casos de Uso

1. **Demonstração:** Fluxo end-to-end em 5 min
2. **Treinamento:** Entender BPMN/DMN/External Task
3. **Prototipagem:** Base para sistemas reais
4. **Integração:** Padrão aplicável em outros contextos
5. **Benchmarking:** Testar performance local

---

## 🔗 Links Importantes

- [Operaton Docs](https://docs.operaton.org/)
- [Camunda BPMN](https://docs.camunda.org/manual/7.18/reference/bpmn20/)
- [DMN 1.3](https://docs.camunda.org/manual/7.18/reference/dmn/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Vite](https://vitejs.dev/)

---

## ✨ Extras

- Swagger docs incluído (`/docs`)
- CORS habilitado para desenvolvimento
- Logging estruturado
- Error handling robusto
- Mock data pronto para teste

---

**Last Updated:** Fevereiro 2026  
**Version:** 1.0.0  
**Status:** Production-Ready (POC)
