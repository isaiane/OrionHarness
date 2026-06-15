# Preset — Mobile / App

Mobile é específico de plataforma/framework; este preset traz **orientações**, não configs fixas.
A stack concreta é decisão do projeto (`AGENTS.md` §9).

## Princípios

- **Lint/format:** use o linter idiomático da stack
  (ex.: ESLint+Prettier para React Native; `ktlint`/`detekt` para Android/Kotlin;
  `SwiftLint` para iOS/Swift; `flutter analyze`+`dart format` para Flutter).
- **Testes:** mantenha testes de unidade e de UI; conecte ao gate de regressão do CI.
- **CI:** builds mobile costumam exigir runners e SDKs específicos — adapte
  `.github/workflows/ci.yml` com os passos da sua plataforma.
- **UI Agent Harness:** projetos com interface seguem
  [`../../docs/architecture/ui-agent-harness.md`](../../docs/architecture/ui-agent-harness.md) —
  componha telas apenas a partir do Design System (tokens + componentes aprovados).
- **Segredos:** chaves de assinatura, keystores e certificados seguem a gestão de segredos
  (`AGENTS.md` §10) — nunca no repositório.

## Recomendações por framework

| Framework | Lint/format | Testes |
|-----------|-------------|--------|
| React Native | ESLint + Prettier (ver `../typescript/`) | Jest + Testing Library |
| Flutter | `flutter analyze` + `dart format` | `flutter test` |
| Android (Kotlin) | `ktlint` / `detekt` | JUnit + Espresso |
| iOS (Swift) | `SwiftLint` | XCTest |
