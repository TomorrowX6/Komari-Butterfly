import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceDir = resolve(root, "src");
const outputDir = resolve(root, "dist");
const manifestPath = resolve(root, "komari-theme.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (typeof manifest.version !== "string" || manifest.version.length === 0) {
  throw new Error("komari-theme.json: version must be a non-empty string");
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

const appPath = resolve(outputDir, "assets", "app.js");
const appSource = await readFile(appPath, "utf8");
if (!appSource.includes("__THEME_VERSION__")) {
  throw new Error("src/assets/app.js does not contain the __THEME_VERSION__ build token");
}
await writeFile(appPath, appSource.replaceAll("__THEME_VERSION__", manifest.version), "utf8");

console.log(`Built Komari Butterfly ${manifest.version} into dist/`);
