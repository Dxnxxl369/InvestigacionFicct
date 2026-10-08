import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const dependencyNames = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
].sort();

const blockedLicensePattern = /\b(A?GPL|LGPL)\b/i;
const permissiveAlternativePattern = /\b(MIT|Apache-?2\.0|BSD-?2-Clause|BSD-?3-Clause|ISC|0BSD|CC0-?1\.0|Unlicense|Zlib)\b/i;
const missingPackages = [];
const blockedPackages = [];
const inspected = [];
const inspectedKeys = new Set();

function packageManifestPath(packageName) {
  return path.join(root, "node_modules", ...packageName.split("/"), "package.json");
}

function inspectManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const packageName = manifest.name || path.basename(path.dirname(manifestPath));
  const packageVersion = manifest.version || "0.0.0";
  const packageKey = `${packageName}@${packageVersion}`;
  if (inspectedKeys.has(packageKey)) return;
  inspectedKeys.add(packageKey);
  const licenseValue = Array.isArray(manifest.license)
    ? manifest.license.join(" OR ")
    : String(manifest.license || "UNKNOWN");

  inspected.push({ packageName, version: packageVersion, license: licenseValue });

  if (isBlockedLicense(licenseValue)) {
    blockedPackages.push({ packageName, version: packageVersion, license: licenseValue });
  }
}

function isBlockedLicense(licenseValue) {
  if (!blockedLicensePattern.test(licenseValue)) return false;
  const normalized = licenseValue.replace(/[()]/g, " ");
  const hasAlternative = /\bOR\b/i.test(normalized);
  return !(hasAlternative && permissiveAlternativePattern.test(normalized));
}

function collectInstalledManifests(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return;
  for (const entry of fs.readdirSync(nodeModulesPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".bin") continue;
    const entryPath = path.join(nodeModulesPath, entry.name);
    if (entry.name.startsWith("@")) {
      for (const scopedEntry of fs.readdirSync(entryPath, { withFileTypes: true })) {
        if (!scopedEntry.isDirectory()) continue;
        collectPackage(path.join(entryPath, scopedEntry.name));
      }
      continue;
    }
    collectPackage(entryPath);
  }
}

function collectPackage(packagePath) {
  const manifestPath = path.join(packagePath, "package.json");
  if (fs.existsSync(manifestPath)) inspectManifest(manifestPath);
  collectInstalledManifests(path.join(packagePath, "node_modules"));
}

for (const packageName of dependencyNames) {
  const manifestPath = packageManifestPath(packageName);
  if (!fs.existsSync(manifestPath)) {
    missingPackages.push(packageName);
  }
}

if (missingPackages.length) {
  console.error("No se pudieron revisar licencias porque faltan paquetes instalados:");
  missingPackages.forEach((packageName) => console.error(`- ${packageName}`));
  console.error("Ejecuta la instalacion de dependencias antes de correr este chequeo.");
  process.exit(1);
}

collectInstalledManifests(path.join(root, "node_modules"));

if (blockedPackages.length) {
  console.error("Dependencias con licencia copyleft fuerte detectadas:");
  blockedPackages.forEach(({ packageName, version, license }) => console.error(`- ${packageName}@${version}: ${license}`));
  console.error("Revisar licencia comercial o reemplazo permisivo antes de vender el producto.");
  process.exit(1);
}

console.log(`Licencias frontend revisadas: ${inspected.length} paquetes instalados sin AGPL/GPL/LGPL.`);
