import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../services/operatonApi'
import FormSeparacao from '../components/DynamicForms/FormSeparacao'
import FormFaturamento from '../components/DynamicForms/FormFaturamento'
import FormColeta from '../components/DynamicForms/FormColeta'
import FormCorrecao from '../components/DynamicForms/FormCorrecao'
import RomaneioCard from '../components/RomaneioCard'

interface TaskListProps {
    usuarioLogado: string
    grupoLogado: string
}

interface TaskComVariaveis extends Task {
    variaveisTarefa?: Record<string, any>
}

const TaskList: React.FC<TaskListProps> = ({ usuarioLogado, grupoLogado }) => {
    const [tarefas, setTarefas] = useState<TaskComVariaveis[]>([])
    const [tarefaSelecionada, setTarefaSelecionada] = useState<TaskComVariaveis | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [carregandoVariaveis, setCarregandoVariaveis] = useState(false)

    useEffect(() => {
        carregarTarefas()
        const intervalo = setInterval(carregarTarefas, 5000) // Recarrega a cada 5 segundos

        return () => clearInterval(intervalo)
    }, [grupoLogado])

    const carregarTarefas = async () => {
        try {
            setCarregando(true)
            const tarefasData = await operatonApi.getTasks(grupoLogado)
            setTarefas(tarefasData || [])
            setErro(null)
        } catch (err) {
            console.error('Erro ao carregar tarefas:', err)
            setErro('Erro ao carregar tarefas. Verifique a conexão com o servidor.')
        } finally {
            setCarregando(false)
        }
    }

    const carregarVariaveisTarefa = async (tarefa: TaskComVariaveis) => {
        try {
            setCarregandoVariaveis(true)
            const variaveis = await operatonApi.getTaskVariables(tarefa.id)
            const tarefaComVariaveis = {
                ...tarefa,
                variaveisTarefa: variaveis
            }
            setTarefaSelecionada(tarefaComVariaveis)
            setErro(null)
        } catch (err) {
            console.error('Erro ao carregar variáveis da tarefa:', err)
            setErro('Erro ao carregar dados da tarefa.')
            setTarefaSelecionada(tarefa)
        } finally {
            setCarregandoVariaveis(false)
        }
    }

    const renderFormulario = (tarefa: TaskComVariaveis) => {
        switch (tarefa.formKey) {
            case 'form_separacao':
                return <FormSeparacao tarefa={tarefa} onConcluido={handleTarefaConcluida} />
            case 'form_faturamento':
                return <FormFaturamento tarefa={tarefa} onConcluido={handleTarefaConcluida} />
            case 'form_coleta':
                return <FormColeta tarefa={tarefa} onConcluido={handleTarefaConcluida} />
            case 'form_correcao':
                return <FormCorrecao tarefa={tarefa} onConcluido={handleTarefaConcluida} />
            default:
                return <div style={{ color: '#666' }}>Formulário não mapeado: {tarefa.formKey}</div>
        }
    }

    const handleTarefaConcluida = () => {
        setTarefaSelecionada(null)
        carregarTarefas()
    }

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
            {/* Sidebar com lista de tarefas */}
            <div
                className="scrollable-sidebar"
                style={{
                width: '400px',
                borderRight: '1px solid #ddd',
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: '#fff'
            }}>
                <div style={{ marginBottom: '20px' }}>
                    <h3>Minhas Tarefas</h3>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                        Grupo: <strong>{grupoLogado}</strong> | Usuário: <strong>{usuarioLogado}</strong>
                    </p>
                    <button
                        onClick={carregarTarefas}
                        style={{ marginTop: '10px', width: '100%' }}
                        className="secondary"
                    >
                        🔄 Atualizar
                    </button>
                </div>

                {carregando && <p>Carregando tarefas...</p>}
                {erro && <p style={{ color: 'red' }}>{erro}</p>}

                {!carregando && tarefas.length === 0 && (
                    <p style={{ color: '#999' }}>Nenhuma tarefa disponível</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tarefas.map(tarefa => {
                        const idRomaneio = tarefa.variaveisTarefa?.idRomaneio || tarefa.variables?.idRomaneio?.value
                        const idPedido = tarefa.variaveisTarefa?.idPedido || tarefa.variables?.idPedido?.value
                        const itens = tarefa.variaveisTarefa?.itens || tarefa.variables?.itens?.value || []
                        const pesoTeorico = tarefa.variaveisTarefa?.pesoTeorico || tarefa.variables?.pesoTeorico?.value
                        const qtdVolumes = tarefa.variaveisTarefa?.qtdVolumes || tarefa.variables?.qtdVolumes?.value

                        return (
                            <div
                                key={tarefa.id}
                                onClick={() => carregarVariaveisTarefa(tarefa)}
                                style={{
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: tarefaSelecionada?.id === tarefa.id ? '#e3f2fd' : '#fff',
                                    borderLeft: tarefaSelecionada?.id === tarefa.id ? '4px solid #0066cc' : '4px solid transparent',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                    {tarefa.name}
                                </div>
                                {(idRomaneio || idPedido) && (
                                    <div style={{ fontSize: '11px', color: '#0066cc', marginBottom: '4px', fontWeight: '500' }}>
                                        {idRomaneio && <span>🚚 ROM: {idRomaneio}</span>}
                                        {idRomaneio && idPedido && <span> | </span>}
                                        {idPedido && <span>📦 PED: {idPedido}</span>}
                                    </div>
                                )}
                                {(itens.length > 0 || pesoTeorico || qtdVolumes) && (
                                    <RomaneioCard
                                        dados={{
                                            idRomaneio,
                                            idPedido,
                                            pesoTeorico,
                                            qtdVolumes,
                                            itens
                                        }}
                                        compact={true}
                                    />
                                )}
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                    ID: {tarefa.id.substring(0, 8)}...
                                </div>
                                <div style={{ fontSize: '11px', color: '#999' }}>
                                    Tipo: {tarefa.formKey}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Main content com detalhes da tarefa */}
            <div
                className="scrollable-panel"
                style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                backgroundColor: '#f5f5f5'
            }}>
                {tarefaSelecionada ? (
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px' }}>
                        <h2>{tarefaSelecionada.name}</h2>
                        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                            <p><strong>ID da Tarefa:</strong> {tarefaSelecionada.id}</p>
                            <p><strong>Tipo de Formulário:</strong> {tarefaSelecionada.formKey}</p>
                            <p><strong>Instância do Processo:</strong> {tarefaSelecionada.processInstanceId}</p>

                            {carregandoVariaveis && <p style={{ color: '#666', fontStyle: 'italic' }}>Carregando dados da tarefa...</p>}
                        </div>

                        {/* Exibe o card completo de Romaneio */}
                        {tarefaSelecionada.variaveisTarefa && (
                            <RomaneioCard dados={tarefaSelecionada.variaveisTarefa} />
                        )}

                        {/* Renderiza o formulário dinâmico da tarefa */}
                        {renderFormulario(tarefaSelecionada)}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#999'
                    }}>
                        <p>Selecione uma tarefa para começar</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TaskList
