import { describe, expect, it } from "vitest";
import { adrsByNumber, diffAdrHistory, parseArgs, runGuard, type GuardDeps } from "./adr-history-guard.ts";

describe("adrsByNumber — identidade número→arquivo por nome (gramática canônica)", () => {
  it("mapeia só nomes válidos; ignora README e não-ADR", () => {
    const m = adrsByNumber(["0006-ledger.md", "README.md", "0031-modelo-v2.md", "notas.md", ".gitkeep"]);
    expect([...m.entries()]).toEqual([
      [6, "0006-ledger.md"],
      [31, "0031-modelo-v2.md"],
    ]);
  });
});

describe("diffAdrHistory — append-only do histórico de ADRs (base×head)", () => {
  const base = ["0006-ledger.md", "0031-modelo-v2.md", "0033-flip.md"];

  it("histórico preservado → sem violação (editar conteúdo é permitido; só nomes contam)", () => {
    expect(diffAdrHistory(base, [...base])).toEqual([]);
  });

  it("adicionar um ADR novo no head → permitido (append)", () => {
    expect(diffAdrHistory(base, [...base, "0034-novo.md"])).toEqual([]);
  });

  it("ADR mergeado REMOVIDO → reprova (mordida)", () => {
    const errs = diffAdrHistory(base, ["0006-ledger.md", "0031-modelo-v2.md"]); // sumiu 0033
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/ADR-0033 removido/);
  });

  it("ADR mergeado RENUMERADO/SUBSTITUÍDO (mesmo número, outro arquivo) → reprova (mordida)", () => {
    const errs = diffAdrHistory(base, ["0006-ledger.md", "0031-modelo-v2.md", "0033-outro-tema.md"]);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/ADR-0033 com identidade mutada.*0033-flip\.md.*0033-outro-tema\.md/);
  });

  it("remoção E renumeração juntas → reporta ambas (não para na 1ª)", () => {
    const errs = diffAdrHistory(base, ["0006-outro.md", "0031-modelo-v2.md"]); // 0006 mutado, 0033 removido
    expect(errs).toHaveLength(2);
    expect(errs.join("\n")).toMatch(/ADR-0006 com identidade mutada/);
    expect(errs.join("\n")).toMatch(/ADR-0033 removido/);
  });

  it("renumerar um ADR AINDA NÃO na base (head-only) é permitido (não é registro mergeado)", () => {
    // 0034 não está na base; trocar o slug de um head-only não viola
    expect(diffAdrHistory(base, [...base, "0034-renumerado.md"])).toEqual([]);
  });
});

describe("runGuard — resolução base×head + skip conservador", () => {
  it("base inacessível (ref inexistente) → SKIP (exit 0), sem falso-vermelho offline", () => {
    const r = runGuard("refs/orion/definitely-not-a-real-ref-for-tests");
    expect(r.code).toBe(0);
    expect(r.message).toMatch(/SKIP/);
  });

  // Deps injetáveis: exercita o caminho de VIOLAÇÃO retornando exit≠0 (não só o diff puro) — Codex #262 L28.
  const deps = (base: string[], head: string[]): GuardDeps => ({
    accessible: () => true,
    baseNames: () => base,
    headNames: () => head,
  });

  it("runGuard → code 1 quando um ADR mergeado é REMOVIDO", () => {
    const r = runGuard("x", deps(["0006-a.md", "0033-flip.md"], ["0006-a.md"]));
    expect(r.code).toBe(1);
    expect(r.errors!.join("\n")).toMatch(/ADR-0033 removido/);
  });

  it("runGuard → code 1 quando um ADR mergeado é RENUMERADO/SUBSTITUÍDO", () => {
    const r = runGuard("x", deps(["0033-flip.md"], ["0033-outro.md"]));
    expect(r.code).toBe(1);
    expect(r.errors!.join("\n")).toMatch(/identidade mutada/);
  });

  it("runGuard → code 0 (PASS) quando o histórico é preservado (+ADR novo)", () => {
    const r = runGuard("x", deps(["0006-a.md"], ["0006-a.md", "0034-novo.md"]));
    expect(r.code).toBe(0);
    expect(r.message).toMatch(/PASS/);
  });

  it("base sem ADRs (null) → SKIP conservador", () => {
    const r = runGuard("x", { accessible: () => true, baseNames: () => null, headNames: () => [] });
    expect(r.code).toBe(0);
    expect(r.message).toMatch(/SKIP/);
  });
});

describe("parseArgs — fail-closed (não faz SKIP silencioso em typo de flag) — Codex #262 L119", () => {
  it("aceita [] e [--check] → base default origin/main", () => {
    expect(parseArgs([])).toEqual({ ref: "origin/main" });
    expect(parseArgs(["--check"])).toEqual({ ref: "origin/main" });
  });
  it("--base <ref> define a base", () => {
    expect(parseArgs(["--base", "origin/develop"])).toEqual({ ref: "origin/develop" });
  });
  it("flag desconhecida (ex.: --chek) → ERRO (não vira base ref → não SKIP silencioso)", () => {
    const r = parseArgs(["--chek"]);
    expect("error" in r).toBe(true);
  });
  it("token em excesso / --base sem valor → ERRO", () => {
    expect("error" in parseArgs(["origin/main"])).toBe(true); // posicional não é aceito
    expect("error" in parseArgs(["--base"])).toBe(true);
  });
});
