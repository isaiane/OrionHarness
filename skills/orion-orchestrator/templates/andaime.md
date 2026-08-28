# Andaime de execução — primeiro comentário da Issue

> Substitui o antigo `handoff.md`. O handoff **não é mais um arquivo**: a substância vai nos campos da
> Issue SDD, e só o andaime vira comentário. Ver a seção *Andaime de execução* no `SKILL.md`.
>
> **Se este comentário estiver crescendo, substância vazou da Issue.** Volte e preencha a Issue.

---

```text
Leia esta Issue por inteiro e execute a TX.Y seguindo os critérios de aceite dela.

Antes de agir, leia `AGENTS.core.md` e as seções §<...> do `AGENTS.md`, mais os ADRs
<relevantes>. Em qualquer divergência entre esta Issue e a constituição, a constituição
vence — pare e me avise.

Você propõe; eu aprovo (G1 na Issue / G2 no ADR) e faço o merge (T3).

<Se houver rascunho de referência em .orion/tmp/, aponte aqui — e diga que é ponto de
partida, não texto final: os critérios de aceite da Issue mandam.>

Comece verificando os pré-requisitos abaixo e me reporte ANTES de tocar em qualquer
arquivo. Depois pare e aguarde.
```

**Pré-requisitos** — pare e avise se algum falhar:

1. **Read-only primeiro** (get-bearings §7): `pwd` + `git status` — confirme **branch correta**,
   **árvore limpa** e **WIP=0** (o repo é one-task-at-a-time). A **sincronização** (`fetch`/`pull`) é ação
   do **humano / fora do action system** — o tool-guard só autoriza `git` read-only; **não rode `git pull`**
   sob o hook. Confirme que a base está atualizada antes de prosseguir.
2. <fatia anterior mergeada / ADR aceito / numeração livre — o que for verificável>
3. <estado que invalidaria a tarefa se estiver diferente>

**Bloqueantes**

- <o que está fora de escopo e é tentador fazer junto>
- <o que exige gate que ainda não foi dado>
- **Não** faça merge (T3). **Não** mude ADR para `aceito` antes do G2.
- Guardrail dos **3–4 arquivos**: se espalhar além disso, **pare** e proponha fatiamento.

**Perguntar antes**

- <a decisão que parece detalhe de execução mas é escolha de desenho>
- <o caso em que a varredura revela contradição que exigiria editar o `AGENTS.md` — isso é G2 novo>
