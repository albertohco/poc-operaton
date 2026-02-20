import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../../services/operatonApi'

interface FormSeparacaoProps {
    tarefa: Task
    onConcluido: () => void
}

interface Variables {
    pesoReal?: number
    observacoes?: string
    [key: string]: any
}

const FormSeparacao: React.FC<FormSeparacaoProps> = ({ tarefa, onConcluido }) => {
    const [variables, setVariables] = useState<Variables>({})
    const [carregando, setCarregando] = useState(true)
    const [submetendo, setSubmetendo] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        carregarVariaveis()
    }, [tarefa.id])

    const carregarVariaveis = async () => {
        try {
            setCarregando(true)
            const vars = await operatonApi.getTaskVariables(tarefa.id)
            setVariables({
                pesoReal: vars.pesoReal || '',
                observacoes: vars.observacoes || ''
            })
            setErro(null)
        } catch (err) {
            console.error('Erro ao carregar variáveis:', err)
            setErro('Erro ao carregar dados da tarefa')
        } finally {
            setCarregando(false)
        }
    }

    const handleInputChange = (field: string, value: any) => {
        setVariables(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!variables.pesoReal) {
            setErro('Peso real é obrigatório')
            return
        }

        try {
            setSubmetendo(true)
            await operatonApi.completeTask(tarefa.id, {
                pesoReal: parseFloat(variables.pesoReal.toString()),
                observacoes: variables.observacoes || ''
            })

            onConcluido()
        } catch (err: any) {
            console.error('Erro ao completar tarefa:', err)
            const mensagemErro = err?.response?.data?.detail || err?.message || 'Erro ao submeter formulário'
            setErro(mensagemErro)
        } finally {
            setSubmetendo(false)
        }
    }

    if (carregando) {
        return <div>Carregando formulário...</div>
    }

    const idRomaneio = variables.idRomaneio
    const idPedido = variables.idPedido

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
            {(idRomaneio || idPedido) && (
                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#e3f2fd',
                    borderLeft: '4px solid #0066cc',
                    borderRadius: '4px'
                }}>
                    {idRomaneio && (
                        <p style={{ margin: '5px 0' }}>
                            <strong style={{ color: '#0066cc' }}>🚚 Romaneio:</strong> {idRomaneio}
                        </p>
                    )}
                    {idPedido && (
                        <p style={{ margin: '5px 0' }}>
                            <strong style={{ color: '#0066cc' }}>📦 Pedido:</strong> {idPedido}
                        </p>
                    )}
                </div>
            )}

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Peso Real (kg) *
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={variables.pesoReal || ''}
                    onChange={(e) => handleInputChange('pesoReal', e.target.value)}
                    placeholder="Digite o peso aferido na balança"
                    style={{ width: '100%' }}
                    required
                    autoFocus
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Leia o peso na balança e digite aqui
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Observações
                </label>
                <textarea
                    value={variables.observacoes || ''}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Digite observações se houver"
                    rows={4}
                    style={{ width: '100%' }}
                />
            </div>

            {erro && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    ⚠️ {erro}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    type="submit"
                    disabled={submetendo}
                    className="primary"
                    style={{ flex: 1 }}
                >
                    {submetendo ? 'Enviando...' : '✓ Confirmar Separação'}
                </button>
                <button
                    type="button"
                    disabled={submetendo}
                    className="secondary"
                    onClick={carregarVariaveis}
                >
                    🔄 Limpar
                </button>
            </div>
        </form>
    )
}

export default FormSeparacao
