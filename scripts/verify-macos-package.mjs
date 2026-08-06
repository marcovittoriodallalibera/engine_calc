#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readlink,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArguments(argv) {
  const options = {
    distDir: "desktop-dist",
    architecture: process.arch,
    expectedSignature: "unsigned",
    expectedTeamId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--dist-dir" && value) options.distDir = value;
    else if (flag === "--arch" && value) options.architecture = value;
    else if (flag === "--expected-signature" && value) {
      options.expectedSignature = value;
    } else if (flag === "--expected-team-id" && value) {
      options.expectedTeamId = value;
    } else {
      throw new Error(`Unknown or incomplete argument '${flag}'.`);
    }
    index += 1;
  }

  if (!["arm64", "x64"].includes(options.architecture)) {
    throw new Error("Architecture must be 'arm64' or 'x64'.");
  }
  if (!["unsigned", "developer-id"].includes(options.expectedSignature)) {
    throw new Error(
      "Expected signature must be 'unsigned' or 'developer-id'.",
    );
  }
  if (
    options.expectedSignature === "developer-id" &&
    !options.expectedTeamId
  ) {
    throw new Error(
      "A Developer ID build requires --expected-team-id for publisher verification.",
    );
  }
  return options;
}

function runCommand(
  executable,
  args,
  { allowFailure = false, timeoutMs = 120_000 } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error(
          `Command timed out: ${executable} ${args.join(" ")}`,
        ),
      );
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      const result = { status, signal, stdout, stderr };
      if (status === 0 || allowFailure) {
        resolve(result);
        return;
      }
      const output = `${stdout}\n${stderr}`.trim().slice(-4_000);
      reject(
        new Error(
          `Command failed (${status ?? signal}): ${executable} ${args.join(" ")}\n${output}`,
        ),
      );
    });
  });
}

async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(filePath);
    input.on("data", (chunk) => hash.update(chunk));
    input.once("error", reject);
    input.once("end", () => resolve(hash.digest("hex")));
  });
}

async function createBundleManifest(bundleRoot) {
  const records = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(bundleRoot, absolutePath);
      const metadata = await lstat(absolutePath);
      if (metadata.isSymbolicLink()) {
        records.push({
          path: relativePath,
          type: "symlink",
          target: await readlink(absolutePath),
        });
      } else if (metadata.isDirectory()) {
        await visit(absolutePath);
      } else if (metadata.isFile()) {
        records.push({
          path: relativePath,
          type: "file",
          bytes: metadata.size,
          mode: metadata.mode & 0o777,
          sha256: await sha256(absolutePath),
        });
      }
    }
  }

  await visit(bundleRoot);
  const serialised = JSON.stringify(records);
  return {
    sha256: createHash("sha256").update(serialised).digest("hex"),
    entries: records.length,
  };
}

async function assertPathExists(target, description) {
  try {
    await access(target);
  } catch {
    throw new Error(`Missing ${description}: '${target}'.`);
  }
}

async function readPlistValue(infoPlist, key) {
  const result = await runCommand("plutil", [
    "-extract",
    key,
    "raw",
    "-o",
    "-",
    infoPlist,
  ]);
  return result.stdout.trim();
}

async function runSmoke(executable, label, architecture, distDir) {
  const smokeSource = path.join(os.tmpdir(), "phase360-smoke-report.json");
  await rm(smokeSource, { force: true });
  await runCommand(executable, ["--smoke-test"], { timeoutMs: 120_000 });
  await assertPathExists(smokeSource, `desktop smoke report for ${label}`);

  const report = JSON.parse(await readFile(smokeSource, "utf8"));
  if (
    report.ok !== true ||
    report.packaged !== true ||
    report.platform !== "darwin" ||
    report.architecture !== architecture ||
    !report.checks ||
    Object.values(report.checks).some((value) => value !== true)
  ) {
    throw new Error(
      `Desktop smoke '${label}' reported an invalid packaged macOS result.`,
    );
  }

  const destination = path.join(
    distDir,
    `smoke-macos-${architecture}-${label}.json`,
  );
  await copyFile(smokeSource, destination);
  return report;
}

