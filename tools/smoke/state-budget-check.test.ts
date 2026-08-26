// Testes do state-budget-check (T8.1b / Issue #127; ADR-0024). Provam que cada sinal ACEITA um STATE
// ponteiro e MORDE o vazamento (verde ≠ correto, §8.1): PASS e FAIL rodam juntos, por sinal. Cobrem os
// casos exigidos pela Issue: PASS ponteiro, FAIL inchado, FAIL história/status e a ISENÇÃO de referência
// pontual sancionada (`#N` e data/prazo pontual). Um guard sem caso FAIL provado não entra.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Bullet,
  type BudgetConfig,
  checkAntesChain,
  checkDatedBullets,
  checkRepeatedLastConclusion,
  checkSize,
  checkStatusCheckboxes,
  countLines,
  extractBodyBullets,
  extractLastConclusionMarkers,
  isValidBudgetConfig,
  loadBudgetConfig,
  runStateBudgetCheck,
} from "./state-budget-check.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REAL_STATE = readFileSync(join(ROOT, "STATE.md"), "utf-8");
const REAL_CONFIG = loadBudgetConfig(join(ROOT, ".orion/state-budget.json"));

// Constrói um Bullet completo (com `segments`) a partir de linhas físicas trimadas (marcador já removido).
const B = (line: number, ...segments: string[]): Bullet => ({
  line,
  text: segments.join(" "),
  segments,
});

// Um STATE-ponteiro mínimo, sancionado: seções nominais + UMA última conclusão com `#N` (ponteiro).
const PONTEIRO = [
  "# STATE",
  "",
  '> Cabeçalho: não anexe narrativa ("Antes…/Antes disso…"); `Última conclusão` é ponteiro.',
  "",
  "## Agora",
  "- **Fase: Plan** · sem tarefa ativa. Épico O8 aberto — resta T8.1b (#127).",
  "",
  "## Próximo passo",
  "- Replanejar (G1) a próxima fatia.",
  "",
  "## Última conclusão",
  "- **[#174]** (T9.7b, PR #178 + flip #179): fecha o épico O9.",
  "",
  "## Riscos / pendências em aberto",
  "- Confirmar a licença ao adotar em contexto organizacional.",
  "- Perfil de proteção = Solo: migrar para Time quando houver 2+ mantenedores.",
  "",
].join("\n");

describe("STATE.md REAL — nasce verde (born-green)", () => {
  it("passa contra o STATE.md e o config reais, sem violações", () => {
    const r = runStateBudgetCheck({ content: REAL_STATE, config: REAL_CONFIG });
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.metrics.bullets).toBeGreaterThan(0); // realmente extraiu bullets (senão o verde é vazio)
    expect(r.metrics.lines).toBeLessThanOrEqual(REAL_CONFIG.maxLines);
  });
});

