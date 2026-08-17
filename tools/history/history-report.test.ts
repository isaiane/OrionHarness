import { describe, it, expect } from "vitest";
import {
  isValidMergedPr,
  isValidIsoInstant,
  validateMergedPrs,
  mergeDate,
  mergeMonth,
  shortOid,
  sanitizeTitle,
  sortByMergedDesc,
  summarize,
  renderReport,
  PR_FETCH_LIMIT,
  type MergedPr,
} from "./history-report.ts";

// Fixture no formato de `gh pr list --state merged --json number,title,mergedAt,mergeCommit,…` (sem rede).
const pr = (
  number: number,
  title: string,
  mergedAt: string,
  oid = "abcdef1234567890",
  extra: Partial<MergedPr> = {},
): MergedPr => ({
  number,
  title,
  mergedAt,
  mergeCommit: { oid },
  ...extra,
});

describe("isValidMergedPr / validateMergedPrs — contrato imutável (ADR-0025 item 3, fail-closed)", () => {
  it("aceita PR mergeado bem-formado", () => {
    expect(isValidMergedPr(pr(157, "chore: x", "2026-08-17T02:11:00Z"))).toBe(true);
  });
  it("rejeita mergedAt ausente ou não-ISO (não é entrega ancorável)", () => {
    expect(isValidMergedPr({ number: 1, title: "x", mergeCommit: { oid: "a" } })).toBe(false);
    expect(
      isValidMergedPr({ number: 1, title: "x", mergedAt: "ontem", mergeCommit: { oid: "a" } }),
    ).toBe(false);
  });
  it("rejeita mergeCommit/oid ausente (sem âncora de identidade)", () => {
    expect(isValidMergedPr({ number: 1, title: "x", mergedAt: "2026-08-01T00:00:00Z" })).toBe(
      false,
    );
    expect(
      isValidMergedPr({
        number: 1,
        title: "x",
        mergedAt: "2026-08-01T00:00:00Z",
        mergeCommit: { oid: "" },
      }),
    ).toBe(false);
    expect(
      isValidMergedPr({
        number: 1,
        title: "x",
        mergedAt: "2026-08-01T00:00:00Z",
        mergeCommit: null,
      }),
    ).toBe(false);
  });
  it("rejeita number/title de tipo errado", () => {
    expect(isValidMergedPr({ number: "1", title: "x", mergedAt: "2026-08-01T00:00:00Z" })).toBe(
      false,
    );
    expect(isValidMergedPr(null)).toBe(false);
    expect(isValidMergedPr({})).toBe(false);
  });
  it("rejeita state != MERGED (fixture não injeta aberto/fechado-sem-merge como história)", () => {
    expect(
      isValidMergedPr({
        number: 1,
        title: "x",
        mergedAt: "2026-08-01T00:00:00Z",
        mergeCommit: { oid: "abcdef1234567" },
        state: "OPEN",
      }),
    ).toBe(false);
    expect(
      isValidMergedPr({
        number: 1,
        title: "x",
        mergedAt: "2026-08-01T00:00:00Z",
        mergeCommit: { oid: "abcdef1234567" },
        state: "MERGED",
      }),
    ).toBe(true);
  });
  it("rejeita OID não-hex ou curto demais, e instante ISO com componente fora de faixa (Codex P2)", () => {
    const base = { number: 1, title: "x", mergedAt: "2026-08-01T00:00:00Z" };
    expect(isValidMergedPr({ ...base, mergeCommit: { oid: "x" } })).toBe(false); // não-hex
    expect(isValidMergedPr({ ...base, mergeCommit: { oid: "abc" } })).toBe(false); // < 7 hex
    expect(isValidMergedPr({ ...base, mergeCommit: { oid: "abcdef1" } })).toBe(true); // 7 hex OK
    // mergedAt que só PARECE ISO (prefixo) mas tem componente inválido → rejeitado
    expect(
      isValidMergedPr({
        number: 1,
        title: "x",
        mergedAt: "2026-99-99Tgarbage",
        mergeCommit: { oid: "abcdef1234567" },
      }),
    ).toBe(false);
  });
  it("validateMergedPrs falha fechada no primeiro inválido, com índice", () => {
    expect(() => validateMergedPrs([pr(1, "ok", "2026-08-01T00:00:00Z"), {}], "teste")).toThrow(
      /índice 1/,
    );
    expect(validateMergedPrs([pr(1, "ok", "2026-08-01T00:00:00Z")], "teste")).toHaveLength(1);
  });
});

