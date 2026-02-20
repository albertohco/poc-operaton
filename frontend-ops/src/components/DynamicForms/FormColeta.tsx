import React, { useState, useEffect } from 'react'
import operatonApi, { Task } from '../../services/operatonApi'

interface FormColetaProps {
    tarefa: Task
    onConcluido: () => void
}

interface Variables {
    transportadora?: string
    qtdVolumes?: number
    [key: string]: any
}

const FormColeta: React.FC<FormColetaProps> = ({ tarefa, onConcluido }) => {
    const [variables, setVariables] = useState<Variables>({})
    const [carregando, setCarregando] = useState(true)
    const [submetendo, setSubmetendo] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [scannerMode, setScannerMode] = useState(false)

    useEffect(() => {
        carregarVariaveis()
    }, [tarefa.id])

    const carregarVariaveis = async () => {
        try {
            setCarregando(true)
            const vars = await operatonApi.getTaskVariables(tarefa.id)
            setVariables({
                transportadora: vars.transportadora || '',
                qtdVolumes: vars.qtdVolumes || ''
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

    const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            // Simula bipagem do leitor de código de barras
            const input = e.currentTarget
            console.log('Código lido:', input.value)
            input.value = ''

            // Foco no próximo campo ou submete
            const qtdInput = document.getElementById('qtdVolumes') as HTMLInputElement
            if (qtdInput) {
                qtdInput.focus()
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!variables.transportadora) {
            setErro('Transportadora é obrigatória')
            return
        }

        if (!variables.qtdVolumes) {
            setErro('Quantidade de volumes é obrigatória')
            return
        }

        try {
            setSubmetendo(true)
            await operatonApi.completeTask(tarefa.id, {
                transportadora: variables.transportadora,
                qtdVolumes: parseInt(variables.qtdVolumes.toString(), 10)
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
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #90caf9'
            }}>
                <p style={{ fontSize: '13px', margin: 0 }}>
                    💡 <strong>Dica:</strong> Este formulário simula um leitor de código de barras. Pode usar um scanner real ou digitar manualmente.
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Scanner de Código de Barras *
                </label>
                <input
                    type="text"
                    placeholder="Aproxime o scanner ou digite o código"
                    onKeyDown={handleScannerInput}
                    onFocus={() => setScannerMode(true)}
                    onBlur={() => setScannerMode(false)}
                    style={{
                        width: '100%',
                        borderColor: scannerMode ? '#0066cc' : '#ddd'
                    }}
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Pressione ENTER para confirmar a leitura
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Transportadora *
                </label>
                <select
                    value={variables.transportadora || ''}
                    onChange={(e) => handleInputChange('transportadora', e.target.value)}
                    style={{ width: '100%' }}
                    required
                >
                    <option value="">-- Selecione uma transportadora --</option>
                    <option value="Sedex">Sedex</option>
                    <option value="Loggi">Loggi</option>
                    <option value="Motoboy">Motoboy Local</option>
                    <option value="Própria">Frota Própria</option>
                    <option value="Outra">Outra</option>
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Quantidade de Volumes *
                </label>
                <input
                    id="qtdVolumes"
                    type="number"
                    min="1"
                    value={variables.qtdVolumes || ''}
                    onChange={(e) => handleInputChange('qtdVolumes', e.target.value)}
                    placeholder="Digite a quantidade de caixas/volumes"
                    style={{ width: '100%' }}
                    required
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    ℹ️ Total de caixas ou volume a ser coletado
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
                    {submetendo ? 'Enviando...' : '✓ Confirmar Coleta'}
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

export default FormColeta
