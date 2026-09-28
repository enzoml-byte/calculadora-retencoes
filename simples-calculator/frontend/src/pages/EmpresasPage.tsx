import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Empresa } from '@simples/shared';
import { formatCNPJ, formatDateBR, formatCurrency } from '../utils';
import { LoadingModal } from '../components/LoadingModal';
import '../styles.css';

export default function EmpresasPage() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ razaoSocial: '', nomeFantasia: '', cnpj: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      alert('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.razaoSocial.trim()) newErrors.razaoSocial = 'Razão social é obrigatória';
    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    else if (formData.cnpj.replace(/\D/g, '').length !== 14) newErrors.cnpj = 'CNPJ deve ter 14 dígitos';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const empresa = await api.createEmpresa({
        razaoSocial: formData.razaoSocial.trim(),
        nomeFantasia: formData.nomeFantasia.trim() || undefined,
        cnpj: formData.cnpj.replace(/\D/g, ''),
      });
      setShowModal(false);
      setFormData({ razaoSocial: '', nomeFantasia: '', cnpj: '' });
      await loadEmpresas();
      navigate(`/${empresa.id}`);
    } catch (error: any) {
      if (error.message.includes('CNPJ já cadastrado')) {
        setErrors({ cnpj: 'Este CNPJ já está cadastrado' });
      } else {
        alert(`Erro ao criar empresa: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    // Formatar enquanto digita
    if (value.length > 12) {
      value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,3})/, '$1.$2');
    }
    
    setFormData(prev => ({ ...prev, cnpj: value }));
    if (errors.cnpj) setErrors(prev => ({ ...prev, cnpj: '' }));
  };

  if (loading) {
    return <LoadingModal />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">{empresas.length} empresa(s) cadastrada(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+</span> Nova Empresa
        </button>
      </div>

      {empresas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3 style={{ marginBottom: '0.5rem' }}>Nenhuma empresa cadastrada</h3>
            <p style={{ marginBottom: '1.5rem' }}>Clique em "Nova Empresa" para começar</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span>+</span> Cadastrar Primeira Empresa
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th style={{ width: '180px' }}>Última Apuração</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }} className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(empresa => (
                  <tr key={empresa.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{empresa.razaoSocial}</div>
                        {empresa.nomeFantasia && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
                            {empresa.nomeFantasia}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{formatCNPJ(empresa.cnpj)}</td>
                    <td>{empresa.apuracoes?.[0] ? formatDateBR(empresa.apuracoes[0].periodoApuracao) : '—'}</td>
                    <td>
                      <span className={`badge ${empresa.ativo ? 'badge-success' : 'badge-gray'}`}>
                        {empresa.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                        <Link to={`/${empresa.id}`} className="btn btn-secondary btn-sm" title="Abrir dashboard">
                          Abrir
                        </Link>
                        <Link to={`/empresas/${empresa.id}/editar`} className="btn btn-secondary btn-sm" title="Editar">
                          ✏️
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Empresa */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Nova Empresa</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Razão Social *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.razaoSocial}
                    onChange={e => setFormData(prev => ({ ...prev, razaoSocial: e.target.value }))}
                    placeholder="Ex: Empresa Exemplo Ltda"
                    autoFocus
                  />
                  {errors.razaoSocial && <div className="form-error">{errors.razaoSocial}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Fantasia</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nomeFantasia}
                    onChange={e => setFormData(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                    placeholder="Ex: Exemplo Serviços (opcional)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {errors.cnpj && <div className="form-error">{errors.cnpj}</div>}
                </div>
              </div>
              <div className="card-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="loading-spinner"></span> Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}