async function inspectSignature(appPath, dmgPath) {
  const display = await runCommand(
    "codesign",
    ["-dv", "--verbose=4", appPath],
    { allowFailure: true },
  );
  const verification = await runCommand(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=4", appPath],
    { allowFailure: true },
  );
  const gatekeeperStatus = await runCommand("spctl", ["--status"], {
    allowFailure: true,
  });
  const applicationGatekeeper = await runCommand(
    "spctl",
    ["--assess", "--type", "execute", "--verbose=4", appPath],
    { allowFailure: true },
  );
  const diskImageGatekeeper = await runCommand(
    "spctl",
    [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=4",
      dmgPath,
    ],
    { allowFailure: true },
  );
  const appStaple = await runCommand(
    "xcrun",
    ["stapler", "validate", appPath],
    { allowFailure: true },
  );
  const dmgStaple = await runCommand(
    "xcrun",
    ["stapler", "validate", dmgPath],
    { allowFailure: true },
  );

  const detail = `${display.stdout}\n${display.stderr}`;
  const authorities = [...detail.matchAll(/^Authority=(.+)$/gmu)].map(
    (match) => match[1].trim(),
  );
  const teamMatch = detail.match(/^TeamIdentifier=(.+)$/mu);
  const teamIdentifier = teamMatch ? teamMatch[1].trim() : null;
  const developerId = authorities.some((authority) =>
    authority.startsWith("Developer ID Application:"),
  );
  const adHoc = /Signature=adhoc/mu.test(detail);
  const unsigned =
    display.status !== 0 && /not signed at all|code object is not signed/mu.test(detail);
  const hardenedRuntime = /flags=.*\bruntime\b/mu.test(detail);
  const gatekeeperStatusOutput =
    `${gatekeeperStatus.stdout}\n${gatekeeperStatus.stderr}`.trim();
  const applicationGatekeeperOutput =
    `${applicationGatekeeper.stdout}\n${applicationGatekeeper.stderr}`.trim();
  const diskImageGatekeeperOutput =
    `${diskImageGatekeeper.stdout}\n${diskImageGatekeeper.stderr}`.trim();
  const gatekeeperPolicyActive =
    gatekeeperStatus.status === 0 &&
    !/assessments disabled|override=security disabled/iu.test(
      `${gatekeeperStatusOutput}\n${applicationGatekeeperOutput}\n${diskImageGatekeeperOutput}`,
    );

  return {
    classification: developerId
      ? "developer-id"
      : adHoc
        ? "ad-hoc"
        : unsigned
          ? "unsigned"
          : "other",
    authorities,
    teamIdentifier,
    developerId,
    hardenedRuntime,
    codesignDisplayStatus: display.status,
    codesignVerificationStatus: verification.status,
    gatekeeperPolicyActive,
    applicationGatekeeperStatus: applicationGatekeeper.status,
    applicationGatekeeperAccepted:
      applicationGatekeeper.status === 0 && gatekeeperPolicyActive,
    diskImageGatekeeperStatus: diskImageGatekeeper.status,
    diskImageGatekeeperAccepted:
      diskImageGatekeeper.status === 0 && gatekeeperPolicyActive,
    applicationNotaryTicket: appStaple.status === 0,
    diskImageNotaryTicket: dmgStaple.status === 0,
    gatekeeperStatusOutput,
    applicationGatekeeperOutput,
    diskImageGatekeeperOutput,
  };
}

