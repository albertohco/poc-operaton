import React from 'react'

interface Item {
  id: string
  descricao: string
  quantidade: number
}

interface RomaneioData {
  idRomaneio?: string
  idPedido?: string
  pesoTeorico?: number
  qtdVolumes?: number
  itens?: Item[]
  [key: string]: any
}

interface RomaneioCardProps {
  dados: RomaneioData
  compact?: boolean
}

const RomaneioCard: React.FC<RomaneioCardProps> = ({ dados, compact = false }) => {
  if (!dados.idRomaneio) {
    return null
  }

  const itens = dados.itens || []
  const pesoTeorico = dados.pesoTeorico || 0
  const qtdVolumes = dados.qtdVolumes || 0
  const totalItens = itens.length

  if (compact) {
    // Versão compacta para lista de tarefas
    return (
      <div style={{
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f0f8ff',
        borderLeft: '3px solid #0066cc',
        borderRadius: '3px',
        fontSize: '12px'
      }}>
        <div style={{ marginBottom: '4px', fontWeight: '500', color: '#0066cc' }}>
          📦 {totalItens} {totalItens === 1 ? 'item' : 'itens'} | ⚖️ {pesoTeorico}kg | 📦 {qtdVolumes} volumes
        </div>
        {itens.length > 0 && (
          <div style={{ fontSize: '11px', color: '#666', maxHeight: '60px', overflowY: 'auto' }}>
            {itens.map(item => (
              <div key={item.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                • {item.descricao} (x{item.quantidade})
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Versão completa para painel de detalhes
  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Cabeçalho do Romaneio */}
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, color: '#0066cc', fontSize: '16px' }}>
            🚚 Romaneio: {dados.idRomaneio}
          </h3>
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#0066cc'
          }}>
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </div>
        </div>
        {dados.idPedido && (
          <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
            <strong>Pedido:</strong> {dados.idPedido}
          </p>
        )}
      </div>

      {/* Resumo de Informações */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3e0',
          borderRadius: '4px',
          textAlign: 'center',
          borderLeft: '3px solid #ff9800'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Peso Teórico</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
            ⚖️ {pesoTeorico}kg
          </div>
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: '#f3e5f5',
          borderRadius: '4px',
          textAlign: 'center',
          borderLeft: '3px solid #9c27b0'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Volumes</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9c27b0' }}>
            📦 {qtdVolumes}
          </div>
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          textAlign: 'center',
          borderLeft: '3px solid #4caf50'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total de Itens</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
            🛍️ {totalItens}
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      {itens.length > 0 ? (
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#333',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '8px'
          }}>
            📋 Itens do Romaneio
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '8px'
          }}>
            {itens.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                  border: '1px solid #eee',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: '2px'
                  }}>
                    {item.descricao}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    ID: {item.id}
                  </div>
                </div>
                <div style={{
                  padding: '6px 10px',
                  backgroundColor: '#e3f2fd',
                  color: '#0066cc',
                  borderRadius: '3px',
                  fontWeight: '500',
                  fontSize: '13px',
                  minWidth: '60px',
                  textAlign: 'center'
                }}>
                  {item.quantidade}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          color: '#999'
        }}>
          ℹ️ Nenhum item disponível
        </div>
      )}
    </div>
  )
}

export default RomaneioCard
