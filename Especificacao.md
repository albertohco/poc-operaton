Esta é a **Especificação Técnica Unificada e Completa** para a POC "Operaton Expedição Inteligente". Este documento consolida todas as visões arquiteturais, regras de negócio e detalhes de implementação fornecidos, servindo como a fonte única da verdade para o desenvolvimento.

---

# Especificação Técnica: POC Operaton Expedição Inteligente

## 1. Visão Geral e Objetivos

O objetivo desta Prova de Conceito (POC) é digitalizar, automatizar e conferir visibilidade ao processo logístico de expedição, atualmente executado de forma manual ("Shadow Process" com planilhas e papel).

A solução utiliza o **Operaton** (Fork comunitário do Camunda 7) como motor de orquestração de processos (Workflow Engine), integrado a microserviços em Python e interfaces modernas em React. O sistema visa eliminar gargalos, validar regras de negócio automaticamente (DMN) e fornecer métricas de produtividade em tempo real.

---

## 2. Arquitetura da Solução (Infraestrutura Monorepo)

O projeto será estruturado como um **Monorepo** orquestrado via Docker Compose, contendo 5 serviços interconectados através da rede interna `operaton-net`.

### 2.1. Serviços e Containers

1. **Engine (Orquestrador)**
* **Nome do Serviço:** `operaton-engine`
* **Imagem:** Baseada em `operaton/operaton-bpm-platform:latest`.
* **Porta Exposta:** `8080:8080`.
* **Responsabilidade:** Executar o fluxo BPMN, gerenciar estados, tarefas humanas e persistência histórica.
* **Dependência:** Aguarda a inicialização do `postgres-db`.


2. **Banco de Dados**
* **Nome do Serviço:** `postgres-db`
* **Imagem:** `postgres:15`.
* **Porta:** `5432:5432` (Apenas interna ou exposta para debug).
* **Responsabilidade:** Persistência dos dados do Operaton (Runtime e History).


3. **Backend & Workers (Middleware)**
* **Nome do Serviço:** `backend-python`
* **Tecnologia:** Python 3.11+, FastAPI, Uvicorn.
* **Porta Exposta:** `8000:8000`.
* **Mecanismo de Trabalho:** External Task Pattern (Long Polling).
* **Responsabilidades:**
* **Worker Genérico:** Thread em background que realiza "Fetch and Lock" nos tópicos do Operaton.
* **API REST:** Recebe requisições do simulador (Protheus) para instanciar processos.
* **Setup Script:** Script de inicialização que configura usuários e grupos automaticamente no boot.




4. **Frontend Operacional (Ops UI)**
* **Nome do Serviço:** `frontend-ops`
* **Tecnologia:** React, Vite (TypeScript), Tailwind CSS.
* **Porta Exposta:** `3000:3000`.
* **Configuração de Proxy:** O `vite.config.ts` deve redirecionar chamadas `/engine-rest` para o `operaton-engine` e `/api` para o `backend-python`.
* **Responsabilidade:** Interface principal para os operadores (Expedição, Financeiro, Gate) e Dashboard de Gestão.


5. **Frontend Mock Protheus (Simulador)**
* **Nome do Serviço:** `frontend-protheus`
* **Tecnologia:** React, Vite (TypeScript), Tailwind CSS.
* **Porta Exposta:** `3001:3001`.
* **Responsabilidade:** Simular o ERP da empresa, listando romaneios fictícios e disparando a ordem de expedição.



---

## 3. Estrutura de Diretórios e Arquivos

A estrutura de pastas deve seguir rigorosamente o padrão abaixo para facilitar a orquestração:

