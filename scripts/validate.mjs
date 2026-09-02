import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "komari-theme.json");
const distIndexPath = resolve(root, "dist", "index.html");
const distAppPath = resolve(root, "dist", "assets", "app.js");
const distRegionDataPath = resolve(root, "dist", "assets", "region-data.js");
const distWorldDataPath = resolve(root, "dist", "assets", "world-data.js");
const distCssPath = resolve(root, "dist", "assets", "styles.css");
const previewPath = resolve(root, "preview.png");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

function localizedText(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).some(entry => typeof entry === "string" && entry.trim().length > 0);
}

if (typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
  errors.push("name must be a non-empty string");
}
if (typeof manifest.short !== "string" || !/^[A-Za-z0-9_-]+$/.test(manifest.short) || manifest.short === "default") {
  errors.push("short must use only letters, digits, underscores, or hyphens and must not be default");
}
if (typeof manifest.description !== "string") errors.push("description must be a string");
if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
  errors.push("version must be a semantic version");
}
if (!localizedText(manifest.author)) errors.push("author must contain a non-empty localized value");
if (typeof manifest.url !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(manifest.url)) {
  errors.push("url must be an HTTPS GitHub repository URL");
}
if (manifest.preview !== "preview.png") errors.push("preview must be preview.png");
if (manifest.configuration?.type !== "managed") errors.push("configuration.type must be managed");
if (!Array.isArray(manifest.configuration?.data)) errors.push("configuration.data must be an array");

const allowedTypes = new Set(["string", "number", "select", "switch", "title", "textbox", "richtext", "nodes", "pingtasks"]);
const keys = new Set();
for (const [index, item] of (manifest.configuration?.data || []).entries()) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`configuration.data[${index}] must be an object`);
    continue;
  }
  if (!allowedTypes.has(item.type)) errors.push(`configuration.data[${index}].type is not supported`);
  if (item.type === "title") {
    if (!localizedText(item.name)) errors.push(`configuration.data[${index}].name is required for title`);
    continue;
  }
  if (typeof item.key !== "string" || item.key.length === 0) errors.push(`configuration.data[${index}].key is required`);
  else if (keys.has(item.key)) errors.push(`configuration key is duplicated: ${item.key}`);
  else keys.add(item.key);
  if (!localizedText(item.name)) errors.push(`configuration.data[${index}].name is required`);
  if (item.type === "select" && (typeof item.options !== "string" || item.options.length === 0)) {
    errors.push(`configuration.data[${index}].options is required for select`);
  }
}

for (const file of [distIndexPath, distAppPath, distRegionDataPath, distWorldDataPath, distCssPath, previewPath]) {
  try { await access(file); } catch { errors.push(`required file is missing: ${file.slice(root.length + 1)}`); }
}

let indexHtml = "";
let appSource = "";
let cssSource = "";
let worldDataSource = "";
try { indexHtml = await readFile(distIndexPath, "utf8"); } catch { /* reported above */ }
try { appSource = await readFile(distAppPath, "utf8"); } catch { /* reported above */ }
try { cssSource = await readFile(distCssPath, "utf8"); } catch { /* reported above */ }
try { worldDataSource = await readFile(distWorldDataPath, "utf8"); } catch { /* reported above */ }

if (!indexHtml.includes("<title>Komari Monitor</title>")) errors.push("dist/index.html must contain the exact Komari title replacement token");
if (!indexHtml.includes("A simple server monitor tool.")) errors.push("dist/index.html must contain the exact Komari description replacement token");
if (!indexHtml.includes('src="/assets/app.js"')) errors.push("dist/index.html must load /assets/app.js");
if (!indexHtml.includes('id="globe-portal"')) errors.push("dist/index.html must provide #globe-portal");
if (!indexHtml.includes('href="/assets/styles.css"')) errors.push("dist/index.html must load /assets/styles.css");
if (!indexHtml.includes('viewport-fit=cover, interactive-widget=resizes-content')) {
  errors.push("dist/index.html must keep the mobile safe-area and keyboard-aware viewport settings");
}
if (!indexHtml.includes('<meta name="format-detection" content="telephone=no"')) {
  errors.push("dist/index.html must disable automatic telephone-number detection");
}
if (/(?:src|href)=["']https?:\/\//i.test(indexHtml)) errors.push("dist/index.html must not load remote scripts or styles");
if (appSource.includes("__THEME_VERSION__")) errors.push("dist/assets/app.js still contains an unreplaced version token");
if (!appSource.includes(`const THEME_VERSION = "${manifest.version}"`)) errors.push("dist/assets/app.js version does not match komari-theme.json");
if (!appSource.includes('from "./region-data.js"')) errors.push("dist/assets/app.js must import the bundled region data");
if (!appSource.includes('from "./world-data.js"')) errors.push("dist/assets/app.js must import the bundled world land data");
if (appSource.includes("renderPerformancePanel")) errors.push("Top Performance panel implementation must not be present");
if (appSource.includes("highPerformance")) errors.push("Redundant performance summary must not be present");
if (worldDataSource.includes("export const REGION_COORDS")) errors.push("world-data.js must not duplicate REGION_COORDS from region-data.js");

const requiredMobileAppTokens = [
  'const MOBILE_LAYOUT_QUERY = "(max-width: 720px), (max-width: 900px) and (orientation: landscape) and (max-height: 520px)";',
  'const MOBILE_GLOBE_QUERY = "(max-width: 680px), (max-width: 900px) and (orientation: landscape) and (max-height: 520px)";',
  'function centerSelectedGlobeRegion(code',
  'function captureRenderContinuity()',
  'function restoreRenderContinuity(snapshot)',
  'aria-current="page"',
  'enterkeyhint="search"',
  'has-mobile-overlay',
  'function handleDrawerPointerDown(event)',
  'function updateMobileNavVisibility()',
  'function updateMobileInputState()',
  'window.visualViewport?.addEventListener("resize", scheduleMobileInputState',
  'let spinVelocity = 0;',
  'const hasMomentum = !reducedMotion',
  'mobile-search-active',
  'searchCompact',
];
for (const token of requiredMobileAppTokens) {
  if (!appSource.includes(token)) errors.push(`dist/assets/app.js is missing mobile contract token: ${token}`);
}

const requiredMobileCssTokens = [
  '.app-shell.view-nodes .status-ribbon',
  '.app-shell.has-mobile-overlay .mobile-bottom-nav',
  '@media (max-width: 900px) and (orientation: landscape) and (max-height: 520px)',
  'bottom: calc(8px + env(safe-area-inset-bottom))',
  'scroll-snap-type: x mandatory',
  '.node-drawer.is-dragging',
  '.app-shell.mobile-nav-hidden .mobile-bottom-nav',
  ':root.mobile-input-focused .mobile-bottom-nav',
  '--drawer-drag-y',
  '@media (max-width: 720px) and (max-height: 650px) and (orientation: portrait)',
  '@media (max-width: 380px) and (max-height: 600px) and (orientation: portrait)',
];
for (const token of requiredMobileCssTokens) {
  if (!cssSource.includes(token)) errors.push(`dist/assets/styles.css is missing mobile contract token: ${token}`);
}

if (errors.length > 0) {
  console.error("Theme validation failed:\n" + errors.map(error => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Validated Komari Butterfly ${manifest.version}`);
console.log(`Configuration keys: ${keys.size}`);
console.log("Package contract: komari-theme.json + preview.png + dist/index.html");
