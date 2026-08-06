# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a Vespa or piston-ported two-stroke engine builder working at the bench, recording physical measurements and evaluating a proposed configuration before assembly or irreversible machining.

Users need to translate millimetres, crank angles, port dimensions, rotary-inlet geometry and transmission tooth counts into one internally consistent view. They must be able to distinguish measured authority from derived values and inspect how a small measurement or configuration change affects the complete cycle.

## Product Purpose

Phase 360 is a client-only visual engineering workbench. It converts authoritative engine measurements through exact centred slider-crank geometry, presents the resulting events on one accessible 360-degree crank diagram, and keeps related timing, area, compression, squish, character and transmission calculations in a single project.

Success means that a user can enter or import a configuration, understand every derived result and its provenance, test a bounded what-if change in real time, and produce a printable project report without moving calculations between unrelated tools.

## Positioning

Phase 360 combines exact port-timing geometry, Vespa rotary-valve arc sizing and moving overlap area, explicit uncertainty, contextual diagnostics, qualitative engine-character evidence and configurable four- or five-speed transmission kinematics in one local project model. Calculated geometry remains separate from heuristics and from measured or calibrated evidence.

The product does not claim to predict a dyno curve, airflow, pressure waves, combustion safety, structural safety or whether an engine can pull a displayed ratio.

## Operating Context

- Users measure stroke, connecting-rod length, bore, deck position, port roofs, projected port windows, rotary sealing-track geometry, chamber volume, squish, gear teeth and loaded-wheel rolling circumference.
- Values may be entered with comma or point decimal separators and update valid results immediately.
- A project can be retained locally, shared through a client-side URL fragment, imported or exported as versioned JSON, exported as SVG and printed as an A4 engineering report.
- Cylinder base spacing, head-gasket thickness and exhaust-roof changes are explicit what-if inputs rather than hidden corrections.
- The same workbench is delivered through the browser and offline Electron packages for Windows x64, macOS Apple Silicon and macOS Intel.
- Methodology references and source-specific comparison bands support interpretation, while direct measurement and manufacturer information remain authoritative for physical decisions.

## Capabilities and Constraints

- Exact centred slider-crank conversion between piston travel and crank events, including signed deck position and stated measurement uncertainty.
- Exhaust and dynamic transfer groups, transfer staging, blowdown, simultaneous opening, rotary-to-transfer margin and overlap, and triple overlap.
- Rotary timing from direct angles or from desired timing plus one authoritative measured component arc, with the complementary crank or crankcase arc derived at full precision.
- Physical rotary-area modelling from cylindrical overlap and a measured common axial width, kept distinct from discharge-corrected effective flow area.
- Displacement, mean piston speed, geometric and trapped compression, clearance-volume breakdown, squish statistics and annular-band geometry.
- Projected rectangular-port angle-area, specific time-area and downstroke blowdown time-area.
- A three-level diagnostic contract: calculated geometry, contextual profile heuristic, and measured or calibrated-model evidence.
- Selectable touring box, sport box, road expansion and race expansion contexts. Profiles compare against versioned source-labelled bands and never alter calculated geometry.
- A qualitative engine-character view that describes tendencies and uncertainty without inventing torque, power, peak output or a synthetic dyno curve.
- Manually entered primary and four- or five-speed gear tooth counts, wheel circumference and maximum RPM, producing reduction, road-speed and post-shift calculations without changing engine timing.
- Backend accounts, cloud projects and remote persistence are deliberately deferred. Future transmission of project content requires a separate capability and an explicit user action.
- Current public desktop packages are preview artefacts. Windows packages are unsigned. macOS packages are ad-hoc signed and not notarised. They must not be described as trusted stable applications.
- Universal timing, compression, squish, exhaust or intake targets are prohibited. Contextual guidance must name its source, version, applicability and evidence level.

## Brand Commitments

- Product name: Phase 360.
- Interface and documentation language: British English.
- Voice: precise, calm, technically literate and explicit about assumptions, authority, unavailable results and uncertainty.
- The product must make measured inputs, calculated outputs, contextual heuristics and measured or modelled evidence visibly distinct.
- Technical density is acceptable when it improves auditability, but every primary workflow must remain scannable and operable on narrow and wide screens.

## Evidence on Hand

- Product scope and interpretation boundary: `README.md`.
- Calculation and diagnostic contract: `openspec/changes/vespa-2t-visual-timing-calculator/`.
- Methodology and source qualification: `docs/methodology.md`.
- Deterministic engine and transmission kernel: `lib/engine/`.
- Shared presentation analysis: `lib/presentation/analyse-project.ts`.
- Browser and desktop interface: `components/`, `app/` and `desktop/`.
- Mathematical, portability, rendering and desktop-security evidence: `tests/`.
- Desktop trust and release evidence: `docs/security-audit.md`, `docs/windows-desktop.md` and `docs/macos-desktop.md`.
- No measured dyno dataset, calibrated gas-dynamic model, manufacturer approval, signing certificate or notarisation credential is present and none may be fabricated.

## Product Principles

1. Preserve measurement authority. Derived values may assist the user but must never silently replace the selected physical source.
2. Show the complete relationship. Every visual result must have an equivalent inspectable numeric representation and clear provenance.
3. Separate certainty levels. Geometry, contextual heuristics and measured or modelled evidence must never collapse into one recommendation.
4. Prefer honest bounds to false precision. Propagate stated uncertainty and preserve unavailable or indeterminate states.
5. Keep projects local and portable. Core calculation, persistence, export, printing and desktop use must remain functional without an account or backend.

## Accessibility & Inclusion

- Core controls and phase inspection must be keyboard operable with visible focus.
- Colour cannot be the only carrier of category, state, uncertainty or series identity.
- The 360-degree diagram and every graph require equivalent semantic tables or accessible text.
- Narrow layouts must avoid page-level horizontal scrolling. A technically dense chart may use a clearly bounded internal scroll area when necessary.
- Status changes must be restrained, labelled and compatible with assistive technology.
