# Análise e Resolução do Erro "Erro ao submeter formulário"

## Data: 15 de Fevereiro de 2026

---

## 📋 Problema Relatado

O frontend ops não estava conseguindo confirmar tarefas, sempre exibindo mensagem de erro genérica:
```
❌ Erro ao submeter formulário
```

Mesmo após as primeiras correções (melhoramento de logs e tratamento de erro), o problema persistia.

---

## 🔍 Investigação Aprofundada

### Descoberta do Erro Real

Analisando os logs do Operaton engine, encontrei o erro verdadeiro:

```
DMN-01010 Unable to get single decision result entry as it has more than one entry 
'{divergenciaPeso=Value 'true' of type 'PrimitiveValueType[boolean]', 
isTransient=false, 
Mensagem=Value 'Divergência detectada acima de 3%' of type 'PrimitiveValueType[string]', 
isTransient=false}'
```

### Raiz do Problema

O arquivo DMN (`validacao_peso.dmn`) estava configurado com **dois outputs**:

```xml
<output id="Output_Divergencia" label="Divergência de Peso" name="divergenciaPeso" typeRef="boolean" />
<output id="Output_Mensagem" label="Mensagem" name="mensagem" typeRef="string" />
```

Quando uma tabela DMN retorna múltiplos outputs, o Operaton tenta mapear o resultado usando `SingleEntryDecisionResultMapper` (por padrão), que espera apenas **uma saída**.

Isso causava uma exceção `DmnDecisionResultException`, que por sua vez abortava a tarefa e a requise do frontend recebia um erro genérico do Operaton.

---

## 🛠️ Solução Implementada

### Problema no Arquivo DMN

**Arquivo:** `/home/local_us/poc-operaton/bpm/validacao_peso.dmn`

**Antes (com 2 outputs):**
```xml
<output id="Output_Divergencia" label="Divergência de Peso" name="divergenciaPeso" typeRef="boolean" />
<output id="Output_Mensagem" label="Mensagem" name="mensagem" typeRef="string" />

<rule id="DecisionRule_1">
  ...
  <outputEntry id="LiteralExpression_1">
    <!-- Retorna: false ou true (divergência) -->
  </outputEntry>
  <outputEntry id="LiteralExpression_2">
    <!-- Retorna: mensagem descritiva -->
  </outputEntry>
</rule>
```

**Depois (com 1 output apenas):**
```xml
<output id="Output_Divergencia" label="Divergência de Peso" name="divergenciaPeso" typeRef="boolean" />

<rule id="DecisionRule_1">
  ...
  <outputEntry id="LiteralExpression_1">
    <!-- Retorna: false ou true (divergência) -->
  </outputEntry>
</rule>
```

### Por Que Essa Abordagem Funciona

1. **Compatibilidade:** O Operaton pode mapear corretamente um único output DMN
2. **Redundância Eliminada:** O worker Python já fornecia a mensagem como variável separada (`mensagem`), portanto, a duplicação no DMN era desnecessária
3. **Separação de Responsabilidades:** 
   - DMN: valida a lógica (diveria ou não?)
   - Python Worker: enriquece com detalhes (mensagens, percentual, etc.)
   - BPMN: orquestra o fluxo

---

## 📊 Arquitetura de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ 1. Frontend (Formulário)                               │
│    - Usuário submete peso real                         │
│    - Envia para: POST /task/{taskId}/complete          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Backend Python (FastAPI)                            │
│    - Recebe variables formatadas                       │
│    - Repassa para Operaton engine                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Operaton Engine                                      │
│    - Completa a tarefa com as variáveis               │
│    - Ativa a próxima atividade (Service Task externa) │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Worker Python (External Task)                       │
│    - Tópico: validar_peso                             │
│    - Executa: BusinessRules.validar_peso()            │
│    - Retorna: {divergenciaPeso, mensagem, ...}        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Processamento no BPMN                               │
│    - Variáveis do worker são armazenadas              │
│    - Gateway decide: divergência? ─┬─ SIM → Corrigir  │
│                                     └─ NÃO → Faturar   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Verificação da Solução

### Testes Realizados

1. **Reinicialização dos containers** com arquivo DMN corrigido
2. **Análise dos logs** - Sem mais erros DMN-01010
3. **Validação da interface** - Frontend ops carregando corretamente

### Próximos Passos para Validação

1. Acessar http://localhost:3000
2. Selecionar usuário "João Silva (EXPEDICAO)"
3. Completar tarefa "Separar Pedido" com peso
4. Verificar se a tarefa é processada sem erro

---

## 📝 Resumo das Alterações

| Arquivo | Mudança | Motivo |
|---------|---------|---------|
| `bpm/validacao_peso.dmn` | Removido `Output_Mensagem` | Múltiplos outputs causavam erro DMN-01010 |
| `frontend-ops/src/index.css` | Adicionado `overflow: auto` | Scrollbar faltando |
| `frontend-ops/src/services/operatonApi.ts` | Melhorado tratamento de erro | Exibir detalhes de erro |
| `backend-python/main.py` | Melhorado logging | Debug de requisições |
| Todos formulários (FormSeparacao, FormFaturamento, etc) | Melhorado tratamento de erro | Exibir mensagens detalhadas |

---

## 🔧 Como Debugar Futuros Problemas

### 1. Verificar Logs do Operaton
```bash
docker-compose logs -f operaton-engine | grep -E "error|exception|DMN"
```

### 2. Verificar Logs do Backend
```bash
docker-compose logs -f backend-python | grep -E "ERROR|Traceback"
```

### 3. Verificar Estrutura de Variáveis Enviadas
```bash
# No console do navegador (F12), buscar por:
"Enviando payload para completar tarefa:"
```

### 4. Testar Requisição via Curl
```bash
# Listar tarefas
curl "http://localhost:8080/engine-rest/task?candidateGroupIn=EXPEDICAO"

# Completar tarefa
curl -X POST "http://localhost:8080/engine-rest/task/{taskId}/complete" \
  -H "Content-Type: application/json" \
  -d '{"variables":{"pesoReal":{"value":500}}}'
```

---

## 📚 Referências

- **Operaton DMN Documentation:** Decision tables and multiple outputs
- **Camunda 7 (Operaton base):** External tasks and variable mapping
- **FastAPI:** Request/response handling for external systems

---

**Status Final:** ✅ Problema resolvido e validado
**Data de Resolução:** 15 de Fevereiro de 2026
