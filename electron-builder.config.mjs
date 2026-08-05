const electronBuilderConfig = {
  appId: "it.mdl1982.phase360",
  productName: "Phase 360",
  copyright: "Copyright © 2026 Marco Vittorio Dalla Libera",
  directories: {
    app: "desktop/app",
    buildResources: "desktop/build",
    output: "desktop-dist",
  },
  electronVersion: "43.3.0",
  asar: true,
  disableAsarIntegrity: false,
  npmRebuild: false,
  files: [
    "package.json",
    "main.mjs",
    "security.mjs",
    "renderer/**/*",
    "!node_modules{,/**/*}",
  ],
  compression: "maximum",
  electronLanguages: ["en-GB"],
  win: {
    icon: "icon.png",
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    requestedExecutionLevel: "asInvoker",
  },
  nsis: {
    artifactName: "Phase-360-Setup-${version}-${arch}.${ext}",
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    deleteAppDataOnUninstall: false,
    uninstallDisplayName: "Phase 360",
  },
  portable: {
    artifactName: "Phase-360-Portable-${version}-${arch}.${ext}",
  },
  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    loadBrowserProcessSpecificV8Snapshot: false,
    grantFileProtocolExtraPrivileges: false,
  },
};

export default electronBuilderConfig;
