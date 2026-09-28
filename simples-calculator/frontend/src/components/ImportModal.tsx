import { useState, useCallback } from 'react';
import { api } from '../api';
import { ImportPreviewData, AnexoType } from '@simples/shared';
import { formatCurrency, formatPercent, formatCNPJ } from '../utils';
import '../styles.css';

interface ImportModalProps {
  empresaId: string;
  empresaNome: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ empresaId, empresaNome, open, onClose, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rbt12Fonte, setRbt12Fonte] = useState<'pgdas' | 'sistema'>('pgdas');
  const [jsonText, setJsonText] = useState('');
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [editedData, setEditedData] = useState<{
    periodoApuracao: string;
    receitaBrutaMes: string;
    rbt12InformadoPgdas: string;
    anexo: AnexoType;
    observacoes: string;
  }>({
    periodoApuracao: '',
    receitaBrutaMes: '',
    rbt12InformadoPgdas: '',
    anexo: 'III',
    observacoes: '',
  });

  const fillFromPreview = (data: ImportPreviewData) => {
    setPreview(data);
    setRbt12Fonte(data.rbt12InformadoPgdas != null ? 'pgdas' : 'sistema');
    const periodoStr = data.periodo
      ? new Date(data.periodo).toISOString().slice(0, 7)
      : '';
    setEditedData({
      periodoApuracao: periodoStr,
      receitaBrutaMes: data.receitaBrutaMes?.toString() || '',
      rbt12InformadoPgdas: (data.rbt12Usado ?? data.rbt12InformadoPgdas ?? data.rbt12CalculadoSistema ?? '')?.toString() || '',
      anexo: data.anexo || 'III',
      observacoes: '',
    });
    setStep('preview');
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setUploading(true);
    setErrors({});
    try {
      const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
      let data: ImportPreviewData;
      if (isJson) {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Arquivo JSON inválido. Verifique a transcrição do Gemini.');
        }
        data = await api.previewJson(empresaId, parsed as Record<string, unknown>);
      } else {
        data = await api.previewImport(empresaId, file);
      }
      fillFromPreview(data);
    } catch (error: unknown) {
      setErrors({ general: (error as Error).message || 'Erro ao processar arquivo' });
    } finally {
      setUploading(false);
    }
  }, [empresaId]);

  const handleJsonPaste = async () => {
    setErrors({});
    if (!jsonText.trim()) {
      setErrors({ json: 'Cole o JSON transcrito pelo Gemini.' });
      return;
    }
    setUploading(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error('JSON colado é inválido. Confira aspas, vírgulas e chaves.');
      }
      const data = await api.previewJson(empresaId, parsed as Record<string, unknown>);
      fillFromPreview(data);
      setShowJsonPaste(false);
      setJsonText('');
    } catch (error: unknown) {
      setErrors({ json: (error as Error).message || 'Erro ao processar JSON' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.json') || file.type === 'application/json')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRbt12FonteChange = async (fonte: 'pgdas' | 'sistema') => {
    setRbt12Fonte(fonte);
    const rbt12 = fonte === 'pgdas' ? preview?.rbt12InformadoPgdas : preview?.rbt12CalculadoSistema;
    if (rbt12) {
      setEditedData(prev => ({ ...prev, rbt12InformadoPgdas: rbt12.toString() }));
    }
    // Recalcula alíquota com o RBT12 escolhido
    if (preview && rbt12 && rbt12 > 0 && editedData.receitaBrutaMes && editedData.anexo && editedData.periodoApuracao) {
      setRecalculating(true);
      try {
        const periodoIso = new Date(editedData.periodoApuracao + '-01T12:00:00.000Z').toISOString();
        const calc = await api.recalculate({
          receitaBrutaMes: parseFloat(editedData.receitaBrutaMes),
          rbt12Usado: rbt12,
          anexo: editedData.anexo,
          periodoApuracao: periodoIso,
        });
        setPreview(prev => prev ? {
          ...prev,
          rbt12Usado: rbt12,
          aliquotaNominal: calc.aliquotaNominal,
          parcelaDeduzir: calc.parcelaDeduzir,
          aliquotaEfetiva: calc.aliquotaEfetiva,
          valorDas: calc.valorDas,
          faixa: calc.faixa,
          memoriaCalculo: calc.memoriaCalculo,
        } : prev);
      } catch {
        // mantém preview anterior; usuário pode corrigir campos
      } finally {
        setRecalculating(false);
      }
    }
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!editedData.periodoApuracao) newErrors.periodoApuracao = 'Período é obrigatório';
    if (!editedData.receitaBrutaMes || parseFloat(editedData.receitaBrutaMes) <= 0) {
      newErrors.receitaBrutaMes = 'Receita bruta deve ser maior que zero';
    }
    if (!editedData.anexo) newErrors.anexo = 'Anexo é obrigatório';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const periodoIso = new Date(editedData.periodoApuracao + '-01T12:00:00.000Z').toISOString();
      const rbt12Escolhido = editedData.rbt12InformadoPgdas ? parseFloat(editedData.rbt12InformadoPgdas) : null;
      const obsFonte = preview?.divergencia
        ? `[RBT12 ${rbt12Fonte === 'pgdas' ? 'PGDAS' : 'sistema'} escolhido; PGDAS=${preview?.rbt12InformadoPgdas} sistema=${preview?.rbt12CalculadoSistema}] `
        : '';
      await api.confirmImport({
        empresaId,
        periodoApuracao: periodoIso,
        receitaBrutaMes: parseFloat(editedData.receitaBrutaMes),
        rbt12InformadoPgdas: rbt12Escolhido,
        anexo: editedData.anexo,
        arquivoOriginal: preview?.warnings.join(' | ').slice(0, 255) || 'importado',
        observacoes: (obsFonte + (editedData.observacoes || '')).slice(0, 1000),
      });
      onSuccess();
    } catch (error: unknown) {
      setErrors({ general: (error as Error).message || 'Erro ao salvar apuração' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {step === 'upload' && (
          <>
            <div className="card-header">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Importar PGDAS-D (PDF ou JSON)</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
                Empresa: {empresaNome}
              </p>
            </div>
            <div className="card-body">
              {errors.general && <div className="alert alert-danger">{errors.general}</div>}

              <div
                className="dropzone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('pgdas-input')?.click()}
              >
                <input
                  id="pgdas-input"
                  type="file"
                  accept=".pdf,.json,application/pdf,application/json"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="dropzone-icon">📄</div>
                <div className="dropzone-text">Arraste o PDF do PGDAS-D ou o JSON transcrito aqui, ou clique para selecionar</div>
                <div className="dropzone-hint">Máximo 10MB • PDF ou JSON</div>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setShowJsonPaste(v => !v)}>
                  {showJsonPaste ? 'Fechar colagem de JSON' : 'Colar JSON do Gemini'}
                </button>
              </div>

              {showJsonPaste && (
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">JSON transcrito (período, receita, RBT12, anexo, CNPJ)</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder='{"periodoApuracao":"06/2024","receitaBrutaMes":25000,"rbt12Informado":280000,"anexo":"III","cnpj":"..."}'
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  {errors.json && <div className="form-error">{errors.json}</div>}
                  <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={handleJsonPaste} disabled={uploading}>
                      {uploading ? 'Processando...' : 'Processar JSON'}
                    </button>
                  </div>
                </div>
              )}

              {uploading && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <div className="loading-spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 0.75rem' }}></div>
                  <p>Processando arquivo...</p>
                </div>
              )}
            </div>
            <div className="card-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
                Cancelar
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div className="card-header">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Confirmar Dados Extraídos</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
                Confira os dados abaixo e edite se necessário antes de salvar
              </p>
            </div>
            <div className="card-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {errors.general && <div className="alert alert-danger">{errors.general}</div>}

              {preview.warnings.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                  <strong>⚠️ Atenção:</strong>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                    {preview.warnings.map((w, i) => <li key={i} style={{ fontSize: '0.8125rem' }}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="preview-grid">
                <div className="preview-item">
                  <div className="preview-label">Empresa</div>
                  <div className="preview-value">{empresaNome}</div>
                </div>
                <div className="preview-item">
                  <div className="preview-label">CNPJ</div>
                  <div className="preview-value" style={{ fontFamily: 'monospace' }}>{formatCNPJ(preview.empresa.cnpj)}</div>
                </div>
              </div>

              <div className="divider"></div>

              {preview.rbt12InformadoPgdas != null && preview.rbt12CalculadoSistema != null && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', border: preview.divergencia ? '1px solid var(--color-warning)' : '1px solid var(--color-gray-200)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    RBT12 — PGDAS vs Sistema {preview.divergencia ? '⚠️ divergente' : '✓ coincidente'}
                  </h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="radio" name="rbt12fonte" checked={rbt12Fonte === 'pgdas'} onChange={() => handleRbt12FonteChange('pgdas')} />
                      PGDAS: <strong>{formatCurrency(preview.rbt12InformadoPgdas)}</strong>
                    </label>
                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="radio" name="rbt12fonte" checked={rbt12Fonte === 'sistema'} onChange={() => handleRbt12FonteChange('sistema')} />
                      Sistema: <strong>{formatCurrency(preview.rbt12CalculadoSistema)}</strong>
                    </label>
                  </div>
                  {preview.divergencia && (
                    <div style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
                      Diferença: {formatCurrency(preview.diferencaRbt12)} — escolha qual valor usar no cálculo da alíquota.
                    </div>
                  )}
                  {recalculating && <div style={{ fontSize: '0.8rem' }}>Recalculando alíquota...</div>}
                </div>
              )}

              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Dados para Conferência e Edição (Anexo selecionável)</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Período de Apuração *</label>
                  <input
                    type="month"
                    className="form-input"
                    value={editedData.periodoApuracao}
                    onChange={e => setEditedData(prev => ({ ...prev, periodoApuracao: e.target.value }))}
                  />
                  {errors.periodoApuracao && <div className="form-error">{errors.periodoApuracao}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Receita Bruta do Mês *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    value={editedData.receitaBrutaMes}
                    onChange={e => setEditedData(prev => ({ ...prev, receitaBrutaMes: e.target.value }))}
                    placeholder="0,00"
                  />
                  {errors.receitaBrutaMes && <div className="form-error">{errors.receitaBrutaMes}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">RBT12 usado no cálculo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={editedData.rbt12InformadoPgdas}
                    onChange={e => setEditedData(prev => ({ ...prev, rbt12InformadoPgdas: e.target.value }))}
                    placeholder="Opcional"
                  />
                  {preview.rbt12CalculadoSistema != null && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
                      Sistema: {formatCurrency(preview.rbt12CalculadoSistema)}
                      {preview.rbt12InformadoPgdas != null && <> • PGDAS: {formatCurrency(preview.rbt12InformadoPgdas)}</>}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Anexo *</label>
                  <select
                    className="form-select"
                    value={editedData.anexo}
                    onChange={e => setEditedData(prev => ({ ...prev, anexo: e.target.value as AnexoType }))}
                  >
                    <option value="III">Anexo III</option>
                    <option value="IV">Anexo IV</option>
                    <option value="V">Anexo V</option>
                  </select>
                  {errors.anexo && <div className="form-error">{errors.anexo}</div>}
                </div>
              </div>

              {preview.aliquotaEfetiva != null && (
                <>
                  <div className="divider"></div>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                    Alíquota do mês {preview.faixa ? `(Faixa ${preview.faixa})` : ''}
                  </h4>
                  <div className="preview-grid">
                    <div className="preview-item">
                      <div className="preview-label">Alíquota Nominal</div>
                      <div className="preview-value">{formatPercent(preview.aliquotaNominal! * 100)}</div>
                    </div>
                    <div className="preview-item">
                      <div className="preview-label">Parcela a Deduzir</div>
                      <div className="preview-value">{formatCurrency(preview.parcelaDeduzir)}</div>
                    </div>
                    <div className="preview-item">
                      <div className="preview-label">Alíquota Efetiva do mês</div>
                      <div className="preview-value positive" style={{ fontSize: '1.25rem' }}>
                        {formatPercent(preview.aliquotaEfetiva)}
                      </div>
                    </div>
                    <div className="preview-item">
                      <div className="preview-label">DAS Estimado</div>
                      <div className="preview-value">{formatCurrency(preview.valorDas)}</div>
                    </div>
                  </div>
                  {preview.memoriaCalculo && (
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.78rem', marginTop: '0.75rem', background: 'var(--color-gray-50)', padding: '0.75rem', borderRadius: '8px' }}>
                      {preview.memoriaCalculo}
                    </pre>
                  )}
                </>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editedData.observacoes}
                  onChange={e => setEditedData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações sobre esta importação (opcional)"
                />
              </div>
            </div>
            <div className="card-footer">
              <button className="btn btn-secondary" onClick={() => { setStep('upload'); setPreview(null); }} disabled={saving}>
                ← Voltar
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="loading-spinner"></span> Salvando...
                  </>
                ) : (
                  'Confirmar e Salvar'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
