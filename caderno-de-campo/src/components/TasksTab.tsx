import { useState } from 'react'
import type { Project, Task, TaskProgress, TaskStatus, TaskPriority } from '../storage/types'
import { Icon } from './Icons'
import { fmtDate } from '../lib/date'

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'doing', 'review', 'done', 'cancelled']

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  doing: 'Fazendo',
  review: 'Revisão',
  done: 'Concluído',
  cancelled: 'Cancelado',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'var(--ink-soft)',
  medium: 'var(--trabalho)',
  high: 'var(--hobby)',
  urgent: 'var(--danger)',
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
}

function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  return (
    <div
      className="task-card"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      data-task-id={task.id}
    >
      <div className="task-card-header">
        <h4 className="task-card-title">{task.titulo}</h4>
        <span className="task-priority" style={{ borderColor: PRIORITY_COLORS[task.prioridade] }}>
          {task.prioridade}
        </span>
      </div>
      {task.descricao && <p className="task-card-desc">{task.descricao}</p>}
      <div className="task-card-footer">
        {task.dataVencimento && (
          <span className="task-due" style={{ color: new Date(task.dataVencimento) < new Date() && task.status !== 'done' ? 'var(--danger)' : 'inherit' }}>
            <Icon name="calendar" size={10} /> {fmtDate(task.dataVencimento)}
          </span>
        )}
        {task.tags.length > 0 && (
          <div className="task-tags">
            {task.tags.slice(0, 3).map((t) => (
              <span key={t} className="task-tag">#{t}</span>
            ))}
            {task.tags.length > 3 && <span className="task-tag">+{task.tags.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

interface ColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onAddTask: (status: TaskStatus) => void
}

function Column({ status, tasks, onTaskClick, onDragOver, onDrop, onAddTask }: ColumnProps) {
  return (
    <div className="task-column" data-status={status}>
      <div className="column-header">
        <h3 className="column-title">{STATUS_LABELS[status]}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div
        className="column-dropzone"
        onDragOver={onDragOver}
        onDrop={onDrop}
        data-status={status}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)} />
        ))}
      </div>
      <button className="add-task-btn" onClick={() => onAddTask(status)}>
        <Icon name="plus" size={14} /> Adicionar
      </button>
    </div>
  )
}

interface ProgressLogProps {
  task: Task
  progress: TaskProgress[]
  onAddProgress: (content: string, tipo: TaskProgress['tipo']) => void
  onClose: () => void
}

function ProgressLog({ task, progress, onAddProgress, onClose }: ProgressLogProps) {
  const [content, setContent] = useState('')
  const [tipo, setTipo] = useState<TaskProgress['tipo']>('log')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onAddProgress(content.trim(), tipo)
    setContent('')
  }

  return (
    <div className="progress-log">
      <div className="progress-header">
        <h3>Andamentos — {task.titulo}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="progress-list">
        {progress.length === 0 ? (
          <p className="progress-empty">Nenhum registro ainda.</p>
        ) : (
          progress.map((p) => (
            <div key={p.id} className="progress-item">
              <div className="progress-meta">
                <span className="progress-type">{p.tipo}</span>
                <span className="progress-date" title={fmtDate(p.data, 'datetime')}>{fmtDate(p.data, 'datetime')}</span>
              </div>
              <p className="progress-content">{p.conteudo}</p>
            </div>
          ))
        )}
      </div>
      <form className="progress-form" onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Registre um andamento, bloqueio, decisão ou revisão..."
          rows={3}
        />
        <div className="progress-form-footer">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TaskProgress['tipo'])} className="progress-tipo-select">
            <option value="log">Log</option>
            <option value="blocker">Bloqueio</option>
            <option value="decisao">Decisão</option>
            <option value="revisao">Revisão</option>
          </select>
          <button type="submit" className="btn-primary" disabled={!content.trim()}>
            <Icon name="plus" size={14} /> Registrar
          </button>
        </div>
      </form>
    </div>
  )
}

interface TaskModalProps {
  task: Task | null
  projects: Project[]
  onClose: () => void
  onSubmit: (data: Partial<Task> & { projectId: string }) => void
}

function TaskModal({ task, projects, onClose, onSubmit }: TaskModalProps) {
  const [form, setForm] = useState({
    projectId: task?.projectId ?? projects[0]?.id ?? '',
    titulo: task?.titulo ?? '',
    descricao: task?.descricao ?? '',
    status: task?.status ?? 'todo',
    prioridade: task?.prioridade ?? 'medium',
    tags: task?.tags.join(', ') ?? '',
    dataVencimento: task?.dataVencimento?.slice(0, 10) ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      projectId: form.projectId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      status: form.status,
      prioridade: form.prioridade,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dataVencimento: form.dataVencimento || undefined,
    })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="campo-display">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <label>Projeto</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <input
            className="input titulo-input campo-display"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Título da tarefa"
            required
          />
          <textarea
            className="input"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição (opcional)"
            rows={3}
          />
          <div className="field-row">
            <div className="field-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label>Prioridade</label>
              <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as TaskPriority })}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <input
            className="input tags-input mono"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="tags separadas por vírgula"
          />
          <input
            type="date"
            className="input"
            value={form.dataVencimento}
            onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
          />
          <div className="form-actions">
            <button type="button" className="btn-text" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-dark">{task ? 'Salvar alterações' : 'Criar tarefa'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
  onSubmit: (data: Partial<Project>) => void
}

