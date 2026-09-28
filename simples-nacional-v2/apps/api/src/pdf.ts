import pdf from "pdf-parse";

export interface DadosExtraidos {
  cnpj?: string;
  periodoApuracao?: string;
  receitaBrutaMes?: number;
  rbt12InformadoPgdas?: number;
  anexoSugerido?: "III" | "IV" | "V";
  /** Campos nao identificados — conferir manualmente, nunca inventar valor. */
  avisos: string[];
}

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

/** Camada fina sobre pdf-parse (sem regra de negocio). */
export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) throw new Error("PDF_VAZIO");
  if (buffer.length > PDF_MAX_BYTES) throw new Error("PDF_MUITO_GRANDE");
  const out = await pdf(buffer);
  return out.text ?? "";
}

/** "12.345,67" -> 12345.67 ; "1234,5" -> 1234.5 ; invalido -> undefined */
export function parseBRL(s: string): number | undefined {
  const limpo = s.trim().replace(/[^\d.,]/g, "");
  if (!limpo) return undefined;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : undefined;
}

const primeiroGrupo = (texto: string, re: RegExp): string | undefined => {
  const m = re.exec(texto);
  return m?.[1];
};

/**
 * Heuristicas sobre o texto do PGDAS-D. Campo ausente = aviso, nunca chute.
 * Testavel sem PDF real (recebe texto).
 */
export function extrairDadosPgdas(texto: string): DadosExtraidos {
  const avisos: string[] = [];

  const cnpjMascarado = primeiroGrupo(texto, /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  const cnpj = cnpjMascarado?.replace(/\D/g, "");
  if (!cnpj) avisos.push("cnpj_nao_identificado");

  const comp = /compet.ncia[^0-9]{0,30}(\d{2})\/(\d{4})/i.exec(texto)
    ?? /per.odo de apura..o[^0-9]{0,40}(\d{2})\/(\d{4})/i.exec(texto);
  const periodoApuracao = comp ? `${comp[2]}${comp[1]}` : undefined;
  if (!periodoApuracao) avisos.push("periodo_nao_identificado");

  const receitaStr = primeiroGrupo(
    texto,
    /receita bruta[^R$0-9]{0,40}R?\$?\s?([\d.,]+)/i,
  );
  const receitaBrutaMes = receitaStr ? parseBRL(receitaStr) : undefined;
  if (receitaBrutaMes === undefined) avisos.push("receita_nao_identificada");

  const rbt12Str = primeiroGrupo(texto, /RBT12[^R$0-9]{0,40}R?\$?\s?([\d.,]+)/i);
  const rbt12InformadoPgdas = rbt12Str ? parseBRL(rbt12Str) : undefined;
  if (rbt12InformadoPgdas === undefined) avisos.push("rbt12_nao_identificado");

  const anexoRaw = primeiroGrupo(texto, /anexo\s+(III|IV|V)/i)?.toUpperCase();
  const anexoSugerido = anexoRaw === "III" || anexoRaw === "IV" || anexoRaw === "V" ? anexoRaw : undefined;
  if (!anexoSugerido) avisos.push("anexo_nao_identificado");

  return { cnpj, periodoApuracao, receitaBrutaMes, rbt12InformadoPgdas, anexoSugerido, avisos };
}
