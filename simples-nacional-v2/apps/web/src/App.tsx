import { useEffect, useState } from "react";
import { api, type Apuracao, type Dashboard, type Empresa } from "./api";
import { cnpjMask, competencia, moeda, percentual } from "./utils";

type Tela = "empresas" | "importar" | "dashboard";

export default function App(): JSX.Element {
  const [tela, setTela] = useState<Tela>("empresas");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [erro, setErro] = useState("");
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [importado, setImportado] = useState<Record<string, unknown> | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [form, setForm] = useState({ periodoApuracao: "", receitaBrutaMes: "", anexo: "III", rbt12InformadoPgdas: "" });

  const carregar = async (): Promise<void> => {
    try {
      const lista = await api.empresas();
      setEmpresas(lista);
      if (!empresaId && lista.length > 0) setEmpresaId(lista[0].id);
    } catch (e) {
      setErro(`API fora do ar? ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const criar = async (): Promise<void> => {
    setErro("");
    try {
      await api.criarEmpresa({ razaoSocial: razao, cnpj });
      setRazao("");
      setCnpj("");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const enviarPdf = async (arquivo: File | undefined): Promise<void> => {
    if (!arquivo) return;
    setErro("");
    try {
      const r = await api.importarPdf(arquivo);
      setImportado(r);
      const ext = r.extraido as Record<string, string | number> | undefined;
      if (ext) {
        setForm({
          periodoApuracao: String(ext.periodoApuracao ?? ""),
          receitaBrutaMes: ext.receitaBrutaMes !== undefined ? String(ext.receitaBrutaMes) : "",
          anexo: String(ext.anexoSugerido ?? "III"),
          rbt12InformadoPgdas: ext.rbt12InformadoPgdas !== undefined ? String(ext.rbt12InformadoPgdas) : "",
        });
      }
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const confirmar = async (): Promise<void> => {
    setErro("");
    try {
      await api.confirmar({
        empresaId,
        periodoApuracao: form.periodoApuracao,
        receitaBrutaMes: Number(form.receitaBrutaMes),
        anexo: form.anexo,
        ...(form.rbt12InformadoPgdas ? { rbt12InformadoPgdas: Number(form.rbt12InformadoPgdas) } : {}),
      });
      setImportado(null);
      setTela("dashboard");
      await verDashboard();
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const verDashboard = async (): Promise<void> => {
    if (!empresaId) return;
    setErro("");
    try {
      setDash(await api.dashboard(empresaId));
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  useEffect(() => {
    if (tela === "dashboard") void verDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tela, empresaId]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Simples Nacional v2</h1>
      <p style={{ color: "#555" }}>
        Ferramenta de apoio — não substitui o PGDAS oficial. Anexos III/IV/V. Confira sempre a tela de conferência.
      </p>
      <nav style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["empresas", "importar", "dashboard"] as Tela[]).map((t) => (
          <button key={t} onClick={() => setTela(t)} disabled={tela === t}>
            {t === "empresas" ? "Empresas" : t === "importar" ? "Importar PGDAS" : "Dashboard"}
          </button>
        ))}
      </nav>
      <label>
        Empresa:{" "}
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">—</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.razaoSocial} ({cnpjMask(e.cnpj)})
            </option>
          ))}
        </select>
      </label>
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {tela === "empresas" && (
        <section>
          <h2>Nova empresa</h2>
          <input placeholder="Razão social" value={razao} onChange={(e) => setRazao(e.target.value)} />
          <input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          <button onClick={criar}>Cadastrar</button>
          <h2>Cadastradas</h2>
          <ul>
            {empresas.map((e) => (
              <li key={e.id}>
                {e.razaoSocial} — {cnpjMask(e.cnpj)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tela === "importar" && (
        <section>
          <h2>Importar PDF do PGDAS-D</h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => void enviarPdf(e.target.files?.[0])}
          />
          {importado && (
            <div>
              <h3>Conferência — corrija antes de salvar</h3>
              <pre style={{ background: "#f4f4f4", padding: 8, overflow: "auto" }}>
                {JSON.stringify(importado, null, 2)}
              </pre>
              <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
                <input placeholder="Período AAAAMM" value={form.periodoApuracao} onChange={(e) => setForm({ ...form, periodoApuracao: e.target.value })} />
                <input placeholder="Receita do mês" value={form.receitaBrutaMes} onChange={(e) => setForm({ ...form, receitaBrutaMes: e.target.value })} />
                <select value={form.anexo} onChange={(e) => setForm({ ...form, anexo: e.target.value })}>
                  <option>III</option>
                  <option>IV</option>
                  <option>V</option>
                </select>
                <input placeholder="RBT12 do PGDAS (se houver)" value={form.rbt12InformadoPgdas} onChange={(e) => setForm({ ...form, rbt12InformadoPgdas: e.target.value })} />
                <button onClick={confirmar} disabled={!empresaId}>
                  Confirmar e salvar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {tela === "dashboard" && dash && (
        <section>
          <h2>{dash.empresa.razaoSocial}</h2>
          <p>
            RBT12 atual: {moeda(dash.rbt12Atual)} {dash.rbt12Parcial && "(parcial — menos de 12 meses)"}
          </p>
          <p>
            Projeção próximo mês: receita {moeda(dash.projecao.receitaEstimada)}, alíquota{" "}
            {percentual(dash.projecao.aliquotaEfetiva)}, DAS {moeda(dash.projecao.valorDAS)} (estimativa)
          </p>
          <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Período</th>
                <th>Receita</th>
                <th>Anexo</th>
                <th>Efetiva</th>
                <th>DAS</th>
              </tr>
            </thead>
            <tbody>
              {dash.apuracoes.map((a: Apuracao) => (
                <tr key={a.id}>
                  <td>{competencia(a.periodoApuracao)}</td>
                  <td>{moeda(a.receitaBrutaMes)}</td>
                  <td>{a.anexo}</td>
                  <td>{percentual(a.aliquotaEfetiva)}</td>
                  <td>{moeda(a.valorDAS)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