function ProjectModal({ project, onClose, onSubmit }: ProjectModalProps) {
  const [form, setForm] = useState({
    nome: project?.nome ?? '',
    descricao: project?.descricao ?? '',
    cor: project?.cor ?? '#2f5d62',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="campo-display">{project ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="input titulo-input campo-display"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do projeto"
            required
          />
          <textarea
            className="input"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição (opcional)"
            rows={3}
          />
          <div className="field-row">
            <label>Cor</label>
            <input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="color-input" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-text" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-dark">{project ? 'Salvar alterações' : 'Criar projeto'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TasksTabProps {
  projects: Project[]
  tasks: Task[]
  progress: Record<string, TaskProgress[]>
  activeProjectId: string | null
  onSelectProject: (id: string | null) => void
  onCreateProject: () => void
  onEditProject: (project: Project) => void
  onDeleteProject: (id: string) => void
  onCreateTask: (projectId: string) => void
  onUpdateTask: (task: Task) => void
  onAddProgress: (taskId: string, content: string, tipo: TaskProgress['tipo']) => void
}

export function TasksTab(props: TasksTabProps) {
  const { projects, tasks, progress, activeProjectId, onSelectProject, onCreateProject, onEditProject, onDeleteProject, onCreateTask, onUpdateTask, onAddProgress } = props
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [progressTask, setProgressTask] = useState<Task | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectTasks = activeProjectId ? tasks.filter((t) => t.projectId === activeProjectId) : []

  const tasksByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = projectTasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const targetStatus = (e.currentTarget as HTMLDivElement).dataset.status as TaskStatus
    const task = projectTasks.find((t) => t.id === taskId)
    if (task && task.status !== targetStatus) {
      onUpdateTask({ ...task, status: targetStatus })
    }
  }

  if (!activeProjectId) {
    return (
      <div className="tasks-empty">
        <Icon name="folder" size={48} />
        <h2 className="campo-display">Nenhum projeto selecionado</h2>
        <p>Selecione um projeto na barra lateral ou crie um novo.</p>
        <button className="btn-primary" onClick={onCreateProject}><Icon name="plus" size={16} /> Criar projeto</button>
      </div>
    )
  }

  return (
    <div className="tasks-tab">
      <aside className="projects-sidebar">
        <div className="projects-header">
          <h2 className="campo-display">Projetos</h2>
          <button className="icon-btn" onClick={onCreateProject} aria-label="Novo projeto"><Icon name="plus" size={16} /></button>
        </div>
        <ul className="projects-list">
          {projects.filter((p) => !p.arquivado).map((p) => (
            <li key={p.id} className={`project-item${activeProjectId === p.id ? ' active' : ''}`}>
              <button className="project-btn" onClick={() => onSelectProject(p.id)} style={{ borderLeftColor: p.cor }}>
                <span className="project-name">{p.nome}</span>
              </button>
              <div className="project-actions">
                <button className="icon-btn small" onClick={(e) => { e.stopPropagation(); setEditingProject(p) }} aria-label="Editar"><Icon name="edit" size={12} /></button>
                <button className="icon-btn small" onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id) }} aria-label="Excluir"><Icon name="trash" size={12} /></button>
              </div>
            </li>
          ))}
          {projects.some((p) => p.arquivado) && (
            <details className="archived-projects">
              <summary>Arquivados</summary>
              <ul>
                {projects.filter((p) => p.arquivado).map((p) => (
                  <li key={p.id} className="project-item archived">
                    <button className="project-btn" onClick={() => onSelectProject(p.id)}>
                      <span className="project-name">{p.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </ul>
        <button className="btn-primary full-width" onClick={onCreateProject}><Icon name="plus" size={14} /> Novo projeto</button>
      </aside>

      <div className="task-board-area">
        <div className="board-header">
          <h1 className="campo-display" style={{ color: activeProject?.cor }}>{activeProject?.nome}</h1>
          <button className="btn-primary" onClick={() => onCreateTask(activeProjectId!)}><Icon name="plus" size={16} /> Nova tarefa</button>
        </div>
        <div className="task-board">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onTaskClick={setEditingTask}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onAddTask={() => onCreateTask(activeProjectId!)}
            />
          ))}
        </div>
      </div>

      {editingTask && (
        <TaskModal
          task={editingTask}
          projects={projects.filter((p) => !p.arquivado)}
          onClose={() => setEditingTask(null)}
          onSubmit={(data) => { onUpdateTask({ ...editingTask, ...data }); setEditingTask(null) }}
        />
      )}

      {editingProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSubmit={(data) => { onEditProject({ ...editingProject, ...data }); setEditingProject(null) }}
        />
      )}

      {progressTask && (
        <ProgressLog
          task={progressTask}
          progress={progress[progressTask.id] ?? []}
          onClose={() => setProgressTask(null)}
          onAddProgress={(content, tipo) => { onAddProgress(progressTask.id, content, tipo); setProgressTask(null) }}
        />
      )}
    </div>
  )
}