import axios from 'axios'

const API_URL = '/api'

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

export interface Romaneio {
    idRomaneio: string
    pesoTeorico: number
    itens: Array<{
        codigoItem: string
        descricao: string
        qtd: number
    }>
}

class BackendApi {
    async startProcess(idRomaneio: string): Promise<any> {
        try {
            const response = await client.post('/start-process', {
                idRomaneio
            })
            return response.data
        } catch (error) {
            console.error('Erro ao iniciar processo:', error)
            throw error
        }
    }

    async getHealth(): Promise<any> {
        try {
            const response = await client.get('/health')
            return response.data
        } catch (error) {
            console.error('Erro ao verificar saúde do backend:', error)
            throw error
        }
    }
}

export default new BackendApi()