```text
/poc-operaton-expedicao
├── docker-compose.yml              # Orquestração dos 5 serviços e redes
├── README.md                       # Instruções de "How to Run"
├── /bpm                            # Artefatos de Modelagem
│   ├── expedicao.bpmn              # O desenho do fluxo (XML)
│   └── validacao_peso.dmn          # A tabela de decisão (XML)
├── /backend-python                 # Serviço FastAPI + Workers
│   ├── Dockerfile
│   ├── requirements.txt            # libs: fastapi, uvicorn, requests, httpx, psycopg2-binary
│   ├── main.py                     # Entrypoint da API e Start das Threads de Worker
│   ├── core/
│   │   ├── worker_engine.py        # Lógica Genérica de Long Polling (Fetch & Lock)
│   │   └── setup_operaton.py       # Script de criação de Usuários/Grupos via API
│   ├── domain/
│   │   ├── tasks.py                # Funções de negócio (validar_peso, etc.) mapeadas por tópico
│   │   └── mock_data.json          # Massa de dados: Romaneios e Pedidos fictícios
├── /frontend-ops                   # Interface do Operador e Dashboard
│   ├── Dockerfile
│   ├── vite.config.ts              # Configuração de Proxy reverso
│   ├── src/
│   │   ├── pages/
│   │   │   ├── TaskList.tsx        # Lista de tarefas (Kanban ou Tabela)
│   │   │   └── Dashboard.tsx       # Gráficos, KPIs e Heatmap
│   │   ├── components/
│   │   │   └── DynamicForms/       # Renderizador condicional baseado em formKey
│   │   │       ├── FormSeparacao.tsx
│   │   │       ├── FormFaturamento.tsx
│   │   │       ├── FormColeta.tsx
│   │   │       └── FormCorrecao.tsx
└── /frontend-protheus              # Simulador ERP
    ├── Dockerfile
    └── src/
        └── App.tsx                 # Lista simples de pedidos para disparo

```

---

## 4. Definição do Processo (BPMN & DMN)

### 4.1. Modelo de Dados (Variáveis do Processo)

O processo deve trafegar um objeto JSON contendo:

* `idRomaneio` (String): Identificador único vindo do ERP.
* `idPedido` (String): Identificador do pedido.
* `pesoTeorico` (Float): Peso esperado (Origem: ERP).
* `pesoReal` (Float): Peso aferido na balança (Origem: Input Humano).
* `qtdVolumes` (Integer): Quantidade de caixas.
* `statusFaturamento` (String/Enum): "Total" ou "Parcial".
* `operadorSeparacao` (String): ID do usuário que executou a tarefa.
* `transportadora` (String): Nome da transportadora.
* `observacoes` (String): Campo de texto acumulativo.
* `divergenciaPeso` (Boolean): Saída da regra de negócio.

### 4.2. Fluxo de Trabalho (BPMN: `processo_expedicao_v1`)

1. **Start Event:**
* Acionado via REST API pelo Mock Protheus.
* Recebe: `idRomaneio`, `pesoTeorico`, `itens`.


2. **User Task: "Separar Pedido"**
* **Candidate Group:** `EXPEDICAO`
* **Form Key:** `form_separacao`
* **Ação:** Usuário preenche `pesoReal` e `observacoes`.


3. **Service Task: "Validar Peso"**
* **Tipo:** External Task.
* **Topic Name:** `validar_peso`
* **Execução:** O Worker Python coleta a tarefa, executa a DMN e devolve as variáveis calculadas.


4. **Exclusive Gateway (Aprovado?):**
* Avalia a variável `divergenciaPeso`.
* **Caminho A (Reprovado/True):** Segue para correção.
* **Caminho B (Aprovado/False):** Segue para faturamento.


5. **User Task: "Corrigir Divergência de Peso"** (Se Reprovado)
* **Candidate Group:** `EXPEDICAO`
* **Form Key:** `form_correcao`
* **Ação:** Ajuste físico da carga. Ao concluir, o fluxo retorna (loop) para a **Service Task "Validar Peso"** para nova conferência.


6. **User Task: "Faturar Pedido"** (Se Aprovado)
* **Candidate Group:** `FINANCEIRO`
* **Form Key:** `form_faturamento`
* **Ação:** Informa `statusFaturamento` e número da NF.


7. **User Task: "Conferir e Coletar"** (Gate)
* **Candidate Group:** `GATE`
* **Form Key:** `form_coleta`
* **Ação:** Input de `transportadora` e `qtdVolumes`. Simula uso de leitor de código de barras.


8. **End Event:** Processo concluído com sucesso.

### 4.3. Regra de Negócio (DMN: `validacao_peso.dmn`)

* **Inputs:** `pesoTeorico`, `pesoReal`.
* **Lógica:** Calcular a diferença percentual.
* Fórmula: `|pesoTeorico - pesoReal| / pesoTeorico`


