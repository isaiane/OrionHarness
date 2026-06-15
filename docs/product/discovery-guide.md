# Roteiro de Discovery — Fase 0 (Prime)

> Use este roteiro quando a Spec e/ou o Product Context **não existirem ou estiverem incompletos**
> (`AGENTS.md` §2.1, gate G0). O objetivo é construir, junto ao humano, contexto suficiente para
> reduzir ambiguidades **antes** de qualquer planejamento. Não inicie o plano enquanto o gate G0
> não for satisfeito.

## Como conduzir

Sessão estruturada, orientada por perguntas, um tema por vez. O agente **propõe** sínteses; o
humano **confirma**. Ao final, os artefatos [`product-context.md`](product-context.md) e
[`spec.md`](spec.md) devem estar preenchidos o suficiente para planejar.

## Blocos de perguntas

1. **Problema e objetivo** — Que problema resolvemos? Para quem? Por que agora? Como é resolvido
   hoje? O que muda com o produto?
2. **Usuários e necessidades** — Quem são as personas? O que cada uma precisa realizar? Em que
   contexto usam?
3. **Domínio e regras de negócio** — Quais são os conceitos centrais e a linguagem ubíqua? Quais
   invariantes/regras o sistema deve sempre respeitar? Há bounded contexts distintos?
4. **Escopo e não-objetivos** — O que entra agora? O que explicitamente fica de fora?
5. **Restrições** — Técnicas, legais/compliance, de dados (PII), prazo e orçamento.
6. **Premissas e riscos** — O que assumimos como verdadeiro? O que pode dar errado e como mitigar?
7. **Critérios de sucesso (Data-First)** — Como saberemos que está sendo usado? Como saberemos que
   gerou o resultado esperado? Quais eventos/métricas capturar? (alimenta a §9.1 e a seção
   Data-First da `spec.md`.)
8. **Fundações sensíveis** — Há requisitos de segurança, autenticação/autorização, dados sensíveis
   ou integrações que exijam decisões arquiteturais? (podem virar ADR — gate G2.)

## Saída esperada (Definition of Ready do contexto)

- [ ] `product-context.md` preenchido (visão, personas, domínio, regras, métricas, não-objetivos).
- [ ] `spec.md` preenchido (capacidades, RF/RNF, contratos de alto nível, bloco Data-First).
- [ ] Ambiguidades e lacunas relevantes resolvidas ou registradas como risco/premissa.
- [ ] Decisões arquiteturais emergentes encaminhadas para ADR (G2).

Satisfeito o gate **G0**, prossiga para a fase **Plan** e registre os épicos em
[`../../PLAN.md`](../../PLAN.md).
