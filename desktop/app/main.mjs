import { rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  Menu,
  net,
  protocol,
  session,
  shell,
} from "electron";

import {
  APP_ORIGIN,
  APP_SCHEME,
  APP_URL,
  DESKTOP_CSP,
  SESSION_PARTITION,
  contentTypeForAsset,
  isAllowedAppNavigation,
  isAllowedDownload,
  isAllowedExternalReference,
  isAppUrl,
  resolvePackagedAsset,
} from "./security.mjs";

const smokeMode = process.argv.includes("--smoke-test");
const smokeReportPath = () => path.join(app.getPath("temp"), "phase360-smoke-report.json");

async function writeSmokeReport(report) {
  const destination = smokeReportPath();
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rm(destination, { force: true });
  await rename(temporary, destination);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      codeCache: true,
      stream: true,
    },
  },
]);

app.enableSandbox();

let mainWindow = null;

function securityHeaders(sourceHeaders, contentType) {
  const headers = new Headers(sourceHeaders);
  headers.set("Content-Type", contentType);
  headers.set("Content-Security-Policy", DESKTOP_CSP);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), payment=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return headers;
}

async function servePackagedAsset(request, rendererRoot) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const assetPath = resolvePackagedAsset(request.url, rendererRoot);
  const contentType = assetPath ? contentTypeForAsset(assetPath) : null;
  if (!assetPath || !contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    if (!(await stat(assetPath)).isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const source = await net.fetch(pathToFileURL(assetPath).href);
    return new Response(request.method === "HEAD" ? null : source.body, {
      status: source.status,
      statusText: source.statusText,
      headers: securityHeaders(source.headers, contentType),
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function openAllowedExternal(rawUrl) {
  if (isAllowedExternalReference(rawUrl)) {
    void shell.openExternal(rawUrl).catch(() => {});
  }
}

function hardenWebContents(contents) {
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.on("will-frame-navigate", (event) => {
    if (event.isMainFrame && isAllowedAppNavigation(event.url)) return;
    event.preventDefault();
  });
  contents.on("will-navigate", (event) => {
    if (isAllowedAppNavigation(event.url)) return;
    event.preventDefault();
    openAllowedExternal(event.url);
  });
  contents.on("will-redirect", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    openAllowedExternal(url);
    return { action: "deny" };
  });
}

function configureApplicationMenu() {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          { role: "close" },
          { type: "separator" },
          { role: "front" },
        ],
      },
    ]),
  );
}

