import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EntryDraft, Especime, SortMode } from './types'
import type { Project, Task, TaskProgress } from './storage/types'
import { newId } from './lib/id'
import { loadTheme, saveTheme } from './storage/localStorageAdapter'
import type { Theme } from './storage/types'
import { searchAndFilter } from './lib/text'
import { initializeStorage, getAdapter } from './storage'
import { EmptyState } from './components/EmptyState'
import { EntryCard } from './components/EntryCard'
import { EntryForm } from './components/EntryForm'
import { Icon } from './components/Icons'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { TopBar } from './components/TopBar'
import { TasksTab } from './components/TasksTab'
import { ToastProvider, useToasts } from './hooks/useToasts'

type Tab = 'conhecimento' | 'tarefas'

function initialTheme(): Theme {
  const stored = loadTheme()
  if (stored) return stored
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

interface MobileFiltersProps {
  entries: Especime[]
  activeCampo: string | null
  activeTag: string | null
  onSelectCampo: (campo: string | null) => void
  onSelectTag: (tag: string | null) => void
}

function MobileFilters(props: MobileFiltersProps) {
  const { entries, activeCampo, activeTag, onSelectCampo, onSelectTag } = props
  const campos = useMemo(() => {
    const counts = new Map<string, number>()
    entries.forEach((e) => {
      const k = e.campo || 'Trabalho'
      counts.set(k, (counts.get(k) || 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])
  return (
    <div className="mobile-filters">
      <div className="chip-scroll">
        <button
          className={'chip' + (activeCampo === null ? ' active' : '')}
          onClick={() => onSelectCampo(null)}
        >
          Todos
        </button>
        {campos.map(([name, count]) => (
          <button
            key={name}
            className={'chip mono' + (activeCampo === name ? ' active' : '')}
            onClick={() => onSelectCampo(activeCampo === name ? null : name)}
          >
            {name} · {count}
          </button>
        ))}
      </div>
      {activeTag && (
        <button className="chip tag-clear" onClick={() => onSelectTag(null)}>
          <Icon name="tag" size={11} /> #{activeTag} <Icon name="x" size={11} />
        </button>
      )}
    </div>
  )
}

function Caderno() {
  const { push } = useToasts()
  const [entries, setEntries] = useState<Especime[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeCampo, setActiveCampo] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Especime | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [lastCampo, setLastCampo] = useState('Trabalho')
  const [initialized, setInitialized] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Tasks state
  const [activeTab, setActiveTab] = useState<Tab>('conhecimento')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState<Record<string, TaskProgress[]>>({})
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    initializeStorage({ kind: 'localStorage' })
      .then(async (adapter) => {
        const [entriesList, projectsList] = await Promise.all([
          adapter.getAll(),
          adapter.getProjects(false),
        ])
        if (mounted) {
          setEntries(entriesList)
          setProjects(projectsList)
          if (projectsList.length > 0 && !activeProjectId) {
            setActiveProjectId(projectsList[0].id)
          }
          // Load tasks for active project
          if (activeProjectId) {
            const tasksList = await adapter.getTasks(activeProjectId)
            setTasks(tasksList)
            const progMap: Record<string, TaskProgress[]> = {}
            for (const t of tasksList) {
              progMap[t.id] = await adapter.getProgress(t.id)
            }
            setProgress(progMap)
          }
          setProjectsLoaded(true)
          setInitialized(true)
        }
      })
      .catch((err) => {
        if (mounted) {
          setStorageError('Falha ao inicializar storage: ' + (err instanceof Error ? err.message : String(err)))
          setInitialized(true)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  // Load tasks when active project changes
  useEffect(() => {
    if (!projectsLoaded || !activeProjectId) return
    let mounted = true
    getAdapter()
      .getTasks(activeProjectId)
      .then((list) => {
        if (mounted) {
          setTasks(list)
          for (const t of list) {
            getAdapter().getProgress(t.id).then((p) => {
              if (mounted) {
                setProgress((prev) => ({ ...prev, [t.id]: p }))
              }
            })
          }
        }
      })
  }, [activeProjectId, projectsLoaded])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const visible = useMemo(() => {
    const base = activeCampo
      ? entries.filter((e) => (e.campo || '').toLowerCase() === activeCampo.toLowerCase())
      : entries
    const { scored, plainTerms } = searchAndFilter(base, query, activeTag)
    const list = scored.map((s) => s.entry)
    if (query.trim()) return { list, plainTerms }
    if (sortMode === 'recent') list.sort((a, b) => +new Date(b.data) - +new Date(a.data))
    else if (sortMode === 'oldest') list.sort((a, b) => +new Date(a.data) - +new Date(b.data))
    else list.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    return { list, plainTerms: [] as string[] }
  }, [entries, query, activeTag, activeCampo, sortMode])

  const openNew = useCallback(() => {
    setEditing(null)
    setConfirmDeleteId(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((esp: Especime) => {
    setEditing(esp)
    setConfirmDeleteId(null)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditing(null)
  }, [])

  const submitForm = useCallback(
    async (draft: EntryDraft) => {
      if (!draft.titulo || !draft.conteudo) return
      setLastCampo(draft.campo)
      const adapter = getAdapter()
      try {
        if (editing) {
          await adapter.update(editing.id, { ...draft, atualizadoEm: new Date().toISOString() })
          push('Registro atualizado.')
        } else {
          await adapter.create({
            id: newId(),
            titulo: draft.titulo,
            campo: draft.campo,
            tags: draft.tags,
            conteudo: draft.conteudo,
            data: new Date().toISOString(),
          })
          push('Registro catalogado.')
        }
      } catch (err) {
        push('Falha ao salvar: ' + (err instanceof Error ? err.message : String(err)))
        return
      }
      const fresh = await adapter.getAll()
      setEntries(fresh)
      closeForm()
    },
    [entries, editing, push, closeForm],
  )

  const confirmDelete = useCallback(
    async (id: string) => {
      const adapter = getAdapter()
      const cur = entriesRef.current
      const idx = cur.findIndex((e) => e.id === id)
      if (idx === -1) return
      const removed = cur[idx]
      try {
        await adapter.delete(id)
        const fresh = await adapter.getAll()
        setEntries(fresh)
        setConfirmDeleteId(null)
        push('Registro excluído.', {
          actionLabel: 'Desfazer',
          duration: 7000,
          onAction: async () => {
            await adapter.create({
              id: removed.id,
              titulo: removed.titulo,
              campo: removed.campo,
              tags: removed.tags,
              conteudo: removed.conteudo,
              data: removed.data,
              atualizadoEm: removed.atualizadoEm,
            })
            const restored = await adapter.getAll()
            setEntries(restored)
          },
        })
      } catch (err) {
        push('Falha ao excluir: ' + (err instanceof Error ? err.message : String(err)))
      }
    },
    [push],
  )

  const handleExport = useCallback(async () => {
    try {
      const adapter = getAdapter()
      await adapter.exportBackup()
      push('Backup exportado.')
    } catch (err) {
      push('Não consegui exportar o backup: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push])

  const handleImportClick = useCallback(() => {
    importFileRef.current?.click()
  }, [])

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = String(reader.result)
        const parsed = JSON.parse(text)
        const adapter = getAdapter()
        const mesclar = window.confirm(
          (parsed.especimes?.length ?? 0) +
            ' registro(s) encontrados.\n\nOK = mesclar com os atuais (sem duplicar por ID)\nCancelar = substituir tudo',
        )
        const count = await adapter.importBackup(parsed, mesclar ? 'merge' : 'replace')
        const [freshEntries, freshProjects] = await Promise.all([adapter.getAll(), adapter.getProjects(false)])
        setEntries(freshEntries)
        setProjects(freshProjects)
        push('Importação concluída: ' + count + ' registro(s).')
      } catch (err) {
        push('Falha na importação: ' + (err instanceof Error ? err.message : String(err)))
      }
    }
    reader.readAsText(file)
  }

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    saveTheme(next)
    setTheme(next)
  }, [theme])

  // Tasks handlers
  const handleCreateProject = useCallback(async () => {
    const adapter = getAdapter()
    const now = new Date().toISOString()
    const project: Project = {
      id: newId('prj'),
      nome: 'Novo projeto',
      descricao: '',
      cor: '#2f5d62',
      criadoEm: now,
      arquivado: false,
    }
    try {
      await adapter.createProject(project)
      const fresh = await adapter.getProjects(false)
      setProjects(fresh)
      setActiveProjectId(project.id)
      push('Projeto criado.')
    } catch (err) {
      push('Falha ao criar projeto: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push])

  const handleEditProject = useCallback(async (project: Project) => {
    const adapter = getAdapter()
    try {
      await adapter.updateProject(project.id, project)
      const fresh = await adapter.getProjects(false)
      setProjects(fresh)
      push('Projeto atualizado.')
    } catch (err) {
      push('Falha ao atualizar projeto: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push])

  const handleDeleteProject = useCallback(async (id: string) => {
    const adapter = getAdapter()
    try {
      await adapter.deleteProject(id)
      const fresh = await adapter.getProjects(false)
      setProjects(fresh)
      if (activeProjectId === id) {
        setActiveProjectId(fresh[0]?.id ?? null)
      }
      push('Projeto excluído.')
    } catch (err) {
      push('Falha ao excluir projeto: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [activeProjectId, push])

  const handleCreateTask = useCallback(async (projectId: string) => {
    const adapter = getAdapter()
    const projectTasks = tasks.filter((t) => t.projectId === projectId)
    const maxOrdem = projectTasks.reduce((max, t) => Math.max(max, t.ordem || 0), 0)
    const now = new Date().toISOString()
    const task: Task = {
      id: newId('tsk'),
      projectId,
      titulo: 'Nova tarefa',
      descricao: '',
      status: 'backlog',
      prioridade: 'medium',
      tags: [],
      dataCriacao: now,
      dataAtualizacao: undefined,
      dataConclusao: undefined,
      dataVencimento: undefined,
      ordem: maxOrdem + 1,
    }
    try {
      await adapter.createTask(task)
      const fresh = await adapter.getTasks(projectId)
      setTasks(fresh)
      push('Tarefa criada.')
    } catch (err) {
      push('Falha ao criar tarefa: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push, tasks])

  const handleUpdateTask = useCallback(async (task: Task) => {
    const adapter = getAdapter()
    try {
      await adapter.updateTask(task.id, task)
      const fresh = await adapter.getTasks(task.projectId)
      setTasks(fresh)
    } catch (err) {
      push('Falha ao atualizar tarefa: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push])

  const handleAddProgress = useCallback(async (taskId: string, content: string, tipo: TaskProgress['tipo']) => {
    const adapter = getAdapter()
    const now = new Date().toISOString()
    const prog: TaskProgress = {
      id: newId('prg'),
      taskId,
      conteudo: content,
      data: now,
      tipo,
    }
    try {
      await adapter.addProgress(prog)
      const fresh = await adapter.getProgress(taskId)
      setProgress((prev) => ({ ...prev, [taskId]: fresh }))
    } catch (err) {
      push('Falha ao registrar andamento: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [push])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing =
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if ((e.key === 'n' || e.key === 'N') && !typing && activeTab === 'conhecimento') {
        e.preventDefault()
        openNew()
      } else if (e.key === 'Escape') {
        if (formOpen) closeForm()
        else if (confirmDeleteId) setConfirmDeleteId(null)
        else if (drawerOpen) setDrawerOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [formOpen, confirmDeleteId, drawerOpen, openNew, closeForm, activeTab])

  if (!initialized) {
    return (
      <div className="app-shell">
        <div className="main">
          <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="empty-box">
              <span className="empty-icon"><Icon name="feather" size={26} /></span>
              <p className="empty-title campo-display">Carregando…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const knowledgeContent = (
    <div>
      <MobileFilters
        entries={entries}
        activeCampo={activeCampo}
        activeTag={activeTag}
        onSelectCampo={(c) => setActiveCampo(activeCampo === c ? null : c)}
        onSelectTag={(t) => setActiveTag(t)}
      />

      {storageError && <div className="msg-error">{storageError}</div>}

      {visible.list.length === 0 ? (
        <EmptyState variant={entries.length === 0 ? 'empty' : 'no-results'} />
      ) : (
        <div className="grid">
          {visible.list.map((esp, i) => (
            <EntryCard
              key={esp.id}
              esp={esp}
              terms={visible.plainTerms}
              index={i}
              confirmingDelete={confirmDeleteId === esp.id}
              onEdit={() => openEdit(esp)}
              onAskDelete={() => setConfirmDeleteId(esp.id)}
              onConfirmDelete={() => confirmDelete(esp.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onSelectTag={(t) => {
                setActiveTag(t)
                window.scrollTo({ top: 0 })
              }}
            />
          ))}
        </div>
      )}

      <footer className="foot">
        Caderno de Campo · storage: localStorage (pronto para API/PostgreSQL)
      </footer>
    </div>
  )

  const tasksContent = (
    <TasksTab
      projects={projects}
      tasks={tasks}
      progress={progress}
      activeProjectId={activeProjectId}
      onSelectProject={setActiveProjectId}
      onCreateProject={handleCreateProject}
      onEditProject={handleEditProject}
      onDeleteProject={handleDeleteProject}
      onCreateTask={handleCreateTask}
      onUpdateTask={handleUpdateTask}
      onAddProgress={handleAddProgress}
    />
  )

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (drawerOpen ? ' open' : '')}>
        <Sidebar
          entries={entries}
          activeTag={activeTag}
          activeCampo={activeCampo}
          onSelectTag={(t) => {
            setActiveTag(t)
            setDrawerOpen(false)
          }}
          onSelectCampo={(c) => {
            setActiveCampo(c)
            setDrawerOpen(false)
          }}
          onExport={handleExport}
          onImport={handleImportClick}
        />
      </aside>
      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}

      <div className="main">
        <TopBar
          query={activeTab === 'conhecimento' ? query : ''}
          onQueryChange={setQuery}
          sortMode={sortMode}
          onSortChange={setSortMode}
          onNew={() => (formOpen && !editing ? closeForm() : openNew())}
          onMenu={() => setDrawerOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          searchRef={searchRef}
        />

        <div className="tabs-nav" role="tablist" aria-label="Abas principais">
          <button
            role="tab"
            aria-selected={activeTab === 'conhecimento'}
            className={'tab-btn' + (activeTab === 'conhecimento' ? ' active' : '')}
            onClick={() => setActiveTab('conhecimento')}
          >
            <Icon name="book" size={16} /> Conhecimento
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'tarefas'}
            className={'tab-btn' + (activeTab === 'tarefas' ? ' active' : '')}
            onClick={() => setActiveTab('tarefas')}
          >
            <Icon name="check-square" size={16} /> Tarefas
          </button>
        </div>

        <div className="content">
          {activeTab === 'conhecimento' ? knowledgeContent : tasksContent}
        </div>
      </div>

      <button className="fab" onClick={activeTab === 'conhecimento' ? openNew : () => { if (activeProjectId) handleCreateTask(activeProjectId) }} aria-label={activeTab === 'conhecimento' ? 'Novo registro' : 'Nova tarefa'}>
        <Icon name="plus" size={22} />
      </button>

      {formOpen && (
        <EntryForm editing={editing} defaultCampo={lastCampo} onClose={closeForm} onSubmit={submitForm} />
      )}

      <input
        ref={importFileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0]
          if (f) handleImportFile(f)
          e.target.value = ''
        }}
      />

      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Caderno />
    </ToastProvider>
  )
}