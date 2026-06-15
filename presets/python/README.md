# Preset — Python

Para APIs/backend e automações em Python.

## Arquivos

- `ruff.toml` — lint + format (Ruff).
- `pyproject.snippet.toml` — trechos de pytest/coverage para o `pyproject.toml` do projeto.

## Ativação

```bash
pip install ruff pytest pytest-cov --break-system-packages
# copie ruff.toml para a raiz e mescle os trechos do snippet no seu pyproject.toml
```

Comandos que o CI executa:

```bash
ruff check .      # lint
ruff format .     # format
pytest            # testes + cobertura
```

O **gate de cobertura** é configurável e não bloqueante por padrão (`AGENTS.md` §8): habilite
`fail_under` no `pyproject.toml` quando fizer sentido para o projeto.
