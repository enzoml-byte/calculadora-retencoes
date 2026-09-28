export type CodigoErro =
  | "RBT12_INVALIDO"
  | "SEM_HISTORICO_RBT12"
  | "CNPJ_INVALIDO"
  | "RECEITA_NEGATIVA"
  | "FAIXA_NAO_ENCONTRADA";

export class ErroDominio extends Error {
  readonly codigo: CodigoErro;
  constructor(codigo: CodigoErro, detalhe?: string) {
    super(detalhe ? `${codigo}:${detalhe}` : codigo);
    this.name = "ErroDominio";
    this.codigo = codigo;
  }
}