describe("mergeDate / mergeMonth / shortOid — derivados determinísticos (sem timezone)", () => {
  const p = pr(9, "t", "2026-08-17T02:11:00Z", "6902ffd00484717c28323935a1c30d739d14ec83");
  it("data e mês vêm do slice do ISO (sem new Date)", () => {
    expect(mergeDate(p)).toBe("2026-08-17");
    expect(mergeMonth(p)).toBe("2026-08");
  });
  it("shortOid = 7 hex", () => {
    expect(shortOid(p)).toBe("6902ffd");
  });
});

describe("sortByMergedDesc — mais recente primeiro; desempate por número desc", () => {
  it("ordena por mergedAt decrescente", () => {
    const a = pr(1, "a", "2026-08-01T00:00:00Z");
    const b = pr(2, "b", "2026-08-10T00:00:00Z");
    const c = pr(3, "c", "2026-07-15T00:00:00Z");
    expect(sortByMergedDesc([a, b, c]).map((p) => p.number)).toEqual([2, 1, 3]);
  });
  it("desempate estável: mesma data → número decrescente", () => {
    const x = pr(10, "x", "2026-08-05T00:00:00Z");
    const y = pr(20, "y", "2026-08-05T00:00:00Z");
    expect(sortByMergedDesc([x, y]).map((p) => p.number)).toEqual([20, 10]);
  });
  it("não muta o array de entrada", () => {
    const arr = [pr(1, "a", "2026-08-01T00:00:00Z"), pr(2, "b", "2026-08-10T00:00:00Z")];
    sortByMergedDesc(arr);
    expect(arr.map((p) => p.number)).toEqual([1, 2]);
  });
});

describe("summarize", () => {
  it("vazio → total 0, sem datas", () => {
    expect(summarize([])).toEqual({ total: 0, first: null, last: null });
  });
  it("conta e reporta primeira/última data (mais antiga/mais recente)", () => {
    const s = summarize([
      pr(1, "a", "2026-08-01T00:00:00Z"),
      pr(2, "b", "2026-08-10T00:00:00Z"),
      pr(3, "c", "2026-07-15T00:00:00Z"),
    ]);
    expect(s).toEqual({ total: 3, first: "2026-07-15", last: "2026-08-10" });
  });
});

describe("renderReport", () => {
  const opts = {
    repo: "isaiane/OrionHarness",
    generatedAt: "2026-08-17T00:00:00Z",
    source: "fixture",
  };

  it("estado vazio: explica que história vazia é correta num template/offline", () => {
    const md = renderReport([], opts);
    expect(md).toContain("0 PR(s) mergeado(s)");
    expect(md).toContain("template-repo");
    expect(md).toContain("CHANGELOG.md");
    expect(md).not.toContain("## 2026"); // nenhuma seção de mês
  });

  it("determinístico (mesmo input → mesma saída)", () => {
    const prs = [
      pr(157, "chore: a", "2026-08-17T02:11:00Z"),
      pr(151, "feat: b", "2026-08-16T00:00:00Z"),
    ];
    expect(renderReport(prs, opts)).toBe(renderReport(prs, opts));
  });

  it("índice utilizável: cabeçalho, resumo com intervalo, meses decrescentes, linha datada por-PR", () => {
    const md = renderReport(
      [
        pr(
          157,
          "chore(ledger): flip passes",
          "2026-08-17T02:11:00Z",
          "6902ffd0000000000000000000000000",
        ),
        pr(
          151,
          "feat(sdd): campo de rastro",
          "2026-08-16T10:00:00Z",
          "3ba4720aaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        pr(
          140,
          "docs(plan): stub PLAN",
          "2026-07-20T00:00:00Z",
          "aaaaaaa1111111111111111111111111",
        ),
      ],
      opts,
    );
    expect(md).toContain("# História (relatório gerado) — isaiane/OrionHarness");
    expect(md).toContain("gitignored");
    expect(md).toContain("**Resumo:** 3 PR(s) mergeado(s) · de 2026-07-20 a 2026-08-17.");
    expect(md).toContain("## 2026-08 (2 PR(s))");
    expect(md).toContain("## 2026-07 (1 PR(s))");
    expect(md).toContain("- 2026-08-17 · #157 · chore(ledger): flip passes  `6902ffd`");
    expect(md).toContain("- 2026-08-16 · #151 · feat(sdd): campo de rastro  `3ba4720`");
    // mês mais recente aparece antes do mais antigo
    expect(md.indexOf("## 2026-08")).toBeLessThan(md.indexOf("## 2026-07"));
    // dentro do mês, merge decrescente (#157 antes de #151)
    expect(md.indexOf("#157")).toBeLessThan(md.indexOf("#151"));
  });
});

