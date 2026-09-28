import { useMemo } from 'react'
import type { Especime } from '../types'
import { Icon } from './Icons'

interface SidebarProps {
  entries: Especime[]
  activeTag: string | null
  activeCampo: string | null
  onSelectTag: (tag: string | null) => void
  onSelectCampo: (campo: string | null) => void
  onExport: () => void
  onImport: () => void
}

function fieldChipClass(campo: string): string {
  const k = campo.toLowerCase()
  if (k === 'trabalho') return ' chip-trabalho'
  if (k === 'hobby') return ' chip-hobby'
  return ''
}

export function Sidebar(props: SidebarProps) {
  const { entries, activeTag, activeCampo, onSelectTag, onSelectCampo, onExport, onImport } = props

  const campos = useMemo(() => {
    const counts = new Map<string, number>()
    entries.forEach((e) => {
      const k = e.campo || 'Trabalho'
      counts.set(k, (counts.get(k) || 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    entries.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  return (
    <>
      <div className="sidebar-brand">
        <span className="brand-icon">
          <Icon name="book" size={20} />
        </span>
        <div>
          <strong>Caderno de Campo</strong>
          <span className="mono">
            {String(entries.length).padStart(3, '0')} registros · {campos.length}{' '}
            {campos.length === 1 ? 'campo' : 'campos'}
          </span>
        </div>
      </div>

      <nav className="side-section">
        <h3>Campos</h3>
        <div className="chip-list">
          <button
            className={'chip' + (activeCampo === null ? ' active' : '')}
            onClick={() => onSelectCampo(null)}
          >
            Todos
          </button>
          {campos.map(([name, count]) => (
            <button
              key={name}
              className={
                'chip mono' +
                (activeCampo === name ? ' active' : '') +
                fieldChipClass(name)
              }
              onClick={() => onSelectCampo(activeCampo === name ? null : name)}
            >
              {name} · {count}
            </button>
          ))}
        </div>
      </nav>

      <nav className="side-section grow">
        <h3>Tags</h3>
        {tags.length === 0 && <p className="side-empty">Nenhuma tag ainda.</p>}
        <ul className="tag-list">
          {tags.map(([name, count]) => (
            <li key={name}>
              <button
                className={'tag-row' + (activeTag === name ? ' active' : '')}
                onClick={() => onSelectTag(activeTag === name ? null : name)}
              >
                <Icon name="tag" size={12} />
                <span className="tag-name">{name}</span>
                <span className="tag-count">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="side-footer">
        <button className="ghost-btn block" onClick={onExport}>
          <Icon name="download" size={14} /> Exportar backup
        </button>
        <button className="ghost-btn block" onClick={onImport}>
          <Icon name="upload" size={14} /> Importar backup
        </button>
        <p className="side-note">Tudo fica salvo neste navegador. Exporte backups de vez em quando.</p>
      </div>
    </>
  )
}
