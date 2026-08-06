import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WINDOWS_BINARIES = [
  "Phase-360-Setup-0.1.0-x64.exe",
  "Phase-360-Portable-0.1.0-x64.exe",
];

function macBinaries(version, architecture) {
  return [
    `Phase-360-${version}-macOS-${architecture}.dmg`,
    `Phase-360-${version}-macOS-${architecture}.zip`,
  ];
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid argument near '${key ?? "end of input"}'.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function parseChecksums(text, label) {
  const entries = new Map();
  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([a-fA-F0-9]{64})\s{2}(.+)$/u);
    if (!match) throw new Error(`${label} contains an invalid checksum line.`);
    if (entries.has(match[2])) throw new Error(`${label} repeats '${match[2]}'.`);
    entries.set(match[2], match[1].toLowerCase());
  }
  return entries;
}

async function digestFile(filePath) {
  const bytes = await readFile(filePath);
  return {
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be '${expected}', received '${actual}'.`);
  }
}

function requireNonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function validateFuses(fuses, label) {
  requireEqual(fuses?.ok, true, `${label} fuse summary`);
  if (!Array.isArray(fuses?.checks) || fuses.checks.length === 0) {
    throw new Error(`${label} fuse checks are incomplete.`);
  }
  if (fuses.checks.some((check) => check.ok !== true)) {
    throw new Error(`${label} contains a failed fuse check.`);
  }
}

function validateSmoke(report, platform, architecture, label) {
  requireEqual(report?.ok, true, `${label} result`);
  requireEqual(report?.packaged, true, `${label} packaged state`);
  requireEqual(report?.platform, platform, `${label} platform`);
  requireEqual(report?.architecture, architecture, `${label} architecture`);
  if (!report.checks || Object.values(report.checks).some((check) => check !== true)) {
    throw new Error(`${label} contains a failed or missing check.`);
  }
}

function artefactMap(manifest, label) {
  if (!Array.isArray(manifest.artefacts)) {
    throw new Error(`${label} has no artefact list.`);
  }
  const entries = new Map();
  for (const entry of manifest.artefacts) {
    if (entries.has(entry.file)) throw new Error(`${label} repeats artefact '${entry.file}'.`);
    entries.set(entry.file, entry);
  }
  return entries;
}

function validateManifestIdentity({ manifest, label, version, sourceCommit }) {
  requireEqual(manifest.schemaVersion, 1, `${label} schema version`);
  requireEqual(manifest.applicationVersion, version, `${label} application version`);
  requireEqual(manifest.sourceCommit, sourceCommit, `${label} source commit`);
  requireEqual(manifest.dependencyAudit, "passed", `${label} dependency audit`);
  requireNonEmpty(manifest.target?.runnerImage, `${label} runner image`);
  requireNonEmpty(manifest.target?.runnerVersion, `${label} runner version`);
  requireEqual(
    manifest.signingPolicy?.publicPromotionEligible,
    false,
    `${label} public promotion eligibility`,
  );
}

function validateWindowsManifest(manifest, binaryNames) {
  requireEqual(manifest.target?.platform, "win32", "Windows target platform");
  requireEqual(manifest.target?.architecture, "x64", "Windows target architecture");
  requireEqual(manifest.signingPolicy?.expected, "NotSigned", "Windows signature expectation");
  if (!Array.isArray(manifest.signatures) || manifest.signatures.length !== binaryNames.length + 1) {
    throw new Error("Windows signature evidence is incomplete.");
  }
  if (manifest.signatures.some((entry) => entry.status !== "NotSigned")) {
    throw new Error("Windows signature evidence contains an unexpected status.");
  }
  for (const file of binaryNames) {
    const records = manifest.signatures.filter((entry) => entry.file === file);
    requireEqual(records.length, 1, `Windows signature record count for ${file}`);
    requireEqual(records[0].status, "NotSigned", `Windows signature for ${file}`);
  }
  const unpackedRecords = manifest.signatures.filter((entry) => entry.file === "Phase 360.exe");
  requireEqual(unpackedRecords.length, 1, "Windows unpacked signature record count");
  validateFuses(manifest.fuses, "Windows");
  validateSmoke(manifest.smoke?.winUnpacked, "win32", "x64", "Windows unpacked smoke");
  validateSmoke(manifest.smoke?.portable, "win32", "x64", "Windows portable smoke");
  validateSmoke(manifest.smoke?.installed, "win32", "x64", "Windows installed smoke");
  requireEqual(manifest.smoke?.installerUninstalled, true, "Windows uninstall result");
}

function validateMacManifest(manifest, architecture) {
  requireEqual(manifest.signingPolicy?.expected, "unsigned", `${architecture} signature expectation`);
  requireEqual(manifest.target?.platform, "darwin", `${architecture} target platform`);
  requireEqual(manifest.target?.architecture, architecture, `${architecture} target architecture`);
  requireEqual(
    manifest.target?.nativeArchitecture,
    architecture === "x64" ? "x86_64" : "arm64",
    `${architecture} native architecture`,
  );
  requireEqual(manifest.signature?.classification, "ad-hoc", `${architecture} signature`);
  requireEqual(manifest.signature?.developerId, false, `${architecture} Developer ID state`);
  requireEqual(manifest.signature?.teamIdentifier, "not set", `${architecture} Team ID`);
  requireEqual(manifest.signature?.codesignDisplayStatus, 0, `${architecture} codesign display`);
  requireEqual(manifest.signature?.codesignVerificationStatus, 0, `${architecture} codesign verification`);
  requireEqual(manifest.signature?.hardenedRuntime, false, `${architecture} hardened runtime`);
  requireEqual(
    manifest.signature?.applicationGatekeeperAccepted,
    false,
    `${architecture} application Gatekeeper acceptance`,
  );
  requireEqual(
    manifest.signature?.diskImageGatekeeperAccepted,
    false,
    `${architecture} disk image Gatekeeper acceptance`,
  );
  requireEqual(
    manifest.signature?.applicationNotaryTicket,
    false,
    `${architecture} application notary ticket`,
  );
  requireEqual(
    manifest.signature?.diskImageNotaryTicket,
    false,
    `${architecture} disk image notary ticket`,
  );
  requireEqual(manifest.packaging?.dmgIntegrityVerified, true, `${architecture} DMG integrity`);
  requireEqual(
    manifest.packaging?.dmgApplicationsLinkVerified,
    true,
    `${architecture} Applications link`,
  );
  requireEqual(
    manifest.packaging?.packagedBundlesMatch,
    true,
    `${architecture} bundle equivalence`,
  );
  requireNonEmpty(manifest.packaging?.bundleManifest?.sha256, `${architecture} bundle hash`);

  const machineArchitecture = architecture === "x64" ? "x86_64" : "arm64";
  if (
    !Array.isArray(manifest.bundle?.architectures) ||
    manifest.bundle.architectures.length !== 1 ||
    manifest.bundle.architectures[0] !== machineArchitecture
  ) {
    throw new Error(`${architecture} bundle architecture evidence is invalid.`);
  }
  if (!Array.isArray(manifest.bundle?.machOBinaries) || manifest.bundle.machOBinaries.length === 0) {
    throw new Error(`${architecture} Mach-O evidence is incomplete.`);
  }
  for (const binary of manifest.bundle.machOBinaries) {
    if (
      !Array.isArray(binary.architectures) ||
      binary.architectures.length !== 1 ||
      binary.architectures[0] !== machineArchitecture ||
      binary.codesignStatus !== 0 ||
      binary.adHoc !== true ||
      binary.developerId !== false ||
      binary.teamIdentifier !== "not set" ||
      binary.hardenedRuntime !== false ||
      binary.getTaskAllow !== false
    ) {
      throw new Error(`${architecture} Mach-O evidence is inconsistent.`);
    }
  }
  validateFuses(manifest.fuses, `macOS ${architecture}`);
  validateSmoke(manifest.smoke?.unpacked, "darwin", architecture, `${architecture} unpacked smoke`);
  validateSmoke(manifest.smoke?.dmg, "darwin", architecture, `${architecture} DMG smoke`);
  validateSmoke(manifest.smoke?.zip, "darwin", architecture, `${architecture} ZIP smoke`);
}

async function validateAndCopyTarget({
  sourceDirectory,
  outputDirectory,
  checksumSourceName,
  checksumOutputName,
  manifestName,
  binaryNames,
  version,
  sourceCommit,
  validateTarget,
}) {
  const manifestPath = path.join(sourceDirectory, manifestName);
  const checksumPath = path.join(sourceDirectory, checksumSourceName);
  const manifest = parseJson(await readFile(manifestPath, "utf8"), manifestName);
  const checksums = parseChecksums(await readFile(checksumPath, "utf8"), checksumSourceName);

  validateManifestIdentity({ manifest, label: manifestName, version, sourceCommit });
  validateTarget(manifest, binaryNames);

  const recordedArtefacts = artefactMap(manifest, manifestName);
  if (recordedArtefacts.size !== binaryNames.length) {
    throw new Error(`${manifestName} contains unexpected artefact records.`);
  }
  const assets = [];
  for (const file of binaryNames) {
    const sourcePath = path.join(sourceDirectory, file);
    const actual = await digestFile(sourcePath);
    const recorded = recordedArtefacts.get(file);
    if (!recorded) throw new Error(`${manifestName} does not record '${file}'.`);
    requireEqual(recorded.sha256, actual.sha256, `${file} manifest hash`);
    requireEqual(recorded.bytes, actual.bytes, `${file} manifest byte size`);
    requireEqual(checksums.get(file), actual.sha256, `${file} checksum`);
    await copyFile(sourcePath, path.join(outputDirectory, file));
    assets.push({ file, ...actual });
  }

  if (checksums.size !== binaryNames.length) {
    throw new Error(`${checksumSourceName} contains unexpected entries.`);
  }

  await copyFile(manifestPath, path.join(outputDirectory, manifestName));
  await copyFile(checksumPath, path.join(outputDirectory, checksumOutputName));
  return assets;
}

export async function preparePreviewRelease({
  inputRoot,
  outputDirectory,
  version,
  tag,
  sourceCommit,
  generatedAt = new Date().toISOString(),
}) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error("Version must use x.y.z format.");
  validatePreviewTag(tag, version);
  if (!/^[a-f0-9]{40}$/u.test(sourceCommit)) throw new Error("Source commit must be a full SHA-1.");

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const windowsBinaries = WINDOWS_BINARIES.map((file) => file.replace("0.1.0", version));
  const assets = [
    ...(await validateAndCopyTarget({
      sourceDirectory: path.join(inputRoot, "windows"),
      outputDirectory,
      checksumSourceName: "SHA256SUMS.txt",
      checksumOutputName: "SHA256SUMS-windows-x64.txt",
      manifestName: "windows-verification.json",
      binaryNames: windowsBinaries,
      version,
      sourceCommit,
      validateTarget: validateWindowsManifest,
    })),
    ...(await validateAndCopyTarget({
      sourceDirectory: path.join(inputRoot, "macos-arm64"),
      outputDirectory,
      checksumSourceName: "SHA256SUMS-macos-arm64.txt",
      checksumOutputName: "SHA256SUMS-macos-arm64.txt",
      manifestName: "macos-verification-arm64.json",
      binaryNames: macBinaries(version, "arm64"),
      version,
      sourceCommit,
      validateTarget: (manifest) => validateMacManifest(manifest, "arm64"),
    })),
    ...(await validateAndCopyTarget({
      sourceDirectory: path.join(inputRoot, "macos-x64"),
      outputDirectory,
      checksumSourceName: "SHA256SUMS-macos-x64.txt",
      checksumOutputName: "SHA256SUMS-macos-x64.txt",
      manifestName: "macos-verification-x64.json",
      binaryNames: macBinaries(version, "x64"),
      version,
      sourceCommit,
      validateTarget: (manifest) => validateMacManifest(manifest, "x64"),
    })),
  ];

  assets.sort((left, right) => left.file.localeCompare(right.file));
  const consolidated = `${assets.map((asset) => `${asset.sha256}  ${asset.file}`).join("\n")}\n`;
  await writeFile(path.join(outputDirectory, "SHA256SUMS-release.txt"), consolidated, "utf8");

  const evidence = {
    schemaVersion: 1,
    releaseType: "public-unsigned-preview",
    trustedPublicRelease: false,
    version,
    tag,
    sourceCommit,
    generatedAtUtc: generatedAt,
    warnings: {
      windows: "Unsigned. Microsoft SmartScreen may warn and no authorised publisher identity is present.",
      macos: "Ad-hoc signed and not notarised. Gatekeeper may block the application and no authorised publisher identity is present.",
    },
    assets,
  };
  await writeFile(
    path.join(outputDirectory, "RELEASE-EVIDENCE.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  const outputFiles = await Promise.all(
    [
      ...assets.map((asset) => asset.file),
      "SHA256SUMS-windows-x64.txt",
      "SHA256SUMS-macos-arm64.txt",
      "SHA256SUMS-macos-x64.txt",
      "SHA256SUMS-release.txt",
      "windows-verification.json",
      "macos-verification-arm64.json",
      "macos-verification-x64.json",
      "RELEASE-EVIDENCE.json",
    ].map(async (file) => ({ file, bytes: (await stat(path.join(outputDirectory, file))).size })),
  );

  return { evidence, outputFiles };
}

export function validatePreviewTag(tag, version) {
  const escapedVersion = version.replaceAll(".", "\\.");
  if (!new RegExp(`^v${escapedVersion}-preview\\.[1-9]\\d*$`, "u").test(tag)) {
    throw new Error(`Tag '${tag}' does not match version ${version}.`);
  }
  return true;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
async function runCommandLine() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  const required = ["input-root", "output-dir", "version", "tag", "source-commit"];
  for (const key of required) {
    if (!argumentsMap[key]) throw new Error(`Missing --${key}.`);
  }
  const result = await preparePreviewRelease({
    inputRoot: path.resolve(argumentsMap["input-root"]),
    outputDirectory: path.resolve(argumentsMap["output-dir"]),
    version: argumentsMap.version,
    tag: argumentsMap.tag,
    sourceCommit: argumentsMap["source-commit"],
  });
  process.stdout.write(
    `Prepared ${result.outputFiles.length} verified preview release files for ${result.evidence.tag}.\n`,
  );
}

if (invokedPath === import.meta.url) {
  runCommandLine().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const annotation = message
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    process.stderr.write(`::error title=Preview release reconciliation failed::${annotation}\n`);
    process.exitCode = 1;
  });
}
