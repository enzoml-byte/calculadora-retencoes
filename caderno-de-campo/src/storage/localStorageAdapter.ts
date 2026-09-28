import type { StorageAdapter, Especime, BackupData, Project, Task, TaskProgress, Theme } from './types'
import { CURRENT_SCHEMA_VERSION, migrate } from './schema'

const ENTRIES_KEY = 'cadernoDeCampo_especimes_v1'
const PROJECTS_KEY = 'cadernoDeCampo_projects_v1'
const TASKS_KEY = 'cadernoDeCampo_tasks_v1'
const PROGRESS_KEY = 'cadernoDeCampo_progress_v1'
const SCHEMA_KEY = 'cadernoDeCampo_schema_v1'
const THEME_KEY = 'cadernoDeCampo_theme'

function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

export class LocalStorageAdapter implements StorageAdapter {
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    const storedVersion = this.getStoredSchemaVersion()
    if (storedVersion < CURRENT_SCHEMA_VERSION) {
      const raw = localStorage.getItem(ENTRIES_KEY)
      let data: unknown = raw ? JSON.parse(raw) : []
      data = await migrate(data, storedVersion)
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(data))
      this.setStoredSchemaVersion(CURRENT_SCHEMA_VERSION)
    }
    if (!localStorage.getItem(PROJECTS_KEY)) localStorage.setItem(PROJECTS_KEY, '[]')
    if (!localStorage.getItem(TASKS_KEY)) localStorage.setItem(TASKS_KEY, '[]')
    if (!localStorage.getItem(PROGRESS_KEY)) localStorage.setItem(PROGRESS_KEY, '[]')
    this.initialized = true
  }

  private getStoredSchemaVersion(): number {
    try {
      const v = localStorage.getItem(SCHEMA_KEY)
      return v ? parseInt(v, 10) : 0
    } catch {
      return 0
    }
  }

  private setStoredSchemaVersion(version: number): void {
    try {
      localStorage.setItem(SCHEMA_KEY, String(version))
    } catch {}
  }

  private loadEntries(): Especime[] {
    try {
      const raw = localStorage.getItem(ENTRIES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private saveEntries(list: Especime[]): boolean {
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(list))
      return true
    } catch {
      return false
    }
  }

  private loadProjects(): Project[] {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private saveProjects(list: Project[]): boolean {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list))
      return true
    } catch {
      return false
    }
  }

  private loadTasks(): Task[] {
    try {
      const raw = localStorage.getItem(TASKS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private saveTasks(list: Task[]): boolean {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(list))
      return true
    } catch {
      return false
    }
  }

  private loadProgress(): TaskProgress[] {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private saveProgress(list: TaskProgress[]): boolean {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(list))
      return true
    } catch {
      return false
    }
  }

  async getAll(): Promise<Especime[]> {
    return this.loadEntries()
  }

  async getById(id: string): Promise<Especime | null> {
    const list = this.loadEntries()
    return list.find((e) => e.id === id) ?? null
  }

  async create(input: Omit<Especime, 'id' | 'numero'> & { id?: string }): Promise<Especime> {
    const list = this.loadEntries()
    const maxNumero = list.reduce((max, e) => Math.max(max, e.numero || 0), 0)
    const now = nowISO()
    const especime: Especime = {
      id: input.id ?? newId('esp'),
      numero: maxNumero + 1,
      titulo: input.titulo,
      campo: input.campo,
      tags: input.tags,
      conteudo: input.conteudo,
      data: input.data ?? now,
      atualizadoEm: input.atualizadoEm,
    }
    this.saveEntries([especime, ...list])
    return especime
  }

  async update(id: string, patch: Partial<Especime>): Promise<Especime | null> {
    const list = this.loadEntries()
    const idx = list.findIndex((e) => e.id === id)
    if (idx === -1) return null
    const updated = { ...list[idx], ...patch, atualizadoEm: nowISO() }
    list[idx] = updated
    this.saveEntries(list)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const list = this.loadEntries()
    const idx = list.findIndex((e) => e.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    return this.saveEntries(list)
  }

  async getSchemaVersion(): Promise<number> {
    return this.getStoredSchemaVersion()
  }

  async setSchemaVersion(version: number): Promise<void> {
    this.setStoredSchemaVersion(version)
  }

  async exportBackup(): Promise<BackupData> {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: nowISO(),
      especimes: this.loadEntries(),
      projects: this.loadProjects(),
      tasks: this.loadTasks(),
      progress: this.loadProgress(),
    }
  }

  async importBackup(data: BackupData, mode: 'merge' | 'replace'): Promise<number> {
    let total = 0
    if (data.especimes) {
      const current = this.loadEntries()
      let finalList: Especime[]
      if (mode === 'merge') {
        const ids = new Set(current.map((e) => e.id))
        finalList = [...data.especimes.filter((e) => !ids.has(e.id)), ...current]
      } else {
        finalList = data.especimes
      }
      this.saveEntries(finalList)
      total += finalList.length
    }
    if (data.projects) {
      const current = this.loadProjects()
      let finalList: Project[]
      if (mode === 'merge') {
        const ids = new Set(current.map((e) => e.id))
        finalList = [...data.projects.filter((e) => !ids.has(e.id)), ...current]
      } else {
        finalList = data.projects
      }
      this.saveProjects(finalList)
      total += finalList.length
    }
    if (data.tasks) {
      const current = this.loadTasks()
      let finalList: Task[]
      if (mode === 'merge') {
        const ids = new Set(current.map((e) => e.id))
        finalList = [...data.tasks.filter((e) => !ids.has(e.id)), ...current]
      } else {
        finalList = data.tasks
      }
      this.saveTasks(finalList)
      total += finalList.length
    }
    if (data.progress) {
      const current = this.loadProgress()
      let finalList: TaskProgress[]
      if (mode === 'merge') {
        const ids = new Set(current.map((e) => e.id))
        finalList = [...data.progress.filter((e) => !ids.has(e.id)), ...current]
      } else {
        finalList = data.progress
      }
      this.saveProgress(finalList)
      total += finalList.length
    }
    return total
  }

  async close(): Promise<void> {}

  // Projects
  async getProjects(includeArchived = false): Promise<Project[]> {
    const list = this.loadProjects()
    return includeArchived ? list : list.filter((p) => !p.arquivado)
  }

  async getProjectById(id: string): Promise<Project | null> {
    const list = this.loadProjects()
    return list.find((p) => p.id === id) ?? null
  }

  async createProject(input: Omit<Project, 'id'> & { id?: string }): Promise<Project> {
    const list = this.loadProjects()
    const project: Project = {
      id: input.id ?? newId('prj'),
      nome: input.nome,
      descricao: input.descricao,
      cor: input.cor,
      criadoEm: nowISO(),
      atualizadoEm: undefined,
      arquivado: false,
    }
    this.saveProjects([project, ...list])
    return project
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project | null> {
    const list = this.loadProjects()
    const idx = list.findIndex((p) => p.id === id)
    if (idx === -1) return null
    const updated = { ...list[idx], ...patch, atualizadoEm: nowISO() }
    list[idx] = updated
    this.saveProjects(list)
    return updated
  }

  async deleteProject(id: string): Promise<boolean> {
    const list = this.loadProjects()
    const idx = list.findIndex((p) => p.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    const tasks = this.loadTasks().filter((t) => t.projectId !== id)
    this.saveTasks(tasks)
    const prog = this.loadProgress().filter((p) => !tasks.some((t) => t.id === p.taskId))
    this.saveProgress(prog)
    return this.saveProjects(list)
  }

  // Tasks
  async getTasks(projectId: string): Promise<Task[]> {
    const list = this.loadTasks()
    return list.filter((t) => t.projectId === projectId).sort((a, b) => a.ordem - b.ordem)
  }

  async getTaskById(projectId: string, id: string): Promise<Task | null> {
    const list = this.loadTasks()
    return list.find((t) => t.id === id && t.projectId === projectId) ?? null
  }

  async createTask(input: Omit<Task, 'id'> & { id?: string }): Promise<Task> {
    const list = this.loadTasks()
    const projectTasks = list.filter((t) => t.projectId === input.projectId)
    const maxOrdem = projectTasks.reduce((max, t) => Math.max(max, t.ordem || 0), 0)
    const task: Task = {
      id: input.id ?? newId('tsk'),
      projectId: input.projectId,
      titulo: input.titulo,
      descricao: input.descricao,
      status: input.status ?? 'backlog',
      prioridade: input.prioridade ?? 'medium',
      tags: input.tags ?? [],
      dataCriacao: input.dataCriacao ?? nowISO(),
      dataAtualizacao: undefined,
      dataConclusao: input.status === 'done' ? nowISO() : undefined,
      dataVencimento: input.dataVencimento,
      ordem: maxOrdem + 1,
    }
    this.saveTasks([task, ...list])
    return task
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
    const list = this.loadTasks()
    const idx = list.findIndex((t) => t.id === id)
    if (idx === -1) return null
    const wasDone = list[idx].status === 'done'
    const willBeDone = patch.status === 'done'
    const updated: Task = {
      ...list[idx],
      ...patch,
      dataAtualizacao: nowISO(),
      dataConclusao: !wasDone && willBeDone ? nowISO() : list[idx].dataConclusao,
    }
    list[idx] = updated
    this.saveTasks(list)
    return updated
  }

  async deleteTask(projectId: string, id: string): Promise<boolean> {
    const list = this.loadTasks()
    const idx = list.findIndex((t) => t.id === id && t.projectId === projectId)
    if (idx === -1) return false
    list.splice(idx, 1)
    const prog = this.loadProgress().filter((p) => p.taskId !== id)
    this.saveProgress(prog)
    return this.saveTasks(list)
  }

  async reorderTasks(projectId: string, taskIds: string[]): Promise<void> {
    const list = this.loadTasks()
    const map = new Map(list.map((t) => [t.id, t]))
    taskIds.forEach((id, idx) => {
      const t = map.get(id)
      if (t && t.projectId === projectId) t.ordem = idx
    })
    this.saveTasks(list)
  }

  // Progress
  async getProgress(taskId: string): Promise<TaskProgress[]> {
    const list = this.loadProgress()
    return list.filter((p) => p.taskId === taskId).sort((a, b) => +new Date(a.data) - +new Date(b.data))
  }

  async addProgress(input: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    const list = this.loadProgress()
    const progress: TaskProgress = {
      id: input.id ?? newId('prg'),
      taskId: input.taskId,
      conteudo: input.conteudo,
      data: input.data ?? nowISO(),
      tipo: input.tipo ?? 'log',
    }
    this.saveProgress([progress, ...list])
    return progress
  }

  async deleteProgress(taskId: string, id: string): Promise<boolean> {
    const list = this.loadProgress()
    const idx = list.findIndex((p) => p.id === id && p.taskId === taskId)
    if (idx === -1) return false
    list.splice(idx, 1)
    return this.saveProgress(list)
  }
}

export function loadTheme(): 'light' | 'dark' | null {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'dark' || t === 'light' ? t : null
  } catch {
    return null
  }
}

export function saveTheme(t: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {}
}

export type { Theme }