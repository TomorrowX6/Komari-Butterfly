import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const command = process.platform === "win32" ? "powershell.exe" : "bash";
const args = process.platform === "win32"
  ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(import.meta.dirname, "package.ps1")]
  : [resolve(import.meta.dirname, "package.sh")];

const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
