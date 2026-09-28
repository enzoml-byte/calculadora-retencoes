import type { RefObject } from 'react'
import type { SortMode } from '../types'
import type { Theme } from '../lib/storage'
import { Icon } from './Icons'

interface TopBarProps {
  query: string
  onQueryChange: (q: string) => void
  sortMode: SortMode
  onSortChange: (s: SortMode) => void
  onNew: () => void
  onMenu: () => void
  theme: Theme
  onToggleTheme: () => void
  searchRef: RefObject<HTMLInputElement | null>
}

export function TopBar(props: TopBarProps) {
  const { query, onQueryChange, sortMode, onSortChange, onNew, onMenu, theme, onToggleTheme, searchRef } =
    props
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Abrir menu">
        <Icon name="menu" size={18} />
      </button>
      <div className="search-box">
        <Icon name="search" size={15} />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar… (ex.: tag:python ou campo:hobby)"
          autoComplete="off"
          aria-label="Buscar registros"
        />
        {query && (
          <button
            className="icon-btn small"
            onClick={() => onQueryChange('')}
            aria-label="Limpar busca"
          >
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
      <select
        className="select"
        value={sortMode}
        disabled={query.trim().length > 0}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        title={query.trim() ? 'Ordenação manual desativada durante a busca (ordenado por relevância)' : 'Ordenar'}
        aria-label="Ordenar registros"
      >
        <option value="recent">Recentes</option>
        <option value="oldest">Antigos</option>
        <option value="az">A–Z</option>
      </select>
      <button className="icon-btn" onClick={onToggleTheme} title="Alternar tema" aria-label="Alternar tema">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>
      <button className="btn-primary" onClick={onNew}>
        <Icon name="plus" size={15} />
        <span className="btn-primary-label">Catalogar</span>
      </button>
    </header>
  )
}
