# Runbook — Gestão de Segredos

> Operacionaliza `AGENTS.md` §10 e as fundações de segurança
> ([`../architecture/foundations.md`](../architecture/foundations.md) §1.3).

## Regras

- **Segredos nunca no repositório.** Versione apenas [`../../.env.example`](../../.env.example) com
  **chaves vazias** e comentários — nunca valores reais.
- **Origem dos segredos:**
  - Local: arquivo `.env` (ignorado pelo Git) ou o secret manager do SO.
  - CI: **GitHub Actions Secrets** (`secrets.NOME`).
  - Runtime: secret manager / KMS do ambiente (preset por projeto: Vault, AWS/GCP/Azure).
- **Menor privilégio:** tokens granulares por ferramenta/contexto, com escopo e validade mínimos.
- **Just-in-time para agentes:** o agente recebe segredos por referência/escopo no momento do uso,
  nunca em texto no contexto de longa duração ou em prompts persistidos.

## Rotação

- Rotacione periodicamente e **imediatamente** sob suspeita de exposição.
- Após rotação, invalide o segredo antigo e atualize o secret manager / GitHub Secrets.

## Em caso de vazamento

1. Revogue/rotacione o segredo exposto **agora**.
2. Verifique o histórico do Git; remova o segredo (history rewrite se necessário) e force-push
   coordenado.
3. Comunique pelo canal privado de [`../../SECURITY.md`](../../SECURITY.md).
4. Registre o incidente e, se houver decisão estrutural, abra um ADR.

## Defesas automáticas

- **gitleaks** no CI ([`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) e em
  pre-commit (`.pre-commit-config.yaml`).
- **Push protection** e **secret scanning** do GitHub (habilitar em Settings → Code security).
- **Dependabot** ([`../../.github/dependabot.yml`](../../.github/dependabot.yml)).
