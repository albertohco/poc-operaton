import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../services/operatonApi'
import FormSeparacao from '../components/DynamicForms/FormSeparacao'
import FormFaturamento from '../components/DynamicForms/FormFaturamento'
import FormColeta from '../components/DynamicForms/FormColeta'
import FormCorrecao from '../components/DynamicForms/FormCorrecao'

interface TaskListProps {
    usuarioLogado: string
    grupoLogado: string
}

const TaskList: React.FC<TaskListProps> = ({ usuarioLogado, grupoLogado }) => {
    const [tarefas, setTarefas] = useState<Task[]>([])
    const [tarefaSelecionada, setTarefaSelecionada] = useState<Task | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

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

    const renderFormulario = (tarefa: Task) => {
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
            <div style={{
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
                    {tarefas.map(tarefa => (
                        <div
                            key={tarefa.id}
                            onClick={() => setTarefaSelecionada(tarefa)}
                            style={{
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: tarefaSelecionada?.id === tarefa.id ? '#e3f2fd' : '#fff',
                                borderLeft: tarefaSelecionada?.id === tarefa.id ? '4px solid #0066cc' : '4px solid transparent'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                {tarefa.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                                ID: {tarefa.id.substring(0, 8)}...
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                                Tipo: {tarefa.formKey}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main content com detalhes da tarefa */}
            <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                backgroundColor: '#f5f5f5'
            }}>
                {tarefaSelecionada ? (
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px' }}>
                        <h2>{tarefaSelecionada.name}</h2>
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                            <p><strong>ID da Tarefa:</strong> {tarefaSelecionada.id}</p>
                            <p><strong>Tipo de Formulário:</strong> {tarefaSelecionada.formKey}</p>
                            <p><strong>Instância do Processo:</strong> {tarefaSelecionada.processInstanceId}</p>
                        </div>

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
