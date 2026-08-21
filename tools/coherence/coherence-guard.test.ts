// Testes do GUARD DE COERÊNCIA (T9.6 / O9; Issue #170). Provam que cada check ACEITA a árvore real e
// MORDE seu defeito (verde ≠ correto, lição #43): PASS e FAIL rodam juntos, por regra. Um guard sem caso
// FAIL provado não entra (D5).
import { lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  COVERAGE_DOMAIN,
  MANIFEST,
  MIRROR_PATTERNS,
  NORMATIVE_SOURCE_PATTERNS,
  type ManifestEntry,
} from "../../docs/examples/artifact-manifest.ts";
import {
  checkClassifiedFilesExist,
  checkNormativeSourceRefs,
  checkOfflineSchemaContract,
  checkUnclassifiedMirrors,
  collectScanFiles,
  type PathKind,
  runCoherenceGuard,
  SCHEMA_CONTRACTS,
  type ScanFile,
  type SchemaContract,
} from "./coherence-guard.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const scanFiles = collectScanFiles(COVERAGE_DOMAIN.scanDirs, ROOT);
const pathKind = (file: string): PathKind => {
  try {
    const st = lstatSync(join(ROOT, file)); // lstat: NÃO segue symlink (G15)
    return st.isSymbolicLink()
      ? "symlink"
      : st.isDirectory()
        ? "dir"
        : st.isFile()
          ? "file"
          : "missing";
  } catch {
    return "missing";
  }
};

describe("guard de coerência — árvore real (nasce verde)", () => {
  it("passa contra o manifesto + a árvore real, sem violações", () => {
    const r = runCoherenceGuard({
      manifest: MANIFEST,
      domainFiles: COVERAGE_DOMAIN.files,
      scanFiles,
      mirrorPatterns: MIRROR_PATTERNS,
      normativePatterns: NORMATIVE_SOURCE_PATTERNS,
      schemaContracts: SCHEMA_CONTRACTS,
      pathKind,
    });
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.counts.scanned).toBeGreaterThan(0); // realmente varreu algo (senão o verde é vazio)
  });
});

describe("check 1 — espelho não classificado (D1-B)", () => {
  it("ACEITA prosa operacional que não reafirma nenhuma regra transversal", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/x.md",
        content: "Configure o branch protection e os 4 checks obrigatórios.",
      },
    ];
    expect(checkUnclassifiedMirrors(files, MIRROR_PATTERNS, MANIFEST)).toEqual([]);
  });

  it("ACEITA um espelho que ESTÁ classificado no manifesto (par existe)", () => {
    // github-projects.md é classificado p/ fast-lane — reafirmá-la ali não viola.
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/github-projects.md",
        content: "Na fast-lane issue-less o PR é a unidade.",
      },
    ];
    expect(checkUnclassifiedMirrors(files, MIRROR_PATTERNS, MANIFEST)).toEqual([]);
  });

  it("MORDE um espelho NOVO não classificado (fast-lane em arquivo fora do manifesto)", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/_novo.md",
        content: "Use a fast-lane issue-less para mudanças triviais.",
      },
    ];
    const v = checkUnclassifiedMirrors(files, MIRROR_PATTERNS, MANIFEST);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("_novo.md");
    expect(v[0]).toContain("fast-lane");
  });

  it("MORDE reafirmação de roteamento-estado num arquivo não classificado p/ essa regra", () => {
    const files: ScanFile[] = [
      { path: "docs/runbooks/_novo.md", content: "O STATE.md aponta para o épico ativo." },
    ];
    const v = checkUnclassifiedMirrors(files, MIRROR_PATTERNS, MANIFEST);
    expect(v.some((m) => m.includes("roteamento-estado"))).toBe(true);
  });

  it("NÃO confunde 'histórico linear' / 'status checks' do git com história/roteamento (sem falso-positivo)", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/_git.md",
        content: "Require linear history; os required_status_checks devem passar.",
      },
    ];
    expect(checkUnclassifiedMirrors(files, MIRROR_PATTERNS, MANIFEST)).toEqual([]);
  });
});

