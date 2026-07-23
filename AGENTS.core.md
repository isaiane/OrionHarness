# AGENTS.core.md — Núcleo L0 (sempre carregado)

> **Sub-partição do L0** (`AGENTS.md` §4), **não** um novo rótulo. Este é o **núcleo condensado** da
> constituição: as **regras inegociáveis por sessão**. É uma **VISÃO derivada** do
> [`AGENTS.md`](AGENTS.md) — **não** é canônico e **não** é uma segunda fonte da verdade: em qualquer
> divergência, **o `AGENTS.md` vence**. Decisão: [ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md) (G2).
>
> **Como carregar:** leia **este núcleo sempre**; carregue o **detalhe sob demanda** abrindo a seção
> `§X` correspondente no `AGENTS.md` quando a tarefa exigir. O mapa `core|detail` de **todas** as
> seções está no fim deste arquivo e é checado pelo guard
> [`docs/examples/l0-core-manifest.ts`](docs/examples/l0-core-manifest.ts) (anti-drift, no smoke-test).

## Princípios inegociáveis — destila `AGENTS.md` §1

1. **Aprovação humana nas decisões.** Nada de decisão arquitetural, operacional ou de governança sem
   aprovação humana. O agente **propõe**; o humano **aprova** nos gates (§3).
2. **Spec-Driven.** Nenhum código antes de uma **Issue SDD aprovada** — **exceção fast-lane T1**
   (§11.2): dispensa a Issue/ADR, **nunca** a revisão nem o merge humano.
3. **Contexto em artefatos versionados**, não na sessão — persista o estado antes de encerrar.
4. **Proporcionalidade.** Rigor de processo/design proporcional ao risco; evite over-engineering
   (KISS/YAGNI) tanto quanto atalhos perigosos.
5. **Deixe o repositório verde.** Sem merge com CI vermelho, testes falhando ou DoD incompleto.
6. **Verde não é prova de correção.** Compilar/passar/qualidade **não** bastam — na dúvida sobre
   premissas do domínio, **pare e pergunte** (§8.1).
7. **Data-First.** O uso real deve ser observável; a estratégia mínima é definida **antes**, na SPEC (§9.1).

## Gates — pare e obtenha aprovação humana — destila `AGENTS.md` §3

- **G0 — Contexto:** antes de planejar, Spec + Product Context suficientes (§2.1).
- **G1 — Plano/Issue:** aprovação de um work item antes de implementar (inclui a Issue de bootstrap).
- **G2 — Decisão arquitetural/governança:** registre um **ADR** em `docs/decisions/` e aguarde aprovação.
- **G3 — Merge:** todo PR exige **CI verde + aprovação humana**.

Fora dos gates, autonomia **dentro do escopo da Issue aprovada** (ou, na fast-lane, do PR leve). Mudança
de escopo volta ao G1/G2. **Na dúvida, escale — nunca presuma.**

## Modelo de confiança T0–T4 — destila `AGENTS.md` §11

| Classe | Tipo | Automação | Gate |
|--------|------|-----------|------|
| **T0** | Leitura sem efeito nem dado sensível | Automática | — |
| **T1** | Efeito reversível de baixo impacto | Automática (validação + auditoria + §8.1) | — |
| **T2** | Médio impacto / mudança de fluxo / dado sensível | Automática **com review** | Humano se cruzar G1/G2 |
| **T3** | Irreversível / alto risco (merge `main`, deploy, credenciais, exclusão, transações) | **Nunca automatizada** | **G3** |
| **T4** | Proibida (exfiltração, malware, burlar controles, fora de escopo) | **Bloqueada** | Recusar e escalar |

**Regra:** na dúvida sobre a classe, **suba de nível**; ambiguidade de domínio interrompe e escala (§8.1).

## Fluxo e limites sempre válidos

- **propõe → aprova → merge:** o agente propõe; o humano aprova (G1/G2) e faz o **merge (T3/G3)**.
- **Uma tarefa ativa por vez** — não iniciar nova antes da ativa estar verde e mergeada (índice: `STATE.md`).
- **Guardrail dos 3–4 arquivos** (§7): mudança que se espalha além de 3–4 arquivos → **pare** e proponha
  um *vertical slice* menor (ou escale).
- **Cerimônia proporcional ao risco** (§3/§11.2): a classe de confiança roteia *quanta* cerimônia — a
  fast-lane T1 reduz especificação, **nunca** o merge humano.

---

## Mapa das seções — manifesto `core|detail`

> **Exaustivo** (toda seção com um tier; nada órfão), **sem duplicata**, **sem renumerar** — os `§X`
> são estáveis (refs cross-doc dependem deles). `core` = destilado acima (sempre carregado). `detail` =
> carregar o `§X` no `AGENTS.md` sob demanda. Fonte de verdade **executável**:
> [`docs/examples/l0-core-manifest.ts`](docs/examples/l0-core-manifest.ts) (orçamento do core = **90**
> linhas de peso no `AGENTS.md`; hoje **77**).

| Seção | Título | Tier | Carregar |
|-------|--------|------|----------|
| **§1** | Princípios inegociáveis | **core** | núcleo (destilado acima) |
| §2 | Papéis do agente (orquestrador + pipeline de fases) | detail | ao conduzir uma fase |
| §2.1 | Fase 0 — Preparação de contexto (Prime) / G0 | detail | ao entrar em contexto novo |
| §2.2 | Initializer — bootstrap de ambiente (opcional/one-time) | detail | no bootstrap do projeto |
| **§3** | Governança e gates (G0–G3) | **core** | núcleo (destilado acima) |
| §4 | Memória e contexto (camadas L0–L5) + regra de compactação | detail | ao compactar / get-bearings |
| §5 | Issues Spec-Driven (SDD) — 10 campos | detail | ao escrever/retomar uma Issue |
| §6 | Fluxo de Git e tarefas | detail | ao branch/commit/PR |
| §7 | Fundamentos de engenharia (lean/flat; guardrail 3–4 arquivos) | detail | ao projetar/implementar |
| §8 | Qualidade e testes | detail | ao testar/revisar |
| §8.1 | Verificação de correção (guardrail fundamental) | detail | antes de concluir tarefa |
| §9 | Convenções, documentação e observabilidade | detail | ao documentar/instrumentar |
| §9.1 | Data-First (observabilidade do uso) | detail | ao especificar feature |
| §10 | Segurança por design e segredos | detail | ao tocar dado/segredo/ação |
| **§11** | Fundações arquiteturais (AI-First) e modelo de confiança T0–T4 | **core** | núcleo (destilado acima) |
| §11.1 | UI Agent Harness (apenas projetos com interface) | detail | em projeto com UI |
| §11.2 | Fast-lane (T1) — proporcionalidade de cerimônia | detail | ao avaliar via rápida |
| §12 | Definition of Done (global) | detail | ao fechar a tarefa |

> **Anti-drift:** este mapa e os destilados acima são uma **visão** do `AGENTS.md`; o guard cruza este
> manifesto com os `§X` reais do `AGENTS.md` no `scripts/smoke-test.sh`. Adicionar/renumerar seção sem
> reclassificar **quebra o CI**. Evoluir a constituição continua sendo **só via ADR (G2)** no `AGENTS.md`.
