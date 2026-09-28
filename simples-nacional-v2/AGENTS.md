# LEI-MAGNA DOS AGENTES — Simples Nacional v2

Canônica. Vale mais que o prompt do turno. Conflito com `docs/ROADMAP.md` = parar e perguntar ao dono. Objetivo duplo: economizar tokens/tempo e impedir deriva (herdar legado, pular fase, commitar lixo).

## 1. Escopo e áreas proibidas
1.1. Atuar SOMENTE em `simples-nacional-v2/`. `../simples-calculator/` e `../caderno-de-campo/` são somente leitura — nunca editar, mover, copiar código ou importar deles. Violação invalida o turno.
1.2. Nunca tocar: `node_modules/`, `dist/`, `build/`, `*.db`, `*.sqlite`, `.env` (só `.env.example`), `uploads/`, segredos, chaves.
1.3. Nunca criar documentação nova (`.md`) fora do pedido. Melhorar as existentes em vez de proliferar.
1.4. Respeitar a fase atual do ROADMAP. Não adiantar F5 se F2 não fechou. Não introduzir Anexo I/II, Fator R, folha, ICMS/ISS sublimite — fora do escopo v2.

## 2. Economia de tokens e tempo (regras duras)
2.1. Ler antes de agir, uma vez só: `AGENTS.md` + fase atual do `ROADMAP.md` + arquivo alvo via `read`. Nunca reler o mesmo arquivo no turno.
2.2. Ferramenta certa: `glob` para achar arquivo, `grep` para achar conteúdo, `read` para ler. `bash` é só para comando de sistema (git, pnpm, teste). Proibido `cat/head/tail/ls/find` via bash, proibido `Select-String`/`Get-Content` via PowerShell.
2.3. Batch paralelo sempre que independente (ex: 3 `read` juntos). Sequencial só com dependência real.
2.4. Exploração limitada: máx. 2 rodadas de busca. Se não achou, pare e pergunte em vez de varrer o repo.
2.5. Resposta curta e factual: o que fez, arquivo:linhas, como verificar. Sem elogio, sem narrativa longa, sem bloco de pensamento em comentário de código.
2.6. Nunca adivinhar URL, API, comportamento do PDF ou número tributário. Ausência de evidência = dizer "não verificado" e pedir exemplo real.
2.7. Reutilizar contexto: citar `arquivo:linha` em vez de colar blocos grandes. Diff pequeno > reescrita grande.

## 3. Fluxo obrigatório do turno
3.1. Abrir `TodoWrite`, exatamente UM `in_progress` por vez. Fechar item só após verificação executada, nunca por intenção.
3.2. Plano de 3 linhas antes de codar (objetivo, arquivos, verificação). Sem plano em tarefa >3 passos = parar.
3.3. Implementar o mínimo que fecha o `Done` da fase. Sem refator oportunista, sem "melhoria" fora do pedido.
3.4. Verificar por execução: `pnpm --filter <pacote> test`, `tsc --noEmit`, ou fluxo manual descrito. Colar texto + conta mental não é verificação.
3.5. Se verificação quebrar: corrigir e reexecutar; se travar 2 vezes, registrar bloqueador no todo e devolver ao dono com evidência (comando + saída curta).

## 4. Pode / Não pode
PODE: ler/editar o mínimo em `v2/`; criar teste reprodutor mínimo; rodar `git status/diff/log`, `pnpm install/test/build`, `npx tsc --noEmit`; propor diff pequeno para revisão.
NÃO PODE: commitar, ammend, push, PR, `git reset --hard`, `git clean -fd`, publicar pacote, rodar Docker pesado/`rm -rf`/comando destrutivo, instalar dependência global, alterar config git, pular conferência do PDF, salvar apuração sem confirmação, editar regra tributária publicada (criar nova versão), versionar `.db`/`.env`/`node_modules`.

## 5. Padrões de código e domínio
5.1. `packages/domain`: puro, sem fs/http/DB/data; regras injetadas de `packages/tax-rules`; nomes em português de domínio (`receitaBrutaMes`, `rbt12`, `aliquotaEfetiva`) com tipos explícitos.
5.2. `packages/tax-rules`: única fonte de faixas. Campos: anexo, faixa, limites, nominal, dedução, vigência, versão. Nova legislação = nova versão, nunca update.
5.3. API: rota fina + Zod na borda; erro de domínio = 422 com memória de cálculo; upload só PDF 10MB com nome sanitizado; `GET /api/health` sempre.
5.4. Web: sem fórmula no frontend; páginas Empresas, Importar/Conferir, Dashboard; conferência exibe extraído + estimado + avisos e exige confirmação.
5.5. Testes: F2 exige 100% core (faixas III/IV/V, virada de faixa, RBT12 completo/incompleto/novo, memória, projeção). Novo bug = novo teste primeiro.

## 6. Git e versionamento (trauma do legado)
6.1. Nada de commit automático. Antes de sugerir commit: `git status --short --branch` + `git diff --stat` + `git log --oneline -5` revisados; stage só do intencionado.
6.2. Mensagem Conventional Commits (`feat(domain): ...`, `fix(api): ...`, `chore(v2): ...`). Um assunto, sem corpo longo salvo se pedido.
6.3. Nunca versionar `node_modules dist *.db .env uploads`. Se `git status` mostrar, corrigir `.gitignore` primeiro e avisar.
6.4. Branch: `main` estável + `develop` trabalho; tag `v2-mvp` só na F7. Sem force-push.

## 7. Auditoria e honestidade fiscal
7.1. UI + README declaram: apoio, não substitui PGDAS oficial; só III/IV/V; parser pode errar — conferência obrigatória; RBT12 do sistema usa só histórico salvo.
7.2. Cada apuração grava `versao_regra`; retificação cria nova linha com `substituida_por_id`, nunca apaga.
7.3. Divergência RBT12 PGDAS vs sistema é exibida, nunca silenciada.

## 8. Parada rápida — quando perguntar em vez de agir
Pare e use `question` se: ambiguidade tributária ou de escopo; falta PDF/caso de teste real; custo >5 tool calls sem progresso; pedido conflita com ROADMAP/esta lei; qualquer dúvida sobre apagar, migrar, commitar, instalar ou expor dado. Retome só com resposta do dono.

## 9. Checklist pré-resposta (obrigatório)
- [ ] Atuei só em `v2/` e respeitei a fase?
- [ ] Usei ferramenta certa, sem releitura, sem varredura infinita?
- [ ] Diff mínimo, sem arquivo extra, sem segredo?
- [ ] Verificação executada (comando + resultado)?
- [ ] `arquivo:linha` citados, resposta curta, sem promessa não cumprida?
Falhou um = corrigir antes de responder.
