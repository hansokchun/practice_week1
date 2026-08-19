import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const workflow = resolve(import.meta.dirname, "..", "maestro", "explore-smoke.yaml");
if (!existsSync(workflow)) {
  console.error("[maestro] Explore smoke workflow is missing.");
  process.exit(1);
}

const result = spawnSync("maestro", ["test", workflow], { stdio: "inherit", windowsHide: true });
if (result.error !== undefined) {
  console.error("[maestro] Maestro CLI is unavailable. Install it before device QA.");
  process.exit(1);
}
process.exit(result.status ?? 1);
