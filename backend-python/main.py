"""
POC Operaton - Backend FastAPI
Orquestração de Processo de Expedição com Operaton (Camunda 7)
"""
import logging
import os
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

# Importações do projeto
from core.worker_engine import ExternalTaskWorker
from core.setup_operaton import initialize_operaton
from domain.tasks import get_task_handlers

# Configuração de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuração de Ambiente
OPERATON_URL = os.getenv('OPERATON_ENGINE_URL', 'http://localhost:8080')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://camunda:camunda123@localhost:5432/operaton')

# Instância da aplicação FastAPI
app = FastAPI(
    title="POC Operaton - Expedição Inteligente",
    description="API Backend para orquestração de processos de expedição",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variáveis globais
worker: Optional[ExternalTaskWorker] = None
operaton_session = requests.Session()


# ==================== Models ====================

class StartProcessRequest(BaseModel):
    """Requisição para iniciar um processo"""
    idRomaneio: str


class TaskSubmitRequest(BaseModel):
    """Requisição para submeter uma tarefa com variáveis"""
    variables: Dict[str, Any]


class ProcessInstanceResponse(BaseModel):
    """Resposta ao iniciar uma instância de processo"""
    id: str
    processInstanceId: str
    caseInstanceId: Optional[str]
    message: str


# ==================== Startup & Shutdown ====================

@app.on_event("startup")
async def startup_event():
    """Executa ao iniciar a aplicação"""
    logger.info("Iniciando POC Operaton - Expedição Inteligente")
    
    # Aguarda o Operaton ficar disponível
    max_retries = 30
    for attempt in range(max_retries):
        try:
            response = operaton_session.get(
                f"{OPERATON_URL}/engine-rest/engine",
                timeout=5
            )
            if response.status_code == 200:
                logger.info("Engine Operaton disponível!")
                break
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Operaton não ficou disponível após {max_retries} tentativas")
                raise
            logger.info(f"Aguardando Operaton... (tentativa {attempt + 1}/{max_retries})")
            time.sleep(2)
    
    # Setup automático
    try:
        initialize_operaton(OPERATON_URL)
    except Exception as e:
        logger.warning(f"Erro no setup automático: {e}")
    
    # Inicia o Worker
    global worker
    worker = ExternalTaskWorker(
        operaton_url=OPERATON_URL,
        worker_id="python-worker-1",
        poll_interval=5,
        max_tasks=5
    )
    
    # Registra handlers
    handlers = get_task_handlers()
    for topic, handler in handlers.items():
        worker.subscribe(topic, handler)
    
    # Inicia o polling
    worker.start()
    logger.info("Worker iniciado com sucesso")


@app.on_event("shutdown")
async def shutdown_event():
    """Executa ao desligar a aplicação"""
    global worker
    if worker:
        worker.stop()
    logger.info("Aplicação desligada")


# ==================== Endpoints ====================

@app.get("/health")
async def health_check():
    """Health check da API"""
    return {
        "status": "ok",
        "operaton_url": OPERATON_URL
    }


@app.post("/start-process", response_model=ProcessInstanceResponse)
async def start_process(request: StartProcessRequest):
    """
    Inicia uma instância do processo de expedição
    
    Busca os dados do romaneio e inicia o fluxo no Operaton.
    """
    try:
        # Carrega dados fictícios
        mock_data_path = Path(__file__).parent / "domain" / "mock_data.json"
        with open(mock_data_path, 'r', encoding='utf-8') as f:
            mock_data = json.load(f)
        
        # Procura o romaneio
        romaneio = None
        for pedido in mock_data.get('pedidos_ficticios', []):
            if pedido['idRomaneio'] == request.idRomaneio:
                romaneio = pedido
                break
        
        if not romaneio:
            raise HTTPException(status_code=404, detail=f"Romaneio {request.idRomaneio} não encontrado")
        
        # Prepara variáveis de entrada no formato esperado pelo Operaton
        # O Operaton espera: {"variables": {"key": {"value": "val"}}}
        variables_dict = {
            "idRomaneio": romaneio['idRomaneio'],
            "idPedido": romaneio['idPedido'],
            "pesoTeorico": romaneio['pesoTeorico'],
            "qtdVolumes": romaneio['qtdVolumes'],
            "itens": romaneio['itens'],
            "statusFaturamento": "",
            "operadorSeparacao": "",
            "transportadora": "",
            "observacoes": "",
            "divergenciaPeso": False,
            "pesoReal": None
        }
        
        # Converte para o formato esperado pelo Operaton
        variables_formatted = {
            key: {"value": value} for key, value in variables_dict.items()
        }
        
        # Inicia o processo no Operaton
        start_url = f"{OPERATON_URL}/engine-rest/process-definition/key/processo_expedicao_v1/start"
        
        response = operaton_session.post(
            start_url,
            json={"variables": variables_formatted},
            timeout=10
        )
        
        response.raise_for_status()
        result = response.json()
        
        logger.info(f"Processo iniciado para romaneio {request.idRomaneio}: {result['id']}")
        
        return ProcessInstanceResponse(
            id=result['id'],
            processInstanceId=result['id'],
            caseInstanceId=result.get('caseInstanceId'),
            message=f"Processo iniciado com sucesso para romaneio {request.idRomaneio}"
        )
    
    except requests.RequestException as e:
        logger.error(f"Erro ao comunicar com Operaton: {e}")
        raise HTTPException(status_code=502, detail=f"Erro ao comunicar com Operaton: {str(e)}")
    except Exception as e:
        logger.error(f"Erro ao iniciar processo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar processo: {str(e)}")


@app.get("/tasks")
async def get_tasks(assignee: Optional[str] = None, candidate_group: Optional[str] = None):
    """
    Lista tarefas disponíveis, opcionalmente filtradas por assignee ou grupo
    """
    try:
        url = f"{OPERATON_URL}/engine-rest/task"
        params = {}
        
        if assignee:
            params['assignee'] = assignee
        if candidate_group:
            params['candidateGroupIn'] = candidate_group
        
        response = operaton_session.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    except requests.RequestException as e:
        logger.error(f"Erro ao obter tarefas: {e}")
        raise HTTPException(status_code=502, detail="Erro ao obter tarefas do Operaton")


@app.get("/task/{task_id}")
async def get_task(task_id: str):
    """
    Obtém detalhes de uma tarefa específica
    """
    try:
        url = f"{OPERATON_URL}/engine-rest/task/{task_id}"
        response = operaton_session.get(url, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    except requests.RequestException as e:
        logger.error(f"Erro ao obter tarefa {task_id}: {e}")
        raise HTTPException(status_code=502, detail="Erro ao obter tarefa do Operaton")


@app.post("/task/{task_id}/complete")
async def complete_task(task_id: str, request: TaskSubmitRequest):
    """
    Completa uma tarefa com as variáveis fornecidas
    """
    try:
        url = f"{OPERATON_URL}/engine-rest/task/{task_id}/complete"
        
        # O Operaton espera as variáveis no formato: {"variavel": {"value": ...}}
        # request.variables já vem neste formato correto
        payload = {
            "variables": request.variables
        }
        
        logger.info(f"Enviando payload para completar tarefa {task_id}: {payload}")
        response = operaton_session.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        logger.info(f"Tarefa {task_id} completada com sucesso")
        
        return {"message": "Tarefa completada com sucesso"}
    
    except requests.RequestException as e:
        logger.error(f"Erro ao completar tarefa {task_id}: {e}")
        logger.error(f"Resposta do erro: {e.response.text if hasattr(e, 'response') and e.response else 'N/A'}")
        raise HTTPException(status_code=502, detail=f"Erro ao completar tarefa no Operaton: {str(e)}")


@app.get("/history/process-instances")
async def get_history_process_instances():
    """
    Retorna histórico de instâncias de processos (para Dashboard)
    """
    try:
        url = f"{OPERATON_URL}/engine-rest/history/process-instance"
        response = operaton_session.get(url, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    except requests.RequestException as e:
        logger.error(f"Erro ao obter histórico: {e}")
        raise HTTPException(status_code=502, detail="Erro ao obter histórico do Operaton")


@app.get("/history/activity-instances")
async def get_history_activity_instances(processInstanceId: Optional[str] = None):
    """
    Retorna histórico de atividades (para cálculo de KPIs)
    """
    try:
        url = f"{OPERATON_URL}/engine-rest/history/activity-instance"
        params = {}
        
        if processInstanceId:
            params['processInstanceId'] = processInstanceId
        
        response = operaton_session.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    except requests.RequestException as e:
        logger.error(f"Erro ao obter atividades: {e}")
        raise HTTPException(status_code=502, detail="Erro ao obter atividades do Operaton")


@app.get("/mock-data/pedidos")
async def get_mock_pedidos():
    """
    Retorna lista de pedidos fictícios (para o frontend Protheus)
    """
    try:
        mock_data_path = Path(__file__).parent / "domain" / "mock_data.json"
        with open(mock_data_path, 'r', encoding='utf-8') as f:
            mock_data = json.load(f)
        
        return mock_data.get('pedidos_ficticios', [])
    
    except Exception as e:
        logger.error(f"Erro ao obter pedidos fictícios: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter pedidos")


# ==================== Root ====================

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "POC Operaton - Expedição Inteligente",
        "version": "1.0.0",
        "docs": "/docs",
        "operaton_url": OPERATON_URL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
