# Security audit

Audit date: 6 August 2026

## Scope

This review covers the Phase 360 browser application, its project import and local persistence boundary, the Cloudflare Worker response policy, tracked source and dependency metadata, and the implemented Windows and macOS desktop packaging boundaries. It is a source and dependency audit with native package smoke evidence, not a penetration test or an assurance certification.

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
- The macOS workflow produces separate ARM64 and x64 packages on matching native runners. The verifier rejects translated or mixed-architecture evidence, checks every executable Mach-O slice, verifies DMG and ZIP contents independently, and records code signature, Team ID, hardened-runtime, notary-ticket and Gatekeeper state separately. Both native jobs passed and their retained evidence is recorded below.
- After the Electron fuse step, macOS packaging explicitly ad-hoc signs the complete application bundle on both architectures. Native verification requires every Mach-O to retain valid ad-hoc code integrity, with no authorised publisher identity, Team ID, hardened runtime or notarisation ticket.
- Packaged macOS menus expose only standard application, editing and window roles. Reload and developer-tools roles are absent and no preload or IPC surface was introduced.

## Native Windows verification evidence

- [GitHub Actions run 31044034676](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31044034676) completed successfully on the `windows-latest` runner for source commit `6172a3b6d225417f06d9c001921010d1258ba37b`.
- Job `92435062574` passed the dependency audit, complete test suite, native x64 package build, fuse inspection, unpacked smoke, portable smoke, per-user installation, installed smoke and uninstall check.
- Retained artefact `phase-360-windows-x64-6172a3b6d225417f06d9c001921010d1258ba37b`, artefact ID `8945782800`, has GitHub archive digest `sha256:572dd7e282fd0921268153a64cbcc7d0cc5f291d55393fe9de8ca616a70af21d`.
- The retained `SHA256SUMS.txt` and `windows-verification.json` bind the individual installer and portable executable hashes, byte sizes, architecture, toolchain, smoke records, fuse record and `NotSigned` Authenticode status to the same commit.

## Native macOS verification evidence

- [GitHub Actions run 31079396042](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31079396042) completed successfully for source commit `cc3ac36caf7791f4143f3b2c5587de556708bb1f`.
- ARM64 job `92544516704` passed on the native `macos-15` runner. Intel job `92544514358` passed on the native `macos-15-intel` runner. Both passed the dependency audit, complete test suite, native package build, full Mach-O scan, fuse inspection, bundle-equivalence check, and unpacked, DMG and ZIP smoke tests.
- Retained ARM64 artefact `phase-360-macos-arm64-cc3ac36caf7791f4143f3b2c5587de556708bb1f`, artefact ID `8958878074`, has GitHub archive digest `sha256:62c8bb0f66e4faa7f641bb67dc3f48d6d200f0a5024d6e25523dd91ddb451bc6`.
- Retained Intel artefact `phase-360-macos-x64-cc3ac36caf7791f4143f3b2c5587de556708bb1f`, artefact ID `8958927081`, has GitHub archive digest `sha256:a12de1e853c95b55b942b744b796b016d6668c053462d1ef03b3c025084dda09`.
- The retained architecture-specific checksum and verification records bind the individual DMG and ZIP hashes, byte sizes, complete bundle manifests, native architecture, macOS 15 runner class, toolchain, smoke records, fuse records, ad-hoc signature classification, absent Team ID, absent notary tickets and recorded Gatekeeper state to the same commit.
- The shared desktop changes also passed native Windows x64 regression run [31079396055](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31079396055), job `92544515296`.

## Public desktop preview evidence

- [GitHub Actions release run 31084404789](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31084404789) completed successfully for tagged source commit `a12e4c620cf1d0a47fc5b1784af48a840c549f8e`.
- Windows x64 job `92560367497`, native Apple Silicon job `92560367584`, native Intel Mac job `92560367556`, and aggregate publish job `92561363515` all completed successfully. Each native job repeated the dependency audit, complete test suite, package build, native verification and package smoke checks before publication was possible.
- [Phase 360 0.1.0 preview 3](https://github.com/marcovittoriodallalibera/engine_calc/releases/tag/v0.1.0-preview.3), release ID `366073583`, is public, non-draft and explicitly marked as a pre-release. It is not the stable `latest` release.
- The release contains six application packages and eight checksum or machine-readable evidence files. The aggregate record identifies `v0.1.0-preview.3`, the exact source commit, byte size and SHA-256 digest of every application package, `trustedPublicRelease: false`, unsigned Windows status and ad-hoc, non-notarised macOS status.
- All six package URLs and the five download, checksum and aggregate-evidence URLs prepared for the Wiki returned HTTP 200 after publication. The public release API digests match `SHA256SUMS-release.txt` and `RELEASE-EVIDENCE.json` for every application package.
- Diagnostic tags `v0.1.0-preview.1` and `v0.1.0-preview.2` remain as audit history without GitHub releases. The public API returned 404 for both release tags and for the stable `latest` channel after preview 3 publication.

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
- The native evidence verifies the packaged Windows x64, macOS ARM64 and macOS Intel candidates on the recorded runner classes. Compatibility outside those environments is not claimed.
- A Windows build without an Authenticode certificate is technically runnable but remains unsigned and may trigger Microsoft SmartScreen. Every artefact must at least ship with a SHA-256 checksum. It may be exposed only as an explicitly unsigned pre-release and never as a trusted or stable-channel release.
- The verified Windows executable is an internal or pre-release candidate, not a trusted public release. A future trusted build must repeat the native checks and additionally record a valid Authenticode signature from the expected publisher.
- The initial macOS packages are ad-hoc signed and not notarised. They may be stopped by Gatekeeper after download and remain internal or explicitly labelled pre-release candidates until the expected Developer ID Application and Apple Team ID, effective hardened runtime, accepted notarisation, stapled tickets and active Gatekeeper acceptance are all verified. They are excluded from the stable release channel.
- A local Gatekeeper assessment can report acceptance when host policy is disabled. The macOS verifier records that override and never treats it as public-release acceptance.

## Verification commands

```bash
npm audit --json
npm test
npm run desktop:smoke
npm run desktop:dist:mac:arm64
node scripts/verify-macos-package.mjs --dist-dir desktop-dist --arch arm64 --expected-signature unsigned
git diff --check
```

The Windows executable additionally requires `scripts/verify-windows-package.ps1` on the native Windows output before it can be described as verified. Each Mac architecture requires `scripts/verify-macos-package.mjs` on a matching native runner and a retained architecture-specific manifest. The evidence above records successful native execution of these gates.
