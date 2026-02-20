"""
Worker Engine - Implementação de Long Polling para External Tasks do Operaton
"""
import logging
import time
import threading
from typing import Dict, Callable, Any, Optional
import requests
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)


class ExternalTaskWorker:
    """
    Worker genérico para Long Polling com Operaton (Camunda 7).
    Implementa fetch-and-lock e despacha tarefas para funções registradas.
    """
    
    def __init__(self, 
                 operaton_url: str,
                 worker_id: str = "python-worker-1",
                 poll_interval: int = 5,
                 max_tasks: int = 5,
                 lock_duration: int = 30000):
        """
        Args:
            operaton_url: URL do Engine do Operaton (ex: http://localhost:8080)
            worker_id: Identificador único do worker
            poll_interval: Intervalo em segundos entre polling (default: 5s)
            max_tasks: Máximo de tarefas a fetch por polling (default: 5)
            lock_duration: Duração do lock em ms (default: 30s = 30000ms)
        """
        self.operaton_url = operaton_url.rstrip('/')
        self.worker_id = worker_id
        self.poll_interval = poll_interval
        self.max_tasks = max_tasks
        self.lock_duration = lock_duration
        
        # Dicionário mapeando topic -> função de handler
        self.handlers: Dict[str, Callable] = {}
        
        # Flag para parar o worker
        self._running = False
        self._thread: Optional[threading.Thread] = None
    
    def subscribe(self, topic: str, handler: Callable[[Dict[str, Any]], Dict[str, Any]]):
        """
        Registra um handler para um tópico específico.
        
        O handler deve ter a assinatura:
            def handler(task_data: Dict[str, Any]) -> Dict[str, Any]:
                # Processar task_data
                return resultado (ou raise Exception)
        """
        self.handlers[topic] = handler
        logger.info(f"Handler registrado para tópico: {topic}")
    
    def start(self):
        """Inicia o worker em uma thread separada"""
        if self._running:
            logger.warning("Worker já está rodando")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._polling_loop, daemon=True)
        self._thread.start()
        logger.info(f"Worker iniciado com ID: {self.worker_id}")
    
    def stop(self):
        """Para o worker"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("Worker parado")
    
    def _polling_loop(self):
        """Loop principal de polling"""
        while self._running:
            try:
                self._fetch_and_process_tasks()
            except Exception as e:
                logger.error(f"Erro no polling loop: {e}", exc_info=True)
            
            time.sleep(self.poll_interval)
    
    def _fetch_and_process_tasks(self):
        """Faz fetch das tarefas e processa as que têm handlers registrados"""
        if not self.handlers:
            return
        
        topics = list(self.handlers.keys())
        
        fetch_url = f"{self.operaton_url}/engine-rest/external-task/fetchAndLock"
        
        payload = {
            "workerId": self.worker_id,
            "maxTasks": self.max_tasks,
            "topics": [
                {
                    "topicName": topic,
                    "lockDuration": self.lock_duration
                }
                for topic in topics
            ]
        }
        
        try:
            response = requests.post(fetch_url, json=payload, timeout=30)
            response.raise_for_status()
            
            tasks = response.json()
            
            for task in tasks:
                self._process_single_task(task)
        
        except RequestException as e:
            logger.debug(f"Erro ao fazer fetch de tarefas: {e}")
        except Exception as e:
            logger.error(f"Erro inesperado no fetch: {e}", exc_info=True)
    
    def _process_single_task(self, task: Dict[str, Any]):
        """Processa uma única tarefa externa"""
        task_id = task.get('id')
        topic = task.get('topicName')
        
        try:
            if topic not in self.handlers:
                logger.warning(f"Nenhum handler para topic: {topic}")
                self._report_failure(task_id, f"No handler for topic: {topic}")
                return
            
            handler = self.handlers[topic]
            
            # Extrai variáveis do processo
            variables = task.get('variables', {})
            
            # Executa o handler
            logger.info(f"Executando handler para task {task_id} (topic: {topic})")
            result = handler(variables)
            
            # Reporta sucesso
            self._report_success(task_id, result)
            logger.info(f"Task {task_id} completada com sucesso")
        
        except Exception as e:
            logger.error(f"Erro ao processar task {task_id}: {e}", exc_info=True)
            self._report_failure(task_id, str(e))
    
    def _report_success(self, task_id: str, result: Dict[str, Any]):
        """Reporta sucesso da execução de uma tarefa"""
        complete_url = f"{self.operaton_url}/engine-rest/external-task/{task_id}/complete"
        
        payload = {
            "workerId": self.worker_id,
            "variables": result if isinstance(result, dict) else {}
        }
        
        try:
            response = requests.post(complete_url, json=payload, timeout=10)
            response.raise_for_status()
        except RequestException as e:
            logger.error(f"Erro ao reportar sucesso da task {task_id}: {e}")
    
    def _report_failure(self, task_id: str, error_message: str):
        """Reporta falha na execução de uma tarefa"""
        failure_url = f"{self.operaton_url}/engine-rest/external-task/{task_id}/failure"
        
        payload = {
            "workerId": self.worker_id,
            "errorMessage": error_message,
            "retries": 2,
            "retryTimeout": 10000
        }
        
        try:
            response = requests.post(failure_url, json=payload, timeout=10)
            response.raise_for_status()
        except RequestException as e:
            logger.error(f"Erro ao reportar falha da task {task_id}: {e}")
