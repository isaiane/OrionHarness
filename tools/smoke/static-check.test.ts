import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  yamlLint,
  detectSecret,
  extractSddLabels,
  missingSddFields,
  walkFiles,
  runStaticCheck,
} from "./static-check.ts";

describe("yamlLint — checagem leve", () => {
  it("aceita YAML válido simples", () => {
    expect(yamlLint("jobs:\n  build:\n    runs-on: ubuntu-latest\n")).toBeNull();
  });

  it("aceita block-scalar com brackets/hash/aspas no corpo (não conta)", () => {
    // Um `run: |` com shell contendo [], {}, # e aspas desbalanceadas NÃO pode falhar o lint.
    const y = 'steps:\n  - run: |\n      if [ -f x ]; then echo "a # b {c"; fi\n  - name: ok\n';
    expect(yamlLint(y)).toBeNull();
  });

  it("aceita hash dentro de string (cor hex)", () => {
    expect(yamlLint('- name: bug\n  color: "#1d76db"\n')).toBeNull();
  });

  it("aceita flow-collection multi-linha balanceada", () => {
    expect(yamlLint("on:\n  push:\n    branches: [\n      main,\n      dev,\n    ]\n")).toBeNull();
  });

  it("rejeita vazio", () => {
    expect(yamlLint("   \n  ")).toBe("vazio");
  });

  it("rejeita TAB de indentação", () => {
    expect(yamlLint("jobs:\n\tbuild: x\n")).toMatch(/TAB/);
  });

  it("rejeita flow-collection não fechada (o caso do Codex)", () => {
    expect(yamlLint("labels:\n  extra: [unterminated\n")).toMatch(/não fechada|desbalanceada/);
  });

  it("rejeita fechamento sem abertura", () => {
    expect(yamlLint("x: manifest]\n")).toMatch(/desbalanceada/);
  });
});

describe("detectSecret", () => {
  // Fixtures montados por concatenação para NÃO plantar um segredo contíguo no arquivo versionado
  // (senão o próprio gitleaks acusa o repo — mesma técnica de fragmentação do smoke-test.sh).
  const aws = "AKIA" + "IOSFODNN7EXAMPLE";
  const ghp = "ghp_" + "012345678901234567890123456789abcdef";
  const generic = 'api_key = "' + "supersecretvalue123" + '"';
  it("detecta AWS/GitHub/api_key", () => {
    expect(detectSecret("AWS_KEY=" + aws)).toBe(true);
    expect(detectSecret("t=" + ghp)).toBe(true);
    expect(detectSecret(generic)).toBe(true);
  });
  it("não acusa texto limpo", () => {
    expect(detectSecret("nada de segredo aqui\nfoo: bar\n")).toBe(false);
  });
});

describe("template SDD", () => {
  it("extrai labels e detecta campos faltantes", () => {
    const yml = 'body:\n  - attributes:\n      label: Contexto\n  - attributes:\n      label: "Objetivo"\n';
    const labels = extractSddLabels(yml);
    expect(labels).toContain("contexto");
    expect(labels).toContain("objetivo");
    const miss = missingSddFields(labels);
    expect(miss).toContain("Critérios de aceite");
    expect(miss).toContain("classe de confiança");
  });
});

describe("walkFiles — não segue symlinks", () => {
  it("ignora symlink de diretório (não escapa do repo)", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-"));
    mkdirSync(join(root, "sub"));
    writeFileSync(join(root, "sub", "a.txt"), "x");
    writeFileSync(join(root, "top.md"), "x");
    // symlink de diretório apontando para fora (/): não pode ser seguido.
    symlinkSync("/", join(root, "escape"));
    const files = walkFiles(root);
    expect(files).toContain("top.md");
    expect(files).toContain("sub/a.txt");
    // nenhum caminho vindo do symlink "escape/..."
    expect(files.some((f) => f.startsWith("escape/"))).toBe(false);
  });
});

describe("runStaticCheck", () => {
  it("repo real (cwd) está íntegro — 0 erros", () => {
    // Roda a checagem contra o próprio repositório: é a e2e da camada estática.
    expect(runStaticCheck(process.cwd())).toEqual([]);
  });

  it("morde: YAML quebrado no template + link .md quebrado são reportados", () => {
    const root = mkdtempSync(join(tmpdir(), "static-"));
    mkdirSync(join(root, ".github", "ISSUE_TEMPLATE"), { recursive: true });
    // template com bracket não fechado
    writeFileSync(join(root, ".github", "ISSUE_TEMPLATE", "sdd-task.yml"), "body:\n  bad: [oops\n");
    // md com link quebrado
    writeFileSync(join(root, "README.md"), "veja [x](./nao-existe.md)\n");
    const errs = runStaticCheck(root);
    expect(errs.some((e) => /YAML .*sdd-task\.yml/.test(e))).toBe(true);
    expect(errs.some((e) => /link quebrado/.test(e))).toBe(true);
  });
});
