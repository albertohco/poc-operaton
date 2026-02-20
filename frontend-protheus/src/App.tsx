import React, { useState, useEffect } from 'react'
import backendApi, { Romaneio } from './services/backendApi'
import './index.css'

const App: React.FC = () => {
    const [romaneios, _setRomaneios] = useState<Romaneio[]>([
        {
            idRomaneio: 'ROM001',
            pesoTeorico: 500,
            itens: [
                { codigoItem: 'ITEM001', descricao: 'Produto A', qtd: 100 },
            ]
        },
        {
            idRomaneio: 'ROM002',
            pesoTeorico: 750.5,
            itens: [
                { codigoItem: 'ITEM002', descricao: 'Produto B', qtd: 50 },
                { codigoItem: 'ITEM003', descricao: 'Produto C', qtd: 75 },
            ]
        },
        {
            idRomaneio: 'ROM003',
            pesoTeorico: 1200,
            itens: [
                { codigoItem: 'ITEM004', descricao: 'Produto D', qtd: 120 },
            ]
        },
    ])

    const [enviando, setEnviando] = useState<string | null>(null)
    const [sucessoMsg, setSucessoMsg] = useState<string | null>(null)
    const [erroMsg, setErroMsg] = useState<string | null>(null)
    const [backendOnline, setBackendOnline] = useState(false)

    useEffect(() => {
        verificarBackend()
    }, [])

    const verificarBackend = async () => {
        try {
            await backendApi.getHealth()
            setBackendOnline(true)
        } catch (error) {
            console.error('Backend offline:', error)
            setBackendOnline(false)
        }
    }

    const handleLiberarExpedicao = async (romaneio: Romaneio) => {
        setEnviando(romaneio.idRomaneio)
        setErroMsg(null)
        setSucessoMsg(null)

        try {
            const resultado = await backendApi.startProcess(romaneio.idRomaneio)
            setSucessoMsg(`✓ Romaneio ${romaneio.idRomaneio} liberado com sucesso! ID do Processo: ${resultado.id}`)

            // Limpa a mensagem após 5 segundos
            setTimeout(() => setSucessoMsg(null), 5000)
        } catch (error) {
            console.error('Erro ao liberar expedição:', error)
            setErroMsg(`✗ Erro ao liberar romaneio. Verifique a conexão com o servidor.`)
        } finally {
            setEnviando(null)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                color: 'white',
                marginBottom: '40px'
            }}>
                <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>
                    🏭 Protheus ERP Mock
                </h1>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
                    Sistema de Gestão de Romaneios - Simulador
                </p>
            </div>

            {/* Status do Backend */}
            <div style={{
                width: '100%',
                maxWidth: '800px',
                marginBottom: '30px'
            }}>
                <div className={`alert ${backendOnline ? 'success' : 'error'}`}>
                    {backendOnline ? '✓ Backend conectado' : '✗ Backend offline - Verifique a conexão'}
                </div>
            </div>

            {/* Mensagens de Sucesso/Erro */}
            {sucessoMsg && (
                <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    marginBottom: '20px'
                }}>
                    <div className="alert success">
                        {sucessoMsg}
                    </div>
                </div>
            )}

            {erroMsg && (
                <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    marginBottom: '20px'
                }}>
                    <div className="alert error">
                        {erroMsg}
                    </div>
                </div>
            )}

            {/* Lista de Romaneios */}
            <div style={{
                width: '100%',
                maxWidth: '800px'
            }}>
                <h2 style={{
                    color: 'white',
                    marginBottom: '20px',
                    fontSize: '20px'
                }}>
                    📋 Romaneios Pendentes
                </h2>

                <div style={{
                    display: 'grid',
                    gap: '20px'
                }}>
                    {romaneios.map(romaneio => (
                        <div key={romaneio.idRomaneio} className="card">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: '15px'
                            }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '18px',
                                        color: '#1e3a8a',
                                        marginBottom: '5px'
                                    }}>
                                        Romaneio: {romaneio.idRomaneio}
                                    </h3>
                                    <p style={{
                                        color: '#666',
                                        margin: 0,
                                        fontSize: '14px'
                                    }}>
                                        📦 Peso Teórico: <strong>{romaneio.pesoTeorico}kg</strong>
                                    </p>
                                </div>
                                <span className="badge success">Pronto</span>
                            </div>

                            <div style={{
                                backgroundColor: '#f9f9f9',
                                padding: '12px',
                                borderRadius: '4px',
                                marginBottom: '15px'
                            }}>
                                <p style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#666',
                                    marginBottom: '8px'
                                }}>
                                    Itens:
                                </p>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0
                                }}>
                                    {romaneio.itens.map(item => (
                                        <li key={item.codigoItem} style={{
                                            fontSize: '12px',
                                            color: '#333',
                                            padding: '4px 0',
                                            borderBottom: '1px solid #e0e0e0'
                                        }}>
                                            <strong>{item.codigoItem}</strong> - {item.descricao} (Qtd: {item.qtd})
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handleLiberarExpedicao(romaneio)}
                                disabled={enviando === romaneio.idRomaneio || !backendOnline}
                                className="primary"
                                style={{ width: '100%' }}
                            >
                                {enviando === romaneio.idRomaneio
                                    ? '⏳ Liberando...'
                                    : '🚀 Liberar para Expedição'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '60px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px'
            }}>
                <p>
                    Prototipo Protheus - Integração com Operaton Expedição Inteligente
                </p>
                <p style={{ marginTop: '5px' }}>
                    Backend em Python | Engine: Operaton (Camunda 7 Fork)
                </p>
            </div>
        </div>
    )
}

export default App
