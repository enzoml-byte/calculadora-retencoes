import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Empresa } from '@simples/shared';
import { formatCNPJ, formatDateBR } from '../utils';
import '../styles.css';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEmpresas = async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar empresas na montagem
  if (loading) {
    return (
      <header className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="container" style={{ padding: '1rem 1.5rem' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">Simples Calculator</h1>
              <p className="page-subtitle">Carregando...</p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Tentar detectar empresa atual da URL
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentEmpresaId = pathParts[1];
  const currentEmpresa = empresas.find(e => e.id === currentEmpresaId);

  return (
    <header className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="container" style={{ padding: '1rem 1.5rem' }}>
        <div className="page-header">
          <div>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 className="page-title">Simples Calculator</h1>
            </Link>
            <p className="page-subtitle">
              {currentEmpresa 
                ? `${currentEmpresa.razaoSocial} • ${formatCNPJ(currentEmpresa.cnpj)}`
                : 'Sistema de cálculo de alíquota do Simples Nacional'
              }
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {empresas.length > 0 && (
              <select
                value={currentEmpresaId || ''}
                onChange={(e) => navigate(`/${e.target.value}`)}
                className="form-select"
                style={{ width: 'auto', minWidth: '250px' }}
              >
                <option value="">Selecione uma empresa</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razaoSocial} ({formatCNPJ(emp.cnpj)})
                  </option>
                ))}
              </select>
            )}
            
            <Link to="/empresas/nova" className="btn btn-primary">
              <span>+</span> Nova Empresa
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      <main className="container" style={{ paddingBottom: '2rem' }}>
        <Outlet />
      </main>
      <footer style={{ 
        background: 'var(--color-white)', 
        borderTop: '1px solid var(--color-gray-200)',
        padding: '1.5rem',
        marginTop: 'auto'
      }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
          Simples Calculator - Ferramenta de apoio para cálculo de alíquota do Simples Nacional.
          <br />
          Os cálculos devem ser conferidos com o PGDAS-D oficial e a legislação vigente.
        </div>
      </footer>
    </div>
  );
}