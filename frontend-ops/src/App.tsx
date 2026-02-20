import React, { useState } from 'react'
import TaskList from './pages/TaskList'
import Dashboard from './pages/Dashboard'

type Pagina = 'tarefas' | 'dashboard'

const App: React.FC = () => {
    const [paginaAtiva, setPaginaAtiva] = useState<Pagina>('tarefas')
    const [usuarioLogado, setUsuarioLogado] = useState('joao.silva')
    const [grupoLogado, setGrupoLogado] = useState('EXPEDICAO')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#1e3a8a',
                color: 'white',
                padding: '15px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px' }}>
                            📦 Operaton - Expedição Inteligente
                        </h1>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                            POC de Orquestração de Processos
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        {/* Seletor de Usuário */}
                        <div>
                            <label style={{ fontSize: '12px', opacity: 0.85 }}>Usuário: </label>
                            <select
                                value={usuarioLogado}
                                onChange={(e) => {
                                    const usuario = e.target.value
                                    setUsuarioLogado(usuario)

                                    // Define o grupo automaticamente
                                    if (usuario === 'joao.silva') setGrupoLogado('EXPEDICAO')
                                    else if (usuario === 'maria.santos') setGrupoLogado('FINANCEIRO')
                                    else if (usuario === 'jose.porteiro') setGrupoLogado('GATE')
                                }}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    marginLeft: '8px'
                                }}
                            >
                                <option value="joao.silva">João Silva (Expedição)</option>
                                <option value="maria.santos">Maria Santos (Financeiro)</option>
                                <option value="jose.porteiro">José Porteiro (Gate)</option>
                            </select>
                        </div>

                        {/* Navegação de Abas */}
                        <nav style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setPaginaAtiva('tarefas')}
                                className="secondary"
                                style={{
                                    backgroundColor: paginaAtiva === 'tarefas' ? '#fff' : 'rgba(255,255,255,0.2)',
                                    color: paginaAtiva === 'tarefas' ? '#1e3a8a' : '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px'
                                }}
                            >
                                📋 Tarefas
                            </button>
                            <button
                                onClick={() => setPaginaAtiva('dashboard')}
                                className="secondary"
                                style={{
                                    backgroundColor: paginaAtiva === 'dashboard' ? '#fff' : 'rgba(255,255,255,0.2)',
                                    color: paginaAtiva === 'dashboard' ? '#1e3a8a' : '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px'
                                }}
                            >
                                📊 Dashboard
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Conteúdo */}
            <main style={{ flex: 1, overflow: 'hidden' }}>
                {paginaAtiva === 'tarefas' ? (
                    <TaskList usuarioLogado={usuarioLogado} grupoLogado={grupoLogado} />
                ) : (
                    <Dashboard />
                )}
            </main>

            {/* Footer */}
            <footer style={{
                backgroundColor: '#f5f5f5',
                padding: '10px 20px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#666',
                borderTop: '1px solid #ddd'
            }}>
                <p style={{ margin: 0 }}>
                    POC Operaton v1.0 | Engine: {' '}
                    <a href="http://localhost:8080" target="_blank" rel="noreferrer">
                        Operaton Console
                    </a>
                    {' '} | Dashboard de Expedição
                </p>
            </footer>
        </div>
    )
}

export default App