describe("isValidIsoInstant — instante ISO-8601 completo, não só prefixo (Codex P2)", () => {
  it("aceita instantes reais (Z e offset, com/sem fração)", () => {
    expect(isValidIsoInstant("2026-08-17T02:11:00Z")).toBe(true);
    expect(isValidIsoInstant("2026-08-17T02:11:00.123Z")).toBe(true);
    expect(isValidIsoInstant("2026-08-17T02:11:00-03:00")).toBe(true);
  });
  it("rejeita prefixo-que-parece-ISO e componentes fora de faixa", () => {
    expect(isValidIsoInstant("2026-99-99Tgarbage")).toBe(false); // o caso do Codex
    expect(isValidIsoInstant("2026-13-01T00:00:00Z")).toBe(false); // mês 13
    expect(isValidIsoInstant("2026-08-32T00:00:00Z")).toBe(false); // dia 32
    expect(isValidIsoInstant("2026-08-01T24:00:00Z")).toBe(false); // hora 24
    expect(isValidIsoInstant("2026-08-01T00:00:00")).toBe(false); // sem zona
    expect(isValidIsoInstant("ontem")).toBe(false);
  });
});

describe("sanitizeTitle — título editável não corrompe o Markdown (Codex P2)", () => {
  it("neutraliza comentário HTML, code span, link e injeção de linha", () => {
    expect(sanitizeTitle("<!-- esconde tudo")).toBe("&lt;!-- esconde tudo");
    expect(sanitizeTitle("usa `oid` fake")).toBe("usa \\`oid\\` fake");
    expect(sanitizeTitle("[link](http://x)")).toBe("\\[link\\](http://x)");
    expect(sanitizeTitle("linha1\nlinha2")).toBe("linha1 linha2"); // sem quebra → não injeta linha
    expect(sanitizeTitle("a | b")).toBe("a \\| b");
  });
  it("preserva títulos normais (não escapa hífen nem emphasis cosmética)", () => {
    expect(sanitizeTitle("feat(sdd): well-formed title")).toBe("feat(sdd): well-formed title");
  });
});

describe("renderReport — título malicioso é escapado; linhas seguintes sobrevivem (Codex P2)", () => {
  it("um título `<!--` não abre comentário que esconde as linhas seguintes", () => {
    const md = renderReport(
      [
        pr(2, "<!-- tenta esconder", "2026-08-02T00:00:00Z", "bbbbbbb2222222222222222222222222"),
        pr(1, "titulo normal", "2026-08-01T00:00:00Z", "aaaaaaa1111111111111111111111111"),
      ],
      { repo: "r", generatedAt: "2026-08-17T00:00:00Z", source: "fixture" },
    );
    expect(md).toContain("&lt;!-- tenta esconder");
    expect(md).not.toContain("- 2026-08-02 · #2 · <!--"); // não aparece cru
    expect(md).toContain("#1 · titulo normal"); // a linha seguinte continua visível
  });
});

describe("constantes de contrato", () => {
  it("PR_FETCH_LIMIT é um teto positivo (guarda de truncamento)", () => {
    expect(PR_FETCH_LIMIT).toBeGreaterThan(0);
  });
});