function waitForDocument(contents) {
  return contents.executeJavaScript(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const check = () => {
      const root = document.querySelector('main#top');
      const diagram = document.querySelector('#phase360-diagram');
      if (root && diagram && document.documentElement.dataset.phase360Ready === 'true') {
        resolve(true);
      } else if (Date.now() >= deadline) {
        reject(new Error('Timed out waiting for the Phase 360 workbench'));
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  })`, true);
}

async function runSmokeTest(window) {
  const report = {
    ok: false,
    applicationVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    platform: process.platform,
    architecture: process.arch,
    packaged: app.isPackaged,
    executable: process.execPath,
    checks: {},
  };

  try {
    await waitForDocument(window.webContents);
    const firstPass = await window.webContents.executeJavaScript(`(async () => {
      const inlineMarker = '__phase360InlineExecuted';
      const script = document.createElement('script');
      script.textContent = 'window.' + inlineMarker + ' = true';
      document.head.append(script);
      await new Promise((resolve) => setTimeout(resolve, 25));

      let remoteFetchBlocked = false;
      try {
        await fetch('https://example.invalid/phase360-smoke');
      } catch {
        remoteFetchBlocked = true;
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      const popup = window.open('https://example.invalid/phase360-smoke', '_blank');
      const storageKey = 'phase360.desktop.smoke';
      localStorage.setItem(storageKey, 'persisted');

      return {
        origin: window.location.origin,
        rootPresent: Boolean(document.querySelector('main#top')),
        diagramPresent: Boolean(document.querySelector('#phase360-diagram')),
        nodeProcessUnavailable: typeof window.process === 'undefined',
        requireUnavailable: typeof window.require === 'undefined',
        inlineScriptBlocked: window[inlineMarker] !== true,
        remoteFetchBlocked,
        geolocationDenied: permission.state === 'denied',
        popupBlocked: popup === null,
        kernelReference: document.documentElement.dataset.phase360KernelReference,
        projectRoundTrip: document.documentElement.dataset.phase360ProjectRoundTrip,
      };
    })()`, true);

    await new Promise((resolve) => {
      window.webContents.once("did-finish-load", resolve);
      window.webContents.reload();
    });
    await waitForDocument(window.webContents);
    const persistence = await window.webContents.executeJavaScript(`(() => {
      const key = 'phase360.desktop.smoke';
      const retained = localStorage.getItem(key) === 'persisted';
      localStorage.removeItem(key);
      return retained;
    })()`, true);

    report.checks = {
      rootPresent: firstPass.rootPresent,
      diagramPresent: firstPass.diagramPresent,
      nodeProcessUnavailable: firstPass.nodeProcessUnavailable,
      requireUnavailable: firstPass.requireUnavailable,
      inlineScriptBlocked: firstPass.inlineScriptBlocked,
      remoteFetchBlocked: firstPass.remoteFetchBlocked,
      geolocationDenied: firstPass.geolocationDenied,
      popupBlocked: firstPass.popupBlocked,
      localStoragePersistedAcrossReload: persistence,
      singleWindow: BrowserWindow.getAllWindows().length === 1,
      expectedOrigin: firstPass.origin === APP_ORIGIN,
      deterministicKernelReference:
        firstPass.kernelReference === "5.113300253227",
      portableProjectRoundTrip: firstPass.projectRoundTrip === "true",
    };
    report.ok = Object.values(report.checks).every((value) => value === true);
    if (!report.ok) throw new Error("One or more desktop smoke checks failed");
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  }

  await writeSmokeReport(report);
  app.exit(report.ok ? 0 : 1);
}

app.on("web-contents-created", (_event, contents) => hardenWebContents(contents));
app.on("certificate-error", (event, _contents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false);
});
app.on("login", (event) => event.preventDefault());

app.whenReady().then(async () => {
  const rendererRoot = path.join(app.getAppPath(), "renderer");
  const isolatedSession = session.fromPartition(SESSION_PARTITION);
  isolatedSession.protocol.handle(APP_SCHEME, (request) =>
    servePackagedAsset(request, rendererRoot),
  );

  isolatedSession.setPermissionCheckHandler(
    (contents, permission, requestingOrigin, details) =>
      permission === "clipboard-sanitized-write" &&
      contents?.id === mainWindow?.webContents.id &&
      isAppUrl(details.requestingUrl ?? requestingOrigin),
  );
  isolatedSession.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      callback(
        permission === "clipboard-sanitized-write" &&
          contents.id === mainWindow?.webContents.id &&
          isAppUrl(details.requestingUrl),
      );
    },
  );
  isolatedSession.setDevicePermissionHandler(() => false);
  isolatedSession.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  isolatedSession.webRequest.onBeforeRequest(
    {
      urls: [
        "http://*/*",
        "https://*/*",
        "ws://*/*",
        "wss://*/*",
        "ftp://*/*",
      ],
    },
    (_details, callback) => callback({ cancel: true }),
  );
  isolatedSession.on("will-download", (event, item, contents) => {
    if (
      contents.id !== mainWindow?.webContents.id ||
      !item.hasUserGesture() ||
      !isAllowedDownload(item.getURL(), item.getFilename())
    ) {
      event.preventDefault();
    }
  });

  configureApplicationMenu();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: "#e7e4da",
    title: "Phase 360",
    webPreferences: {
      partition: SESSION_PARTITION,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      devTools: !app.isPackaged,
      safeDialogs: true,
      navigateOnDragDrop: false,
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (!smokeMode) mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  try {
    await mainWindow.loadURL(APP_URL);
    if (smokeMode) await runSmokeTest(mainWindow);
  } catch (error) {
    if (!smokeMode) throw error;
    const report = {
      ok: false,
      applicationVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      architecture: process.arch,
      packaged: app.isPackaged,
      executable: process.execPath,
      error: error instanceof Error ? error.message : String(error),
      checks: {},
    };
    await writeSmokeReport(report);
    app.exit(1);
  }
});

app.on("window-all-closed", () => app.quit());