describe("mordida por REGRA (G2/G4) — cada array de MIRROR_PATTERNS morde de fato", () => {
  // Uma fixture não classificada por regra: apagar/corromper qualquer array deixaria a sua regra sem
  // morder (o self-check ficaria verde sem cobrir aquela regra — achado Codex). O `plano-L1` usa o EXATO
  // exemplo documentado, que antes NÃO casava por causa do `\bépico` impossível (achado Codex G4).
  const RULE_FIXTURE: Record<string, string> = {
    "plano-L1": "Os Milestones são a fonte do épico.",
    "historia-L5": "A história são os PRs mergeados.",
    "roteamento-historia": "A história vai ao CHANGELOG antigo.",
    "roteamento-estado": "O STATE.md aponta o épico ativo.",
    "fast-lane": "Use a fast-lane issue-less.",
  };
  for (const [rule, content] of Object.entries(RULE_FIXTURE)) {
    it(`MORDE a regra '${rule}' num arquivo não classificado`, () => {
      const v = checkUnclassifiedMirrors(
        [{ path: "docs/runbooks/_novo.md", content }],
        MIRROR_PATTERNS,
        MANIFEST,
      );
      expect(v.some((m) => m.includes(`'${rule}'`))).toBe(true);
    });
  }

  it("cobre TODA regra de MIRROR_PATTERNS (nenhuma sem fixture de mordida)", () => {
    expect(Object.keys(RULE_FIXTURE).sort()).toEqual(Object.keys(MIRROR_PATTERNS).sort());
  });
});

