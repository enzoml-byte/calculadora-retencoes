import { Icon } from './Icons'

export function EmptyState({ variant }: { variant: 'empty' | 'no-results' }) {
  return (
    <div className="empty-box">
      <span className="empty-icon">
        <Icon name="feather" size={26} />
      </span>
      {variant === 'empty' ? (
        <>
          <p className="empty-title campo-display">Ainda vazio.</p>
          <p className="empty-sub">
            Catalogue o primeiro registro — trabalho ou hobby, tanto faz. Dica rápida:{' '}
            <kbd>N</kbd> abre o formulário.
          </p>
        </>
      ) : (
        <>
          <p className="empty-title campo-display">Nada encontrado por aqui.</p>
          <p className="empty-sub">
            Limpe a busca ou os filtros. Você também pode usar <kbd>tag:algo</kbd> ou{' '}
            <kbd>campo:algo</kbd> na busca.
          </p>
        </>
      )}
    </div>
  )
}
