# Fundações Arquiteturais — Orion Harness

> Camada **L0** (governança). Estas fundações são **pré-requisito da implementação**: nenhum
> agente, ferramenta ou fluxo de negócio é construído antes de estarem definidas e aprovadas.
> Mudanças aqui exigem **ADR** (gate G2). Resumo e ganchos vivem em [`AGENTS.md`](../../AGENTS.md);
> o detalhe é este documento.
>
> Premissa central: **agentes executam ações, acessam ferramentas e manipulam informações
> sensíveis.** A arquitetura é desenhada partindo do princípio de que um agente pode errar, ser
> induzido ao erro ou operar com contexto incompleto — e mesmo assim o sistema deve preservar
> segurança, integridade do domínio e rastreabilidade.

## 1. Security by Design

A segurança é um requisito de projeto, não um complemento. Princípios obrigatórios:

- **Secure by default.** Configuração inicial é a mais restritiva; capacidades são habilitadas
  explicitamente, nunca o contrário.
- **Menor privilégio.** Todo agente, ferramenta, serviço e credencial recebe o mínimo de escopo
  necessário, com tokens de curta duração e granulares por ferramenta/contexto.
- **Defense in depth.** Múltiplas camadas de controle (validação de entrada, autorização,
  sandbox, revisão, auditoria) — nenhuma camada é ponto único de confiança.
- **Fail secure.** Em caso de dúvida, erro ou falha de validação, o sistema **nega/interrompe** e
  escala ao humano, em vez de prosseguir.

### 1.1 Autenticação (AuthN)

- Identidade explícita para cada ator: humano, agente, serviço e ferramenta.
- Agentes e serviços autenticam via credenciais próprias (OIDC/OAuth2, service accounts, tokens
  escopados) — **nunca** reutilizando credenciais humanas.
- Segredos de autenticação seguem a §1.3. Sem credenciais embutidas em código ou prompts.

### 1.2 Autorização (AuthZ)

- Modelo explícito de permissões (RBAC ou ABAC) declarado por contexto/recurso.
- Autorização é verificada **na fronteira de cada ação** (ver Action System, §2.3), não assumida
  a partir do fato de o agente "ter conseguido chamar" uma ferramenta.
- A capacidade de uma ferramenta é limitada pelo escopo do token daquele contexto. Escalonamento
  de privilégio exige aprovação humana (modelo de confiança, §3).

### 1.3 Gestão de segredos

- Segredos **nunca** no repositório; apenas `.env.example` versionado.
- Origem: variáveis de ambiente / secret manager (GitHub Secrets, Vault, cloud KMS) — integração
  concreta é preset por projeto.
- Scan de segredos no CI e em pre-commit; rotação periódica e sob suspeita de exposição.
- Agentes recebem segredos por referência/escopo just-in-time, nunca em texto no contexto de
  longa duração.

### 1.4 Proteção de dados

- Classifique dados (público, interno, sensível/PII, secreto) e trate cada classe conforme
  política.
- Criptografia em trânsito (TLS) e em repouso para dados sensíveis.
- **Minimização:** o agente só acessa/retém o dado necessário à tarefa. Dados sensíveis não
  entram em logs, prompts persistidos ou artefatos de memória versionados.
- Mascaramento/redaction em logs e relatórios.

### 1.5 Auditoria e rastreabilidade

- **Log de auditoria** append-only para toda ação com efeito colateral: quem (ator), o quê
  (ação + parâmetros redigidos), quando, em qual contexto, resultado e autorização aplicada.
- **Rastreabilidade ponta a ponta:** toda mudança correlaciona `Issue SDD → branch → commit →
  PR → merge`, e toda decisão arquitetural a um ADR. Um `correlation-id` por fluxo liga logs,
  ações e artefatos. **Exceção fast-lane T1** (`AGENTS.md` §11.2/ADR-0017): mudanças
  *issue-less* correlacionam `branch → commit → PR → merge` (o **PR** é a unidade de
  rastreabilidade, branch `fast/<slug>`).
- Decisões automatizadas registram a justificativa e o nível de confiança aplicado (§3).

### 1.6 Isolamento entre contextos

- **Bounded contexts** do domínio são isolados; comunicação só por contratos explícitos
  (eventos/APIs), nunca por estado compartilhado oculto.
- **Isolamento de ferramentas:** cada ferramenta roda com credenciais e escopo próprios; uma
  ferramenta não acessa segredos/dados de outro contexto.
- **Sandbox de execução** para ações de código/sistema, com allowlist de capacidades e sem acesso
  de rede/arquivos além do necessário.
- **Sem vazamento cruzado de contexto:** dados sensíveis de um contexto não transitam para outro
  sem autorização e contrato explícitos.

## 2. Padrões de design para sistemas AI-First

### 2.1 Separação de responsabilidades e boundaries de contexto

> Postura **encapsulamento-first** (lean/flat — `AGENTS.md` §7, [ADR-0004](../decisions/0004-reconciliacao-s7-lean-flat.md)):
> o default é esconder frameworks/I/O atrás de métodos limpos do módulo, **não** camadas físicas
> rituais.

- **Encapsulamento simples e direto como default:** ORM, clientes e I/O ficam atrás de métodos
  limpos do próprio módulo. **Clean Architecture/Hexagonal** (camadas físicas, ports & adapters) é
  **opt-in** — adotado só com necessidade real registrada em Issue/ADR (ex.: **≥2 implementações**
  de um port, ou troca já contratada).
- O **raciocínio do agente** é uma camada separada da **lógica de domínio**: o agente orquestra e
  decide; o domínio valida e executa as regras de negócio de forma determinística.
