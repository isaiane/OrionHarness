# CLAUDE.md

A constituição que rege qualquer agente de IA neste repositório está em **[`AGENTS.md`](AGENTS.md)** —
a **fonte única de verdade** (camada L0, §4).

**Carregue o núcleo sempre; o detalhe sob demanda** ([ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md), G2):

- **[`AGENTS.core.md`](AGENTS.core.md) — núcleo L0, sempre carregado.** As **regras inegociáveis por
  sessão**: Princípios (§1), Gates G0–G3 (§3) e modelo de confiança T0–T4 (§11), com os limites e o
  fluxo **propõe→aprova→merge**. É uma **visão condensada/derivada** do `AGENTS.md`, **não** canônica.
- **[`AGENTS.md`](AGENTS.md) — constituição completa e canônica, carregada sob demanda.** Abra a seção
  `§X` quando a tarefa exigir (o mapa `core|detail` de todas as seções vive no núcleo). **Em qualquer
  divergência, o `AGENTS.md` vence** — o núcleo nunca é fonte paralela.

> Este arquivo é intencionalmente um ponteiro. O núcleo (`AGENTS.core.md`) é uma **visão** derivada e
> checada (anti-drift no `scripts/smoke-test.sh`); a **fonte única de verdade** é o `AGENTS.md`, que
> evolui **apenas via ADR aprovado (G2)**.