describe("check 2 — classificação para fonte removida", () => {
  it("ACEITA o manifesto real (todo arquivo classificado existe com o tipo certo)", () => {
    expect(checkClassifiedFilesExist(MANIFEST, pathKind)).toEqual([]);
  });

  it("MORDE um par que aponta para arquivo inexistente (destiny≠remove)", () => {
    const orfa: ManifestEntry = {
      file: "docs/sumiu.md",
      rule: "plano-L1",
      role: "mirror",
      destiny: "keep",
      slice: "T9.3b",
      group: "plan-history",
      note: "sintético",
    };
    const v = checkClassifiedFilesExist([...MANIFEST, orfa], pathKind);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("docs/sumiu.md");
    expect(v[0]).toContain("não existe");
  });

  it("MORDE tipo DIVERGENTE (G13): arquivo classificado que virou diretório", () => {
    // `docs` existe como DIRETÓRIO; classificado sem `/` (espera arquivo) → o arquivo nomeado sumiu.
    const trocado: ManifestEntry = {
      file: "docs",
      rule: "plano-L1",
      role: "mirror",
      destiny: "keep",
      slice: "T9.3b",
      group: "plan-history",
      note: "dir onde se espera arquivo",
    };
    const v = checkClassifiedFilesExist([trocado], pathKind);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("tipo divergente");
  });

  it("ACEITA o diretório `docs/plans/` classificado com `/` (tipo bate)", () => {
    const dirEntry: ManifestEntry = {
      file: "docs/plans/",
      rule: "plano-L1",
      role: "pointer",
      destiny: "stub",
      slice: "T9.3b",
      group: "plan-history",
      note: "dir real",
    };
    expect(checkClassifiedFilesExist([dirEntry], pathKind)).toEqual([]);
  });

  it("MORDE um SYMLINK onde se espera arquivo regular (G15 — lstat não segue o link)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "coh-sl-"));
    try {
      writeFileSync(join(tmp, "real.md"), "alvo");
      symlinkSync(join(tmp, "real.md"), join(tmp, "link.md")); // link.md → real.md (arquivo regular)
      const kindLocal = (file: string): PathKind => {
        const st = lstatSync(join(tmp, file));
        return st.isSymbolicLink()
          ? "symlink"
          : st.isDirectory()
            ? "dir"
            : st.isFile()
              ? "file"
              : "missing";
      };
      const entry: ManifestEntry = {
        file: "link.md",
        rule: "plano-L1",
        role: "mirror",
        destiny: "keep",
        slice: "T9.3b",
        group: "plan-history",
        note: "symlink onde se espera arquivo",
      };
      const v = checkClassifiedFilesExist([entry], kindLocal);
      expect(v.length).toBe(1);
      expect(v[0]).toContain("tipo divergente");
      expect(v[0]).toContain("symlink");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("NÃO cobra existência de entradas 'removed'/'remove' (registro deliberado de saída)", () => {
    const removida: ManifestEntry = {
      file: "docs/ja-removido.md",
      rule: "plano-L1",
      role: "removed",
      destiny: "remove",
      slice: "T9.3b",
      group: "plan-history",
      note: "registro de que existiu",
    };
    expect(checkClassifiedFilesExist([removida], pathKind)).toEqual([]);
  });
});

describe("check 1 × entradas removidas (F4) — removed não classifica como ativo", () => {
  it("MORDE um espelho recriado num path cuja única entrada é 'removed'/'remove'", () => {
    // Um registro de remoção NÃO deve exibir a reintrodução do espelho: senão recriar o arquivo com a
    // frase-espelho passaria batido (achado Codex). O check 1 só considera classificação ATIVA.
    const removida: ManifestEntry = {
      file: "docs/runbooks/_recriado.md",
      rule: "fast-lane",
      role: "removed",
      destiny: "remove",
      slice: "T9.5b",
      group: "na",
      note: "registro de que existiu",
    };
    const files: ScanFile[] = [
      { path: "docs/runbooks/_recriado.md", content: "Use a fast-lane issue-less de novo." },
    ];
    const v = checkUnclassifiedMirrors(files, MIRROR_PATTERNS, [removida]);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("fast-lane");
  });
});

describe("check 3 — referência normativa a PLAN/CHANGELOG como fonte", () => {
  it("ACEITA a construção NEGADA ('Milestones = fonte, não o PLAN.md')", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/x.md",
        content: "Os Milestones são a fonte do épico (não o PLAN.md, que é stub-ponteiro).",
      },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS)).toEqual([]);
  });

  it("MORDE 'registre no CHANGELOG.md' (afirmativa)", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/_novo.md",
        content: "Ao concluir, registre no CHANGELOG.md o que mudou.",
      },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("historia-L5");
  });

  it("MORDE 'PLAN.md é a fonte' (afirmativa)", () => {
    const files: ScanFile[] = [
      { path: "docs/runbooks/_novo.md", content: "O PLAN.md é a fonte do plano de épicos." },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.some((m) => m.includes("plano-L1"))).toBe(true);
  });

  it("MORDE mesmo num arquivo cujo par é normativeSourceRef (F1 — sem exceção nos scanDirs)", () => {
    // O bypass que o Codex apontou: nos scanDirs NÃO há residual legítimo (PLAN/CHANGELOG são stubs),
    // então uma exceção por par marcado esconderia exatamente a regressão que o check 3 promete pegar.
    // O guard não recebe mais o manifesto aqui — qualquer match afirmativo viola.
    const files: ScanFile[] = [
      { path: "docs/runbooks/github-projects.md", content: "O PLAN.md é a fonte do plano." },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("plano-L1");
  });

  it("MORDE nomes em CODE SPAN (G1) — `PLAN.md`/`CHANGELOG.md` entre crases não driblam", () => {
    // O estilo Markdown do repo envolve nomes em crase; sem tolerar `?` os padrões deixavam passar o
    // exato falso-verde que o check 3 promete pegar (achado Codex).
    const files: ScanFile[] = [
      { path: "docs/runbooks/a.md", content: "O `PLAN.md` é a fonte do plano." },
      {
        path: "docs/runbooks/b.md",
        content: "Ao concluir, registre no `CHANGELOG.md` o que mudou.",
      },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.some((m) => m.includes("a.md") && m.includes("plano-L1"))).toBe(true);
    expect(v.some((m) => m.includes("b.md") && m.includes("historia-L5"))).toBe(true);
  });

  it("ACEITA a instrução NEGADA imperativa (G1/G8) — 'Não registre no CHANGELOG.md' reforça a regra", () => {
    // Falso-positivo que o Codex apontou: o imperativo negado é orientação COMPLIANT (usa PRs), não drift.
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/c.md",
        content: "Não registre no `CHANGELOG.md`; use os PRs mergeados.",
      },
      {
        path: "docs/runbooks/d.md",
        content: "Nunca registre no PLAN.md — o plano vive nos Milestones.",
      },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS)).toEqual([]);
  });

  it("ainda MORDE o imperativo AFIRMATIVO (a negação não abre buraco)", () => {
    const files: ScanFile[] = [
      { path: "docs/runbooks/e.md", content: "Ao concluir, registre no CHANGELOG.md o que mudou." },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS).length).toBe(1);
  });

  it("MORDE a 2ª CLÁUSULA afirmativa após negação de OUTRA cláusula (G18)", () => {
    // A negação governa "edite o STATE", não "registre no CHANGELOG.md" — o 2º é drift real e DEVE morder.
    const files: ScanFile[] = [
      { path: "docs/runbooks/f.md", content: "Não edite o STATE; registre no CHANGELOG.md." },
      { path: "docs/runbooks/g.md", content: "Não edite o STATE, mas registre no CHANGELOG.md." },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.some((m) => m.includes("f.md"))).toBe(true);
    expect(v.some((m) => m.includes("g.md"))).toBe(true);
  });

  it("MORDE o imperativo de OBJETO DIRETO (G22): 'atualize o CHANGELOG.md' / 'Mantenha o PLAN.md'", () => {
    const files: ScanFile[] = [
      { path: "docs/runbooks/j.md", content: "Ao concluir, atualize o CHANGELOG.md." },
      { path: "docs/runbooks/k.md", content: "Mantenha o PLAN.md atualizado." },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS);
    expect(v.some((m) => m.includes("j.md") && m.includes("historia-L5"))).toBe(true);
    expect(v.some((m) => m.includes("k.md") && m.includes("plano-L1"))).toBe(true);
  });

  it("LIMITE documentado (G21): dupla-negação afirmativa NÃO é distinguida — deixada à revisão humana", () => {
    // Decisão humana: negação é tratada por forma, não por sentido. "Não deixe de registrar" (= faça)
    // é SUPRIMIDA como se fosse negativa. Este teste FIXA o comportamento conhecido (não é aspiração):
    // se um dia for corrigido, o teste falha e força reavaliar a decisão de parar de remendar negação.
    const files: ScanFile[] = [
      { path: "docs/runbooks/l.md", content: "Nunca deixe de registrar no CHANGELOG.md." },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS)).toEqual([]);
  });

  it("MORDE cada REGRA normativa com sua fixture (G19): plano-L1 E historia-L5", () => {
    const rules = new Set(NORMATIVE_SOURCE_PATTERNS.map((p) => p.rule));
    // PLAN afirmativo → plano-L1; CHANGELOG imperativo → historia-L5. Apagar um grupo deixaria essa
    // regra sem mordida — aqui provamos as duas separadamente.
    const plano = checkNormativeSourceRefs(
      [{ path: "docs/runbooks/h.md", content: "O PLAN.md é a fonte do plano." }],
      NORMATIVE_SOURCE_PATTERNS,
    );
    const hist = checkNormativeSourceRefs(
      [{ path: "docs/runbooks/i.md", content: "registre no `CHANGELOG.md`" }],
      NORMATIVE_SOURCE_PATTERNS,
    );
    expect(rules).toEqual(new Set(["plano-L1", "historia-L5"]));
    expect(plano.some((m) => m.includes("plano-L1"))).toBe(true);
    expect(hist.some((m) => m.includes("historia-L5"))).toBe(true);
  });
});