describe("PASS — um STATE ponteiro sancionado", () => {
  it("aceita seções nominais + UMA última conclusão com `#N`", () => {
    const r = runStateBudgetCheck({ content: PONTEIRO, config: { maxLines: 80 } });
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("S1 — tamanho (FAIL inchado)", () => {
  it("MORDE quando o STATE excede o orçamento", () => {
    const inchado = Array.from({ length: 50 }, (_, i) => `linha ${i}`).join("\n");
    const v = checkSize(countLines(inchado), 10);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("orçamento estourado");
  });

  it("ACEITA exatamente no orçamento (limite não-estrito)", () => {
    expect(checkSize(80, 80)).toEqual([]);
    expect(checkSize(81, 80).length).toBe(1);
  });

  it("está WIRED no agregado", () => {
    const v = runStateBudgetCheck({ content: "a\nb\nc\nd", config: { maxLines: 2 } }).violations;
    expect(v.some((m) => m.includes("orçamento estourado"))).toBe(true);
  });
});

describe("S2 — cadeia 'Antes…' (FAIL história)", () => {
  it("MORDE '- **Antes disso:** …' e '- Antes: …' e '- Antes…'", () => {
    const bullets: Bullet[] = [
      B(1, "**Antes disso:** ajustamos o núcleo"),
      B(2, "Antes: corrigimos o fence"),
      B(3, "Antes… veio a investigação"),
    ];
    expect(checkAntesChain(bullets).length).toBe(3);
  });

  it("NÃO confunde 'antes de mergear' (uso comum de 'antes', sem marcador de cadeia)", () => {
    expect(checkAntesChain([B(1, "antes de mergear, rode o smoke-test")])).toEqual([]);
  });

  it("MORDE 'Antes disso:' numa LINHA DE CONTINUAÇÃO do bullet (gap do `^`-only — Codex Thread 3)", () => {
    // O bullet lógico une continuações; o marcador cai no meio do texto. O S2 varre os `segments` físicos.
    const bullets = extractBodyBullets(
      ["## Agora", "- item atual", "  **Antes disso:** fizemos X."].join("\n"),
    );
    expect(checkAntesChain(bullets).length).toBe(1);
  });

  it("está WIRED no agregado (via continuação)", () => {
    const v = runStateBudgetCheck({
      content: "## Agora\n- item atual\n  **Antes disso:** fez X",
      config: { maxLines: 999 },
    }).violations;
    expect(v.some((m) => m.includes("cadeia narrativa 'Antes"))).toBe(true);
  });

  it("MORDE dois-pontos FORA da ênfase '**Antes disso**:' (Codex round 2 #5)", () => {
    // Forma Markdown comum: o `:` fica após o `**` de fechamento. O `**Antes disso:**` já mordia; este não.
    expect(checkAntesChain([B(1, "**Antes disso**: fizemos o anterior")]).length).toBe(1);
    expect(checkAntesChain([B(1, "__Antes__: retro")]).length).toBe(1);
  });
});

describe("S3 — acumulação de bullets datados (FAIL log; data/prazo pontual isento)", () => {
  it("ACEITA UMA data pontual (prazo forward-looking sancionado — ADR-0024)", () => {
    expect(checkDatedBullets([B(1, "Certificado expira em 2026-09-01")], 1)).toEqual([]);
  });

  it("MORDE a ACUMULAÇÃO (2 bullets datados > limiar 1)", () => {
    const v = checkDatedBullets([B(1, "fez X em 2026-08-04"), B(2, "fez Y em 2026-08-05")], 1);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("acumulação de bullets datados");
    expect(v[0]).toContain("linhas 1, 2");
  });

  it("respeita o limiar do config (maxDatedBullets=0 morde já na 1ª data)", () => {
    expect(checkDatedBullets([B(1, "algo em 2026-08-04")], 0).length).toBe(1);
    expect(checkDatedBullets([B(1, "algo em 2026-08-04")], 2)).toEqual([]);
  });

  it("conta data em LINHA DE CONTINUAÇÃO (não escapa pela quebra) e acumula", () => {
    const content = [
      "## Log",
      "- **#174** fez a coisa",
      "  e terminou em 2026-08-04.",
      "- outra coisa em 2026-08-05.",
    ].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.some((m) => m.includes("acumulação de bullets datados"))).toBe(true);
  });

  it("MORDE acumulação mesmo sob 'Agora'/'Riscos' (ADR-0024: acumulação datada não é isenta)", () => {
    const content = ["## Agora", "- corrigiu X em 2026-08-04.", "- corrigiu Y em 2026-08-05."].join(
      "\n",
    );
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.some((m) => m.includes("acumulação de bullets datados"))).toBe(true);
  });
});

describe("S4 — repetição de 'última conclusão' (FAIL cadeia; heading E bullet)", () => {
  it("MORDE ≥2 marcadores de heading `## Última conclusão` (formato do repo — Codex Thread 2)", () => {
    const content = ["## Última conclusão", "- #10", "", "## Última conclusão", "- #12"].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.some((m) => m.includes("repetição de 'última conclusão'"))).toBe(true);
  });

  it("MORDE ≥2 bullets rotulados 'última conclusão' (formato inline)", () => {
    const v = checkRepeatedLastConclusion([1, 2]);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("repetição de 'última conclusão'");
  });

  it("ACEITA UM marcador (1 heading + bullet-ponteiro não-rotulado = 1)", () => {
    const markers = extractLastConclusionMarkers(
      ["## Última conclusão", "- **[#174]** (PR #178): fecha o O9."].join("\n"),
    );
    expect(markers).toEqual([1]); // só o heading; o bullet não é rotulado 'última conclusão'
    expect(checkRepeatedLastConclusion(markers)).toEqual([]);
  });

  it("NÃO conta a menção no cabeçalho em blockquote (orientação, não marcador)", () => {
    const content = ["> `Última conclusão` é ponteiro.", "## Última conclusão", "- #10"].join("\n");
    expect(extractLastConclusionMarkers(content)).toEqual([2]); // só o heading da linha 2
  });

  it("NÃO conta menção EM PROSA num passo legítimo (Codex round 2 #2 — falso-vermelho)", () => {
    // `- Atualizar a última conclusão após o merge` + o heading canônico NÃO pode contar 2 marcadores.
    const content = [
      "## Próximo passo",
      "- Atualizar a última conclusão após o merge de #127.",
      "",
      "## Última conclusão",
      "- **[#174]** (PR #178): fecha o O9.",
    ].join("\n");
    expect(extractLastConclusionMarkers(content)).toEqual([4]); // só o heading; a prosa não é marcador
    expect(runStateBudgetCheck({ content, config: { maxLines: 999 } }).ok).toBe(true);
  });

  it("CONTA um bullet ROTULADO 'Última conclusão:' (formato inline sancionado)", () => {
    const content = ["## Agora", "- **Última conclusão:** #10 (PR #11)"].join("\n");
    expect(extractLastConclusionMarkers(content)).toEqual([2]);
  });

  it("NÃO conta um HEADING que só discute a última conclusão (Codex round 3 — falso-vermelho)", () => {
    // `## Como atualizar a última conclusão` NÃO é a seção-ponteiro; só o heading-rótulo canônico conta.
    const content = [
      "## Como atualizar a última conclusão",
      "- passo",
      "",
      "## Última conclusão",
      "- #10",
    ].join("\n");
    expect(extractLastConclusionMarkers(content)).toEqual([4]); // só o heading canônico da linha 4
    expect(runStateBudgetCheck({ content, config: { maxLines: 999 } }).ok).toBe(true);
  });
});

describe("S5 — status por-item / checkbox (FAIL status)", () => {
  it("MORDE checkbox de critério SDD ('- [x]' / '- [ ]')", () => {
    const content = ["## Agora", "- [x] Critério 1 passa", "- [ ] Critério 2 pendente"].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.filter((m) => m.includes("status por-item")).length).toBe(2);
  });

  it("MORDE checkbox em listas `+` e ORDENADAS ('1.'/'2)') (Codex round 2 #4)", () => {
    const content = ["## Agora", "+ [x] Critério A", "1. [ ] Critério B", "2) [X] Critério C"].join(
      "\n",
    );
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.filter((m) => m.includes("status por-item")).length).toBe(3);
  });

  it("ACEITA um bullet normal (sem checkbox)", () => {
    expect(checkStatusCheckboxes([B(1, "**Fase: Plan** · sem tarefa ativa")])).toEqual([]);
  });
});

