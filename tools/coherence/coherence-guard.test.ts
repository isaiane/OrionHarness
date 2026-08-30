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
  checkCommittedGeneratedReport,
  checkNormativeSourceRefs,
  checkOfflineSchemaContract,
  checkUnclassifiedMirrors,
  collectCommittedReports,
  collectScanFiles,
  type PathKind,
  pathKindAt,
  runCoherenceGuard,
  SCHEMA_CONTRACTS,
  type ScanFile,
  type SchemaContract,
} from "./coherence-guard.ts";
import { GENERATED_REPORT_SENTINEL, REPORTS_DIR } from "../plan/plan-report.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const scanFiles = collectScanFiles(COVERAGE_DOMAIN.scanDirs, ROOT);
const pathKind = (file: string): PathKind => pathKindAt(ROOT, file);
// Insumos do CHECK 5 reusados nos dois call sites do agregado (real + `base`).
const check5 = {
  committedReports: [] as ScanFile[],
  sentinel: GENERATED_REPORT_SENTINEL,
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
      // CHECK 5 contra a ÁRVORE REAL: `git grep` do sentinela deve retornar VAZIO (nenhum relatório
      // gerado committado; a forma montada não aparece em fonte rastreado — é concatenada).
      committedReports: collectCommittedReports(ROOT, GENERATED_REPORT_SENTINEL),
      sentinel: GENERATED_REPORT_SENTINEL,
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

  it("ACEITA destino NEGADO após vírgula (G24): 'Registre nos PRs, não no CHANGELOG.md' roteia p/ longe", () => {
    // Contenção de cláusula no gap verbo→destino: não cruza vírgula/`;` até um destino negado (compliant).
    const files: ScanFile[] = [
      { path: "docs/runbooks/m.md", content: "Registre nos PRs, não no CHANGELOG.md." },
      { path: "docs/runbooks/n.md", content: "Atualize a Issue, não o CHANGELOG.md." },
      { path: "docs/runbooks/o.md", content: "Mantenha o Milestone, não o PLAN.md." },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS)).toEqual([]);
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

describe("agregado — runCoherenceGuard (G26: cada check é WIRED, não só o helper)", () => {
  // Um defeito por camada, roteado pela PORTA AGREGADA: prova que runCoherenceGuard CHAMA cada check —
  // remover o wiring de um deles faria o teste correspondente falhar (achado Codex).
  const base = {
    manifest: MANIFEST,
    domainFiles: COVERAGE_DOMAIN.files,
    scanFiles: [] as ScanFile[],
    mirrorPatterns: MIRROR_PATTERNS,
    normativePatterns: NORMATIVE_SOURCE_PATTERNS,
    schemaContracts: SCHEMA_CONTRACTS,
    pathKind,
    ...check5,
  };
  const run = (o: Partial<typeof base>): string[] =>
    runCoherenceGuard({ ...base, ...o }).violations;
  const synth = (file: string): ManifestEntry => ({
    file,
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    note: "sintético",
  });

  it("check 1 (espelho) está wired no agregado", () => {
    const v = run({
      scanFiles: [{ path: "docs/runbooks/_x.md", content: "fast-lane issue-less." }],
    });
    expect(v.some((m) => m.includes("espelho não classificado"))).toBe(true);
  });

  it("check 2 (existência) está wired no agregado", () => {
    const v = run({ manifest: [...MANIFEST, synth("docs/sumiu-agg.md")] });
    expect(v.some((m) => m.includes("não existe na árvore"))).toBe(true);
  });

  it("check 2 (tipo divergente) está wired no agregado", () => {
    const v = run({ manifest: [...MANIFEST, synth("docs")] }); // `docs` é dir, classificado sem `/`
    expect(v.some((m) => m.includes("tipo divergente"))).toBe(true);
  });

  it("check 3 (ref normativa) está wired no agregado", () => {
    const v = run({
      scanFiles: [{ path: "docs/runbooks/_y.md", content: "O PLAN.md é a fonte." }],
    });
    expect(v.some((m) => m.includes("referência normativa"))).toBe(true);
  });

  it("check 4 (schema) está wired no agregado", () => {
    const v = run({
      schemaContracts: [
        {
          name: "quebrado",
          isValid: () => true,
          valid: { number: 1 },
          invalids: [{ constraint: "x", sample: {} }],
        },
      ],
    });
    expect(v.some((m) => m.includes("quebra de schema"))).toBe(true);
  });

  it("consistência interna do manifesto (validateManifest) está wired no agregado", () => {
    // Par duplicado → validateManifest viola; prova que o agregado roda a camada 0.
    const v = run({ manifest: [...MANIFEST, MANIFEST[0]!] });
    expect(v.some((m) => m.includes("par duplicado"))).toBe(true);
  });

  it("check 5 (relatório committado) está wired no agregado — morde fora do scratch", () => {
    const v = run({
      committedReports: [{ path: "AGENTS.md", content: GENERATED_REPORT_SENTINEL }],
    });
    expect(v.some((m) => m.includes("relatório gerado committado"))).toBe(true);
  });

  it("check 5 morde relatório FORCE-ADDED no scratch (git add -f, o buraco do .gitignore)", () => {
    // .orion/tmp/reports/ é gitignored → um arquivo RASTREADO ali só existe por `git add -f` = violação.
    const v = run({
      committedReports: [{ path: `${REPORTS_DIR}/status.md`, content: GENERATED_REPORT_SENTINEL }],
    });
    expect(v.some((m) => m.includes("relatório gerado committado"))).toBe(true);
  });
});

describe("check 5 — relatório gerado committado (T9.7b / mecanismo D4)", () => {
  it("reprova arquivo versionado com o sentinela — copiado a path versionado", () => {
    const v = checkCommittedGeneratedReport(
      [{ path: "docs/relatorio-copiado.md", content: `${GENERATED_REPORT_SENTINEL}\n# ...` }],
      GENERATED_REPORT_SENTINEL,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("relatório gerado committado");
  });

  it("reprova relatório RASTREADO no scratch (git add -f de .orion/tmp/reports/ — gitignored)", () => {
    // O dir é gitignored: um arquivo rastreado ali só existe por force-add → é o buraco que a D4 fecha.
    expect(
      checkCommittedGeneratedReport(
        [{ path: `${REPORTS_DIR}/plan.md`, content: GENERATED_REPORT_SENTINEL }],
        GENERATED_REPORT_SENTINEL,
      ),
    ).toHaveLength(1);
  });

  it("aceita arquivo versionado SEM o sentinela", () => {
    expect(
      checkCommittedGeneratedReport(
        [{ path: "README.md", content: "# Orion\nprosa normal." }],
        GENERATED_REPORT_SENTINEL,
      ),
    ).toEqual([]);
  });

  it("a forma MONTADA do sentinela não aparece verbatim na árvore rastreada (git grep vazio)", () => {
    // O guard nasce verde: `collectCommittedReports` sobre a árvore real retorna VAZIO (o sentinela é
    // concatenado nos fontes, então `git grep` da forma montada não acha nenhum arquivo rastreado).
    expect(collectCommittedReports(ROOT, GENERATED_REPORT_SENTINEL)).toEqual([]);
  });
});

describe("arestas de robustez (G27/G28/G29)", () => {
  const mkEntry = (over: Partial<ManifestEntry>): ManifestEntry => ({
    file: "x",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: "T9.5b",
    group: "na",
    note: "sintético",
    ...over,
  });

  it("G27: ancestral SYMLINK de um path classificado → 'symlink' (não segue o link)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "coh-anc-"));
    try {
      mkdirSync(join(tmp, "alvo"), { recursive: true });
      writeFileSync(join(tmp, "alvo/source.md"), "x");
      symlinkSync(join(tmp, "alvo"), join(tmp, "parent")); // parent → alvo (dir symlink)
      expect(pathKindAt(tmp, "parent/source.md")).toBe("symlink"); // ancestral é symlink
      expect(pathKindAt(tmp, "alvo/source.md")).toBe("file"); // caminho real
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("G28: par classificado como POINTER que ganha prosa-espelho → MORDE (role não autoriza espelho)", () => {
    const pointer = mkEntry({ file: "docs/runbooks/new.md", rule: "fast-lane", role: "pointer" });
    const files: ScanFile[] = [
      { path: "docs/runbooks/new.md", content: "Use a fast-lane issue-less." },
    ];
    const v = checkUnclassifiedMirrors(files, MIRROR_PATTERNS, [pointer]);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("fast-lane");
  });

  it("G28: o MESMO par como MIRROR NÃO viola (papel autoriza espelho)", () => {
    const mirror = mkEntry({ file: "docs/runbooks/new.md", rule: "fast-lane", role: "mirror" });
    const files: ScanFile[] = [
      { path: "docs/runbooks/new.md", content: "Use a fast-lane issue-less." },
    ];
    expect(checkUnclassifiedMirrors(files, MIRROR_PATTERNS, [mirror])).toEqual([]);
  });

  it("G29: entrada contraditória role:removed + destiny:keep NÃO é eximida (arquivo ausente → morde)", () => {
    const contradictory = mkEntry({
      file: "docs/nao-existe-xyz.md",
      rule: "plano-L1",
      role: "removed",
      destiny: "keep",
      group: "plan-history",
      slice: "T9.3b",
    });
    const v = checkClassifiedFilesExist([contradictory], pathKind);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("não existe");
  });

  it("G29: remoção COERENTE (removed + remove) segue eximida", () => {
    const coherent = mkEntry({
      file: "docs/removido.md",
      rule: "plano-L1",
      role: "removed",
      destiny: "remove",
      group: "plan-history",
      slice: "T9.3b",
    });
    expect(checkClassifiedFilesExist([coherent], pathKind)).toEqual([]);
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

  it("NÃO segue um scanDir RAIZ que é symlink (G25 — trailing slash não dereferencia)", () => {
    const tmp2 = mkdtempSync(join(tmpdir(), "coh-slroot-"));
    try {
      mkdirSync(join(tmp2, "alvo"), { recursive: true });
      writeFileSync(join(tmp2, "alvo/segredo.md"), "fora do alcance");
      symlinkSync(join(tmp2, "alvo"), join(tmp2, "docs-runbooks-link")); // dir symlink → alvo
      // Passa o symlink COM trailing slash como scanDir: não pode ser traversado.
      const found = collectScanFiles(["docs-runbooks-link/"], tmp2).map((f) => f.path);
      expect(found).toEqual([]);
    } finally {
      rmSync(tmp2, { recursive: true, force: true });
    }
  });

  it("FALHA FECHADA num scanDir que ESCAPA o root via `..` (G32/G34 — config inválida = throw)", () => {
    const tmp4 = mkdtempSync(join(tmpdir(), "coh-esc-"));
    try {
      mkdirSync(join(tmp4, "outside"), { recursive: true });
      writeFileSync(join(tmp4, "outside/x.md"), "fora do repo");
      mkdirSync(join(tmp4, "repo"), { recursive: true });
      // scanDir malformado é ERRO DE CONFIG (committado) → throw, não skip silencioso (coverage sumiria).
      expect(() => collectScanFiles(["../outside/"], join(tmp4, "repo"))).toThrow(/escapa o root/);
    } finally {
      rmSync(tmp4, { recursive: true, force: true });
    }
  });

  it("check 2 MORDE um path classificado que ESCAPA o root via `..` (G33 — pathKindAt=missing)", () => {
    const fora: ManifestEntry = {
      file: "../outside/source.md",
      rule: "plano-L1",
      role: "mirror",
      destiny: "keep",
      slice: "T9.3b",
      group: "plan-history",
      note: "escapa o root",
    };
    const v = checkClassifiedFilesExist([fora], pathKind);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("não existe");
  });

  it("NÃO segue um ANCESTRAL symlink do scanDir (G30 — checagem por-componente)", () => {
    const tmp3 = mkdtempSync(join(tmpdir(), "coh-slanc-"));
    try {
      // Alvo EXTERNO ao "root" lógico, contendo runbooks/x.md
      mkdirSync(join(tmp3, "externo/runbooks"), { recursive: true });
      writeFileSync(join(tmp3, "externo/runbooks/x.md"), "fora do repo");
      mkdirSync(join(tmp3, "repo"), { recursive: true });
      symlinkSync(join(tmp3, "externo"), join(tmp3, "repo/docs")); // repo/docs → externo (ancestral symlink)
      // root = repo; scanDir docs/runbooks/ tem ANCESTRAL symlinkado → não pode ser varrido.
      const found = collectScanFiles(["docs/runbooks/"], join(tmp3, "repo")).map((f) => f.path);
      expect(found).toEqual([]);
    } finally {
      rmSync(tmp3, { recursive: true, force: true });
    }
  });
});

// ─── REGRESSÃO da skill orion-orchestrator (S3, #193 / ADR-0028) ─────────────────────────────────────
// O drift EXATO que o ADR-0028 combate: o template de handoff mandava "ATERRISSAR o estado no STATE.md",
// contra o "ROTEAR" do §4 (ADR-0024/0025). Agora a fonte da skill é VERSIONADA e VARRIDA no CI: este
// teste reprova a reintrodução da INSTRUÇÃO stale — o modelo é guard-backed de fato, não só no review.
//
// O padrão ancora na FRASE de roteamento do estado ("aterrissar" perto de "estado"/"STATE"), não na
// palavra solta (Codex R1 #199): um glossário/aviso como "não use 'aterrissar'" NÃO deve falhar o CI —
// só a instrução que de fato reintroduz o bug. Mesma janela {0,20} do padrão `roteamento-estado`.
describe("regressão da skill orion-orchestrator (S3, #193) — rotear, nunca 'aterrissar estado'", () => {
  const ATERRISSAR_RE = /aterrissar\b[^.\n]{0,20}\b(?:estado|state)\b/i;
  const skillFiles = scanFiles.filter((f) => f.path.startsWith("skills/orion-orchestrator/"));

  it("a fonte da skill ESTÁ nos scanDirs (varrida, não fora-de-domínio — ADR-0028 item 4)", () => {
    // Se a skill saísse dos scanDirs (ou a fonte sumisse), o guard pararia de vê-la e a regressão abaixo
    // ficaria vazia/verde por vacuidade. Exige ≥1 arquivo para o teste ter dentes.
    expect(skillFiles.length).toBeGreaterThan(0);
  });

  it("NENHUM arquivo da fonte da skill manda 'aterrissar estado' (a orientação é rotear + só o ponteiro)", () => {
    const offenders = skillFiles.filter((f) => ATERRISSAR_RE.test(f.content)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("MORDE 'aterrissar estado' reintroduzido (self-check: o padrão pega o drift)", () => {
    const fixture: ScanFile = {
      path: "skills/orion-orchestrator/SKILL.md",
      content: "Ao fechar a sessão, aterrissar o estado no STATE.md com o resumo do que foi feito.",
    };
    expect(ATERRISSAR_RE.test(fixture.content)).toBe(true);
  });

  it("NÃO morde a palavra solta 'aterrissar' fora da instrução (sem falso-positivo — Codex R1 #199)", () => {
    // Um glossário/aviso legítimo que só CITA a palavra não pode quebrar o CI.
    expect(ATERRISSAR_RE.test("Glossário: NÃO use o verbo 'aterrissar' — a orientação é rotear.")).toBe(
      false,
    );
  });
});
