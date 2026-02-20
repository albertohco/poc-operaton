"""
Setup Operaton - Criação automática de Usuários e Grupos
"""
import logging
import requests
import os
from pathlib import Path
from typing import Dict, Any
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)


class OperatonSetup:
    """Gerencia a configuração inicial do Operaton"""
    
    def __init__(self, operaton_url: str):
        self.operaton_url = operaton_url.rstrip('/')
        self.session = requests.Session()
    
    def _deploy_bpmn_files(self):
        """Faz deploy dos arquivos BPMN"""
        try:
            # Procura por arquivos BPMN na pasta bpm do projeto
            # Tenta primeiro o caminho relativo, depois absoluto
            bpm_paths = [
                Path(__file__).parent.parent.parent / "bpm",  # Relativo
                Path("/bpm"),  # Absoluto no container
                Path("./bpm"),  # Relativo ao CWD
            ]
            
            bpm_dir = None
            for path in bpm_paths:
                if path.exists():
                    bpm_dir = path
                    break
            
            if not bpm_dir:
                logger.warning(f"Pasta BPM não encontrada em nenhum dos caminhos testados")
                return
            
            logger.info(f"Usando pasta BPM: {bpm_dir}")
            bpmn_files = list(bpm_dir.glob("*.bpmn"))
            
            if not bpmn_files:
                logger.warning(f"Nenhum arquivo BPMN encontrado em {bpm_dir}")
                return
            
            for bpmn_file in bpmn_files:
                with open(bpmn_file, 'rb') as f:
                    files = {'file': (bpmn_file.name, f, 'application/xml')}
                    
                    # Deploy do processo
                    deploy_url = f"{self.operaton_url}/engine-rest/deployment/create"
                    response = self.session.post(deploy_url, files=files, timeout=10)
                    
                    if response.status_code in [200, 201]:
                        logger.info(f"Processo {bpmn_file.name} deployado com sucesso")
                    else:
                        logger.warning(f"Status inesperado ao fazer deploy de {bpmn_file.name}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Erro ao fazer deploy de arquivos BPMN: {e}")
    
    def setup_all(self):
        """Executa todo o setup necessário"""
        logger.info("Iniciando setup automático do Operaton...")
        
        try:
            self._deploy_bpmn_files()
            self._create_groups()
            self._create_users()
            self._assign_users_to_groups()
            logger.info("Setup automático concluído com sucesso!")
        except Exception as e:
            logger.error(f"Erro durante setup: {e}", exc_info=True)
            raise
    
    def _create_groups(self):
        """Cria os grupos necessários"""
        groups = ['EXPEDICAO', 'FINANCEIRO', 'GATE']
        
        for group_id in groups:
            try:
                # Verifica se grupo já existe
                get_url = f"{self.operaton_url}/engine-rest/group/{group_id}"
                response = self.session.get(get_url, timeout=5)
                
                if response.status_code == 200:
                    logger.info(f"Grupo {group_id} já existe")
                    continue
                
                # Cria o grupo
                create_url = f"{self.operaton_url}/engine-rest/group/create"
                payload = {
                    "id": group_id,
                    "name": f"Grupo {group_id}",
                    "type": "WORKFLOW"
                }
                
                response = self.session.post(create_url, json=payload, timeout=5)
                
                if response.status_code in [200, 204]:
                    logger.info(f"Grupo {group_id} criado com sucesso")
                else:
                    logger.warning(f"Status inesperado ao criar grupo {group_id}: {response.status_code}")
            
            except Exception as e:
                logger.warning(f"Erro ao criar grupo {group_id}: {e}")
    
    def _create_users(self):
        """Cria os usuários necessários"""
        users = [
            {
                "id": "joao.silva",
                "firstName": "João",
                "lastName": "Silva",
                "email": "joao.silva@company.com"
            },
            {
                "id": "maria.santos",
                "firstName": "Maria",
                "lastName": "Santos",
                "email": "maria.santos@company.com"
            },
            {
                "id": "jose.porteiro",
                "firstName": "José",
                "lastName": "Porteiro",
                "email": "jose.porteiro@company.com"
            }
        ]
        
        for user in users:
            try:
                # Verifica se usuário já existe
                get_url = f"{self.operaton_url}/engine-rest/user/{user['id']}"
                response = self.session.get(get_url, timeout=5)
                
                if response.status_code == 200:
                    logger.info(f"Usuário {user['id']} já existe")
                    continue
                
                # Cria o usuário
                create_url = f"{self.operaton_url}/engine-rest/user/create"
                payload = user
                
                response = self.session.post(create_url, json=payload, timeout=5)
                
                if response.status_code in [200, 204]:
                    logger.info(f"Usuário {user['id']} criado com sucesso")
                else:
                    logger.warning(f"Status inesperado ao criar usuário {user['id']}: {response.status_code}")
            
            except Exception as e:
                logger.warning(f"Erro ao criar usuário {user['id']}: {e}")
    
    def _assign_users_to_groups(self):
        """Atribui usuários aos grupos"""
        assignments = [
            ("joao.silva", "EXPEDICAO"),
            ("maria.santos", "FINANCEIRO"),
            ("jose.porteiro", "GATE")
        ]
        
        for user_id, group_id in assignments:
            try:
                url = f"{self.operaton_url}/engine-rest/group/{group_id}/members"
                payload = {"userId": user_id}
                
                response = self.session.post(url, json=payload, timeout=5)
                
                if response.status_code in [200, 204]:
                    logger.info(f"Usuário {user_id} adicionado ao grupo {group_id}")
                else:
                    logger.warning(f"Status inesperado ao adicionar {user_id} ao grupo {group_id}: {response.status_code}")
            
            except Exception as e:
                logger.warning(f"Erro ao adicionar {user_id} ao grupo {group_id}: {e}")


def initialize_operaton(operaton_url: str):
    """Função de inicialização conveniente"""
    setup = OperatonSetup(operaton_url)
    setup.setup_all()
