import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { EmpresaDashboard, AnexoType } from '@simples/shared';
import { formatCurrency, formatPercent, formatDateBR, formatCNPJ, getAnexoLabel, getAnexoColor } from '../utils';
import { LoadingModal } from '../components/LoadingModal';
import { ImportModal } from '../components/ImportModal';
import '../styles.css';

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<EmpresaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [projecaoLoading, setProjecaoLoading] = useState(false);
  const [projecao, setProjecao] = useState<any>(null);

  useEffect(() => {
    if (id) loadDashboard();
  }, [id]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard(id!);
      setDashboard(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      alert('Erro ao carregar dados da empresa');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSuccess = async () => {
    setShowImportModal(false);
    await loadDashboard();
  };

  const handleProjetar = async () => {
    if (!id) return;
    setProjecaoLoading(true);
    try {
      const data = await api.getProjecao(id);
      setProjecao(data);
    } catch (error: any) {
      alert(error.message || 'Erro ao gerar projeção');
    } finally {
      setProjecaoLoading(false);
    }
  };

  if (loading) return <LoadingModal />;
  if (!dashboard) return null;

  const { empresa, ultimaApuracao, receitaAcumulada12m, rbt12Atual, anexoAtual, aliquotaEfetivaAtual, divergenciaRbt12, historico } = dashboard;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/" className="btn btn-secondary btn-sm" style={{ marginBottom: '0.5rem' }}>
            ← Voltar às empresas
          </Link>
          <h1 className="page-title">{empresa.razaoSocial}</h1>
          <p className="page-subtitle">
            CNPJ: {formatCNPJ(empresa.cnpj)} {empresa.nomeFantasia && `• ${empresa.nomeFantasia}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
            📄 Importar PGDAS
          </button>
          <button className="btn btn-secondary" onClick={handleProjetar} disabled={projecaoLoading}>
            {projecaoLoading ? 'Calculando...' : '📊 Projetar Próximo Mês'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {divergenciaRbt12 && (
        <div className="alert alert-warning">
          ⚠️ <strong>Divergência detectada:</strong> O RBT12 informado pelo PGDAS difere do RBT12 calculado pelo sistema com base no histórico. Verifique as apurações.
        </div>
      )}

      {/* Projeção do próximo mês */}
      {projecao && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-primary)', borderWidth: '2px' }}>
          <div className="card-header" style={{ background: 'var(--color-primary-light)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              📊 Projeção para {formatDateBR(projecao.proximoPeriodo)} (Estimativa)
            </h3>
          </div>
          <div className="card-body">
            <div className="preview-grid">
              <div className="preview-item">
                <div className="preview-label">RBT12 Estimado</div>
                <div className="preview-value">{formatCurrency(projecao.rbt12Estimado)}</div>
              </div>
              <div className="preview-item">
                <div className="preview-label">{getAnexoLabel(projecao.anexo)} • {projecao.faixa}ª Faixa</div>
                <div className="preview-value">
                  <span className={`badge badge-${getAnexoColor(projecao.anexo)}`}>{getAnexoLabel(projecao.anexo)}</span>
                </div>
              </div>
              <div className="preview-item">
                <div className="preview-label">Alíquota Nominal</div>
                <div className="preview-value">{formatPercent(projecao.aliquotaNominal * 100)}</div>
              </div>
              <div className="preview-item">
                <div className="preview-label">Parcela a Deduzir</div>
                <div className="preview-value">{formatCurrency(projecao.parcelaDeduzir)}</div>
              </div>
              <div className="preview-item">
                <div className="preview-label">Alíquota Efetiva Estimada</div>
                <div className="preview-value positive" style={{ fontSize: '1.5rem' }}>
                  {formatPercent(projecao.aliquotaEfetivaEstimada)}
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Base de Cálculo (últimos 12 meses)</h4>
            <div className="table-container" style={{ maxHeight: '200px' }}>
              <table style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {projecao.baseCalculo.map((item: any) => (
                    <tr key={item.periodo}>
                      <td>{formatDateBR(item.periodo)}</td>
                      <td className="text-right">{formatCurrency(item.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {projecao.observacoes.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>Observações</h4>
                <ul style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', paddingLeft: '1.25rem' }}>
                  {projecao.observacoes.map((obs: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Receita do Último Mês</div>
          <div className="stat-value">{ultimaApuracao ? formatCurrency(ultimaApuracao.receitaBrutaMes) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RBT12 Atual</div>
          <div className="stat-value">{rbt12Atual ? formatCurrency(rbt12Atual) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Receita Acumulada (12m)</div>
          <div className="stat-value">{formatCurrency(receitaAcumulada12m)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Anexo Atual</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {anexoAtual ? <span className={`badge badge-${getAnexoColor(anexoAtual)}`}>{getAnexoLabel(anexoAtual)}</span> : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alíquota Efetiva Atual</div>
          <div className="stat-value positive" style={{ fontSize: '1.5rem' }}>
            {aliquotaEfetivaAtual ? formatPercent(aliquotaEfetivaAtual) : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DAS Último Mês</div>
          <div className="stat-value">{ultimaApuracao ? formatCurrency(ultimaApuracao.valorDas) : '—'}</div>
        </div>
      </div>

      {/* Memória de cálculo da última apuração */}
      {ultimaApuracao && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              📋 Memória de Cálculo - {formatDateBR(ultimaApuracao.periodoApuracao)}
            </h3>
          </div>
          <div className="card-body">
            <div className="memoria-calculo">
{`RBT12: ${formatCurrency(ultimaApuracao.rbt12CalculadoSistema || ultimaApuracao.rbt12InformadoPgdas || 0)}

Faixa utilizada: ${ultimaApuracao.anexo === 'III' ? '2ª' : ultimaApuracao.anexo === 'IV' ? '2ª' : '2ª'} faixa (exemplo)

Alíquota nominal: ${formatPercent(ultimaApuracao.aliquotaNominal * 100)}

Parcela a deduzir: ${formatCurrency(ultimaApuracao.parcelaDeduzir)}

Cálculo:
(${formatCurrency(ultimaApuracao.rbt12CalculadoSistema || ultimaApuracao.rbt12InformadoPgdas || 0).replace('R$', '').trim()} × ${formatPercent(ultimaApuracao.aliquotaNominal * 100)} − ${formatCurrency(ultimaApuracao.parcelaDeduzir)}) / ${formatCurrency(ultimaApuracao.rbt12CalculadoSistema || ultimaApuracao.rbt12InformadoPgdas || 0).replace('R$', '').trim()}

Alíquota efetiva: ${formatPercent(ultimaApuracao.aliquotaEfetiva)}

Valor DAS: ${formatCurrency(ultimaApuracao.valorDas)}

Anexo: ${getAnexoLabel(ultimaApuracao.anexo)}`}
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Apurações */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>📊 Histórico de Apurações</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {historico.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📄</div>
              <p>Nenhuma apuração registrada. Importe o primeiro PGDAS.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Período</th>
                    <th className="text-right">Receita</th>
                    <th className="text-right">RBT12 PGDAS</th>
                    <th className="text-right">RBT12 Sistema</th>
                    <th style={{ width: '100px' }}>Anexo</th>
                    <th className="text-right">Alíquota Efetiva</th>
                    <th className="text-right">DAS</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '120px' }} className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.slice().reverse().map((item, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 500 }}>{formatDateBR(item.periodo)}</td>
                      <td className="text-right">{formatCurrency(item.receita)}</td>
                      <td className="text-right">{item.rbt12Pgdas ? formatCurrency(item.rbt12Pgdas) : '—'}</td>
                      <td className="text-right">{item.rbt12Sistema ? formatCurrency(item.rbt12Sistema) : '—'}</td>
                      <td>
                        <span className={`badge badge-${getAnexoColor(item.anexo)}`}>{getAnexoLabel(item.anexo)}</span>
                      </td>
                      <td className="text-right">{formatPercent(item.aliquotaEfetiva)}</td>
                      <td className="text-right">{formatCurrency(item.valorDas)}</td>
                      <td>
                        {item.divergencia ? (
                          <span className="badge badge-warning" title="Divergência entre RBT12 PGDAS e Sistema">
                            ⚠️ Divergente
                          </span>
                        ) : (
                          <span className="badge badge-success">OK</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => alert('Funcionalidade de edição em desenvolvimento')}
                          title="Editar/Retificar"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => alert('Funcionalidade de exclusão em desenvolvimento')}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Importação */}
      <ImportModal
        empresaId={id!}
        empresaNome={empresa.razaoSocial}
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}