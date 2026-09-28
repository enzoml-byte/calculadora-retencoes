export interface Especime {
  id: string
  numero: number
  titulo: string
  campo: string
  tags: string[]
  conteudo: string
  data: string
  atualizadoEm?: string
}

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProgressTipo = 'log' | 'blocker' | 'decisao' | 'revisao'

export interface Project {
  id: string
  nome: string
  descricao?: string
  cor?: string
  criadoEm: string
  atualizadoEm?: string
  arquivado?: boolean
}

export interface Task {
  id: string
  projectId: string
  titulo: string
  descricao?: string
  status: TaskStatus
  prioridade: TaskPriority
  tags: string[]
  dataCriacao: string
  dataAtualizacao?: string
  dataConclusao?: string
  dataVencimento?: string
  ordem: number
}

export interface TaskProgress {
  id: string
  taskId: string
  conteudo: string
  data: string
  tipo: 'log' | 'blocker' | 'decisao' | 'revisao'
}

export interface SchemaVersion {
  version: number
  appliedAt: string
}

export interface BackupData {
  schemaVersion: number
  exportedAt: string
  especimes: Especime[]
  projects: Project[]
  tasks: Task[]
  progress: TaskProgress[]
}

export interface StorageAdapter {
  init(): Promise<void>
  getAll(): Promise<Especime[]>
  getById(id: string): Promise<Especime | null>
  create(especime: Omit<Especime, 'id' | 'numero'> & { id?: string }): Promise<Especime>
  update(id: string, patch: Partial<Especime>): Promise<Especime | null>
  delete(id: string): Promise<boolean>
  getSchemaVersion(): Promise<number>
  setSchemaVersion(version: number): Promise<void>
  exportBackup(): Promise<BackupData>
  importBackup(data: BackupData, mode: 'merge' | 'replace'): Promise<number>
  close(): Promise<void>

  // Projects
  getProjects(includeArchived?: boolean): Promise<Project[]>
  getProjectById(id: string): Promise<Project | null>
  createProject(project: Omit<Project, 'id'> & { id?: string }): Promise<Project>
  updateProject(id: string, patch: Partial<Project>): Promise<Project | null>
  deleteProject(id: string): Promise<boolean>

  // Tasks
  getTasks(projectId: string): Promise<Task[]>
  getTaskById(projectId: string, id: string): Promise<Task | null>
  createTask(task: Omit<Task, 'id'> & { id?: string }): Promise<Task>
  updateTask(id: string, patch: Partial<Task>): Promise<Task | null>
  deleteTask(projectId: string, id: string): Promise<boolean>
  reorderTasks(projectId: string, taskIds: string[]): Promise<void>

  // Progress
  getProgress(taskId: string): Promise<TaskProgress[]>
  addProgress(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress>
  deleteProgress(taskId: string, id: string): Promise<boolean>
}

export type AdapterKind = 'localStorage' | 'api'

export interface AdapterConfig {
  kind: AdapterKind
  apiBaseUrl?: string
}

export type Theme = 'light' | 'dark'