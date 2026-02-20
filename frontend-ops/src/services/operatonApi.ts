import axios, { AxiosInstance } from 'axios'

const API_URL = '/engine-rest'

const client: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

export interface Task {
    id: string
    name: string
    formKey: string
    processInstanceId: string
    assignee?: string
    candidateGroups?: string[]
    variables?: Record<string, any>
}

export interface ProcessInstance {
    id: string
    processDefinitionId: string
    businessKey?: string
    variables?: Record<string, any>
}

export interface Variable {
    value: any
    type?: string
}

export interface HistoryActivityInstance {
    id: string
    parentActivityInstanceId?: string
    activityId: string
    activityName: string
    activityType: string
    processInstanceId: string
    processDefinitionKey: string
    executionId: string
    taskId?: string
    assignee?: string
    startTime: string
    endTime?: string
    durationInMillis?: number
    canceled?: boolean
}

export interface HistoryProcessInstance {
    id: string
    processDefinitionId: string
    processDefinitionKey: string
    processDefinitionName?: string
    businessKey?: string
    startTime: string
    endTime?: string
    durationInMillis?: number
    endActivityId?: string
    variables?: Record<string, any>
}

class OperatonApi {
    // Tasks
    async getTasks(candidateGroup?: string): Promise<Task[]> {
        try {
            const params: Record<string, any> = {}
            if (candidateGroup) {
                params.candidateGroup = candidateGroup
            }

            const response = await client.get('/task', { params })
            return response.data
        } catch (error) {
            console.error('Erro ao buscar tarefas:', error)
            throw error
        }
    }

    async getTaskById(taskId: string): Promise<Task> {
        try {
            const response = await client.get(`/task/${taskId}`)
            return response.data
        } catch (error) {
            console.error('Erro ao buscar tarefa:', error)
            throw error
        }
    }

    async completeTask(taskId: string, variables: Record<string, any>): Promise<void> {
        try {
            // Formata como esperado pelo Operaton: {"variavel": {"value": ..., "type": "String"}}
            const formattedVariables = Object.entries(variables).reduce((acc, [key, value]) => {
                let varType = 'String'
                if (typeof value === 'number') varType = 'Number'
                else if (typeof value === 'boolean') varType = 'Boolean'

                acc[key] = {
                    value: value,
                    type: varType
                }
                return acc
            }, {} as Record<string, Variable>)

            const payload = {
                variables: formattedVariables
            }

            console.log('Enviando payload para completar tarefa:', payload)
            await client.post(`/task/${taskId}/complete`, payload)
        } catch (error) {
            console.error('Erro ao completar tarefa:', error)
            throw error
        }
    }

    async getTaskVariables(taskId: string): Promise<Record<string, any>> {
        try {
            const response = await client.get(`/task/${taskId}/variables`)
            const vars: Record<string, any> = {}

            Object.entries(response.data).forEach(([key, varObj]: [string, any]) => {
                vars[key] = varObj.value
            })

            return vars
        } catch (error) {
            console.error('Erro ao buscar variáveis da tarefa:', error)
            throw error
        }
    }

    // Process Instances
    async getProcessInstances(): Promise<ProcessInstance[]> {
        try {
            const response = await client.get('/process-instance')
            return response.data
        } catch (error) {
            console.error('Erro ao buscar instâncias de processo:', error)
            throw error
        }
    }

    async getProcessInstanceVariables(processInstanceId: string): Promise<Record<string, any>> {
        try {
            const response = await client.get(`/process-instance/${processInstanceId}/variables`)
            const vars: Record<string, any> = {}

            Object.entries(response.data).forEach(([key, varObj]: [string, any]) => {
                vars[key] = varObj.value
            })

            return vars
        } catch (error) {
            console.error('Erro ao buscar variáveis do processo:', error)
            throw error
        }
    }

    // History
    async getHistoryProcessInstances(): Promise<HistoryProcessInstance[]> {
        try {
            const response = await client.get('/history/process-instance')
            return response.data
        } catch (error) {
            console.error('Erro ao buscar histórico de processos:', error)
            throw error
        }
    }

    async getHistoryActivityInstances(processInstanceId?: string): Promise<HistoryActivityInstance[]> {
        try {
            const params: Record<string, any> = {
                sortBy: 'startTime',
                sortOrder: 'asc'
            }

            if (processInstanceId) {
                params.processInstanceId = processInstanceId
            }

            const response = await client.get('/history/activity-instance', { params })
            return response.data
        } catch (error) {
            console.error('Erro ao buscar histórico de atividades:', error)
            throw error
        }
    }

    // Engine Health
    async getEngineHealth(): Promise<any> {
        try {
            const response = await client.get('/engine')
            return response.data
        } catch (error) {
            console.error('Erro ao verificar saúde do engine:', error)
            throw error
        }
    }
}

export default new OperatonApi()