- Bounded contexts (DDD **estratégico**) com linguagem ubíqua; integrações entre contextos por
  contrato, sem importação cruzada — isso é preservado independentemente do estilo de camadas.

### 2.2 Event-driven architecture (opt-in)

> Padrão **opt-in** (lean/flat — `AGENTS.md` §7, ADR-0004): default é chamada direta/encapsulada;
> adote eventos só com necessidade real (desacoplamento entre contextos, fan-out, auditoria de
> domínio) justificada em Issue/ADR.

- Quando adotado: mudanças de estado relevantes são **eventos** de domínio explícitos, versionados
  e auditáveis.
- Acoplamento fraco entre produtores e consumidores; efeitos colaterais reagem a eventos.
- Eventos são imutáveis e carregam `correlation-id` para rastreabilidade (§1.5).

### 2.3 Action System (ações como cidadãos de primeira classe)

Toda capacidade do agente que produz efeito colateral é uma **Ação** tipada, com contrato
explícito:

- **Entrada validada** por esquema antes da execução; saída tipada.
- **Autorização** verificada na fronteira (§1.2) e **classificação de confiança** (§3) atribuída.
- **Idempotência** e/ou chave de deduplicação para ações repetíveis.
- **Dry-run / pré-visualização** para ações de impacto antes da execução real.
- **Reversibilidade** declarada (reversível, compensável, irreversível) — guia o gate aplicável.
- Registro no log de auditoria (§1.5).

### 2.4 Workflow orchestration

- O pipeline de fases (`prime → initialize → plan → spec → build → review → ship`, ver `AGENTS.md`)
  é a orquestração de alto nível, com **gates** entre etapas e **handoffs** por artefato
  (`initialize` é bootstrap opcional/one-time do ambiente executável, **gateado** via Issue de
  bootstrap → PR → merge humano — não uma fase "livre"; `AGENTS.md` §2.2 / ADR-0007).
- Workflows são explícitos, observáveis e retomáveis: o estado vive em artefatos versionados, não
  na sessão, permitindo recuperação após interrupção.
- Orquestrador coordena; subagentes executam fases especializadas com contexto isolado.

### 2.5 Observabilidade

- **Logging estruturado** (JSON) com `correlation-id`, ator, contexto e nível.
- **Decision logs:** decisões automatizadas registram premissas, alternativas e confiança.
- **Métricas e tracing** (ex: OpenTelemetry) como preset opt-in por stack; spans cobrem ações e
  fases.
- Erros tratados e correlacionados; nada de falha silenciosa.

### 2.6 Resiliência e recuperação de falhas

- **Retries com backoff** e timeouts em integrações externas; **circuit breakers** para
  dependências instáveis.
- **Idempotência** nas ações para tornar a repetição segura.
- **Compensação / saga** **quando necessário**, para desfazer efeitos parciais em fluxos
  multi-etapa (não preventivamente — ver §7 / [ADR-0004](../decisions/0004-reconciliacao-s7-lean-flat.md)).
- **Checkpoints de estado** (artefatos de memória) para retomada sem perda de contexto.
- **Degradação graciosa** e **escalonamento ao humano** quando a confiança/segurança não pode ser
  garantida — preferir parar a prosseguir incerto (fail secure).

## 3. Modelo de confiança

Define **o que pode ser automatizado, o que exige aprovação humana e o nível de validação** por
tipo de ação. Toda Ação (§2.3) recebe uma classe na sua criação; a classe determina o gate e a
validação.

| Classe | Tipo de ação | Automação | Validação mínima | Gate |
|--------|--------------|-----------|------------------|------|
| **T0** | Leitura/consulta sem efeito colateral e sem dado sensível | Automática | Validação de entrada + log padrão | — |
| **T1** | Efeito reversível de baixo impacto (criar branch, escrever arquivo do repo, abrir PR, comentar Issue) | Automática | Validação de schema + autorização + auditoria + verificação de correção §8.1 | — |
| **T2** | Médio impacto, mudança de fluxo, ou acesso a dado sensível/segredo | Automática **com revisão** | Tudo de T1 + review do agente revisor + ADR se arquitetural | Aprovação humana se cruzar G1/G2 |
| **T3** | Irreversível / alto risco: merge em `main`, deploy, rotação/criação de credenciais, exclusão de dados, comandos destrutivos, transações financeiras | **Nunca automatizada** | Tudo de T2 + dry-run/preview + aprovação humana explícita | **G3** (ou gate equivalente) obrigatório |
| **T4** | Proibida: exfiltração de segredos, execução de malware, contornar controles de segurança, ação fora do escopo aprovado | **Bloqueada** | — | Recusar e escalar |

Regras do modelo:

- **Na dúvida sobre a classe, suba de nível** (trate como mais arriscada).
- **Ambiguidade de domínio interrompe a ação** (§8.1 do `AGENTS.md`): o agente pede esclarecimento
  em vez de assumir comportamento implícito.
- A classe e a justificativa entram no **log de auditoria** e na descrição do PR.
- Os gates de governança do `AGENTS.md` (G0–G3) são a manifestação operacional deste modelo.
- **Cerimônia proporcional:** a classe também determina *quanta cerimônia de especificação* a ação
  carrega — ações **estritamente T1** de baixo risco podem seguir pela **fast-lane** (`AGENTS.md`
  §11.2, [ADR-0017](../decisions/0017-fast-lane-baixo-risco.md)), que dispensa Issue SDD/ADR mas
  preserva CI verde e **merge humano (T3/G3)**.

---

_Este documento é a fonte de detalhe das fundações arquiteturais. Decisões que o alterem são
registradas como ADR em [`../decisions/`](../decisions/)._
