import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import builderConfig from "../../electron-builder.config.mjs";
import {
  APP_ORIGIN,
  DESKTOP_CSP,
  contentTypeForAsset,
  isAllowedAppNavigation,
  isAllowedDownload,
  isAllowedExternalReference,
  isAppUrl,
  resolvePackagedAsset,
} from "../../desktop/app/security.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("packaged protocol accepts only the application host and contained assets", () => {
  const rendererRoot = path.join(projectRoot, "desktop/app/renderer");

  assert.equal(isAppUrl("phase360://app/"), true);
  assert.equal(isAppUrl("phase360://other/"), false);
  assert.equal(isAppUrl("https://app/"), false);
  assert.equal(isAllowedAppNavigation("phase360://app/index.html#p=value"), true);
  assert.equal(isAllowedAppNavigation("phase360://app/assets/app.js"), false);
  assert.equal(
    resolvePackagedAsset("phase360://app/assets/app.js", rendererRoot),
    path.join(rendererRoot, "assets/app.js"),
  );
  assert.equal(
    resolvePackagedAsset("phase360://app/%2e%2e%2fsecret.txt", rendererRoot),
    null,
  );
  assert.equal(
    resolvePackagedAsset("phase360://app/assets%5c..%5csecret.txt", rendererRoot),
    null,
  );
  assert.equal(resolvePackagedAsset("phase360://app/%00secret.txt", rendererRoot), null);
  assert.equal(resolvePackagedAsset("phase360://app/asset.exe", rendererRoot), path.join(rendererRoot, "asset.exe"));
  assert.equal(contentTypeForAsset(path.join(rendererRoot, "asset.exe")), null);
});

test("external references use an exact HTTPS origin allowlist", () => {
  assert.equal(
    isAllowedExternalReference("https://catalogue.polini.com/dep/PI702.pdf"),
    true,
  );
  assert.equal(
    isAllowedExternalReference("https://www.youtube.com/watch?v=jhnKO9YTaC0"),
    true,
  );
  assert.equal(
    isAllowedExternalReference("https://catalogue.polini.com.evil.example/file"),
    false,
  );
  assert.equal(
    isAllowedExternalReference("http://catalogue.polini.com/dep/PI702.pdf"),
    false,
  );
  assert.equal(
    isAllowedExternalReference("https://user@catalogue.polini.com/dep/PI702.pdf"),
    false,
  );
});

test("downloads are limited to user-generated JSON and SVG blobs", () => {
  assert.equal(
    isAllowedDownload(`blob:${APP_ORIGIN}/a-guid`, "engine-project.json"),
    true,
  );
  assert.equal(
    isAllowedDownload(`blob:${APP_ORIGIN}/a-guid`, "engine-timing-diagram.svg"),
    true,
  );
  assert.equal(isAllowedDownload("https://example.com/file.json", "file.json"), false);
  assert.equal(isAllowedDownload(`blob:${APP_ORIGIN}/a-guid`, "file.exe"), false);
  assert.equal(isAllowedDownload(`blob:${APP_ORIGIN}/a-guid`, "../file.json"), false);
});

test("desktop CSP and Electron package configuration fail closed", async () => {
  assert.match(DESKTOP_CSP, /script-src 'self'/u);
  assert.match(DESKTOP_CSP, /connect-src 'none'/u);
  assert.match(DESKTOP_CSP, /object-src 'none'/u);
  assert.doesNotMatch(DESKTOP_CSP, /unsafe-eval/u);
  assert.doesNotMatch(DESKTOP_CSP, /script-src[^;]*unsafe-inline/u);

  assert.equal(builderConfig.asar, true);
  assert.equal(builderConfig.disableAsarIntegrity, false);
  assert.equal(builderConfig.electronFuses.runAsNode, false);
  assert.equal(builderConfig.electronFuses.enableEmbeddedAsarIntegrityValidation, true);
  assert.equal(builderConfig.electronFuses.onlyLoadAppFromAsar, true);
  assert.equal(builderConfig.electronFuses.grantFileProtocolExtraPrivileges, false);
  assert.equal(builderConfig.electronFuses.loadBrowserProcessSpecificV8Snapshot, false);
  assert.ok(builderConfig.files.includes("!node_modules{,/**/*}"));

  const main = await readFile(path.join(projectRoot, "desktop/app/main.mjs"), "utf8");
  assert.doesNotMatch(main, /preload\s*:/u);
  assert.match(main, /nodeIntegration:\s*false/u);
  assert.match(main, /contextIsolation:\s*true/u);
  assert.match(main, /sandbox:\s*true/u);
  assert.doesNotMatch(main, /loadURL\(["'`]https?:/u);
});

test("desktop package metadata stays aligned and dependencies are exact", async () => {
  const rootPackage = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );
  const desktopPackage = JSON.parse(
    await readFile(path.join(projectRoot, "desktop/app/package.json"), "utf8"),
  );
  assert.equal(desktopPackage.version, rootPackage.version);
  assert.equal(rootPackage.devDependencies.electron, "43.3.0");
  assert.equal(rootPackage.devDependencies["electron-builder"], "26.15.3");
  assert.equal(rootPackage.devDependencies["@electron/fuses"], "2.1.3");
  assert.equal(rootPackage.devDependencies["cross-env"], "10.1.0");
});
