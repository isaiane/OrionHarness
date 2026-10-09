// Testes do entrypoint `orion` e das duas raízes (O16.4a / Issue #366). Provam o contrato de processo
// (códigos de saída), que `validate` roda o smoke-test do PACOTE contra a raiz do PROJETO e devolve o código
// dele, e como cada raiz é resolvida.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type Runner, USAGE, main } from "./orion.ts";
import { resolvePackageRoot, resolveProjectRoot } from "./roots.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
const quiet = { out: () => {}, err: () => {} };

describe("orion — contrato de processo", () => {
  it("sem comando: mostra o uso e sai 2", () => {
    const out: string[] = [];
    expect(main([], { ...quiet, out: (s) => out.push(s) })).toBe(2);
    expect(out.join()).toContain("orion <comando>");
  });

  it.each(["help", "--help", "-h"])("%s: mostra o uso e sai 0", (arg) => {
    expect(main([arg], quiet)).toBe(0);
  });

  it.each(["help", "--help", "-h"])("%s com argumento a mais sai 2", (arg) => {
    const err: string[] = [];
    expect(main([arg, "inesperado"], { ...quiet, err: (s) => err.push(s) })).toBe(2);
    expect(err.join()).toContain("argumento inesperado: inesperado");
  });

  it("comando desconhecido sai 2", () => {
    const err: string[] = [];
    expect(main(["deploy"], { ...quiet, err: (s) => err.push(s) })).toBe(2);
    expect(err.join()).toContain("comando desconhecido: deploy");
  });

  it("validate com argumento a mais sai 2 sem rodar nada", () => {
    let ran = false;
    const run: Runner = () => ((ran = true), 0);
    expect(main(["validate", "x"], { ...quiet, run })).toBe(2);
    expect(ran).toBe(false);
  });
});

describe("orion validate", () => {
  it("roda o smoke-test do pacote com cwd na raiz do projeto", () => {
    const calls: { cmd: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }[] = [];
    const run: Runner = (cmd, args, opts) => (calls.push({ cmd, args, ...opts }), 0);
    expect(main(["validate"], { ...quiet, run, packageRoot: "/r", projectRoot: "/r" })).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.cmd).toBe("bash");
    expect(calls[0]!.args).toEqual(["/r/scripts/smoke-test.sh"]);
    expect(calls[0]!.cwd).toBe("/r");
    expect(calls[0]!.env.ORION_PROJECT_ROOT).toBe("/r");
  });

  it("recusa (sai 2, sem rodar) quando o projeto está fora do pacote — até a 4b", () => {
    let ran = false;
    const err: string[] = [];
    const run: Runner = () => ((ran = true), 0);
    const r = main(["validate"], {
      ...quiet,
      err: (s) => err.push(s),
      run,
      packageRoot: "/pkg",
      projectRoot: "/proj",
    });
    expect(r).toBe(2);
    expect(ran).toBe(false);
    expect(err.join()).toContain("fatia 4b da #366");
  });

  it.each([0, 1, 3])("devolve o código de saída do smoke-test (%i)", (code) => {
    const run: Runner = () => code;
    expect(main(["validate"], { ...quiet, run, packageRoot: "/r", projectRoot: "/r" })).toBe(code);
  });
});

describe("raízes", () => {
  it("a raiz do pacote é a raiz deste repositório", () => {
    expect(resolvePackageRoot()).toBe(ROOT);
  });

  it("ORION_PROJECT_ROOT tem precedência e é resolvida a partir do cwd", () => {
    expect(resolveProjectRoot({ ORION_PROJECT_ROOT: "/tmp/produto" }, "/x")).toBe("/tmp/produto");
    expect(resolveProjectRoot({ ORION_PROJECT_ROOT: "produto" }, "/x")).toBe("/x/produto");
  });

  it("sem variável, usa a raiz git do diretório de trabalho", () => {
    expect(resolveProjectRoot({}, join(ROOT, "tools/cli"))).toBe(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: ROOT,
        encoding: "utf-8",
      }).trim(),
    );
  });

  it("fora de um repositório git, usa o próprio diretório", () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "orion-roots-")));
    expect(resolveProjectRoot({}, dir)).toBe(dir);
  });
});

describe("orion — processo real", () => {
  it("`node tools/cli/orion.ts help` sai 0 e imprime o uso", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--disable-warning=ExperimentalWarning",
        "--experimental-strip-types",
        "tools/cli/orion.ts",
        "help",
      ],
      { cwd: ROOT, encoding: "utf-8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(USAGE);
  });
});

describe("orion validate — runner real", () => {
  it("propaga o código de saída de um smoke-test que falha", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "orion-root-")));
    mkdirSync(join(root, "scripts"));
    writeFileSync(
      join(root, "scripts/smoke-test.sh"),
      'test "$ORION_PROJECT_ROOT" = "$PWD" || exit 9\nexit 3\n',
    );
    expect(main(["validate"], { ...quiet, packageRoot: root, projectRoot: root })).toBe(3);
  });
});
