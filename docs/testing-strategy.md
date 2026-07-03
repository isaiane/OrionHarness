# Estratégia de Testes e Qualidade

> Operacionaliza `AGENTS.md` §8 e §8.1. Objetivo: **prevenir regressão e preservar a integridade
> do domínio**, não apenas produzir código que compila. Rigor proporcional ao risco da tarefa.

## Princípios

- **TDD por padrão.** Escreva o teste antes do código sempre que viável: o teste codifica o
  critério de aceite da Issue SDD.
- **Testes por tarefa + DoD.** Cada Issue exige testes que validem seus critérios de aceite. Sem
  testes que provem o aceite, a tarefa não está pronta (§12).
- **Verde não é prova de correção (§8.1).** Além dos testes, valide conformidade com spec, regras
  de negócio, decisões arquiteturais (ADRs), impacto em fluxos existentes e regressões não cobertas.
- **Determinismo.** Testes não dependem de rede/relógio/ordem; use fakes e dados controlados.

## Pirâmide de testes

| Nível | Foco | Proporção alvo |
|-------|------|----------------|
| **Unidade** | Regras de domínio puras, isoladas de I/O | maioria |
| **Integração** | Adaptadores, contratos, persistência, mensageria | média |
| **E2E / aceitação** | Fluxos de ponta a ponta sob a ótica do usuário | poucos, críticos |

O domínio (núcleo) deve ser testável sem frameworks nem I/O. Contratos (API-First) têm testes de
contrato. Quando há eventos de domínio (event-driven, opt-in), eles têm testes de produção/consumo.

## Regressão

- A suíte roda em **todo PR** (`.github/workflows/ci.yml`). Nenhum merge com regressão.
- Todo bug corrigido ganha um **teste de regressão** que falha antes do fix e passa depois.

## Cobertura (gate configurável)

- Cobertura é sinal, **não** prova de correção, e é **não bloqueante por padrão**.
- Quando o projeto amadurecer, habilite um piso por projeto (ex.: `fail_under` no
  `presets/python/pyproject.snippet.toml`, ou `--coverage` + threshold no Vitest).
- Priorize cobrir **regras de negócio e caminhos de risco**, não perseguir 100%.

## Observabilidade nos testes (Data-First)

Quando a Issue entrega instrumentação (§9.1), inclua testes/asserções de que os eventos/métricas
de uso e de resultado são emitidos conforme especificado.

## Papéis na verificação

1. **Implementador** escreve testes junto do código (TDD) e roda a suíte local + hooks.
2. **Agente revisor independente** aplica o checklist do processo selecionado (ADR-0008) antes do PR
   humano: [Product Review](agent-reviewer-checklist.md) para código/testes/config **e
   `docs/product/`**; [Harness Review](harness-reviewer-checklist.md) para mudanças de
   governança/instruções (regra de seleção completa em `AGENTS.md` §2, fase _Review_).
3. **Humano** aprova no gate G3 com CI verde.
