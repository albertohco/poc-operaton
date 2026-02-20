#!/bin/bash
# Stop and cleanup script

set -e

echo "🛑 Parando POC Operaton..."
docker-compose down

echo "✅ Serviços parados com sucesso."
echo ""
echo "Para remover dados persistentes da base de dados, execute:"
echo "  docker-compose down -v"
echo ""
