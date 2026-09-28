import type { Especime, Project, Task, TaskProgress, TaskStatus, TaskPriority, ProgressTipo } from './types'

export const API_VERSION = 'v1'
export const API_BASE_PATH = `/api/${API_VERSION}`

export const Endpoints = {
  health: `${API_BASE_PATH}/health`,
  especimes: `${API_BASE_PATH}/especimes`,
  especimeById: (id: string) => `${API_BASE_PATH}/especimes/${id}`,
  backup: `${API_BASE_PATH}/backup`,
  schema: `${API_BASE_PATH}/schema`,
  projects: `${API_BASE_PATH}/projects`,
  projectById: (id: string) => `${API_BASE_PATH}/projects/${id}`,
  tasks: (projectId: string) => `${API_BASE_PATH}/projects/${projectId}/tasks`,
  taskById: (projectId: string, id: string) => `${API_BASE_PATH}/projects/${projectId}/tasks/${id}`,
  taskReorder: (projectId: string) => `${API_BASE_PATH}/projects/${projectId}/tasks/reorder`,
  progress: (taskId: string) => `${API_BASE_PATH}/tasks/${taskId}/progress`,
  progressById: (taskId: string, id: string) => `${API_BASE_PATH}/tasks/${taskId}/progress/${id}`,
} as const

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export interface HealthResponse {
  status: 'ok'
  version: string
  schemaVersion: number
}

export interface ListEspecimesParams {
  q?: string
  tag?: string
  campo?: string
  sort?: 'recent' | 'oldest' | 'az'
  limit?: number
  offset?: number
}

export interface ListEspecimesResponse {
  items: Especime[]
  total: number
  limit: number
  offset: number
}

export interface CreateEspecimeRequest {
  titulo: string
  campo: string
  tags: string[]
  conteudo: string
  data?: string
}

export interface UpdateEspecimeRequest {
  titulo?: string
  campo?: string
  tags?: string[]
  conteudo?: string
}

export interface ImportBackupRequest {
  mode: 'merge' | 'replace'
  especimes: Especime[]
  projects?: Project[]
  tasks?: Task[]
  progress?: TaskProgress[]
}

export interface ImportBackupResponse {
  imported: number
  total: number
}

export interface BackupResponse {
  schemaVersion: number
  exportedAt: string
  especimes: Especime[]
  projects: Project[]
  tasks: Task[]
  progress: TaskProgress[]
}

export interface SchemaResponse {
  version: number
}

export interface ListProjectsParams {
  includeArchived?: boolean
}

export interface CreateProjectRequest {
  nome: string
  descricao?: string
  cor?: string
}

export interface UpdateProjectRequest {
  nome?: string
  descricao?: string
  cor?: string
  arquivado?: boolean
}

export interface ListTasksParams {
  status?: TaskStatus
}

export interface CreateTaskRequest {
  titulo: string
  descricao?: string
  status?: TaskStatus
  prioridade?: TaskPriority
  tags?: string[]
  dataVencimento?: string
}

export interface UpdateTaskRequest {
  titulo?: string
  descricao?: string
  status?: TaskStatus
  prioridade?: TaskPriority
  tags?: string[]
  dataVencimento?: string
}

export interface ReorderTasksRequest {
  taskIds: string[]
}

export interface CreateProgressRequest {
  conteudo: string
  tipo?: ProgressTipo
}

export type {
  Especime,
  Project,
  Task,
  TaskProgress,
  TaskStatus,
  TaskPriority,
  ProgressTipo,
  BackupResponse as BackupData,
}