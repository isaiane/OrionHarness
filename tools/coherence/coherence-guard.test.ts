// Testes do GUARD DE COERÊNCIA (T9.6 / O9; Issue #170). Provam que cada check ACEITA a árvore real e
// MORDE seu defeito (verde ≠ correto, lição #43): PASS e FAIL rodam juntos, por regra. Um guard sem caso
// FAIL provado não entra (D5).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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
  checkUnclassifiedMirrors,
  collectScanFiles,
  runCoherenceGuard,
  type ScanFile,
} from "./coherence-guard.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const scanFiles = collectScanFiles(COVERAGE_DOMAIN.scanDirs, ROOT);
const exists = (file: string) => existsSync(join(ROOT, file));

describe("guard de coerência — árvore real (nasce verde)", () => {
  it("passa contra o manifesto + a árvore real, sem violações", () => {
    const r = runCoherenceGuard({
      manifest: MANIFEST,
      domainFiles: COVERAGE_DOMAIN.files,
      scanFiles,
      mirrorPatterns: MIRROR_PATTERNS,
      normativePatterns: NORMATIVE_SOURCE_PATTERNS,
      exists,
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

describe("check 2 — classificação para fonte removida", () => {
  it("ACEITA o manifesto real (todo arquivo classificado existe)", () => {
    expect(checkClassifiedFilesExist(MANIFEST, exists)).toEqual([]);
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
    const v = checkClassifiedFilesExist([...MANIFEST, orfa], exists);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("docs/sumiu.md");
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
    expect(checkClassifiedFilesExist([removida], exists)).toEqual([]);
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
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS, MANIFEST)).toEqual([]);
  });

  it("MORDE 'registre no CHANGELOG.md' (afirmativa) em arquivo sem marcador residual", () => {
    const files: ScanFile[] = [
      {
        path: "docs/runbooks/_novo.md",
        content: "Ao concluir, registre no CHANGELOG.md o que mudou.",
      },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS, MANIFEST);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("historia-L5");
  });

  it("MORDE 'PLAN.md é a fonte' (afirmativa)", () => {
    const files: ScanFile[] = [
      { path: "docs/runbooks/_novo.md", content: "O PLAN.md é a fonte do plano de épicos." },
    ];
    const v = checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS, MANIFEST);
    expect(v.some((m) => m.includes("plano-L1"))).toBe(true);
  });

  it("ACEITA um match num par MARCADO normativeSourceRef (residual permitido)", () => {
    // Constrói um manifesto sintético que marca o arquivo/regra como residual — não deve violar.
    const marcado: ManifestEntry = {
      file: "docs/runbooks/_res.md",
      rule: "historia-L5",
      role: "mirror",
      destiny: "keep",
      slice: "T9.4b",
      group: "plan-history",
      normativeSourceRef: true,
      note: "residual permitido",
    };
    const files: ScanFile[] = [
      { path: "docs/runbooks/_res.md", content: "Por ora, registre no CHANGELOG.md (residual)." },
    ];
    expect(checkNormativeSourceRefs(files, NORMATIVE_SOURCE_PATTERNS, [marcado])).toEqual([]);
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
      exists,
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((m) => m.includes("_novo.md"))).toBe(true);
  });
});