describe("check 4 — quebra de schema da representação offline/história (G3, ADR-0025 (d))", () => {
  it("ACEITA os contratos reais (predicados dos geradores íntegros)", () => {
    expect(checkOfflineSchemaContract(SCHEMA_CONTRACTS)).toEqual([]);
  });

  it("cobre plano E história (a representação offline dos dois geradores)", () => {
    expect(SCHEMA_CONTRACTS.map((c) => c.name).sort()).toEqual([
      "história (MergedPr)",
      "plano (PlanIssue)",
    ]);
  });

  it("tem uma fixture inválida por CAMPO obrigatório (G5 — sem mascaramento)", () => {
    // Cada contrato real cobre cada campo com uma amostra que quebra SÓ aquele campo.
    const plano = SCHEMA_CONTRACTS.find((c) => c.name.includes("PlanIssue"))!;
    const historia = SCHEMA_CONTRACTS.find((c) => c.name.includes("MergedPr"))!;
    expect(plano.invalids.map((i) => i.constraint).sort()).toEqual(["number", "state", "title"]);
    expect(historia.invalids.map((i) => i.constraint).sort()).toEqual([
      "mergeCommit.oid",
      "mergedAt",
      "number",
      "state",
      "title",
    ]);
  });

  it("MORDE uma regressão POR CAMPO: predicado que para de exigir `number` é pego (G5)", () => {
    // Simula isValidIssue que ESQUECEU de validar `number` (só checa title+state). A fixture que quebra
    // SÓ number passaria — antes (um inválido genérico que também errava state) isso ficava mascarado.
    const semNumber = (x: unknown): boolean => {
      const o = x as Record<string, unknown>;
      return typeof o?.title === "string" && /^(open|closed)$/i.test(String(o?.state));
    };
    const contrato: SchemaContract = {
      name: "plano-sem-number",
      isValid: semNumber,
      valid: { number: 1, title: "x", state: "open" },
      invalids: [
        { constraint: "number", sample: { number: "1", title: "x", state: "open" } },
        { constraint: "state", sample: { number: 1, title: "x", state: "banana" } },
      ],
    };
    const v = checkOfflineSchemaContract([contrato]);
    expect(v.some((m) => m.includes("plano-sem-number/number"))).toBe(true); // pega a regressão de number
    expect(v.some((m) => m.includes("/state"))).toBe(false); // state ainda é exigido → não falso-positivo
  });

  it("MORDE quando o predicado aceita QUALQUER amostra malformada (deixou de falhar fechado)", () => {
    const frouxo: SchemaContract = {
      name: "frouxo",
      isValid: () => true, // aceita qualquer coisa — schema quebrado
      valid: { number: 1, title: "x", state: "open" },
      invalids: [{ constraint: "tudo", sample: { lixo: true } }],
    };
    const v = checkOfflineSchemaContract([frouxo]);
    expect(v.some((m) => m.includes("ACEITA"))).toBe(true);
  });

  it("MORDE quando o predicado rejeita a amostra VÁLIDA (ficou estrito demais)", () => {
    const estrito: SchemaContract = {
      name: "estrito",
      isValid: () => false, // rejeita tudo — inclusive a forma canônica
      valid: { number: 1, title: "x", state: "open" },
      invalids: [{ constraint: "tudo", sample: { lixo: true } }],
    };
    const v = checkOfflineSchemaContract([estrito]);
    expect(v.some((m) => m.includes("VÁLIDA rejeitada"))).toBe(true);
  });
});

