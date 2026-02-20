"""
Tasks - Funções de Negócio mapeadas por tópico
"""
import logging
import json
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class BusinessRules:
    """Regras de negócio da expedição"""
    
    # Limite de desvio permitido em percentual
    TOLERANCE_PERCENT = 3.0
    
    @staticmethod
    def validar_peso(variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Task: Validar Peso
        
        Valida se o peso real está dentro da tolerância de ±3% do peso teórico.
        
        Input esperado:
            - pesoTeorico: Float
            - pesoReal: Float
        
        Output:
            - divergenciaPeso: Boolean (true = divergência, false = dentro da tolerância)
            - mensagem: String (descrição da validação)
        """
        try:
            peso_teorico = float(variables.get('pesoTeorico', 0))
            peso_real = float(variables.get('pesoReal', 0))
            
            if peso_teorico == 0:
                return {
                    "divergenciaPeso": True,
                    "mensagem": "Erro: Peso teórico não pode ser zero"
                }
            
            # Calcula a diferença percentual
            diferenca_percentual = abs(peso_teorico - peso_real) / peso_teorico * 100
            
            # Verifica se está dentro da tolerância
            divergencia = diferenca_percentual > BusinessRules.TOLERANCE_PERCENT
            
            if divergencia:
                mensagem = f"Divergência detectada: {diferenca_percentual:.2f}% (limite: {BusinessRules.TOLERANCE_PERCENT}%)"
                logger.warning(mensagem)
            else:
                mensagem = f"Peso dentro do limite: {diferenca_percentual:.2f}%"
                logger.info(mensagem)
            
            return {
                "divergenciaPeso": divergencia,
                "mensagem": mensagem,
                "diferenca_percentual": diferenca_percentual
            }
        
        except (ValueError, TypeError) as e:
            logger.error(f"Erro ao validar peso: {e}")
            return {
                "divergenciaPeso": True,
                "mensagem": f"Erro ao validar peso: {str(e)}"
            }


def get_task_handlers() -> Dict[str, callable]:
    """
    Retorna um dicionário mapeando tópicos para funções de handler.
    
    Cada handler recebe um Dict com as variáveis do processo e deve retornar
    um Dict com as variáveis a serem atualizadas.
    """
    return {
        "validar_peso": BusinessRules.validar_peso,
    }


# Para debugging
if __name__ == "__main__":
    # Teste da função de validação
    test_cases = [
        {
            "pesoTeorico": 500.0,
            "pesoReal": 510.0,
            "descricao": "Dentro da tolerância (2%)"
        },
        {
            "pesoTeorico": 500.0,
            "pesoReal": 515.0,
            "descricao": "Fora da tolerância (3%)"
        },
        {
            "pesoTeorico": 500.0,
            "pesoReal": 485.0,
            "descricao": "Abaixo da tolerância (-3%)"
        },
        {
            "pesoTeorico": 500.0,
            "pesoReal": 470.0,
            "descricao": "Bem abaixo da tolerância (-6%)"
        },
    ]
    
    print("=== Testes de Validação de Peso ===\n")
    for test in test_cases:
        result = BusinessRules.validar_peso(test)
        print(f"{test['descricao']}")
        print(f"  Entrada: {test['pesoTeorico']} kg (teórico) vs {test['pesoReal']} kg (real)")
        print(f"  Resultado: Divergência={result['divergenciaPeso']}, Mensagem={result['mensagem']}")
        print()
