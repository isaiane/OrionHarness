# ADR-0009 — Verificação end-to-end com ferramenta real (convenção opt-in)

> **Numeração (repo):** a `main` tem ADRs `0001–0008`, então este é o **0009**.

- **Status:** proposto
- **Data:** 2026-07-04
- **Decisores:** Isa (owner) — aprovação humana pendente (gate G2)
- **Relacionado a:** `AGENTS.md` §8.1 (verificação de correção), §12 (DoD), §11 (modelo de
  confiança), §11.1 (UI harness); `docs/agent-reviewer-checklist.md`; épico **O4**; Issues
  #51 (T4.1), #52 (T4.2), #53 (T4.3); núcleo runnable da O2 (ADR-0006/0007)

## Contexto
O `AGENTS.md` §8.1 afirma que **"verde ≠ correto"**: compilação, testes de unidade e qualidade de
código não provam que o produto **funciona para o usuário**. Mas o harness tinha a **doutrina sem
instrumento** — nenhuma convenção dizia *como* verificar o comportamento observável de ponta a ponta,
exercitando a ferramenta **real** em vez de só chamar unidades internas ou `curl` isolado.

_Effective Harnesses for Long-Running Agents_ e o benchmark `autonomous-coding` mostram o valor de
**checar como um usuário** — automação de browser para UI, exercício do contrato público para
API/CLI. Sem isso, um agente fecha a tarefa com a suíte verde e uma regressão de comportamento
silenciosa (ver §1, princípio 6). Falta materializar o §8.1 num passo verificável, amarrado ao
checklist do revisor e ao DoD — **sem** inflar toda tarefa com cerimônia de e2e (proporcionalidade,
[ADR-0004](0004-reconciliacao-s7-lean-flat.md)).

## Decisão
Adotaremos uma **convenção de verificação end-to-end (e2e) opt-in**, dirigida por agente, que
materializa o §8.1. A técnica é **selecionada pelo tipo do artefato** entregue:

1. **UI (web/mobile)** → **automação de browser/MCP.** Exercer a tela como usuário (navegar, clicar,
   preencher, ler o resultado renderizado), não só montar o componente. Respeita o UI Agent Harness
   (§11.1): a verificação usa componentes/estados aprovados, não inventa UI.
2. **API** → **exercício do contrato público.** Subir o serviço e chamar o endpoint real pela
   fronteira HTTP (request → status/corpo/efeito observável), cobrindo o caminho de aceite — não um
   teste de unidade do handler.
3. **CLI** → **exercício do contrato público.** Invocar o binário/comando real como o usuário faria
   pela shell, observando o comportamento na fronteira (exit code, stdout/stderr, efeitos) — não uma
   função interna.

**Opt-in por tipo/risco (proporcionalidade).** A e2e é **exigida quando aplicável** — a tarefa
entrega comportamento observável de usuário (UI/API/CLI) **e** o risco justifica (fluxo novo,
mudança de contrato, correção de bug com comportamento observável). É **dispensada** para tarefas
sem superfície de usuário observável (ex.: docs/governança, refactor interno coberto por unidade,
mudança só de memória/estado). Na dúvida sobre aplicabilidade, **suba de nível** (§11) e verifique.

**Evidência anexável.** Quando a e2e se aplica, a **saída da execução** (log/exit code, screenshot ou
gravação para UI) é anexada ao PR como prova do critério de aceite. É a contraparte observável do
§8.1 e entra no DoD (§12).

**Amarração.** Esta convenção entra no `docs/agent-reviewer-checklist.md` (Product Review — a e2e
verifica **produto**) e no DoD global (`AGENTS.md` §12). Um **caso de exemplo** rodável acompanha
esta decisão: [`docs/examples/e2e-init-check.sh`](../examples/e2e-init-check.sh) exercita o contrato
público (CLI) do `init.sh` real — dry-run com exit 0 e sem efeitos na árvore, argumento inválido com
exit 2 — produzindo a evidência anexável.

**Restrições de confiança/segurança.** A e2e roda dentro do modelo de confiança (§11): só ações
**T0/T1** por padrão (ler, dry-run, subir serviço efêmero local, exercitar contrato) — **sem** tocar
`main`, credenciais reais, dados de produção ou ambientes externos sem gate. Sem PII/segredos na
evidência anexada (§10). A automação de browser/MCP herda essas restrições.

## Alternativas consideradas
- **Tornar e2e obrigatória para toda tarefa:** rejeitada por proporcionalidade (ADR-0004) — infla
  tarefas sem superfície de usuário e contradiz KISS/YAGNI. Opt-in por tipo/risco cobre o valor sem
  a cerimônia.
- **Manter só a doutrina (§8.1) sem convenção:** rejeitada — é o estado atual (doutrina sem
  instrumento) que deixa a verificação a cargo do improviso de cada sessão, sem enforcement no
  review nem no DoD.
- **Uma única técnica genérica (ex.: sempre `curl`):** rejeitada — não checa UI "como usuário" e
  ignora contratos CLI; a seleção por tipo é o que faz a verificação valer.

## Consequências
- **Positivas:** o §8.1 ganha um passo verificável e enforceável; regressões de comportamento
  observável passam a ser pegas antes do merge; a evidência anexada torna o "funciona para o
  usuário" auditável (§9.1). O caso de exemplo é reutilizável como template.
- **Negativas/riscos:** custo de execução e flakiness de e2e (mitigado pelo opt-in por risco e pela
  restrição a T0/T1); mais um item no checklist do revisor (mitigado por ser condicional —
  "quando aplicável"). Risco de e2e tocar recursos sensíveis — mitigado pela restrição de confiança
  acima. Este ADR é **mudança de harness** → passa por **Harness Review** antes do merge.

## Conformidade
Verificável: (1) `AGENTS.md` §8.1 e §12 referenciam a convenção e2e por tipo; (2) o
`docs/agent-reviewer-checklist.md` exige evidência e2e do critério de aceite **quando aplicável**;
(3) existe um caso de exemplo rodável (`docs/examples/e2e-init-check.sh`) cuja execução produz a
evidência; (4) um PR que entrega superfície de usuário (UI/API/CLI) de risco relevante traz a
evidência e2e anexada, ou justifica no PR por que a e2e não se aplica.
