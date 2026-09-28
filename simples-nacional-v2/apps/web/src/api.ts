const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const corpo = (await r.json().catch(() => ({}))) as T & { codigo?: string; mensagem?: string };
  if (!r.ok) throw new Error(corpo.codigo ?? `HTTP_${r.status}`);
  return corpo;
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
}

export interface Apuracao {
  id: string;
  periodoApuracao: string;
  receitaBrutaMes: number;
  rbt12Calculado: number;
  rbt12InformadoPgdas?: number | null;
  anexo: string;
  aliquotaEfetiva: number;
  valorDAS: number;
  versaoRegra: string;
}

export interface Dashboard {
  empresa: Empresa;
  apuracoes: Apuracao[];
  rbt12Atual: number;
  rbt12Parcial: boolean;
  projecao: { receitaEstimada: number; aliquotaEfetiva: number; valorDAS: number; faixa: number };
}

export const api = {
  empresas: () => req<Empresa[]>("/empresas"),
  criarEmpresa: (dados: { razaoSocial: string; nomeFantasia?: string; cnpj: string }) =>
    req<Empresa>("/empresas", { method: "POST", body: JSON.stringify(dados) }),
  importarPdf: async (arquivo: File): Promise<Record<string, unknown>> => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    const r = await fetch(`${BASE}/import/pdf`, { method: "POST", body: form });
    const corpo = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) throw new Error((corpo.codigo as string) ?? `HTTP_${r.status}`);
    return corpo;
  },
  confirmar: (dados: Record<string, unknown>) =>
    req<Apuracao>("/apuracoes/confirmar", { method: "POST", body: JSON.stringify(dados) }),
  dashboard: (empresaId: string) => req<Dashboard>(`/empresas/${empresaId}/dashboard`),
};
