import React, { useState, useEffect } from 'react'
import dashboardService, { KPI, EtapaProductivity } from '../services/dashboardApi'

const Dashboard: React.FC = () => {
    const [kpis, setKpis] = useState<KPI | null>(null)
    const [etapas, setEtapas] = useState<EtapaProductivity[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        carregarDados()
        const intervalo = setInterval(carregarDados, 10000) // Atualiza a cada 10 segundos

        return () => clearInterval(intervalo)
    }, [])

    const carregarDados = async () => {
        try {
            setCarregando(true)
            const [kpisData, etapasData] = await Promise.all([
                dashboardService.calcularKPIs(),
                dashboardService.calcularEtapasProductivity()
            ])

            setKpis(kpisData)
            setEtapas(etapasData)
            setErro(null)
        } catch (err) {
            console.error('Erro ao carregar dados do dashboard:', err)
            setErro('Erro ao carregar dados. Verifique a conexão com o servidor.')
        } finally {
            setCarregando(false)
        }
    }

    if (carregando && !kpis) {
        return <div style={{ padding: '20px' }}>Carregando dados...</div>
    }

    if (erro) {
        return <div style={{ padding: '20px', color: 'red' }}>{erro}</div>
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h1>Dashboard de Produtividade - Expedição</h1>
                <button
                    onClick={carregarDados}
                    style={{ marginTop: '10px' }}
                    className="secondary"
                >
                    🔄 Atualizar
                </button>
            </div>

            {/* KPIs */}
            {kpis && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                            Total de Processos
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>
                            {kpis.totalProcessos}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                            Processos Completos
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                            {kpis.processosCompletos}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                            {dashboardService.formatarPercentual(kpis.processosCompletos, kpis.totalProcessos)}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                            Sem Completar
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                            {kpis.processosSemCompletar}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                            Tempo Médio Total
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                            {dashboardService.formatarTempo(kpis.tempoMedioTotal)}
                        </div>
                    </div>
                </div>
            )}

            {/* Heatmap de Etapas */}
            <div style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginBottom: '20px' }}>Mapa de Calor - Etapas do Processo</h2>

                {etapas.length === 0 ? (
                    <p style={{ color: '#999' }}>Nenhuma etapa registrada</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9' }}>
                                    <th>Etapa</th>
                                    <th>Instâncias</th>
                                    <th>Tempo Médio</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {etapas.map(etapa => (
                                    <tr
                                        key={etapa.activityId}
                                        style={{
                                            backgroundColor: etapa.status === 'vermelho'
                                                ? 'rgba(244, 67, 54, 0.1)'
                                                : 'rgba(76, 175, 80, 0.1)'
                                        }}
                                    >
                                        <td style={{ fontWeight: '500' }}>
                                            {etapa.nomeEtapa}
                                        </td>
                                        <td>
                                            {etapa.totalInstancias}
                                        </td>
                                        <td>
                                            {dashboardService.formatarTempo(etapa.tempoMedio)}
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: etapa.status === 'vermelho' ? '#f44336' : '#4caf50',
                                                color: 'white'
                                            }}>
                                                {etapa.status === 'vermelho' ? '🔴 Gargalo' : '🟢 Ok'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <strong>📊 Legenda:</strong>
                    <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                        <li><strong>🔴 Gargalo (Vermelho):</strong> Etapa com tempo médio &gt; 30 segundos</li>
                        <li><strong>🟢 Ok (Verde):</strong> Etapa dentro do esperado (&lt;= 30 segundos)</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
