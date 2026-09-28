import type { StorageAdapter, Especime, BackupData, AdapterConfig, Project, Task, TaskProgress } from './types'
import { Endpoints } from './apiContract'

export class ApiAdapter implements StorageAdapter {
  private baseUrl: string
  private cache: Especime[] = []
  private cacheValid = false

  constructor(config: AdapterConfig) {
    this.baseUrl = config.apiBaseUrl ?? ''
  }

  async init(): Promise<void> {
    await this.refreshCache()
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  private async refreshCache(): Promise<void> {
    this.cache = await this.request<Especime[]>(Endpoints.especimes)
    this.cacheValid = true
  }

  async getAll(): Promise<Especime[]> {
    if (!this.cacheValid) await this.refreshCache()
    return this.cache
  }

  async getById(id: string): Promise<Especime | null> {
    try {
      return await this.request<Especime>(Endpoints.especimeById(id))
    } catch {
      return null
    }
  }

  async create(input: Omit<Especime, 'id' | 'numero'> & { id?: string }): Promise<Especime> {
    const created = await this.request<Especime>(Endpoints.especimes, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    this.cacheValid = false
    return created
  }

  async update(id: string, patch: Partial<Especime>): Promise<Especime | null> {
    const updated = await this.request<Especime>(Endpoints.especimeById(id), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    this.cacheValid = false
    return updated
  }

  async delete(id: string): Promise<boolean> {
    await this.request<void>(Endpoints.especimeById(id), { method: 'DELETE' })
    this.cacheValid = false
    return true
  }

  async getSchemaVersion(): Promise<number> {
    const res = await this.request<{ version: number }>(Endpoints.schema)
    return res.version
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.request<void>(Endpoints.schema, {
      method: 'POST',
      body: JSON.stringify({ version }),
    })
  }

  async exportBackup(): Promise<BackupData> {
    return this.request<BackupData>(Endpoints.backup)
  }

  async importBackup(data: BackupData, mode: 'merge' | 'replace'): Promise<number> {
    const res = await this.request<{ imported: number }>(Endpoints.backup, {
      method: 'POST',
      body: JSON.stringify({ mode, especimes: data.especimes, projects: data.projects, tasks: data.tasks, progress: data.progress }),
    })
    this.cacheValid = false
    return res.imported
  }

  async close(): Promise<void> {}

  // Projects
  async getProjects(includeArchived = false): Promise<Project[]> {
    const params = includeArchived ? '?includeArchived=true' : ''
    return this.request<Project[]>(`${Endpoints.projects}${params}`)
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      return await this.request<Project>(Endpoints.projectById(id))
    } catch {
      return null
    }
  }

  async createProject(input: Omit<Project, 'id'> & { id?: string }): Promise<Project> {
    return this.request<Project>(Endpoints.projects, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project | null> {
    return this.request<Project>(Endpoints.projectById(id), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.request<void>(Endpoints.projectById(id), { method: 'DELETE' })
    return true
  }

  // Tasks
  async getTasks(projectId: string): Promise<Task[]> {
    return this.request<Task[]>(Endpoints.tasks(projectId))
  }

  async getTaskById(projectId: string, id: string): Promise<Task | null> {
    try {
      return await this.request<Task>(Endpoints.taskById(projectId, id))
    } catch {
      return null
    }
  }

  async createTask(input: Omit<Task, 'id'> & { id?: string }): Promise<Task> {
    return this.request<Task>(Endpoints.tasks(input.projectId), {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
    const projectId = patch.projectId ?? ''
    const endpoint = projectId ? Endpoints.taskById(projectId, id) : Endpoints.taskById('', id)
    return this.request<Task>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  async deleteTask(projectId: string, id: string): Promise<boolean> {
    await this.request<void>(Endpoints.taskById(projectId, id), { method: 'DELETE' })
    return true
  }

  async reorderTasks(projectId: string, taskIds: string[]): Promise<void> {
    await this.request<void>(Endpoints.taskReorder(projectId), {
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    })
  }

  // Progress
  async getProgress(taskId: string): Promise<TaskProgress[]> {
    return this.request<TaskProgress[]>(Endpoints.progress(taskId))
  }

  async addProgress(input: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    return this.request<TaskProgress>(Endpoints.progress(input.taskId), {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async deleteProgress(taskId: string, id: string): Promise<boolean> {
    await this.request<void>(Endpoints.progressById(taskId, id), { method: 'DELETE' })
    return true
  }
}