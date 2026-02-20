import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../../services/operatonApi'

interface FormCorrecaoProps {
    tarefa: Task
    onConcluido: () => void
}

interface Variables {
    observacoes?: string
    [key: string]: any
}

const FormCorrecao: React.FC<FormCorrecaoProps> = ({ tarefa, onConcluido }) => {
    const [variables, setVariables] = useState<Variables>({})
    const [carregando, setCarregando] = useState(true)
    const [submetendo, setSubmetendo] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [divergenciaInfo, setDivergenciaInfo] = useState<string>('')

    useEffect(() => {
        carregarVariaveis()
    }, [tarefa.id])

    const carregarVariaveis = async () => {
        try {
            setCarregando(true)
            const vars = await operatonApi.getTaskVariables(tarefa.id)
            setVariables({
                observacoes: vars.observacoes || ''
            })

            // Tenta exibir informações sobre a divergência
            if (vars.mensagem) {
                setDivergenciaInfo(vars.mensagem)
            }

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

        try {
            setSubmetendo(true)
            await operatonApi.completeTask(tarefa.id, {
                observacoes: (variables.observacoes || '') + '\n[Corrigido em ' + new Date().toLocaleString() + ']'
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
            <div style={{
                padding: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #ffe0b2'
            }}>
                <p style={{ fontSize: '13px', margin: 0, color: '#e65100' }}>
                    ⚠️ <strong>Divergência Detectada</strong>
                </p>
                {divergenciaInfo && (
                    <p style={{ fontSize: '12px', margin: '10px 0 0 0', color: '#d84315' }}>
                        {divergenciaInfo}
                    </p>
                )}
            </div>

            <div style={{
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '20px'
            }}>
                <p style={{ fontSize: '12px', margin: 0, color: '#666' }}>
                    <strong>Ação Necessária:</strong>
                </p>
                <ol style={{ fontSize: '12px', color: '#666', marginTop: '10px', paddingLeft: '20px' }}>
                    <li>Verifique fisicamente o peso da carga</li>
                    <li>Reposicione itens se necessário</li>
                    <li>Adicione ou remova produtos conforme necessário</li>
                    <li>Documenta a ação na observação abaixo</li>
                    <li>Clique em "Confirmar Correção" para revalidar</li>
                </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Observações sobre a Correção
                </label>
                <textarea
                    value={variables.observacoes || ''}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Descreva a ação executada para corrigir a divergência (ex: Removido 2kg de produto X)"
                    rows={5}
                    style={{ width: '100%' }}
                    required
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Descreva exatamente o que foi corrigido
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
                    {submetendo ? 'Enviando...' : '✓ Confirmar Correção'}
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

export default FormCorrecao
