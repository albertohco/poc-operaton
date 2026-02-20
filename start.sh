#!/bin/bash
# Quick Start Script - POC Operaton Expedição Inteligente
# Este script inicia toda a POC com um único comando

set -e

echo "🚀 Iniciando POC Operaton Expedição Inteligente..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale Docker Compose."
    exit 1
fi

echo -e "${BLUE}✓ Docker verificado${NC}"
echo ""

# Iniciar os serviços
echo -e "${YELLOW}📦 Iniciando containers...${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}⏳ Aguardando serviços ficarem prontos (30-40 segundos)...${NC}"
sleep 40

echo ""
echo -e "${GREEN}✅ Serviços iniciados com sucesso!${NC}"
echo ""

# Exibir informações de acesso
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}📋 URLS DISPONÍVEIS:${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Operaton Console:${NC}"
echo -e "    🔗 http://localhost:8080/camunda"
echo ""
echo -e "  ${GREEN}Frontend Operacional (Dashboard + Tarefas):${NC}"
echo -e "    🔗 http://localhost:3000"
echo ""
echo -e "  ${GREEN}Frontend Protheus (Simulador ERP):${NC}"
echo -e "    🔗 http://localhost:3001"
echo ""
echo -e "  ${GREEN}Backend API (Swagger):${NC}"
echo -e "    🔗 http://localhost:8000/docs"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}👥 USUÁRIOS PADRÃO:${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "  joao.silva (Grupo: EXPEDICAO)"
echo -e "  maria.santos (Grupo: FINANCEIRO)"
echo -e "  jose.porteiro (Grupo: GATE)"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📊 FLUXO RECOMENDADO DE TESTE:${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  1️⃣  Acesse http://localhost:3001 (Protheus Mock)"
echo "      → Clique em 'Liberar para Expedição' em um romaneio"
echo ""
echo "  2️⃣  Acesse http://localhost:3000 (Frontend Ops)"
echo "      → Selecione usuário 'João Silva (EXPEDICAO)'"
echo "      → Complete a tarefa 'Separar Pedido'"
echo ""
echo "  3️⃣  O sistema valida o peso automaticamente"
echo "      → Se desvio > 3%: Aparece tarefa 'Corrigir Divergência'"
echo "      → Se desvio ≤ 3%: Segue para 'Faturar'"
echo ""
echo "  4️⃣  Mude para usuário 'Maria Santos (FINANCEIRO)'"
echo "      → Complete a tarefa 'Faturar Pedido'"
echo ""
echo "  5️⃣  Mude para usuário 'José Porteiro (GATE)'"
echo "      → Complete a tarefa 'Conferir e Coletar'"
echo ""
echo "  6️⃣  Volte ao Frontend Ops e abra o Dashboard (📊)"
echo "      → Visualize KPIs e Mapa de Calor das etapas"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}💡 DICAS ÚTEIS:${NC}"
echo ""
echo "  • Ver logs de um serviço:"
echo "    $ docker-compose logs -f [nome-do-servico]"
echo ""
echo "  • Parar todos os serviços:"
echo "    $ docker-compose down"
echo ""
echo "  • Remover dados persistentes:"
echo "    $ docker-compose down -v"
echo ""
echo "  • Verificar status dos containers:"
echo "    $ docker-compose ps"
echo ""
echo "  • Deploy manual do BPMN/DMN:"
echo "    → Acesse Operaton Console"
echo "    → Cockpit → Processes → Deploy"
echo "    → Selecione arquivos em /bpm/"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}🎉 Tudo pronto! Comece a testar!${NC}"
echo ""
