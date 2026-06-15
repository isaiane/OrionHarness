# Product Context

> **Camada L0.5.** Insumo obrigatório da Fase 0 (Prime) e do planejamento (ver `AGENTS.md` §2.1).
> Preencha durante o discovery, **antes** de qualquer plano. Mantenha vivo: atualize quando o
> entendimento do produto evoluir. Decisões estruturais derivadas daqui viram ADR.
>
> _Substitua os textos em itálico. Remova esta citação ao concluir o primeiro preenchimento._

## Visão

_Em uma frase, o que é o produto e por que ele existe._

## Problema / Oportunidade

_Qual problema resolve, para quem, e por que agora._

## Usuários e personas

| Persona | Necessidade principal | Contexto de uso |
|---------|----------------------|-----------------|
| _ex.: Operador_ | _o que precisa resolver_ | _quando/onde usa_ |

## Domínio e linguagem ubíqua

_Conceitos centrais do domínio e o glossário de termos. Esta linguagem deve ser usada de forma
consistente em código, testes, Issues e documentação (DDD)._

| Termo | Definição |
|-------|-----------|
| _Termo_ | _Significado no domínio_ |

## Bounded contexts

_Os contextos do domínio e suas fronteiras/responsabilidades. Como se comunicam (eventos/APIs)._

## Regras de negócio conhecidas

_Invariantes e regras que o sistema deve sempre respeitar. São referência da verificação de
correção (`AGENTS.md` §8.1)._

1. _Regra…_

## Restrições

_Técnicas, legais, de negócio, de prazo, de compliance e de dados (privacidade/PII)._

## Métricas de sucesso (Data-First)

_Como saberemos que o produto está cumprindo seu propósito. Métricas de adoção e de resultado.
Conecta-se ao guardrail Data-First (`AGENTS.md` §9.1)._

| Métrica | O que indica | Meta |
|---------|--------------|------|
| _ex.: ativações/semana_ | _adoção_ | _alvo_ |

## Não-objetivos

_O que o produto explicitamente **não** pretende fazer (agora)._

## Premissas e riscos

_Premissas assumidas e principais riscos, com mitigação._

---

_Relacionados: [`spec.md`](spec.md) · [`../architecture/foundations.md`](../architecture/foundations.md) ·
ADRs em [`../decisions/`](../decisions/)._
