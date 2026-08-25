// Testes do state-budget-check (T8.1b / Issue #127; ADR-0024). Provam que cada sinal ACEITA um STATE
// ponteiro e MORDE o vazamento (verde ≠ correto, §8.1): PASS e FAIL rodam juntos, por sinal. Cobrem os
// casos exigidos pela Issue: PASS ponteiro, FAIL inchado, FAIL história/status e a ISENÇÃO de referência
// pontual sancionada (`#N`). Um guard sem caso FAIL provado não entra.
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
  isValidBudgetConfig,
  loadBudgetConfig,
  runStateBudgetCheck,
} from "./state-budget-check.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REAL_STATE = readFileSync(join(ROOT, "STATE.md"), "utf-8");
const REAL_CONFIG = loadBudgetConfig(join(ROOT, ".orion/state-budget.json"));

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
      { line: 1, text: "**Antes disso:** ajustamos o núcleo" },
      { line: 2, text: "Antes: corrigimos o fence" },
      { line: 3, text: "Antes… veio a investigação" },
    ];
    expect(checkAntesChain(bullets).length).toBe(3);
  });

  it("NÃO confunde 'antes de mergear' (uso comum de 'antes', sem marcador de cadeia)", () => {
    const bullets: Bullet[] = [{ line: 1, text: "antes de mergear, rode o smoke-test" }];
    expect(checkAntesChain(bullets)).toEqual([]);
  });

  it("está WIRED no agregado", () => {
    const v = runStateBudgetCheck({
      content: "## Agora\n- **Antes disso:** fez X",
      config: { maxLines: 999 },
    }).violations;
    expect(v.some((m) => m.includes("cadeia narrativa 'Antes"))).toBe(true);
  });
});

describe("S3 — bullet datado (FAIL narrativa datada; morde mesmo sob seção sancionada)", () => {
  it("MORDE um bullet com data ISO", () => {
    const v = checkDatedBullets([{ line: 5, text: "corrigiu o parser em 2026-08-04 no PR #128" }]);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("bullet datado");
    expect(v[0]).toContain("linha 5");
  });

  it("MORDE data mesmo sob 'Agora'/'Riscos' (ADR-0024: acumulação datada não é isenta)", () => {
    const content = ["## Agora", "- PR #128 corrigiu X em 2026-08-04."].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.some((m) => m.includes("bullet datado"))).toBe(true);
  });

  it("captura data em LINHA DE CONTINUAÇÃO do bullet (não escapa pela quebra)", () => {
    const content = [
      "## Última conclusão",
      "- **#174** fez a coisa",
      "  e terminou em 2026-08-04.",
    ].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.some((m) => m.includes("bullet datado"))).toBe(true);
  });
});

describe("S4 — repetição de 'última conclusão' (FAIL cadeia)", () => {
  it("MORDE ≥2 bullets rotulados 'última conclusão'", () => {
    const bullets: Bullet[] = [
      { line: 1, text: "Última conclusão: #10 (PR #11)" },
      { line: 2, text: "última conclusão: #12 (PR #13)" },
    ];
    const v = checkRepeatedLastConclusion(bullets);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("repetição de 'última conclusão'");
  });

  it("ACEITA UM único bullet 'última conclusão' (ponteiro sancionado)", () => {
    const bullets: Bullet[] = [{ line: 1, text: "Última conclusão: #10 (PR #11)" }];
    expect(checkRepeatedLastConclusion(bullets)).toEqual([]);
  });
});

describe("S5 — status por-item / checkbox (FAIL status)", () => {
  it("MORDE checkbox de critério SDD ('- [x]' / '- [ ]')", () => {
    const content = ["## Agora", "- [x] Critério 1 passa", "- [ ] Critério 2 pendente"].join("\n");
    const v = runStateBudgetCheck({ content, config: { maxLines: 999 } }).violations;
    expect(v.filter((m) => m.includes("status por-item")).length).toBe(2);
  });

  it("ACEITA um bullet normal (sem checkbox)", () => {
    expect(checkStatusCheckboxes([{ line: 1, text: "**Fase: Plan** · sem tarefa ativa" }])).toEqual(
      [],
    );
  });
});

describe("ISENÇÃO — referência pontual sancionada (`#N`) passa", () => {
  it("NÃO morde um bullet-ponteiro com múltiplos `#N` que descrevem UMA conclusão", () => {
    const content = [
      "## Última conclusão",
      "- **[#174]** (T9.7b, PR #178 + flip #179): fecha o épico O9.",
    ].join("\n");
    const r = runStateBudgetCheck({ content, config: { maxLines: 999 } });
    expect(r.violations).toEqual([]);
  });

  it("NÃO morde um risco vivo que cita UM `#N` (ponteiro, não narrativa)", () => {
    const content = ["## Riscos", "- Pendência aberta em #127 — destravar após T9.1/T9.2."].join(
      "\n",
    );
    const r = runStateBudgetCheck({ content, config: { maxLines: 999 } });
    expect(r.violations).toEqual([]);
  });
});

describe("extractBodyBullets — só o corpo (ignora blockquote e heading)", () => {
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

  it("une continuações indentadas ao bullet lógico", () => {
    const content = [
      "## X",
      "- começo do bullet",
      "  continuação indentada",
      "  mais continuação",
    ].join("\n");
    const bullets = extractBodyBullets(content);
    expect(bullets.length).toBe(1);
    expect(bullets[0]!.text).toBe("começo do bullet continuação indentada mais continuação");
  });

  it("NÃO captura prosa não-indentada (ex.: seção Ponteiros) como bullet", () => {
    const content = [
      "## Ponteiros",
      "**GitHub Milestones** · [`PLAN.md`](PLAN.md) · [`MEMORY.md`](MEMORY.md)",
    ].join("\n");
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
  it("aceita a forma mínima válida", () => {
    expect(isValidBudgetConfig({ maxLines: 80 })).toBe(true);
    expect(isValidBudgetConfig({ maxLines: 80, note: "doc" })).toBe(true);
  });

  it("rejeita maxLines ausente / não-inteiro / não-positivo", () => {
    expect(isValidBudgetConfig({})).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 0 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: -5 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: 12.5 })).toBe(false);
    expect(isValidBudgetConfig({ maxLines: "80" })).toBe(false);
    expect(isValidBudgetConfig(null)).toBe(false);
  });

  it("rejeita note de tipo errado", () => {
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
