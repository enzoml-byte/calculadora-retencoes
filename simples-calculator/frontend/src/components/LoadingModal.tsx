import '../styles.css';

export function LoadingModal() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '400px',
      gap: '1rem'
    }}>
      <div className="loading-spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }}></div>
      <p style={{ color: 'var(--color-gray-500)' }}>Carregando...</p>
    </div>
  );
}