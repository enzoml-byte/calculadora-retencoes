import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  Empresa, 
  Apuracao, 
  ImportPreviewData, 
  ProjecaoProximoMes, 
  EmpresaDashboard,
  HistoricoApuracao,
  AnexoType 
} from '@simples/shared';

const API_BASE = '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message = (error.response?.data as any)?.error || error.message;
        return Promise.reject(new Error(message));
      }
    );
  }

  // Empresas
  async getEmpresas(): Promise<Empresa[]> {
    const { data } = await this.client.get('/empresas');
    return data;
  }

  async createEmpresa(data: { razaoSocial: string; nomeFantasia?: string; cnpj: string }): Promise<Empresa> {
    const { data: empresa } = await this.client.post('/empresas', data);
    return empresa;
  }

  async getEmpresa(id: string): Promise<Empresa> {
    const { data } = await this.client.get(`/empresas/${id}`);
    return data;
  }

  async updateEmpresa(id: string, data: Partial<Empresa>): Promise<Empresa> {
    const { data: empresa } = await this.client.put(`/empresas/${id}`, data);
    return empresa;
  }

  async deleteEmpresa(id: string): Promise<void> {
    await this.client.delete(`/empresas/${id}`);
  }

  async getDashboard(id: string): Promise<EmpresaDashboard> {
    const { data } = await this.client.get(`/empresas/${id}/dashboard`);
    return data;
  }

  // Apurações
  async getApuracoes(empresaId: string): Promise<Apuracao[]> {
    const { data } = await this.client.get(`/empresas/${empresaId}/apuracoes`);
    return data;
  }

  async createApuracao(data: {
    empresaId: string;
    periodoApuracao: string;
    receitaBrutaMes: number;
    rbt12InformadoPgdas?: number | null;
    anexo: AnexoType;
    arquivoOriginal?: string;
    observacoes?: string;
  }): Promise<Apuracao> {
    const { data: apuracao } = await this.client.post('/apuracoes', data);
    return apuracao;
  }

  async getApuracao(id: string): Promise<Apuracao> {
    const { data } = await this.client.get(`/apuracoes/${id}`);
    return data;
  }

  async retificarApuracao(id: string, data: {
    receitaBrutaMes?: number;
    rbt12InformadoPgdas?: number | null;
    anexo?: AnexoType;
    observacoes?: string;
  }): Promise<Apuracao> {
    const { data: apuracao } = await this.client.post(`/apuracoes/${id}/retificar`, data);
    return apuracao;
  }

  async deleteApuracao(id: string): Promise<void> {
    await this.client.delete(`/apuracoes/${id}`);
  }

  // Importação (PDF ou JSON)
  async previewImport(empresaId: string, file: File): Promise<ImportPreviewData> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresaId', empresaId);

    const { data } = await this.client.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async previewJson(empresaId: string, dados: Record<string, unknown>): Promise<ImportPreviewData> {
    const { data } = await this.client.post('/import/preview-json', { empresaId, dados });
    return data;
  }

  async recalculate(data: {
    receitaBrutaMes: number;
    rbt12Usado: number;
    anexo: AnexoType;
    periodoApuracao: string;
  }): Promise<{ faixa: number; aliquotaNominal: number; parcelaDeduzir: number; aliquotaEfetiva: number; valorDas: number; memoriaCalculo: string }> {
    const { data: result } = await this.client.post('/import/recalculate', data);
    return result;
  }

  async confirmImport(data: {
    empresaId: string;
    periodoApuracao: string;
    receitaBrutaMes: number;
    rbt12InformadoPgdas?: number | null;
    anexo: AnexoType;
    arquivoOriginal: string;
    observacoes?: string;
  }): Promise<Apuracao> {
    const { data: apuracao } = await this.client.post('/import/confirm', data);
    return apuracao;
  }

  // Projeção
  async getProjecao(empresaId: string): Promise<ProjecaoProximoMes> {
    const { data } = await this.client.get(`/empresas/${empresaId}/projecao`);
    return data;
  }

  // Regras tributárias
  async getTaxRules(): Promise<any[]> {
    const { data } = await this.client.get('/tax-rules');
    return data;
  }

  async getTaxRulesByAnexo(anexo: AnexoType): Promise<any[]> {
    const { data } = await this.client.get(`/tax-rules/${anexo}`);
    return data;
  }
}

export const api = new ApiClient();