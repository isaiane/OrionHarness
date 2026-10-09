// roots.ts — as DUAS raízes do harness (O16.4 / Issue #366; ADR-0047). Num produto, as ferramentas moram no
// pacote instalado (sob `node_modules`) e rodam CONTRA o repositório do produto. Confundir as duas faz uma
// ferramenta validar o próprio pacote e passar verde. Por isso cada uma tem a sua função:
//   - resolvePackageRoot(): onde está o harness (schemas, manifestos, scripts) — relativa a ESTE arquivo;
//   - resolveProjectRoot(): o repositório validado — `ORION_PROJECT_ROOT`, senão a raiz git do diretório
//     de trabalho, senão o próprio diretório de trabalho.
// No repositório central as duas coincidem. A migração das ferramentas para este módulo é a fatia 4b.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Raiz do pacote do harness: dois níveis acima de `tools/cli/`. */
export function resolvePackageRoot(): string {
  return fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
}

/** Raiz do projeto validado. `env` e `cwd` são injetáveis para teste. */
export function resolveProjectRoot(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  const fromEnv = env.ORION_PROJECT_ROOT?.trim();
  if (fromEnv) return resolve(cwd, fromEnv);
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return resolve(cwd);
  }
}