describe("ISENÇÃO — referência pontual sancionada passa", () => {
  it("NÃO morde um bullet-ponteiro com múltiplos `#N` que descrevem UMA conclusão", () => {
    const content = [
      "## Última conclusão",
      "- **[#174]** (T9.7b, PR #178 + flip #179): fecha o épico O9.",
    ].join("\n");
    expect(runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations).toEqual([]);
  });

  it("NÃO morde um risco vivo que cita UM `#N` (ponteiro, não narrativa)", () => {
    const content = ["## Riscos", "- Pendência aberta em #127 — destravar após T9.1/T9.2."].join(
      "\n",
    );
    expect(runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations).toEqual([]);
  });

  it("NÃO morde um risco com UMA data/prazo pontual (forward-looking — honra a isenção da ADR)", () => {
    const content = ["## Riscos", "- Certificado expira em 2026-09-01."].join("\n");
    expect(runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations).toEqual([]);
  });
});

describe("extractBodyBullets — só o corpo (ignora blockquote e heading) + segmentos", () => {
  it("ignora o cabeçalho em blockquote que cita 'Antes…/última conclusão' como orientação", () => {
    const content = [
      "# STATE",
      '> Não anexe narrativa ("Antes…/Antes disso…"); `Última conclusão` é ponteiro.',
      "## Agora",
      "- bullet real do corpo",
    ].join("\n");
    const bullets = extractBodyBullets(content);
    expect(bullets.length).toBe(1);
    expect(bullets[0]!.text).toBe("bullet real do corpo");
  });

  it("une continuações indentadas em `text` e as preserva em `segments`", () => {
    const content = ["## X", "- começo do bullet", "  continuação indentada", "  mais uma"].join(
      "\n",
    );
    const bullets = extractBodyBullets(content);
    expect(bullets.length).toBe(1);
    expect(bullets[0]!.text).toBe("começo do bullet continuação indentada mais uma");
    expect(bullets[0]!.segments).toEqual(["começo do bullet", "continuação indentada", "mais uma"]);
  });

  it("NÃO captura prosa não-indentada (ex.: seção Ponteiros) como bullet", () => {
    const content = ["## Ponteiros", "**GitHub Milestones** · [`PLAN.md`](PLAN.md)"].join("\n");
    expect(extractBodyBullets(content)).toEqual([]);
  });
});

