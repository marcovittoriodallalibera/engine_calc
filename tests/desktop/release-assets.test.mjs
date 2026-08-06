import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { preparePreviewRelease, validatePreviewTag } from "../../scripts/prepare-preview-release.mjs";

const VERSION = "0.1.0";
const TAG = "v0.1.0-preview.1";
const SOURCE_COMMIT = "1234567890abcdef1234567890abcdef12345678";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function smoke(platform, architecture) {
  return {
    ok: true,
    packaged: true,
    platform,
    architecture,
    checks: { packagedOrigin: true, deterministicCalculation: true },
  };
}

async function writeTarget({ root, directory, binaries, manifest }) {
  const targetDirectory = path.join(root, directory);
  await mkdir(targetDirectory, { recursive: true });
  const artefacts = [];
  for (const [file, content] of Object.entries(binaries)) {
    const bytes = Buffer.from(content);
    await writeFile(path.join(targetDirectory, file), bytes);
    artefacts.push({ file, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  const checksumName = directory === "windows" ? "SHA256SUMS.txt" : `SHA256SUMS-${directory}.txt`;
  await writeFile(
    path.join(targetDirectory, checksumName),
    `${artefacts.map((entry) => `${entry.sha256}  ${entry.file}`).join("\n")}\n`,
  );
  await writeFile(
    path.join(targetDirectory, manifest.file),
    `${JSON.stringify({
      schemaVersion: 1,
      sourceCommit: SOURCE_COMMIT,
      applicationVersion: VERSION,
      dependencyAudit: "passed",
      signingPolicy: { ...manifest.signingPolicy, publicPromotionEligible: false },
      target: manifest.target,
      signature: manifest.signature,
      signatures: manifest.signatures,
      fuses: { ok: true, checks: [{ ok: true }] },
      artefacts,
      ...manifest.extra,
    })}\n`,
  );
}

async function createFixture(root) {
  const windowsFiles = {
    "Phase-360-Setup-0.1.0-x64.exe": "windows installer",
    "Phase-360-Portable-0.1.0-x64.exe": "windows portable",
  };
  await writeTarget({
    root,
    directory: "windows",
    binaries: windowsFiles,
    manifest: {
      file: "windows-verification.json",
      signingPolicy: { expected: "NotSigned" },
      target: { platform: "win32", architecture: "x64", runnerImage: "windows", runnerVersion: "1" },
      signatures: [
        ...Object.keys(windowsFiles).map((file) => ({ file, status: "NotSigned" })),
        { file: "Phase 360.exe", status: "NotSigned" },
      ],
      extra: {
        smoke: {
          winUnpacked: smoke("win32", "x64"),
          portable: smoke("win32", "x64"),
          installed: smoke("win32", "x64"),
          installerUninstalled: true,
        },
      },
    },
  });

  for (const architecture of ["arm64", "x64"]) {
    await writeTarget({
      root,
      directory: `macos-${architecture}`,
      binaries: {
        [`Phase-360-0.1.0-macOS-${architecture}.dmg`]: `${architecture} dmg`,
        [`Phase-360-0.1.0-macOS-${architecture}.zip`]: `${architecture} zip`,
      },
      manifest: {
        file: `macos-verification-${architecture}.json`,
        signingPolicy: { expected: "unsigned" },
        target: {
          platform: "darwin",
          architecture,
          nativeArchitecture: architecture === "x64" ? "x86_64" : "arm64",
          runnerImage: "macos",
          runnerVersion: "1",
        },
        signature: {
          classification: "ad-hoc",
          developerId: false,
          teamIdentifier: "not set",
          hardenedRuntime: false,
          applicationGatekeeperAccepted: false,
          diskImageGatekeeperAccepted: false,
          applicationNotaryTicket: false,
          diskImageNotaryTicket: false,
        },
        extra: {
          packaging: {
            dmgIntegrityVerified: true,
            dmgApplicationsLinkVerified: true,
            packagedBundlesMatch: true,
            bundleManifest: { sha256: "a".repeat(64) },
          },
          bundle: {
            architectures: [architecture === "x64" ? "x86_64" : "arm64"],
            machOBinaries: [
              {
                architectures: [architecture === "x64" ? "x86_64" : "arm64"],
                codesignStatus: 0,
                developerId: false,
                teamIdentifier: "not set",
                hardenedRuntime: false,
                getTaskAllow: false,
              },
            ],
          },
          smoke: {
            unpacked: smoke("darwin", architecture),
            dmg: smoke("darwin", architecture),
            zip: smoke("darwin", architecture),
          },
        },
      },
    });
  }
}

test("prepares a release only from matching verified target records", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "phase360-release-"));
  const inputRoot = path.join(root, "input");
  const outputDirectory = path.join(root, "output");
  try {
    await createFixture(inputRoot);
    const result = await preparePreviewRelease({
      inputRoot,
      outputDirectory,
      version: VERSION,
      tag: TAG,
      sourceCommit: SOURCE_COMMIT,
      generatedAt: "2026-08-06T00:00:00.000Z",
    });

    assert.equal(result.evidence.trustedPublicRelease, false);
    assert.equal(result.evidence.assets.length, 6);
    assert.equal(result.outputFiles.length, 14);
    const consolidated = await readFile(path.join(outputDirectory, "SHA256SUMS-release.txt"), "utf8");
    assert.match(consolidated, /Phase-360-Setup-0\.1\.0-x64\.exe/u);
    assert.match(consolidated, /Phase-360-0\.1\.0-macOS-arm64\.dmg/u);
    assert.match(consolidated, /Phase-360-0\.1\.0-macOS-x64\.zip/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a package changed after native verification", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "phase360-release-"));
  const inputRoot = path.join(root, "input");
  const outputDirectory = path.join(root, "output");
  try {
    await createFixture(inputRoot);
    await writeFile(
      path.join(inputRoot, "macos-arm64", "Phase-360-0.1.0-macOS-arm64.dmg"),
      "tampered",
    );
    await assert.rejects(
      preparePreviewRelease({
        inputRoot,
        outputDirectory,
        version: VERSION,
        tag: TAG,
        sourceCommit: SOURCE_COMMIT,
      }),
      /manifest hash/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts numbered preview tags and rejects stable or mismatched tags", () => {
  assert.equal(validatePreviewTag("v0.1.0-preview.2", "0.1.0"), true);
  assert.throws(() => validatePreviewTag("v0.1.0", "0.1.0"), /does not match/u);
  assert.throws(() => validatePreviewTag("v0.2.0-preview.1", "0.1.0"), /does not match/u);
});
