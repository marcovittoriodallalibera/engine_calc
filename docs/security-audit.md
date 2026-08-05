# Security audit

Audit date: 5 August 2026

## Scope

This review covers the Phase 360 browser application, its project import and local persistence boundary, the Cloudflare Worker response policy, tracked source and dependency metadata, and the proposed Windows desktop packaging boundary. It is a source and dependency audit, not a penetration test or an assurance certification.

## Remediated findings

- React, React DOM and React Server DOM Webpack are aligned at 19.2.8 to remove the published Server Functions denial-of-service advisory present in 19.2.6.
- Vite is updated to 8.2.0, the Cloudflare Vite plugin to 1.51.0 and Wrangler to 4.114.0. The dependency graph overrides Undici to 7.29.0 because the current Cloudflare toolchain pins a vulnerable 7.28.0 release.
- `npm audit` reports zero known vulnerabilities for the complete installed dependency graph and for production dependencies alone at the audit date.
- Duplicate or blank port identifiers are rejected during project validation. This prevents imported records from being matched to the wrong baseline during cylinder-lift comparisons.
- An invalid piston crown position is no longer treated as zero. Deck-referenced results become unavailable and the invalid draft is ineligible for save or export.
- An unreadable locally stored project is preserved. Automatic saving pauses until an explicit edit, import, reset or clear action, preventing silent loss during a failed migration.
- The interface exposes a confirmed `Clear local data` action. Project data remains plain text in the browser profile until the user clears it.
- Response hardening now includes HSTS, same-origin opener and resource policies, `form-action 'self'`, frame denial, MIME sniffing protection, a restrictive permissions policy and referrer controls.
- The Sites packaging hook is safe when Vinext invokes concurrent Vite environment hooks, so repeated production builds no longer race over the same output directory.
- The desktop renderer packages the shared calculation and project code locally and is served through a secure custom scheme in a dedicated persistent Electron session. It does not load or fall back to the hosted application.
- The Electron host enables the process and renderer sandboxes, context isolation and web security, and disables Node integration, preload or IPC bridges, renderer network requests, device and media permissions, popup creation and navigation away from the packaged origin.
- An exact HTTPS origin allowlist opens methodology references only in the system browser. Local downloads are limited to user-initiated JSON and SVG Blob URLs with bounded safe filenames.
- The desktop CSP denies remote connections, inline scripts, evaluation, objects, forms, frames, workers and media. Sanitised clipboard write is the only permission exception and is scoped to the packaged workbench for the explicit Share action.
- The packaging configuration enables embedded ASAR integrity validation, loads application code only from ASAR, disables run-as-Node, Node option and inspect inputs, disables extra `file` privileges, and retains WebAssembly trap handlers. Automated verification reads the final executable fuse wire rather than trusting configuration alone.

## Positive controls

- Project JSON is limited to 48,000 bytes, reconstructed from recognised fields and bounded to 12 port groups.
- Share fragments are limited to 7,500 characters and validated before replacement of the active project.
- Imported text is rendered through React text nodes. No `dangerouslySetInnerHTML`, raw `innerHTML`, `eval` or `new Function` sink is present in application source.
- Export filenames are reduced to bounded ASCII-safe stems.
- The MVP has no project backend, user account, project telemetry or server-side project store.
- No high-confidence secret, private key or untracked environment credential was found in the reviewed source.

## Residual risks and release gates

- Browser project data is intentionally stored in plain text local storage. It can be read by software with access to the browser profile or by a future same-origin script vulnerability. Sensitive projects should be explicitly exported and cleared after use.
- The server-rendered application currently needs inline bootstrap scripts, so the web Content Security Policy retains `script-src 'unsafe-inline'`. No exploitable injection sink was found, but a future nonce or hash integration would provide stronger defence in depth.
- The source-level desktop boundary and a local macOS ARM64 runtime smoke test are verified. That smoke proves custom-origin rendering, Node isolation, CSP, remote-request and popup blocking, permission denial, the 51 mm stroke, 97 mm rod and 33-degree deterministic reference, project-format round trip, and persistence across reload. It does not verify the Windows executable.
- A Windows build without an Authenticode certificate is technically runnable but remains unsigned and may trigger Microsoft SmartScreen. Every artefact must at least ship with a SHA-256 checksum. Public distribution should require a valid Authenticode signature.
- A Windows executable becomes a verified internal candidate only after the native Windows workflow records the exact source commit, final hashes, x64 application header, fuse wire, three packaged smoke results, installation and uninstall result, and Authenticode status. A cross-build or a successful local renderer test is insufficient.

## Verification commands

```bash
npm audit --json
npm test
npm run desktop:smoke
git diff --check
```

The Windows executable additionally requires `scripts/verify-windows-package.ps1` on the native Windows output before it can be described as verified.
