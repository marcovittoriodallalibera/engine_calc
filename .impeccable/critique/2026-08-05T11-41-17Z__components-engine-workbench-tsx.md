---
target: Phase 360 engine workbench redesign
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-08-05T11-41-17Z
slug: components-engine-workbench-tsx
---
Method: dual-agent (A: impeccable_design_a · B: impeccable_detector_b)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Live feedback is strong, but the save claim does not reflect invalid or unavailable storage states. |
| 2 | Match System / Real World | 4 | Domain language, units and TDC/BDC conventions closely match two-stroke engine work. |
| 3 | User Control and Freedom | 2 | Reset and selection clearing exist, but live edits have no undo or sectional revert. |
| 4 | Consistency and Standards | 3 | The control language is coherent; some colour and status semantics drift. |
| 5 | Error Prevention | 2 | Numeric syntax is checked, but field-specific mathematical constraints are not visible enough. |
| 6 | Recognition Rather Than Recall | 3 | Labels, units, help and derived strips are strong; mobile views still create some cross-view memory. |
| 7 | Flexibility and Efficiency | 2 | Live calculation and multiple input modes are efficient, but there are no shortcuts, batch operations or undo. |
| 8 | Aesthetic and Minimalist Design | 3 | The composition is focused, but the map legend and mobile preamble remain dense. |
| 9 | Error Recovery | 2 | Inline format errors exist, but recovery guidance is generic. |
| 10 | Help and Documentation | 3 | Contextual notes, methodology and sources are good; help coverage is uneven. |
| **Total** | | **27/40** | **Acceptable, close to Good** |

## Design Specificity Verdict

**LLM assessment:** Strongly product-specific, with some dashboard residue. The crank dial, TDC/BDC references, authoritative measurement modes, uncertainty treatment, squish map and evidence hierarchy clearly belong to a two-stroke timing workbench. Warm painted-metal surfaces, hard rules and monospaced measurements create a coherent analogue-digital test-bench. The generic title, status and KPI stack before the dial is the main dilution, especially on mobile.

**Deterministic scan:** Five raw warnings at four source locations. Two duplicate `layout-transition` reports at `components/timing-dial.tsx:441` are false positives caused by `stroke-width`. Three `side-tab` reports at `app/globals.css:1039`, `1043` and `1047` identify inset top stripes on metric tones. Only the accent tone is active in the sample; positive is dormant and warning is conditional. The active stripe is a low-severity but valid simplification opportunity.

**Visual overlays:** No reliable user-visible overlay was created. The supported browser surface allowed inspection and screenshots but no mutable script injection. Browser evidence confirmed the rendered workbench, no horizontal overflow at 1280 px, two active accent metrics and eight SVG paths using the falsely flagged paint transition.

## Overall Impression

The redesign now feels like an authored engine instrument rather than a generic calculator. Its strongest asset is the timing dial and the traceable input model around it. The biggest remaining opportunity is to make that instrument the immediate mobile work surface while tightening the truthfulness of status and validation language.

## What's Working

1. **The timing instrument is specific and credible.** Concentric phases, event markers, TDC/BDC references and exact values expose the model without implying gas-dynamic simulation.
2. **The input architecture preserves traceability.** Authoritative source modes, automatic conversion, derived strips and uncertainty controls make assumptions visible.
3. **The evidence boundary is responsible.** Calculation, documented reference and tuning hypothesis are explicitly separated, with model limits and sources available in context.

## Priority Issues

### [P1] Mobile views are CSS masks rather than fully authored task views

**Why it matters:** The default Timing map view still places project title, comparison, status and four metrics before the dial. Switching views also shares page scroll position, which can land users partway through Setup.

**Fix:** Put the dial immediately below the mobile readout, reduce the metric preamble and reset orientation when changing views.

**Suggested command:** `$impeccable adapt`

### [P1] Status language overstates save and readiness

**Why it matters:** Static “Saved on this device” and green “Geometry ready” can be read as persistence or mechanical approval even when inputs are invalid or local storage is unavailable.

**Fix:** Drive save copy from real storage state and rename readiness to “Inputs valid for calculation”, keeping the safety boundary explicit.

**Suggested command:** `$impeccable clarify`

### [P1] Numeric guardrails are too weak for a technical calculator

**Why it matters:** Syntactically valid but mathematically impossible values can produce authoritative-looking output or generic diagnostics.

**Fix:** Add field-specific mathematical limits and actionable messages, without presenting tuning recommendations as universal safety limits.

**Suggested command:** `$impeccable harden`

### [P2] The comparison action promises more than it reveals

**Why it matters:** “Save setup for comparison” implies a complete before-and-after mode, while the visible delta is currently limited to blowdown.

**Fix:** Rename it as a blowdown baseline until broader deltas are implemented.

**Suggested command:** `$impeccable clarify`

### [P2] The map legend becomes a second dense interface

**Why it matters:** Eight phase choices and eight marker choices duplicate the map, push feedback down the page and exceed a comfortable decision set.

**Fix:** Keep primary phases visible and move analysis overlays and event markers into compact disclosures.

**Suggested command:** `$impeccable distill`

## Persona Red Flags

**Alex, power user:** No undo, keyboard shortcuts or batch port editing. Autosave is immediate, but the only broad revert is the illustrative reset. The comparison control currently suggests more than the visible blowdown delta.

**Sam, accessibility-dependent user:** White text on the original orange Share button was below 4.5:1; help targets were only 22 px; mobile Setup lacked a visible semantic heading; SVG arcs appeared interactive but were removed from keyboard order; EXH and BD abbreviations lacked expanded accessible names. Native labels, semantic tables, live regions and visible focus are strong foundations.

**Casey, distracted mobile user:** The sticky top chrome consumes substantial height, shared page scroll can disorient after switching views, and the map is delayed by a desktop-style preamble. Persistence and the compact EXH/BD readout are valuable.

## Minor Observations

- British English is consistent.
- Phase colours appear outside the diagram in a few supporting data cues, slightly weakening their reserved meaning.
- The mobile Results navigation scrolls horizontally without a strong continuation cue.
- External reference links open new tabs without an explicit warning.
- Heavy label weights add workshop character but create dense texture on small screens.

## Questions to Consider

1. If Timing map is the default mobile view, why is the dial not the first substantive object?
2. Does a green status mean mathematically calculable, mechanically plausible or safe to assemble?
3. Should the comparison feature eventually cover the entire setup, or remain a focused blowdown baseline?
4. Which values must stay visible while editing on mobile beyond exhaust duration and blowdown?

## Resolution Status

Applied in the same release: mobile map prioritisation and scroll reset, truthful local-save and core-geometry states, mathematical field guardrails, explicit blowdown-baseline wording, collapsed analysis and marker legends, accessible Share contrast, 44 px help targets, expanded mobile readout names, and removal of misleading SVG keyboard semantics. Metric accent stripes reported by the detector were replaced with flat tonal surfaces. The `stroke-width` transition remains because it is an SVG paint transition and the detector finding is a confirmed false positive.

Deferred product enhancements: undo, keyboard accelerators, batch port editing, a whole-project comparison model, active result-section tracking, and broader browser and assistive-technology coverage.
