# Política de Segurança

Esta política operacionaliza a **Segurança por design** do Orion Harness (`AGENTS.md` §10 e
[`docs/architecture/foundations.md`](docs/architecture/foundations.md) §1).

## Reportar uma vulnerabilidade

**Não** abra Issue pública para vulnerabilidades. Prefira o canal privado:

- Use **GitHub → Security → Report a vulnerability** (GitHub Security Advisories), ou
- contate o(s) mantenedor(es) definido(s) em [`CODEOWNERS`](CODEOWNERS) por canal privado.

Inclua: descrição, impacto potencial, passos de reprodução e versões afetadas. Comprometemo-nos a
confirmar o recebimento e a tratar com prioridade proporcional ao risco.

## Princípios em vigor

- **Menor privilégio** e **secure by default** em credenciais, tokens e ferramentas.
- **Segredos nunca no repositório** — apenas `.env.example`. Ver
  [`docs/runbooks/secrets.md`](docs/runbooks/secrets.md).
- **Defense in depth:** scan de segredos no CI (gitleaks) e em pre-commit; Dependabot para
  dependências e Actions.
- **Proteção de dados:** classificação, criptografia em trânsito/repouso, minimização, redaction;
  sem PII em logs/métricas.
- **Auditoria e rastreabilidade** de ações com efeito colateral.
- **Modelo de confiança (T0–T4):** ações irreversíveis/alto risco (T3) exigem aprovação humana
  explícita (gate G3); ações proibidas (T4) são bloqueadas.

## Boas práticas para contribuidores

- Rode os hooks de pre-commit (`pre-commit install`).
- Nunca cole segredos em código, prompts, Issues, PRs ou logs.
- Rotacione credenciais sob qualquer suspeita de exposição e comunique pelo canal privado.
