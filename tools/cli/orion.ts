#!/usr/bin/env node
// orion.ts — entrypoint do CLI `orion` (O16.4 / Issue #366; ADR-0047 decisão 2). Fatia 4a: entrypoint LOCAL em
// TypeScript, rodado no central por type stripping — sem `bin` oficial nem `dist/` (esses entram na 4c,
// ADR-0048). Um único subcomando nesta tarefa:
//   orion validate   executa as checagens do smoke-test (scripts/smoke-test.sh do PACOTE) contra a raiz do
//                    PROJETO e sai com o mesmo código.
// Contrato de processo (ADR-0047): exit 0 = ok; o código do smoke-test em `validate`; 2 = uso inválido.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import process from "node:process";
import { resolvePackageRoot, resolveProjectRoot } from "./roots.ts";

export const USAGE = `uso: orion <comando>

comandos:
  validate   roda as checagens do harness (smoke-test) contra o projeto
  help       mostra esta ajuda`;

export interface Runner {
  (cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): number;
}

const spawnRunner: Runner = (cmd, args, opts) => {
  const r = spawnSync(cmd, args, { cwd: opts.cwd, env: opts.env, stdio: "inherit" });
  if (r.error) {
    console.error(`orion: falha ao executar ${cmd}: ${r.error.message}`);
    return 1;
  }
  return r.status ?? 1;
};

/** Executa o CLI e devolve o código de saída. Raízes e runner são injetáveis para teste. */
export function main(
  argv: string[],
  deps: {
    packageRoot?: string;
    projectRoot?: string;
    run?: Runner;
    out?: (s: string) => void;
    err?: (s: string) => void;
  } = {},
): number {
  const out = deps.out ?? ((s) => console.log(s));
  const err = deps.err ?? ((s) => console.error(s));
  const [cmd, ...rest] = argv;
  if (cmd === undefined) {
    out(USAGE);
    return 2;
  }
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    // Argumento a mais é uso inválido (sai 2), como no `validate` — Codex #393.
    if (rest.length > 0) {
      err(`orion ${cmd}: argumento inesperado: ${rest.join(" ")}\n\n${USAGE}`);
      return 2;
    }
    out(USAGE);
    return 0;
  }
  if (cmd === "validate") {
    if (rest.length > 0) {
      err(`orion validate: argumento inesperado: ${rest.join(" ")}\n\n${USAGE}`);
      return 2;
    }
    const packageRoot = deps.packageRoot ?? resolvePackageRoot();
    const projectRoot = deps.projectRoot ?? resolveProjectRoot();
    const run = deps.run ?? spawnRunner;
    return run("bash", [join(packageRoot, "scripts/smoke-test.sh")], {
      cwd: projectRoot,
      env: { ...process.env, ORION_PROJECT_ROOT: projectRoot },
    });
  }
  err(`orion: comando desconhecido: ${cmd}\n\n${USAGE}`);
  return 2;
}

if (process.argv[1]?.endsWith("orion.ts")) process.exit(main(process.argv.slice(2)));
