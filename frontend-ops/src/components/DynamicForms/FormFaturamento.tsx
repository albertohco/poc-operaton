import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../../services/operatonApi'

interface FormFaturamentoProps {
    tarefa: Task
    onConcluido: () => void
}

interface Variables {
    statusFaturamento?: string
    numeroNF?: string
    [key: string]: any
}

const FormFaturamento: React.FC<FormFaturamentoProps> = ({ tarefa, onConcluido }) => {
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
                statusFaturamento: vars.statusFaturamento || 'Total',
                numeroNF: vars.numeroNF || ''
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

        if (!variables.numeroNF) {
            setErro('Número da NF é obrigatório')
            return
        }

        try {
            setSubmetendo(true)
            await operatonApi.completeTask(tarefa.id, {
                statusFaturamento: variables.statusFaturamento || 'Total',
                numeroNF: variables.numeroNF
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

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Status do Faturamento *
                </label>
                <select
                    value={variables.statusFaturamento || 'Total'}
                    onChange={(e) => handleInputChange('statusFaturamento', e.target.value)}
                    style={{ width: '100%' }}
                    required
                >
                    <option value="Total">Total</option>
                    <option value="Parcial">Parcial</option>
                </select>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Indique se o faturamento é total ou parcial
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Número da NF *
                </label>
                <input
                    type="text"
                    value={variables.numeroNF || ''}
                    onChange={(e) => handleInputChange('numeroNF', e.target.value)}
                    placeholder="Ex: NF-2024-001234"
                    style={{ width: '100%' }}
                    required
                    autoFocus
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Digite o número da nota fiscal gerada
                </p>
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
                    {submetendo ? 'Enviando...' : '✓ Confirmar Faturamento'}
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

export default FormFaturamento