* **Regra:** Permitir desvio de **± 3%**.
* **Outputs:**
* `divergenciaPeso` (Boolean): `true` se desvio > 3%, `false` caso contrário.
* `mensagem` (String): "Peso dentro do limite" ou "Divergência detectada: X%".



---

## 5. Especificação do Backend (Python)

### 5.1. Setup Automático (`setup_operaton.py`)

Executado na inicialização. Deve verificar e criar via API do Operaton se não existirem:

* **Grupos:** `EXPEDICAO`, `FINANCEIRO`, `GATE`.
* **Usuários:**
* `joao.silva` (Membro de EXPEDICAO)
* `maria.santos` (Membro de FINANCEIRO)
* `jose.porteiro` (Membro de GATE)



### 5.2. Worker Genérico (`worker_engine.py`)

Implementação robusta de Long Polling:

1. Loop infinito em background thread.
2. Chama endpoint `POST /external-task/fetchAndLock`.
3. **Abstração:** Possui um dicionário de mapeamento `{ 'topicName': funcao_python }`.
4. Ao receber uma task, verifica o tópico e despacha para a função correspondente em `tasks.py`.
5. Tratamento de Exceção: Se a função falhar, reporta `handleFailure` para o Engine. Se sucesso, reporta `complete`.

### 5.3. API e Mock Data

* **Endpoint:** `POST /api/start-process`
* Recebe JSON com ID do Romaneio.
* Busca detalhes no `pedidos_ficticios.json`.
* Inicia processo no Operaton via `POST /process-definition/key/processo_expedicao_v1/start`.



---

## 6. Especificação do Frontend Operacional (React)

### 6.1. Lista de Tarefas (Kanban/List)

* Deve permitir filtrar tarefas pelo **Grupo do Usuário** (simulado via um Select no cabeçalho: "Logado como: João (Expedição)").
* Consome a API `/task` do Operaton filtrando por `candidateGroup`.

### 6.2. Formulários Dinâmicos

O componente de detalhes da tarefa deve ler a propriedade `formKey` da task selecionada e renderizar o componente correto:

* **`form_separacao`:** Inputs numéricos para Peso Real.
* **`form_faturamento`:** Input texto para NF e Select para Status (Total/Parcial).
* **`form_coleta`:**
* Campo "Scanner": Input de texto focado. Ao pressionar `ENTER`, considera a leitura "bipada" e foca no próximo campo ou submete o form (simulação de coletor de dados).



### 6.3. Dashboard de Produtividade (History API)

Utiliza as APIs de Histórico do Operaton (`/history/process-instance`, `/history/activity-instance`).

* **KPI 1:** Total de Pedidos Separados (Contagem).
* **KPI 2:** Tempo Médio por Etapa (Duração média de cada Activity ID).
* **Mapa de Calor (Heatmap):**
* Exibir uma tabela ou lista das etapas do processo.
* **Lógica de Teste:** Calcular a duração média (`endTime - startTime`).
* **Condicional Visual:** Se a duração média for **> 30 segundos**, destacar a linha/card em **Vermelho** (indicando gargalo). Caso contrário, Verde.



---

## 7. Especificação do Frontend Mock Protheus

* Interface minimalista.
* Carrega a lista de romaneios do `mock_data.json` (via Backend ou importação direta).
* Exibe cards: "Romaneio #101 - Peso Teórico: 500kg".
* Botão de Ação: **"Liberar para Expedição"**.
* Ao clicar, faz POST para o Backend Python (`/api/start-process`), que por sua vez inicia o fluxo no Operaton.
* Exibe feedback visual de "Enviado com sucesso".



---

## 8. Considerações de Desenvolvimento (Prompt Guide)

Para a implementação, o desenvolvedor (Agente AI) deve seguir esta ordem lógica:

1. **Infra:** Criar o `docker-compose.yml` garantindo a comunicação entre containers.
2. **BPMN:** Gerar o XML válido do processo e da DMN.
3. **Backend:** Implementar o loop do Worker antes das regras de negócio específicas para garantir extensibilidade.
4. **Frontend:** Criar primeiro a camada de serviços (API Client) para interagir com o Operaton antes de criar os componentes visuais.
5. **Validação:** Garantir que o loop de correção (rejeição de peso) funcione corretamente na lógica BPMN/DMN.