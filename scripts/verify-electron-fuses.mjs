import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  FuseState,
  FuseV1Options,
  getCurrentFuseWire,
} from "@electron/fuses";

const executable = process.argv[2];
const reportPath = process.argv[3];
if (!executable) {
  throw new Error(
    "Usage: node scripts/verify-electron-fuses.mjs <electron-executable> [report.json]",
  );
}

const resolvedExecutable = path.resolve(executable);
await access(resolvedExecutable);

const expected = new Map([
  [FuseV1Options.RunAsNode, FuseState.DISABLE],
  [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
  [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
  [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
  [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.DISABLE],
  [FuseV1Options.WasmTrapHandlers, FuseState.ENABLE],
]);

const wire = await getCurrentFuseWire(resolvedExecutable);
const checks = [...expected].map(([option, expectedState]) => {
  const actualState = wire[option];
  return {
    fuse: FuseV1Options[option],
    expected: FuseState[expectedState],
    actual: FuseState[actualState],
    ok: actualState === expectedState,
  };
});
const report = {
  ok: checks.every((check) => check.ok),
  executable: resolvedExecutable,
  fuseWireVersion: wire.version,
  checks,
};

const serialised = `${JSON.stringify(report, null, 2)}\n`;
if (reportPath) {
  await writeFile(path.resolve(reportPath), serialised, "utf8");
}
process.stdout.write(serialised);
if (!report.ok) process.exitCode = 1;
