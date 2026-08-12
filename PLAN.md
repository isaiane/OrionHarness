# PLAN — stub-ponteiro (transitório)

> **Camada L1 — stub-ponteiro** (`AGENTS.md` §4 /
> [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)). Este arquivo
> **deixou de ser a fonte autoral do plano** (épico O9 — fim do Markdown autoral como fonte). O plano
> operacional vive no **GitHub**; este stub só aponta para lá. Enquanto o §4 o nomear como stub, o
> arquivo **permanece** — a remoção definitiva, se houver, é fatia futura própria (ADR-0025).

## Onde o plano vive agora

- **Épicos → GitHub Milestones** (mapa autoritativo de épicos).
- **Tarefas → GitHub Issues SDD** associadas ao Milestone do épico (fonte da verdade de status).
- **Fase Plan (pré-Spec) → draft items do Project** (aprovados no **G1**; promovidos a Issues na fase Spec).
- **Projeção de verificação → `feature-ledger.json`** (status por critério, não autoral).

## Leitura offline (relatório gerado)

Gere o mapa de épicos/tarefas sob demanda, sem navegar o GitHub:

```bash
node --experimental-strip-types tools/plan/plan-report.ts
```

Saída em `.orion/tmp/reports/plan.md` (scratch, **gitignored** — não é fonte versionada). Num clone
**sem rede/sem auth**, o relatório sai **vazio** e este ponteiro é o que se lê (ADR-0025).

## Ao adotar o Orion como template

Não edite este arquivo. Abra **Milestones** (um por épico) e **Issues** (tarefas) — e, opcionalmente,
um **Project** (board) — para o seu produto. O plano nasce vazio, que é o comportamento correto de um
template.

---

<sub>**Conteúdo autoral anterior aposentado nesta fatia (T9.3b), com destino declarado (D3):** a tabela
de épicos (F1–F5, O1–O9) vive agora em **Milestones**; o detalhe épico→tarefa é **derivável** das
Issues pelo gerador acima; as notas de fatiamento/follow-up e a sequência obrigatória do O9 vivem nos
**PRs/Issues** e no **ADR-0025 §9**. A convenção `## Como ler` e os títulos de agrupamento narrativo
(“meta-projeto”, “linha de trabalho atual”) **não têm equivalente em Milestone** — perda aceita e
declarada: o board é auto-descritivo.</sub>
