import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const hash = process.argv[2]?.trim();
if (!/^[0-9a-f]{64}$/.test(hash || "")) {
  throw new Error("Usage: node scripts/sync-release-metadata.mjs <sha256>");
}

const manifestPath = resolve(root, "komari-theme.json");
const marketEntryPath = resolve(root, "docs", "theme-market-entry.json");
const marketPrPath = resolve(root, "docs", "theme-market-pr.md");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = JSON.parse(await readFile(marketEntryPath, "utf8"));
const version = manifest.version;

if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("komari-theme.json contains an invalid version");
}

entry.version = version;
entry.download = `https://github.com/TomorrowX6/Komari-Butterfly/releases/download/v${version}/komari-butterfly-v${version}.zip`;
entry.sha256 = hash;
await writeFile(marketEntryPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");

const originalPr = await readFile(marketPrPath, "utf8");
const versionLine = /^- Version: `[^`]+`$/m;
const hashLine = /^Release SHA256: `[0-9a-f]+`$/m;
if (!versionLine.test(originalPr)) {
  throw new Error("docs/theme-market-pr.md is missing the exact version line");
}
if (!hashLine.test(originalPr)) {
  throw new Error("docs/theme-market-pr.md is missing the exact release SHA256 line");
}
const updatedPr = originalPr
  .replace(versionLine, `- Version: \`${version}\``)
  .replace(hashLine, `Release SHA256: \`${hash}\``);
await writeFile(marketPrPath, updatedPr, "utf8");

console.log(`Synchronized market metadata for v${version}: ${hash}`);