describe("countLines — ignora UM newline final", () => {
  it("conta linhas sem contar a linha vazia terminal", () => {
    expect(countLines("a\nb\nc\n")).toBe(3);
    expect(countLines("a\nb\nc")).toBe(3);
    expect(countLines("")).toBe(0);
    expect(countLines("a\r\nb\r\n")).toBe(2);
  });
});

describe("config — fail-closed", () => {
  it("aceita a forma mínima válida e a com maxDatedBullets/note", () => {
    expect(isValidBudgetConfig({ maxLines: 80 })).toBe(true);
    expect(isValidBudgetConfig({ maxLines: 80, maxDatedBullets: 0, note: "doc" })).toBe(true);
  });

  it("rejeita maxLines ausente / não-inteiro / não-positivo", () => {
    expect(isValidBudgetConfig({})).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 0 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: -5 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 12.5 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: "80" })).toBe(false);
    expect(isValidBudgetConfig(null)).toBe(false);
  });

  it("rejeita maxDatedBullets inválido (não-inteiro / negativo / tipo errado) e note de tipo errado", () => {
    expect(isValidBudgetConfig({ maxLines: 80, maxDatedBullets: -1 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 80, maxDatedBullets: 1.5 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 80, maxDatedBullets: "1" })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 80, note: 123 })).toBe(false);
  });

  it("loadBudgetConfig falha fechado em arquivo ausente", () => {
    expect(() => loadBudgetConfig(join(ROOT, ".orion/nao-existe.json"))).toThrow(/falha fechada/);
  });

  it("o config real do repo é válido e cobre o STATE real com folga", () => {
    const cfg: BudgetConfig = REAL_CONFIG;
    expect(isValidBudgetConfig(cfg)).toBe(true);
    expect(countLines(REAL_STATE)).toBeLessThanOrEqual(cfg.maxLines);
  });
});