function assertSignaturePolicy(signature, options, machOBinaries) {
  const notarised =
    signature.applicationNotaryTicket && signature.diskImageNotaryTicket;

  if (options.expectedSignature === "unsigned") {
    if (
      !["unsigned", "ad-hoc"].includes(signature.classification) ||
      signature.developerId ||
      (signature.teamIdentifier && signature.teamIdentifier !== "not set") ||
      signature.applicationNotaryTicket ||
      signature.diskImageNotaryTicket
    ) {
      throw new Error(
        "Expected an unsigned or ad-hoc internal candidate, but publisher or notarisation evidence was present.",
      );
    }
    return;
  }

  if (
    !signature.developerId ||
    signature.teamIdentifier !== options.expectedTeamId ||
    signature.codesignVerificationStatus !== 0 ||
    !signature.hardenedRuntime ||
    !signature.applicationGatekeeperAccepted ||
    !signature.diskImageGatekeeperAccepted ||
    !notarised ||
    machOBinaries.some(
      (binary) =>
        binary.codesignStatus !== 0 ||
        binary.developerId !== true ||
        binary.teamIdentifier !== options.expectedTeamId ||
        binary.hardenedRuntime !== true ||
        binary.getTaskAllow === true,
    )
  ) {
    throw new Error(
      "Developer ID signature, hardened runtime, expected team identity, Gatekeeper acceptance, and stapled app and DMG tickets are all required.",
    );
  }
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("The macOS package verifier must run natively on macOS.");
  }

  const options = parseArguments(process.argv.slice(2));
  const sourceCommit = (
    await runCommand("git", ["rev-parse", "HEAD"])
  ).stdout.trim();
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== sourceCommit) {
    throw new Error(
      `Checked-out commit '${sourceCommit}' does not match GITHUB_SHA '${process.env.GITHUB_SHA}'.`,
    );
  }
  const sourceStatus = (
    await runCommand("git", [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ])
  ).stdout.trim();
  if (sourceStatus) {
    throw new Error(
      `Release verification requires a clean source tree. Found:\n${sourceStatus}`,
    );
  }
  const distDir = path.resolve(projectRoot, options.distDir);
  const rootPackage = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );
  const version = rootPackage.version;
  const unpackedDirectory = path.join(
    distDir,
    options.architecture === "arm64" ? "mac-arm64" : "mac",
  );
  const unpackedApp = path.join(unpackedDirectory, "Phase 360.app");
  const unpackedExecutable = path.join(
    unpackedApp,
    "Contents",
    "MacOS",
    "Phase 360",
  );
  const infoPlist = path.join(unpackedApp, "Contents", "Info.plist");
  const dmgPath = path.join(
    distDir,
    `Phase-360-${version}-macOS-${options.architecture}.dmg`,
  );
  const zipPath = path.join(
    distDir,
    `Phase-360-${version}-macOS-${options.architecture}.zip`,
  );

  await assertPathExists(unpackedExecutable, "unpacked application executable");
  await assertPathExists(dmgPath, "macOS disk image");
  await assertPathExists(zipPath, "macOS ZIP archive");

  const nativeArchitecture = (await runCommand("uname", ["-m"])).stdout.trim();
  const expectedNativeArchitecture =
    options.architecture === "arm64" ? "arm64" : "x86_64";
  if (nativeArchitecture !== expectedNativeArchitecture) {
    throw new Error(
      `Expected a native ${expectedNativeArchitecture} runner, found '${nativeArchitecture}'.`,
    );
  }

  const binaryArchitectures = (
    await runCommand("lipo", ["-archs", unpackedExecutable])
  ).stdout
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (
    binaryArchitectures.length !== 1 ||
    binaryArchitectures[0] !== expectedNativeArchitecture
  ) {
    throw new Error(
      `Expected a single ${expectedNativeArchitecture} Mach-O application, found '${binaryArchitectures.join(" ")}'.`,
    );
  }

  const executableCandidates = (
    await runCommand("find", [
      path.join(unpackedApp, "Contents"),
      "-type",
      "f",
      "(",
      "-perm",
      "-111",
      "-o",
      "-name",
      "*.dylib",
      ")",
      "-print0",
    ])
  ).stdout
    .split("\0")
    .filter(Boolean);
  const machOBinaries = [];
  for (const candidate of executableCandidates) {
    const type = (await runCommand("file", ["-b", candidate])).stdout;
    if (!type.includes("Mach-O")) continue;
    const architectures = (await runCommand("lipo", ["-archs", candidate])).stdout
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
    if (
      architectures.length !== 1 ||
      architectures[0] !== expectedNativeArchitecture
    ) {
      throw new Error(
        `Expected ${expectedNativeArchitecture} for '${candidate}', found '${architectures.join(" ")}'.`,
      );
    }
    const codeSignature = await runCommand(
      "codesign",
      ["-dv", "--verbose=4", candidate],
      { allowFailure: true },
    );
    const codeSignatureDetail = `${codeSignature.stdout}\n${codeSignature.stderr}`;
    const entitlements = await runCommand(
      "codesign",
      ["-d", "--entitlements", "-", candidate],
      { allowFailure: true },
    );
    const entitlementDetail = `${entitlements.stdout}\n${entitlements.stderr}`;
    const getTaskAllow =
      /<key>com\.apple\.security\.get-task-allow<\/key>\s*<true\s*\/>/imu.test(
        entitlementDetail,
      );
    if (getTaskAllow) {
      throw new Error(
        `Debug entitlement get-task-allow is forbidden in '${candidate}'.`,
      );
    }
    machOBinaries.push({
      path: path.relative(unpackedApp, candidate),
      architectures,
      codesignStatus: codeSignature.status,
      developerId: /^Authority=Developer ID Application:/mu.test(
        codeSignatureDetail,
      ),
      teamIdentifier:
        codeSignatureDetail.match(/^TeamIdentifier=(.+)$/mu)?.[1].trim() ?? null,
      hardenedRuntime: /flags=.*\bruntime\b/mu.test(codeSignatureDetail),
      getTaskAllow,
    });
  }
  if (machOBinaries.length === 0) {
    throw new Error("No Mach-O binaries were found in the packaged application.");
  }

  const bundleIdentifier = await readPlistValue(
    infoPlist,
    "CFBundleIdentifier",
  );
  const bundleVersion = await readPlistValue(
    infoPlist,
    "CFBundleShortVersionString",
  );
  const minimumSystemVersion = await readPlistValue(
    infoPlist,
    "LSMinimumSystemVersion",
  );
  if (
    bundleIdentifier !== "it.mdl1982.phase360" ||
    bundleVersion !== version ||
    minimumSystemVersion !== "12.0"
  ) {
    throw new Error("The packaged macOS bundle metadata is not aligned.");
  }

  const fuseReportPath = path.join(
    distDir,
    `electron-fuses-macos-${options.architecture}.json`,
  );
  await runCommand("node", [
    path.join(projectRoot, "scripts", "verify-electron-fuses.mjs"),
    unpackedExecutable,
    fuseReportPath,
  ]);
  const fuseReport = JSON.parse(await readFile(fuseReportPath, "utf8"));
  if (fuseReport.ok !== true) {
    throw new Error("Electron fuse verification did not pass.");
  }

  const unpackedSmoke = await runSmoke(
    unpackedExecutable,
    "unpacked",
    options.architecture,
    distDir,
  );
  const unpackedExecutableHash = await sha256(unpackedExecutable);
  const unpackedBundleManifest = await createBundleManifest(unpackedApp);

  await runCommand("hdiutil", ["verify", dmgPath]);
  const mountRoot = await mkdtemp(path.join(os.tmpdir(), "phase360-dmg-"));
  const mountPoint = path.join(mountRoot, "mounted");
  await mkdir(mountPoint);
  let diskAttached = false;
  let dmgSmoke;
  try {
    await runCommand("hdiutil", [
      "attach",
      dmgPath,
      "-nobrowse",
      "-readonly",
      "-mountpoint",
      mountPoint,
    ]);
    diskAttached = true;
    const dmgExecutable = path.join(
      mountPoint,
      "Phase 360.app",
      "Contents",
      "MacOS",
      "Phase 360",
    );
    await assertPathExists(dmgExecutable, "application inside disk image");
    const applicationsLink = path.join(mountPoint, "Applications");
    const applicationsLinkMetadata = await lstat(applicationsLink);
    if (
      !applicationsLinkMetadata.isSymbolicLink() ||
      (await readlink(applicationsLink)) !== "/Applications"
    ) {
      throw new Error("The disk image does not contain the expected Applications link.");
    }
    if ((await sha256(dmgExecutable)) !== unpackedExecutableHash) {
      throw new Error("The disk-image executable differs from the verified bundle.");
    }
    const dmgBundleManifest = await createBundleManifest(
      path.join(mountPoint, "Phase 360.app"),
    );
    if (dmgBundleManifest.sha256 !== unpackedBundleManifest.sha256) {
      throw new Error("The complete disk-image bundle differs from the verified bundle.");
    }
    await runCommand("codesign", [
      "--verify",
      "--deep",
      "--strict",
      "--verbose=4",
      path.join(mountPoint, "Phase 360.app"),
    ]);
    dmgSmoke = await runSmoke(
      dmgExecutable,
      "dmg",
      options.architecture,
      distDir,
    );
  } finally {
    if (diskAttached) {
      await runCommand("hdiutil", ["detach", mountPoint]);
    }
    await rm(mountRoot, { force: true, recursive: true });
  }

  const zipRoot = await mkdtemp(path.join(os.tmpdir(), "phase360-zip-"));
  let zipSmoke;
  try {
    await runCommand("ditto", ["-x", "-k", zipPath, zipRoot]);
    const zipExecutable = path.join(
      zipRoot,
      "Phase 360.app",
      "Contents",
      "MacOS",
      "Phase 360",
    );
    await assertPathExists(zipExecutable, "application inside ZIP archive");
    if ((await sha256(zipExecutable)) !== unpackedExecutableHash) {
      throw new Error("The ZIP executable differs from the verified bundle.");
    }
    const zipBundleManifest = await createBundleManifest(
      path.join(zipRoot, "Phase 360.app"),
    );
    if (zipBundleManifest.sha256 !== unpackedBundleManifest.sha256) {
      throw new Error("The complete ZIP bundle differs from the verified bundle.");
    }
    await runCommand("codesign", [
      "--verify",
      "--deep",
      "--strict",
      "--verbose=4",
      path.join(zipRoot, "Phase 360.app"),
    ]);
    zipSmoke = await runSmoke(
      zipExecutable,
      "zip",
      options.architecture,
      distDir,
    );
  } finally {
    await rm(zipRoot, { force: true, recursive: true });
  }

  const signature = await inspectSignature(unpackedApp, dmgPath);
  assertSignaturePolicy(signature, options, machOBinaries);

  const artefacts = [];
  for (const filePath of [dmgPath, zipPath]) {
    const metadata = await stat(filePath);
    artefacts.push({
      file: path.basename(filePath),
      bytes: metadata.size,
      sha256: await sha256(filePath),
    });
  }

  const checksumPath = path.join(
    distDir,
    `SHA256SUMS-macos-${options.architecture}.txt`,
  );
  await writeFile(
    checksumPath,
    `${artefacts.map((item) => `${item.sha256}  ${item.file}`).join("\n")}\n`,
    "utf8",
  );

  const macosVersion = (
    await runCommand("sw_vers", ["-productVersion"])
  ).stdout.trim();
  const verification = {
    schemaVersion: 1,
    verifiedAtUtc: new Date().toISOString(),
    sourceCommit,
    applicationVersion: version,
    target: {
      platform: "darwin",
      architecture: options.architecture,
      nativeArchitecture,
      macosVersion,
      runnerImage: process.env.ImageOS ?? null,
      runnerVersion: process.env.ImageVersion ?? null,
      minimumSystemVersion,
    },
    toolchain: {
      node: (await runCommand("node", ["--version"])).stdout.trim(),
      electron: rootPackage.devDependencies.electron,
      electronBuilder: rootPackage.devDependencies["electron-builder"],
    },
    signingPolicy: {
      expected: options.expectedSignature,
      expectedTeamId: options.expectedTeamId,
      publicPromotionEligible:
        options.expectedSignature === "developer-id" &&
        signature.applicationGatekeeperAccepted &&
        signature.diskImageGatekeeperAccepted &&
        signature.applicationNotaryTicket &&
        signature.diskImageNotaryTicket,
      note:
        options.expectedSignature === "developer-id"
          ? "Developer ID identity, hardened runtime, Gatekeeper acceptance and stapled notary tickets verified."
          : "Unsigned or ad-hoc internal test artefact. SHA-256 is not publisher identity and the package is not notarised.",
    },
    dependencyAudit: "passed",
    bundle: {
      identifier: bundleIdentifier,
      version: bundleVersion,
      architectures: binaryArchitectures,
      machOBinaries,
    },
    packaging: {
      dmgIntegrityVerified: true,
      dmgApplicationsLinkVerified: true,
      packagedBundlesMatch: true,
      bundleManifest: unpackedBundleManifest,
    },
    artefacts,
    signature,
    fuses: fuseReport,
    smoke: {
      unpacked: unpackedSmoke,
      dmg: dmgSmoke,
      zip: zipSmoke,
    },
  };

  await writeFile(
    path.join(
      distDir,
      `macos-verification-${options.architecture}.json`,
    ),
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `macOS ${options.architecture} package verification passed for commit ${sourceCommit}.\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  const annotation = message
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  process.stderr.write(
    `::error title=macOS package verification failed::${annotation}\n${message}\n`,
  );
  process.exitCode = 1;
});
