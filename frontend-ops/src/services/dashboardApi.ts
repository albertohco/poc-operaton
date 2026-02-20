import operatonApi, { HistoryActivityInstance } from './operatonApi'

export interface KPI {
    totalProcessos: number
    processosCompletos: number
    processosCancelados: number
    processosSemCompletar: number
    tempoMedioTotal: number
}

export interface EtapaProductivity {
    nomeEtapa: string
    activityId: string
    totalInstancias: number
    tempoMedio: number
    duracao: number
    status: 'verde' | 'vermelho'
}

export class DashboardService {
    private DURACAO_ALERTA = 30000 // 30 segundos em ms

    async calcularKPIs(): Promise<KPI> {
        const historicoProcessos = await operatonApi.getHistoryProcessInstances()

        const totalProcessos = historicoProcessos.length
        const processosCompletos = historicoProcessos.filter(p => p.endTime).length
        const processosCancelados = 0
        const processosSemCompletar = totalProcessos - processosCompletos

        const tempoMedioTotal = historicoProcessos.length > 0
            ? historicoProcessos.reduce((sum, p) => sum + (p.durationInMillis || 0), 0) / historicoProcessos.length
            : 0

        return {
            totalProcessos,
            processosCompletos,
            processosCancelados,
            processosSemCompletar,
            tempoMedioTotal
        }
    }

    async calcularEtapasProductivity(): Promise<EtapaProductivity[]> {
        const historicoAtividades = await operatonApi.getHistoryActivityInstances()

        // Agrupar por activityId
        const mapaAtividades = new Map<string, HistoryActivityInstance[]>()

        historicoAtividades.forEach(atividade => {
            if (!mapaAtividades.has(atividade.activityId)) {
                mapaAtividades.set(atividade.activityId, [])
            }
            mapaAtividades.get(atividade.activityId)!.push(atividade)
        })

        // Calcular métricas por etapa
        const etapas: EtapaProductivity[] = []

        mapaAtividades.forEach((atividades, activityId) => {
            const nomeEtapa = atividades[0]?.activityName || activityId
            const duracoes = atividades
                .filter(a => a.durationInMillis !== undefined && a.durationInMillis > 0)
                .map(a => a.durationInMillis!)

            const tempoMedio = duracoes.length > 0
                ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
                : 0

            const status = tempoMedio > this.DURACAO_ALERTA ? 'vermelho' : 'verde'

            etapas.push({
                nomeEtapa,
                activityId,
                totalInstancias: atividades.length,
                tempoMedio: Math.round(tempoMedio),
                duracao: Math.round(tempoMedio / 1000), // converter para segundos
                status
            })
        })

        return etapas.sort((a, b) => b.tempoMedio - a.tempoMedio)
    }

    formatarTempo(ms: number): string {
        if (ms < 1000) {
            return `${Math.round(ms)}ms`
        }
        if (ms < 60000) {
            return `${Math.round(ms / 1000)}s`
        }
        const minutos = Math.floor(ms / 60000)
        const segundos = Math.round((ms % 60000) / 1000)
        return `${minutos}m ${segundos}s`
    }

    formatarPercentual(valor: number, total: number): string {
        if (total === 0) return '0%'
        return `${Math.round((valor / total) * 100)}%`
    }
}

export default new DashboardService()