describe("agregado — runCoherenceGuard", () => {
  it("reprova quando QUALQUER camada viola (defeito injetado)", () => {
    const r = runCoherenceGuard({
      manifest: MANIFEST,
      domainFiles: COVERAGE_DOMAIN.files,
      scanFiles: [{ path: "docs/runbooks/_novo.md", content: "fast-lane issue-less aqui." }],
      mirrorPatterns: MIRROR_PATTERNS,
      normativePatterns: NORMATIVE_SOURCE_PATTERNS,
      schemaContracts: SCHEMA_CONTRACTS,
      pathKind,
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((m) => m.includes("_novo.md"))).toBe(true);
  });
});

describe("collectScanFiles (F3) — recursa subdiretórios", () => {
  const tmp = mkdtempSync(join(tmpdir(), "coh-scan-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it("varre um `.md` ANINHADO num subdiretório do scanDir (não pode escapar em silêncio)", () => {
    mkdirSync(join(tmp, "docs/runbooks/team"), { recursive: true });
    writeFileSync(join(tmp, "docs/runbooks/top.md"), "topo");
    writeFileSync(join(tmp, "docs/runbooks/team/nested.md"), "aninhado");
    writeFileSync(join(tmp, "docs/runbooks/team/skip.txt"), "não-md");
    const found = collectScanFiles(["docs/runbooks/"], tmp)
      .map((f) => f.path)
      .sort();
    expect(found).toEqual(["docs/runbooks/team/nested.md", "docs/runbooks/top.md"]);
  });
});
