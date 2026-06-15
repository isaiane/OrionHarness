# Spec — Especificação do Produto / Sistema

> **Camada L0.5.** Insumo obrigatório da Fase 0 (Prime) e do planejamento (ver `AGENTS.md` §2.1).
> A Spec descreve **o quê** e **por quê** — não **como** implementar. O detalhamento de cada
> tarefa vive nas **Issues SDD**. Mantenha alinhada ao [`product-context.md`](product-context.md).
>
> _Substitua os textos em itálico e remova esta citação ao concluir._

## Resumo

_O que este documento especifica e seu escopo geral._

## Capacidades

_As capacidades/funcionalidades de alto nível que o produto oferece._

| Capacidade | Descrição | Prioridade |
|-----------|-----------|------------|
| _Cap. 1_ | _o que faz_ | _alta/média/baixa_ |

## Requisitos funcionais

_O que o sistema deve fazer. Numere para rastreabilidade (RF-01, RF-02…)._

- **RF-01** — _descrição verificável._

## Requisitos não-funcionais

_Desempenho, escalabilidade, disponibilidade, segurança, acessibilidade, observabilidade, etc._

- **RNF-01** — _ex.: p95 de latência < X ms._

## Contratos / APIs (API-First)

_Contratos de alto nível definidos **antes** da implementação (ex.: OpenAPI, esquemas de eventos).
Liga-se ao princípio API-First (`AGENTS.md` §7)._

## Observabilidade do uso (Data-First) — obrigatório

> Guardrail Data-First (`AGENTS.md` §9.1): **nenhuma funcionalidade é implementada sem responder
> isto.** Preencha por capacidade/funcionalidade relevante.

| Funcionalidade | Como saberemos que está sendo usada? | Como saberemos que gerou o resultado esperado? | Eventos / métricas a capturar |
|----------------|--------------------------------------|------------------------------------------------|-------------------------------|
| _Cap. 1_ | _sinal de uso_ | _sinal de resultado_ | _evento(s)/métrica(s)_ |

## Premissas

_O que está sendo assumido como verdadeiro para esta spec._

## Fora de escopo

_O que esta spec explicitamente não cobre._

---

_Relacionados: [`product-context.md`](product-context.md) ·
[`../architecture/foundations.md`](../architecture/foundations.md) · [`../../PLAN.md`](../../PLAN.md)._
