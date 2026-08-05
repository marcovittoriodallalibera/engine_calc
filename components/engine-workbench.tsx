"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import TimingDial, {
  type TimingMarker,
  type TimingPhaseArc,
} from "@/components/timing-dial";
import {
  ENGINE_CHARACTER_PROFILES,
  evaluateCompressionScenario,
  type TransmissionResult,
} from "@/lib/engine";
import {
  analyseProject,
  type CylinderLiftPortComparison,
  type EngineProjectAnalysis,
  type PortAnalysis,
} from "@/lib/presentation/analyse-project";
import {
  MAX_SHARE_FRAGMENT_LENGTH,
  PROJECT_STORAGE_KEY,
  changeRotaryMeasuredArc,
  cloneDemonstrationProject,
  decodeProjectFragment,
  encodeProjectFragment,
  parseLocaleNumber,
  parseProjectJson,
  safeProjectFilename,
  serialiseProject,
  validateProjectDocument,
  type EngineProjectDraft,
  type CharacterProfile,
  type PortDraft,
  type PortSourceMode,
  type TransmissionGearCount,
} from "@/lib/project/model";
import {
  clearProjectFromStorage,
  loadProjectFromStorage,
} from "@/lib/project/browser";

const sourceOptions: Array<{ value: PortSourceMode; label: string }> = [
  { value: "travel-from-tdc", label: "Roof travel from TDC" },
  { value: "height-above-bdc", label: "Roof height above BDC" },
  { value: "depth-from-deck", label: "Roof depth from deck" },
  { value: "opening-angle", label: "Opening angle ATDC" },
  { value: "duration", label: "Event duration" },
];

const sourceUnits: Record<PortSourceMode, string> = {
  "travel-from-tdc": "mm",
  "height-above-bdc": "mm",
  "depth-from-deck": "mm",
  "opening-angle": "deg",
  duration: "deg",
};

const characterProfileOptions: Array<{
  value: CharacterProfile;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "No profile",
    description: "Show geometry without contextual tuning annotations.",
  },
  ...Object.values(ENGINE_CHARACTER_PROFILES).map((profile) => ({
    value: profile.id,
    label: profile.label,
    description: profile.description,
  })),
];

const DEMONSTRATION_PROJECT_JSON = serialiseProject(cloneDemonstrationProject());

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not set";
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSigned(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not set";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)}`;
}

function formatConstraint(value: number): string {
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

function formatTimeArea(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not set";
  return value.toExponential(3);
}

function formatBoundedValue(
  value: number | null | undefined,
  minimum: number | null | undefined,
  maximum: number | null | undefined,
  digits = 1,
): string {
  const nominal = formatNumber(value, digits);
  if (
    nominal === "Not set" ||
    minimum === null ||
    minimum === undefined ||
    maximum === null ||
    maximum === undefined
  ) {
    return nominal;
  }
  return `${nominal} (${formatNumber(minimum, digits)} to ${formatNumber(maximum, digits)})`;
}

function formatBoundedMeasure(
  value: number | null | undefined,
  minimum: number | null | undefined,
  maximum: number | null | undefined,
  unit: string,
  digits = 1,
): string {
  const formatted = formatBoundedValue(value, minimum, maximum, digits);
  return formatted === "Not set" ? formatted : `${formatted}${unit}`;
}

function formatProjectDate(value: string): string {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) return "Not set";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSourceValue(value: string, unit: string): string {
  return value.trim() ? `${value} ${unit}` : "Not set";
}

function normaliseAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function clockwiseDuration(start: number, end: number): number {
  const raw = end - start;
  if (Math.abs(raw) >= 360) return 360;
  return normaliseAngle(raw);
}

function sourceLabel(mode: PortSourceMode): string {
  return sourceOptions.find((option) => option.value === mode)?.label ?? mode;
}

const transmissionColours = [
  "#b83c1e",
  "#1f7663",
  "#236e9a",
  "#70459a",
  "#7a5a00",
];

function downloadText(contents: string, mimeType: string, filename: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface NumberFieldProps {
  label: string;
  inputAriaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  help?: string;
  disabled?: boolean;
  compact?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  integer?: boolean;
  required?: boolean;
  validationMessage?: string | null;
}

function NumberField({
  label,
  inputAriaLabel,
  value,
  onChange,
  unit,
  help,
  disabled,
  compact,
  minimum,
  maximum,
  exclusiveMinimum,
  integer,
  required,
  validationMessage,
}: NumberFieldProps) {
  const numericValue = parseLocaleNumber(value);
  let errorMessage: string | null = null;

  if (value.trim() === "" && required) {
    errorMessage = "Enter a value.";
  } else if (value.trim() !== "") {
    if (numericValue === null) {
      errorMessage = "Enter a valid number.";
    } else if (integer && !Number.isInteger(numericValue)) {
      errorMessage = "Use a whole number.";
    } else if (
      minimum !== undefined &&
      (exclusiveMinimum ? numericValue <= minimum : numericValue < minimum)
    ) {
      errorMessage = exclusiveMinimum
        ? `Use a value greater than ${formatConstraint(minimum)}.`
        : `Use ${formatConstraint(minimum)} or more.`;
    } else if (maximum !== undefined && numericValue > maximum) {
      errorMessage = `Use ${formatConstraint(maximum)} or less.`;
    } else if (validationMessage) {
      errorMessage = validationMessage;
    }
  }

  const invalid = errorMessage !== null;
  const fieldId = useId();
  const helpId = help ? `${fieldId}-help` : undefined;
  const errorId = invalid ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <label className={`field ${compact ? "field-compact" : ""}`}>
      <span className="field-label">
        <span>{label}</span>
        {help ? (
          <span className="field-help-wrap">
            <span
              className="field-help"
              aria-label={`Help for ${label}`}
              aria-describedby={helpId}
              tabIndex={0}
            >
              i
            </span>
            <span className="field-help-copy" id={helpId} role="tooltip">
              {help}
            </span>
          </span>
        ) : null}
      </span>
      <span className={`input-shell ${invalid ? "input-invalid" : ""}`}>
        <input
          type="text"
          inputMode="decimal"
          aria-label={inputAriaLabel}
          value={value}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit ? <span className="input-unit">{unit}</span> : null}
      </span>
      {invalid ? (
        <span className="field-error" id={errorId}>
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}

interface MetricProps {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: "neutral" | "accent" | "positive" | "warning";
}

function Metric({ label, value, unit, detail, tone = "neutral" }: MetricProps) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">
        {value}
        {unit && value !== "Not set" ? <small>{unit}</small> : null}
      </strong>
      {detail ? <span className="metric-detail">{detail}</span> : null}
    </div>
  );
}

function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

function MethodologyDetailsContent() {
  return (
    <>
      <div className="method-copy">
        <p>
          The centred slider-crank equation uses crank radius, centre-to-centre
          rod length and crank angle. Port opening is solved exactly from piston
          travel; symmetric closure is 360° minus the opening angle.
        </p>
        <p>
          A positive rotary-to-transfer margin means the rotary inlet opens
          before the selected transfer closes. A negative value is a closed
          angular gap. This signed relationship is shown instead of claiming a
          universal ratio between inlet and transfer durations.
        </p>
        <p>
          Rotary arc conversion uses θ = 360L / (πD). The crank cut-away
          and crankcase opening add to the total arc required by the desired
          opening and closing angles. One physical arc is measured; the other
          is calculated by subtraction and is never stored as a second authority.
        </p>
        <p>
          Cylindrical inlet area is the instantaneous circumferential overlap
          between crank cut-away and crankcase window, multiplied by their
          measured common axial width. It is geometric sealing-surface area, not
          discharge-corrected flow area.
        </p>
        <p>
          Entered millimetre uncertainty is propagated through port event
          boundaries, signed inlet margin, blowdown and geometric time-area. The
          result is a bounded measurement interval, not a probability or a
          manufacturing tolerance inferred by the calculator.
        </p>
        <p>
          The Engine character estimate plots only geometric area and specific
          time-area. A selected profile adds conditional lower-, mid- or
          upper-speed language; it does not create an output or dyno curve.
        </p>
        <p>
          Transmission reduction is primary driven teeth divided by drive-pinion
          teeth, multiplied by each gear-wheel to cluster-pinion ratio. The road
          speed conversion uses the entered loaded rolling circumference. The
          resulting straight lines are kinematic, not an achievable-speed model.
        </p>
        <p>
          Geometric compression uses full displacement. Trapped compression
          uses only the swept volume from exhaust closure to TDC. Raising the
          exhaust roof can therefore reduce trapped compression while leaving
          geometric compression unchanged, provided the chamber volume is unchanged.
        </p>
      </div>
      <div className="source-links">
        <span>Reference trail</span>
        <a
          href="https://catalogue.polini.com/dep/PI702.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Polini PP18 conversion table
        </a>
        <a
          href="https://saemobilus.sae.org/papers/effect-crankcase-volume-inlet-system-delivery-ratio-two-stroke-cycle-engines-670030"
          target="_blank"
          rel="noreferrer"
        >
          SAE 670030 on inlet time-area
        </a>
        <a
          href="https://patents.google.com/patent/US20050139179A1/en"
          target="_blank"
          rel="noreferrer"
        >
          Crank-web rotary timing reference
        </a>
        <a
          href="https://catalogue.polini.com/dep/210_0043.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Polini Vespa rotary crank instructions
        </a>
        <a
          href="https://saemobilus.sae.org/papers/relationship-port-shape-engine-performance-two-stroke-engines-1999-01-3333"
          target="_blank"
          rel="noreferrer"
        >
          SAE 1999-01-3333 on transfer shape
        </a>
        <a
          href="https://wiki.germanscooterforum.de/index.php/Steuerzeiten_messen"
          target="_blank"
          rel="noreferrer"
        >
          GSF timing measurement uncertainty
        </a>
        <a
          href="https://www.bridgestonemotorcycle.com/documents/delivery_ratio6.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Komotori and Watanabe on rotary inlet timing
        </a>
        <a
          href="https://api.sip-scootershop.com/api/files/download/1/pdf/fd38cfbd-e197-4fe7-9c64-4904a6cdf2a3/SIP%2BBFA%2BEngine%2BInstructions.pdf"
          target="_blank"
          rel="noreferrer"
        >
          SIP-BFA kit-specific squish guidance
        </a>
        <a
          href="https://www.sip-scootershop.com/download/article/1/pdf/fa6fa8d4-75db-48e7-8d72-31c6952120a1/Gearbox%2BTechnology.pdf%3FcontentType%3Dapplication-pdf"
          target="_blank"
          rel="noreferrer"
        >
          SIP gearbox ratio and speed methodology
        </a>
      </div>
    </>
  );
}

function PortEditor({
  port,
  analysis,
  liftComparison,
  strokeMm,
  onUpdate,
  onRemove,
  onSelect,
}: {
  port: PortDraft;
  analysis: PortAnalysis | undefined;
  liftComparison: CylinderLiftPortComparison | undefined;
  strokeMm: number | null;
  onUpdate: (patch: Partial<PortDraft>) => void;
  onRemove?: () => void;
  onSelect?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(port.kind === "exhaust");

  return (
    <details
      className="port-editor"
      id={`port-${port.id}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary onClick={onSelect}>
        <span className={`port-dot port-dot-${port.kind}`} aria-hidden="true" />
        <span className="port-summary-main">
          <strong>{port.label || "Untitled port"}</strong>
          <span>
            {analysis
              ? `${formatNumber(analysis.durationDeg, 1)}° duration`
              : "Waiting for valid geometry"}
          </span>
        </span>
        <span className={`port-state ${port.enabled ? "is-enabled" : ""}`}>
          {port.enabled ? "On" : "Off"}
        </span>
      </summary>
      <div className="port-editor-body">
        <div className="toggle-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={port.enabled}
              onChange={(event) => onUpdate({ enabled: event.target.checked })}
            />
            <span aria-hidden="true" />
            Include in analysis
          </label>
          {onRemove ? (
            <button className="text-button danger" type="button" onClick={onRemove}>
              Remove
            </button>
          ) : null}
        </div>

        <label className="field">
          <span className="field-label">Label</span>
          <span className="input-shell">
            <input
              type="text"
              value={port.label}
              maxLength={60}
              onChange={(event) => onUpdate({ label: event.target.value })}
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Authoritative timing input</span>
          <span className="select-shell">
            <select
              value={port.sourceMode}
              onChange={(event) =>
                onUpdate({ sourceMode: event.target.value as PortSourceMode })
              }
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <NumberField
          label={sourceLabel(port.sourceMode)}
          value={port.sourceValue}
          unit={sourceUnits[port.sourceMode]}
          minimum={0}
          maximum={
            port.sourceMode === "duration"
              ? 360
              : port.sourceMode === "opening-angle"
                ? 180
                : port.sourceMode === "travel-from-tdc" ||
                    port.sourceMode === "height-above-bdc"
                  ? strokeMm ?? undefined
                  : undefined
          }
          onChange={(sourceValue) => onUpdate({ sourceValue })}
          help={
            port.sourceMode === "travel-from-tdc"
              ? "Distance travelled by the piston crown from TDC when the port roof first becomes visible."
              : port.sourceMode === "height-above-bdc"
                ? "Vertical distance from the piston crown at BDC to the port roof."
                : port.sourceMode === "depth-from-deck"
                  ? "Depth from the cylinder deck to the port roof. The signed piston position at TDC is subtracted."
                : "This value becomes authoritative. Linear dimensions are then calculated from the exact slider-crank geometry."
          }
        />

        {analysis ? (
          <>
            <div className="derived-strip" aria-label={`${port.label} calculated timing`}>
              <span>
                <small>Opens</small>
                <strong>{formatNumber(analysis.openingAngleDeg, 1)}° ATDC</strong>
              </span>
              <span>
                <small>Closes</small>
                <strong>{formatNumber(360 - analysis.closingAngleDeg, 1)}° BTDC</strong>
              </span>
              <span>
                <small>Travel</small>
                <strong>{formatNumber(analysis.travelFromTdcMm, 2)} mm</strong>
              </span>
            </div>
            {liftComparison && liftComparison.durationDeltaDeg !== 0 ? (
              <p className="cylinder-lift-note">
                Cylinder lift changes opening by {formatSigned(liftComparison.openingDeltaDeg, 1)}°
                and duration by {formatSigned(liftComparison.durationDeltaDeg, 1)}° from the measured baseline.
              </p>
            ) : null}
            {analysis.uncertainty ? (
              <p className="uncertainty-note">
                ±{formatNumber(analysis.uncertainty.travelMm, 2)} mm gives
                {" "}{formatNumber(analysis.uncertainty.durationMinDeg, 1)}° to
                {" "}{formatNumber(analysis.uncertainty.durationMaxDeg, 1)}° duration.
              </p>
            ) : null}
          </>
        ) : null}

        <details className="nested-disclosure">
          <summary>Window geometry and uncertainty</summary>
          <div className="field-grid field-grid-2 nested-fields">
            <NumberField
              compact
              label="Window width"
              value={port.widthMm}
              unit="mm"
              minimum={0}
              exclusiveMinimum
              onChange={(widthMm) => onUpdate({ widthMm })}
              help="Width of one idealised rectangular window."
            />
            <NumberField
              compact
              label="Window height"
              value={port.heightMm}
              unit="mm"
              minimum={0}
              exclusiveMinimum
              onChange={(heightMm) => onUpdate({ heightMm })}
              help="Height of the idealised rectangular window used for time-area."
            />
            <NumberField
              compact
              label="Window count"
              value={port.count}
              unit="qty"
              minimum={1}
              integer
              onChange={(count) => onUpdate({ count })}
            />
            <NumberField
              compact
              label="Measurement uncertainty"
              value={port.uncertaintyMm}
              unit="± mm"
              minimum={0}
              onChange={(uncertaintyMm) => onUpdate({ uncertaintyMm })}
            />
          </div>
          <p className="fine-print">
            Time-area uses an idealised rectangular projected window. Radius,
            chamfer, duct angle and discharge coefficient are not modelled.
          </p>
        </details>
      </div>
    </details>
  );
}

function PortTimingTable({ analysis }: { analysis: EngineProjectAnalysis }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Source</th>
            <th scope="col">Roof travel</th>
            <th scope="col">Opening</th>
            <th scope="col">Closing</th>
            <th scope="col">Duration</th>
            <th scope="col">At RPM</th>
          </tr>
        </thead>
        <tbody>
          {analysis.ports.map((port) => (
            <tr key={port.id}>
              <th scope="row">
                <span className="table-event">
                  <span
                    className="table-event-dot"
                    style={{ background: port.colour }}
                    aria-hidden="true"
                  />
                  {port.label}
                </span>
              </th>
              <td>{sourceLabel(port.sourceMode)}</td>
              <td>{formatNumber(port.travelFromTdcMm, 2)} mm</td>
              <td>{formatNumber(port.openingAngleDeg, 1)}° ATDC</td>
              <td>{formatNumber(360 - port.closingAngleDeg, 1)}° BTDC</td>
              <td>{formatNumber(port.durationDeg, 1)}°</td>
              <td>{port.durationMs === null ? "Not set" : `${formatNumber(port.durationMs, 2)} ms`}</td>
            </tr>
          ))}
          {analysis.rotary ? (
            <tr>
              <th scope="row">
                <span className="table-event">
                  <span
                    className="table-event-dot"
                    style={{ background: "#f0bd50" }}
                    aria-hidden="true"
                  />
                  Rotary inlet
                </span>
              </th>
              <td>
                {analysis.rotary.source === "crank-and-case-arcs"
                  ? "Desired timing + solved arcs"
                  : "Desired timing angles"}
              </td>
              <td>Not applicable</td>
              <td>{formatNumber(analysis.rotary.advanceBeforeTdcDeg, 1)}° BTDC</td>
              <td>{formatNumber(analysis.rotary.delayAfterTdcDeg, 1)}° ATDC</td>
              <td>{formatNumber(analysis.rotary.durationDeg, 1)}°</td>
              <td>
                {analysis.rotary.durationMs === null
                  ? "Not set"
                  : `${formatNumber(analysis.rotary.durationMs, 2)} ms`}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RotaryArcConversion({ analysis }: { analysis: EngineProjectAnalysis }) {
  const geometry = analysis.induction.geometry;
  if (!geometry) return null;
  const crankIsMeasured = geometry.measuredArc === "crank-cutaway";

  return (
    <div className="rotary-arc-conversion">
      <table>
        <caption>Solved arc geometry</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Role</th>
            <th scope="col">Arc</th>
            <th scope="col">Angular contribution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Crank cut-away</th>
            <td>{crankIsMeasured ? "Measured" : "Calculated"}</td>
            <td>
              {formatNumber(geometry.crankCutawayArcMm, 2)} mm
              {geometry.uncertainty ? (
                <small>
                  {" "}({formatMeasurementRange(
                    geometry.uncertainty.crankCutawayArcMm,
                    2,
                    "mm",
                  )})
                </small>
              ) : null}
            </td>
            <td>{formatNumber(geometry.crankCutawayDeg, 2)}°</td>
          </tr>
          <tr>
            <th scope="row">Crankcase valve opening</th>
            <td>{crankIsMeasured ? "Calculated" : "Measured"}</td>
            <td>
              {formatNumber(geometry.crankcaseWindowArcMm, 2)} mm
              {geometry.uncertainty ? (
                <small>
                  {" "}({formatMeasurementRange(
                    geometry.uncertainty.crankcaseWindowArcMm,
                    2,
                    "mm",
                  )})
                </small>
              ) : null}
            </td>
            <td>{formatNumber(geometry.crankcaseWindowDeg, 2)}°</td>
          </tr>
          <tr className="rotary-total-row">
            <th scope="row">Desired inlet total</th>
            <td>Target</td>
            <td>{formatNumber(geometry.combinedArcMm, 2)} mm</td>
            <td>{formatNumber(geometry.durationDeg, 2)}°</td>
          </tr>
        </tbody>
      </table>
      <p className="rotary-diameter-readout">
        <span>Timing-track diameter</span>
        <strong>{formatNumber(geometry.crankshaftDiameterMm, 2)} mm</strong>
      </p>
      <div className="rotary-edge-summary">
        <span>
          <small>Desired opening</small>
          <strong>
            {formatNumber(geometry.advanceBeforeTdcDeg, 2)}° BTDC
          </strong>
        </span>
        <span>
          <small>Desired closing</small>
          <strong>
            {formatNumber(geometry.delayAfterTdcDeg, 2)}° ATDC
          </strong>
        </span>
      </div>
      <p className="rotary-comparison-note">
        The {crankIsMeasured ? "crankcase opening" : "crank cut-away"} is
        calculated at full precision by subtracting the measured arc from the
        {" "}{formatNumber(geometry.combinedArcMm, 2)} mm total required by the
        desired timing.
      </p>
      {geometry.uncertainty ? (
        <p className="fine-print">
          Bounds use {geometry.uncertainty.provenance.inputs.join(" and ")} as
          deterministic worst-case inputs. No probability distribution or
          confidence level is implied.
        </p>
      ) : null}
    </div>
  );
}

function readableToken(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatMeasurementRange(
  bounds: { minimum: number; maximum: number } | null | undefined,
  digits: number,
  unit: string,
): string | null {
  return bounds
    ? `${formatNumber(bounds.minimum, digits)} to ${formatNumber(bounds.maximum, digits)} ${unit}`
    : null;
}

function RotaryAreaChart({ analysis }: { analysis: EngineProjectAnalysis }) {
  const rotary = analysis.rotary;
  if (!rotary || rotary.areaSamples.length === 0) {
    return (
      <div className="character-plot character-plot-empty">
        <div>
          <h3>Rotary inlet opening area</h3>
          <p>
            Choose an inlet area source and complete its measurement to plot
            geometric opening area against crank angle.
          </p>
        </div>
      </div>
    );
  }

  const maximumPointCount = 49;
  const stride = Math.max(
    1,
    Math.ceil((rotary.areaSamples.length - 1) / (maximumPointCount - 1)),
  );
  const plottedSamples = rotary.areaSamples.filter(
    (_, index) => index % stride === 0,
  );
  const finalSample = rotary.areaSamples.at(-1)!;
  if (plottedSamples.at(-1) !== finalSample) plottedSamples.push(finalSample);

  const width = 620;
  const height = 250;
  const left = 58;
  const right = 18;
  const top = 24;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const duration = Math.max(finalSample.elapsedDeg, 1);
  const maximumArea = Math.max(
    ...plottedSamples.map(
      (sample) => sample.maximumOpenAreaMm2 ?? sample.openAreaMm2,
    ),
    1,
  );
  const pointFor = (
    sample: (typeof plottedSamples)[number],
    areaMm2: number,
  ) => {
    const x = left + (sample.elapsedDeg / duration) * plotWidth;
    const y = top + plotHeight - (areaMm2 / maximumArea) * plotHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  const linePoints = plottedSamples
    .map((sample) => pointFor(sample, sample.openAreaMm2))
    .join(" ");
  const areaPoints = `${left},${top + plotHeight} ${linePoints} ${left + plotWidth},${top + plotHeight}`;
  const hasUncertaintyEnvelope = plottedSamples.some(
    (sample) =>
      sample.minimumOpenAreaMm2 !== null &&
      sample.maximumOpenAreaMm2 !== null,
  );
  const uncertaintyPoints = hasUncertaintyEnvelope
    ? [
        ...plottedSamples.map((sample) =>
          pointFor(
            sample,
            sample.maximumOpenAreaMm2 ?? sample.openAreaMm2,
          ),
        ),
        ...[...plottedSamples].reverse().map((sample) =>
          pointFor(
            sample,
            sample.minimumOpenAreaMm2 ?? sample.openAreaMm2,
          ),
        ),
      ].join(" ")
    : null;

  return (
    <article className="character-plot">
      <div className="character-plot-heading">
        <div>
          <h3>Rotary inlet opening area</h3>
          <p>Geometric sealing-surface overlap through the inlet event.</p>
        </div>
        <span className="plot-source">
          {rotary.areaModel === "cylindrical-overlap"
            ? "Arc overlap"
            : "Constant estimate"}
        </span>
      </div>
      <svg
        className="character-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Rotary inlet opening area from zero to ${formatNumber(duration, 1)} crank degrees, reaching ${formatNumber(rotary.maximumOpenAreaMm2, 1)} square millimetres`}
      >
        <line x1={left} x2={left} y1={top} y2={top + plotHeight} />
        <line
          x1={left}
          x2={left + plotWidth}
          y1={top + plotHeight}
          y2={top + plotHeight}
        />
        <line
          className="chart-guide"
          x1={left}
          x2={left + plotWidth}
          y1={top + plotHeight / 2}
          y2={top + plotHeight / 2}
        />
        {uncertaintyPoints ? (
          <polygon className="chart-series-band" points={uncertaintyPoints} />
        ) : null}
        <polygon className="chart-area-fill" points={areaPoints} />
        <polyline className="chart-area-line" points={linePoints} />
        <text x={left - 8} y={top + 4} textAnchor="end">
          {formatNumber(maximumArea, 0)}
        </text>
        <text x={left - 8} y={top + plotHeight + 4} textAnchor="end">
          0
        </text>
        <text x={left} y={height - 22} textAnchor="middle">
          0°
        </text>
        <text x={left + plotWidth} y={height - 22} textAnchor="middle">
          {formatNumber(duration, 1)}°
        </text>
        <text
          className="chart-axis-label"
          x={left + plotWidth / 2}
          y={height - 4}
          textAnchor="middle"
        >
          Elapsed crank angle
        </text>
        <text
          className="chart-axis-label"
          x={16}
          y={top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${top + plotHeight / 2})`}
        >
          Open area, mm²
        </text>
      </svg>
      {rotary.areaUncertainty ? (
        <p className="fine-print">
          Shaded limits propagate {rotary.areaUncertainty.provenance.inputs.join(
            ", ",
          )}. They are deterministic worst-case bounds, not a confidence band.
          Angle-area is {formatMeasurementRange(
            rotary.areaUncertainty.overlapAngleAreaMm2Deg,
            0,
            "mm²·deg",
          )}; specific time-area is {formatMeasurementRange(
            rotary.areaUncertainty.overlapSpecificTimeArea,
            7,
            "s·mm²/cc",
          ) ?? "not available until RPM and displacement are valid"}.
        </p>
      ) : null}
      <details className="chart-data-disclosure">
        <summary>Numeric area samples</summary>
        <div className="table-scroll">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th scope="col">Elapsed crank angle</th>
                <th scope="col">Open area</th>
                {hasUncertaintyEnvelope ? (
                  <th scope="col">Measurement bounds</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {plottedSamples.map((sample) => (
                <tr key={sample.elapsedDeg}>
                  <th scope="row">{formatNumber(sample.elapsedDeg, 2)}°</th>
                  <td>{formatNumber(sample.openAreaMm2, 2)} mm²</td>
                  {hasUncertaintyEnvelope ? (
                    <td>
                      {formatMeasurementRange(
                        sample.minimumOpenAreaMm2 === null ||
                          sample.maximumOpenAreaMm2 === null
                          ? null
                          : {
                              minimum: sample.minimumOpenAreaMm2,
                              maximum: sample.maximumOpenAreaMm2,
                            },
                        2,
                        "mm²",
                      ) ?? "Not available"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

function TimeAreaRpmChart({ analysis }: { analysis: EngineProjectAnalysis }) {
  const geometry = analysis.characterGeometry;
  if (!geometry || geometry.series.length === 0) {
    return (
      <div className="character-plot character-plot-empty">
        <div>
          <h3>Specific time-area across RPM</h3>
          <p>
            Complete displacement, port area and the bounded RPM sweep to plot
            geometric specific time-area.
          </p>
        </div>
      </div>
    );
  }

  const width = 620;
  const height = 250;
  const left = 68;
  const right = 18;
  const top = 24;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(
    ...geometry.series.flatMap((series) =>
      series.samples.flatMap((sample) => [
        sample.specificTimeArea,
        sample.maximum ?? sample.specificTimeArea,
      ]),
    ),
    1e-9,
  );
  const xFor = (rpm: number) =>
    left +
    ((rpm - geometry.rpmMinimum) /
      (geometry.rpmMaximum - geometry.rpmMinimum)) *
      plotWidth;
  const yFor = (value: number) =>
    top + plotHeight - (value / maximum) * plotHeight;

  return (
    <article className="character-plot">
      <div className="character-plot-heading">
        <div>
          <h3>Specific time-area across RPM</h3>
          <p>Same geometric angle-area, converted at each selected engine speed.</p>
        </div>
        <span className="plot-source">Geometric</span>
      </div>
      <svg
        className="character-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Specific time-area from ${formatNumber(geometry.rpmMinimum, 0)} to ${formatNumber(geometry.rpmMaximum, 0)} RPM for ${geometry.series.length} geometric events`}
      >
        <line x1={left} x2={left} y1={top} y2={top + plotHeight} />
        <line
          x1={left}
          x2={left + plotWidth}
          y1={top + plotHeight}
          y2={top + plotHeight}
        />
        <line
          className="chart-guide"
          x1={left}
          x2={left + plotWidth}
          y1={top + plotHeight / 2}
          y2={top + plotHeight / 2}
        />
        {geometry.series.map((series) => {
          const uncertaintyPoints = series.samples.some(
            (sample) => sample.minimum !== null && sample.maximum !== null,
          )
            ? [
                ...series.samples.map(
                  (sample) =>
                    `${xFor(sample.rpm).toFixed(2)},${yFor(sample.maximum ?? sample.specificTimeArea).toFixed(2)}`,
                ),
                ...[...series.samples]
                  .reverse()
                  .map(
                    (sample) =>
                      `${xFor(sample.rpm).toFixed(2)},${yFor(sample.minimum ?? sample.specificTimeArea).toFixed(2)}`,
                  ),
              ].join(" ")
            : null;
          const points = series.samples
            .map(
              (sample) =>
                `${xFor(sample.rpm).toFixed(2)},${yFor(sample.specificTimeArea).toFixed(2)}`,
            )
            .join(" ");
          return (
            <g key={series.id} style={{ color: series.colour }}>
              {uncertaintyPoints ? (
                <polygon className="chart-series-band" points={uncertaintyPoints} />
              ) : null}
              <polyline className="chart-series-line" points={points} />
            </g>
          );
        })}
        <text x={left - 8} y={top + 4} textAnchor="end">
          {maximum.toExponential(1)}
        </text>
        <text x={left - 8} y={top + plotHeight + 4} textAnchor="end">
          0
        </text>
        <text x={left} y={height - 22} textAnchor="middle">
          {formatNumber(geometry.rpmMinimum, 0)}
        </text>
        <text x={left + plotWidth} y={height - 22} textAnchor="middle">
          {formatNumber(geometry.rpmMaximum, 0)}
        </text>
        <text
          className="chart-axis-label"
          x={left + plotWidth / 2}
          y={height - 4}
          textAnchor="middle"
        >
          Engine speed, RPM
        </text>
        <text
          className="chart-axis-label"
          x={16}
          y={top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${top + plotHeight / 2})`}
        >
          Specific time-area, s·mm²/cc
        </text>
      </svg>
      <div className="character-series-legend" aria-label="Time-area series">
        {geometry.series.map((series) => (
          <span key={series.id}>
            <i style={{ background: series.colour }} aria-hidden="true" />
            {series.label}
          </span>
        ))}
      </div>
      <details className="chart-data-disclosure">
        <summary>Numeric RPM samples</summary>
        <div className="table-scroll">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th scope="col">RPM</th>
                {geometry.series.map((series) => (
                  <th scope="col" key={series.id}>
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {geometry.series[0].samples.map((_, sampleIndex) => (
                <tr key={geometry.series[0].samples[sampleIndex].rpm}>
                  <th scope="row">
                    {formatNumber(geometry.series[0].samples[sampleIndex].rpm, 0)}
                  </th>
                  {geometry.series.map((series) => {
                    const sample = series.samples[sampleIndex];
                    return (
                      <td key={series.id}>
                        {formatTimeArea(sample.specificTimeArea)}
                        {sample.minimum !== null && sample.maximum !== null ? (
                          <small className="table-sublabel">
                            {formatTimeArea(sample.minimum)} to {formatTimeArea(sample.maximum)}
                          </small>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

function CharacterSignature({
  character,
}: {
  character: NonNullable<EngineProjectAnalysis["character"]>;
}) {
  const rows = [
    {
      id: "rpm-bias",
      label: "RPM / speed emphasis",
      description:
        "Where the selected profile and timing place relative speed emphasis.",
      lowerLabel: "Lower-speed biased",
      upperLabel: "Higher-speed biased",
      score: character.rpmBias,
    },
    {
      id: "low-speed-response",
      label: "Low-speed response",
      description:
        "Relative tendency to retain response at lower engine speeds.",
      lowerLabel: "Less immediate",
      upperLabel: "More immediate",
      score: character.lowSpeedResponse,
    },
    {
      id: "useful-band-breadth",
      label: "Useful-band breadth",
      description: "Relative tendency towards a focused or broad useful band.",
      lowerLabel: "Focused",
      upperLabel: "Broad",
      score: character.midRangeBreadth,
    },
    {
      id: "over-rev-tendency",
      label: "Over-rev tendency",
      description:
        "Relative tendency to carry beyond the main useful-speed region.",
      lowerLabel: "Lower",
      upperLabel: "Higher",
      score: character.overRevTendency,
    },
  ];

  return (
    <figure className="character-signature" aria-labelledby="character-signature-heading">
      <figcaption className="character-signature-heading">
        <div>
          <h3 id="character-signature-heading">Character signature</h3>
          <p>
            Four relative heuristic scores on a 0 to 100 scale. They describe
            tendencies, not torque, power or a safe engine-speed limit.
          </p>
        </div>
        <div className="character-score-legend" aria-label="Character score key">
          <span>
            <i className="character-legend-marker" aria-hidden="true" />
            Nominal marker
          </span>
          <span>
            <i className="character-legend-range" aria-hidden="true" />
            Measurement range
          </span>
        </div>
      </figcaption>
      <ul className="character-score-list">
        {rows.map((row) => {
          const rangeWidth = Math.max(
            0,
            row.score.maximum - row.score.minimum,
          );
          return (
            <li className="character-score-row" key={row.id}>
              <div className="character-score-copy">
                <h4>{row.label}</h4>
                <p>{row.description}</p>
              </div>
              <div className="character-score-plot">
                <div className="character-score-scale" aria-hidden="true">
                  <span>{row.lowerLabel}</span>
                  <span>{row.upperLabel}</span>
                </div>
                <div className="character-score-track" aria-hidden="true">
                  <span
                    className="character-score-range"
                    style={{
                      left: `${row.score.minimum}%`,
                      width: `${rangeWidth}%`,
                    }}
                  />
                  <span
                    className="character-score-marker"
                    style={{ left: `${row.score.value}%` }}
                  />
                </div>
              </div>
              <div className="character-score-values">
                <strong>{formatNumber(row.score.value, 0)}</strong>
                <span>/100 nominal</span>
                <small>
                  {formatNumber(row.score.minimum, 0)} to{" "}
                  {formatNumber(row.score.maximum, 0)} range
                </small>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

function TransmissionChart({
  result,
  referenceRpm,
}: {
  result: TransmissionResult;
  referenceRpm: number | null;
}) {
  const width = 780;
  const height = 390;
  const margin = { top: 28, right: 34, bottom: 62, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const rawMaximumSpeed = Math.max(
    10,
    ...result.gears.map((gear) => gear.speedAtMaximumRpmKmh),
  );
  const maximumSpeed = Math.ceil((rawMaximumSpeed * 1.08) / 10) * 10;
  const x = (speedKmh: number) =>
    margin.left + (speedKmh / maximumSpeed) * plotWidth;
  const y = (rpm: number) =>
    margin.top + plotHeight - (rpm / result.maximumRpm) * plotHeight;
  const speedTicks = Array.from({ length: 6 }, (_, index) =>
    (maximumSpeed * index) / 5,
  );
  const rpmTicks = Array.from({ length: 6 }, (_, index) =>
    (result.maximumRpm * index) / 5,
  );
  const visibleReferenceRpm =
    referenceRpm !== null &&
    referenceRpm > 0 &&
    referenceRpm <= result.maximumRpm
      ? referenceRpm
      : null;

  return (
    <figure className="gearing-chart-frame">
      <div
        className="gearing-chart-scroll"
        tabIndex={0}
        aria-label="Scrollable transmission chart"
      >
        <svg
          className="character-chart gearing-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="gearing-chart-title gearing-chart-description"
        >
        <title id="gearing-chart-title">
          Theoretical engine speed against road speed for each gear
        </title>
        <desc id="gearing-chart-description">
          Road speed in kilometres per hour is on the horizontal axis. Engine
          speed in revolutions per minute is on the vertical axis. Each straight
          line represents one configured gear.
        </desc>
        {rpmTicks.map((tick) => (
          <g key={`rpm-${tick}`}>
            <line
              className="chart-guide"
              x1={margin.left}
              y1={y(tick)}
              x2={width - margin.right}
              y2={y(tick)}
            />
            <text x={margin.left - 12} y={y(tick) + 4} textAnchor="end">
              {formatNumber(tick, 0)}
            </text>
          </g>
        ))}
        {speedTicks.map((tick) => (
          <g key={`speed-${tick}`}>
            <line
              className="chart-guide"
              x1={x(tick)}
              y1={margin.top}
              x2={x(tick)}
              y2={height - margin.bottom}
            />
            <text
              x={x(tick)}
              y={height - margin.bottom + 24}
              textAnchor="middle"
            >
              {formatNumber(tick, 0)}
            </text>
          </g>
        ))}
        {visibleReferenceRpm !== null ? (
          <g className="gearing-reference-line">
            <line
              x1={margin.left}
              y1={y(visibleReferenceRpm)}
              x2={width - margin.right}
              y2={y(visibleReferenceRpm)}
            />
            <text
              x={width - margin.right - 4}
              y={y(visibleReferenceRpm) - 7}
              textAnchor="end"
            >
              Current {formatNumber(visibleReferenceRpm, 0)} RPM
            </text>
          </g>
        ) : null}
        {result.gears.map((gear, index) => {
          const colour = transmissionColours[index];
          const labelFraction = 0.58 + index * 0.075;
          const labelRpm = result.maximumRpm * labelFraction;
          const labelSpeed = gear.speedAtMaximumRpmKmh * labelFraction;
          return (
            <g key={gear.id}>
              <line
                className="gearing-series-line"
                x1={x(0)}
                y1={y(0)}
                x2={x(gear.speedAtMaximumRpmKmh)}
                y2={y(result.maximumRpm)}
                style={{ stroke: colour }}
              />
              <text
                className="gearing-series-label"
                x={x(labelSpeed) + 7}
                y={y(labelRpm) - 5}
                style={{ fill: colour }}
              >
                {gear.gearNumber}
              </text>
            </g>
          );
        })}
        <text
          className="chart-axis-label"
          x={margin.left + plotWidth / 2}
          y={height - 10}
          textAnchor="middle"
        >
          Road speed, km/h
        </text>
        <text
          className="chart-axis-label"
          transform={`translate(18 ${margin.top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Engine speed, RPM
        </text>
        </svg>
      </div>
      <figcaption>
        <div className="gearing-legend" aria-label="Gear line key">
          {result.gears.map((gear, index) => (
            <span key={gear.id}>
              <i
                aria-hidden="true"
                style={{ background: transmissionColours[index] }}
              />
              {gear.label}
            </span>
          ))}
        </div>
      </figcaption>
    </figure>
  );
}

function TransmissionResults({
  analysis,
  project,
}: {
  analysis: EngineProjectAnalysis;
  project: EngineProjectDraft;
}) {
  if (!analysis.transmission.enabled) return null;
  const result = analysis.transmission.result;
  const referenceRpm = parseLocaleNumber(project.geometry.rpm);

  return (
    <section className="result-section gearing-results" id="gearing-results">
      <SectionHeading
        title="Transmission and road speed"
        detail="Deterministic gearing from entered tooth counts and measured rolling circumference. Speed is theoretical."
      />
      {result ? (
        <>
          <div className="result-stat-grid gearing-stat-grid">
            <Metric
              label="Primary reduction"
              value={formatNumber(result.primaryRatio, 3)}
              unit=":1"
              detail={`${project.transmission.primaryDrivePinionTeeth}/${project.transmission.primaryDrivenGearTeeth} teeth`}
            />
            <Metric
              label="Top-gear reduction"
              value={formatNumber(result.gears.at(-1)?.gearRatio, 3)}
              unit=":1"
              detail="Gear wheel ÷ cluster pinion"
            />
            <Metric
              label="Overall top ratio"
              value={formatNumber(result.gears.at(-1)?.overallReduction, 3)}
              unit=":1"
              detail="Primary × top gear"
            />
            <Metric
              label="Highest plotted speed"
              value={formatNumber(result.maximumSpeedKmh, 1)}
              unit="km/h"
              detail={`At ${formatNumber(result.maximumRpm, 0)} RPM`}
              tone="accent"
            />
          </div>
          <TransmissionChart result={result} referenceRpm={referenceRpm} />
          <div className="table-scroll gearing-table-wrap">
            <table className="data-table gearing-table">
              <caption className="visually-hidden">
                Transmission ratios and theoretical road speed by gear
              </caption>
              <thead>
                <tr>
                  <th scope="col">Gear</th>
                  <th scope="col">Cluster / wheel</th>
                  <th scope="col">Gear ratio</th>
                  <th scope="col">Overall reduction</th>
                  <th scope="col">km/h per 1,000 RPM</th>
                  <th scope="col">Speed at max RPM</th>
                  <th scope="col">RPM after upshift</th>
                  <th scope="col">RPM drop</th>
                </tr>
              </thead>
              <tbody>
                {result.gears.map((gear, index) => (
                  <tr key={gear.id}>
                    <th scope="row">
                      <span
                        className="table-phase-dot"
                        style={{ background: transmissionColours[index] }}
                        aria-hidden="true"
                      />
                      {gear.label}
                    </th>
                    <td>
                      {gear.clusterPinionTeeth} / {gear.drivenGearTeeth}
                    </td>
                    <td>{formatNumber(gear.gearRatio, 3)}:1</td>
                    <td>{formatNumber(gear.overallReduction, 3)}:1</td>
                    <td>{formatNumber(gear.speedKmhPer1000Rpm, 2)}</td>
                    <td>{formatNumber(gear.speedAtMaximumRpmKmh, 1)} km/h</td>
                    <td>
                      {gear.rpmAfterUpshiftAtMaximumRpm === null
                        ? "Not applicable"
                        : `${formatNumber(gear.rpmAfterUpshiftAtMaximumRpm, 0)} RPM`}
                    </td>
                    <td>
                      {gear.rpmDropPercent === null
                        ? "Not applicable"
                        : `${formatNumber(gear.rpmDropPercent, 1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analysis.transmission.diagnostics.length ? (
            <ul className="gearing-diagnostics">
              {analysis.transmission.diagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          ) : null}
          <p className="model-note gearing-boundary">
            The graph assumes fixed ratios and the entered rolling circumference.
            It excludes tyre deformation or growth, clutch or tyre slip,
            transmission losses, engine load, gradient, wind and aerodynamic drag.
            It therefore does not predict an achievable maximum speed.
          </p>
        </>
      ) : (
        <div className="character-plot-empty gearing-empty" role="status">
          <div>
            <h3>Complete the transmission inputs</h3>
            <p>
              Enter positive whole tooth counts, four or five complete gears, a
              rolling circumference and a graph RPM limit.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function EngineCharacterEstimate({
  analysis,
  project,
}: {
  analysis: EngineProjectAnalysis;
  project: EngineProjectDraft;
}) {
  const character = analysis.character;
  const selectedProfile = characterProfileOptions.find(
    (profile) => profile.value === project.character.profile,
  );
  const lowSpeedDescription = character
    ? character.lowSpeedResponse.value >= 66
      ? "stronger lower-speed tendency"
      : character.lowSpeedResponse.value >= 40
        ? "balanced lower-speed tendency"
        : "reduced lower-speed tendency"
    : null;

  return (
    <section className="result-section character-estimate" id="character-results">
      <SectionHeading
        title="Engine character estimate"
        detail="Real geometric area and time-area plots, with optional profile-qualified interpretation. No output curve is predicted."
      />
      <div className="character-plot-grid">
        <RotaryAreaChart analysis={analysis} />
        <TimeAreaRpmChart analysis={analysis} />
      </div>
      {character ? <CharacterSignature character={character} /> : null}
      <aside className="character-interpretation" aria-label="Profile interpretation">
        <div>
          <span className="evidence-level profile-heuristic">
            Profile heuristic
          </span>
          <h3>{selectedProfile?.label ?? "No profile"}</h3>
          <p>{selectedProfile?.description}</p>
        </div>
        {character ? (
          <dl>
            <div>
              <dt>Speed emphasis</dt>
              <dd>{readableToken(character.speedEmphasis)}</dd>
            </div>
            <div>
              <dt>Useful band</dt>
              <dd>{readableToken(character.bandShape)}</dd>
            </div>
            <div>
              <dt>Delivery note</dt>
              <dd>{lowSpeedDescription}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{character.modelVersion}</dd>
            </div>
          </dl>
        ) : (
          <p className="character-no-profile">
            Geometry remains available without interpretation. Select a profile
            to add conditional lower-, mid- or upper-speed annotations.
          </p>
        )}
      </aside>
      <p className="model-note character-boundary">
        {character?.modelStatement ??
          "These plots show geometric opening and flow opportunity only. They do not predict output, combustion, exhaust-wave behaviour or a safe engine-speed range."}
      </p>
    </section>
  );
}

function DiagnosticLevels({ analysis }: { analysis: EngineProjectAnalysis }) {
  const levels = [
    {
      id: "calculated-geometry" as const,
      label: "Calculated geometry",
      description: "Deterministic relationships from the current inputs.",
    },
    {
      id: "profile-heuristic" as const,
      label: "Profile heuristic",
      description: "Conditional interpretation from the selected use profile.",
    },
    {
      id: "measured-or-modelled" as const,
      label: "Measured or modelled",
      description: "Results whose boundary depends on a stated measurement or model.",
    },
  ];
  return (
    <section className="result-section diagnostics-levels" id="diagnostic-results">
      <SectionHeading
        title="Diagnostic levels"
        detail="Claim strength and warning severity remain separate, so a contextual note cannot override invalid geometry."
      />
      <div className="diagnostic-level-grid">
        {levels.map((level) => {
          const items = analysis.advisories.filter(
            (advisory) => advisory.evidence === level.id,
          );
          return (
            <article key={level.id}>
              <span className={`evidence-level ${level.id}`}>{level.label}</span>
              <p className="diagnostic-level-description">{level.description}</p>
              <ul>
                {items.map((item) => (
                  <li className={`diagnostic-tone-${item.tone}`} key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        {item.sourceLabel ?? "Source"}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export interface EngineWorkbenchProps {
  shareBaseUrl?: string;
  updateLocationOnShare?: boolean;
}

export function EngineWorkbench({
  shareBaseUrl,
  updateLocationOnShare = true,
}: EngineWorkbenchProps = {}) {
  const [project, setProject] = useState<EngineProjectDraft>(() =>
    cloneDemonstrationProject(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [autosaveBlocked, setAutosaveBlocked] = useState(false);
  const [actionStatus, setActionStatus] = useState(
    "Illustrative values loaded. Edit any field to begin.",
  );
  const [localSaveState, setLocalSaveState] = useState<
    "checking" | "saved" | "invalid" | "paused" | "unavailable"
  >("checking");
  const [selectedArc, setSelectedArc] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<EngineProjectAnalysis | null>(null);
  const [mobileView, setMobileView] = useState<"inputs" | "map" | "results">(
    "map",
  );
  const [openPrimarySections, setOpenPrimarySections] = useState({
    report: true,
    geometry: true,
    cylinderLift: true,
    ports: true,
    induction: true,
    character: true,
    transmission: true,
  });
  const [reportGeneratedAt, setReportGeneratedAt] = useState(() =>
    formatGeneratedAt(new Date()),
  );
  const importInputRef = useRef<HTMLInputElement>(null);

  const analysis = useMemo(() => analyseProject(project), [project]);
  const portableProject = useMemo(
    () => validateProjectDocument(project),
    [project],
  );
  const geometryBoreMm = parseLocaleNumber(project.geometry.boreMm);
  const geometryStrokeMm = parseLocaleNumber(project.geometry.strokeMm);
  const requestedCylinderLiftMm = parseLocaleNumber(
    project.compression.baseSpacerThicknessMm,
  );
  const rotaryAdvanceDeg = parseLocaleNumber(project.induction.advanceBtdcDeg);
  const rotaryDelayDeg = parseLocaleNumber(project.induction.delayAtdcDeg);
  const rotaryDiameterMm = parseLocaleNumber(project.induction.crankshaftDiameterMm);
  const rotaryMeasuredArcMm = parseLocaleNumber(project.induction.measuredArcMm);
  const rotaryCircumferenceMm =
    rotaryDiameterMm !== null && rotaryDiameterMm > 0
      ? Math.PI * rotaryDiameterMm
      : null;
  const rotaryDesiredDurationDeg =
    rotaryAdvanceDeg !== null && rotaryDelayDeg !== null
      ? rotaryAdvanceDeg + rotaryDelayDeg
      : null;
  const rotaryRequiredCombinedArcMm =
    rotaryCircumferenceMm !== null &&
    rotaryDesiredDurationDeg !== null &&
    rotaryDesiredDurationDeg >= 0 &&
    rotaryDesiredDurationDeg <= 360
      ? (rotaryCircumferenceMm * rotaryDesiredDurationDeg) / 360
      : null;
  const showCylinderLiftReferenceMarkers =
    analysis.cylinderLift.appliedThicknessMm > 0 &&
    project.presentation.showAnalysisOverlays &&
    project.presentation.showReferenceLabels;
  const rotaryTimingValidationMessage =
    rotaryAdvanceDeg !== null &&
    rotaryDelayDeg !== null &&
    rotaryAdvanceDeg + rotaryDelayDeg > 360
      ? "Opening advance and closing delay must total 360° or less."
      : project.induction.timingSource === "crank-and-case-arcs" &&
          rotaryAdvanceDeg !== null &&
          rotaryDelayDeg !== null &&
          rotaryAdvanceDeg + rotaryDelayDeg <= 0
        ? "Arc sizing requires a desired duration greater than 0°."
      : null;
  const rotaryMeasuredArcValidationMessage =
    rotaryRequiredCombinedArcMm !== null &&
    rotaryMeasuredArcMm !== null &&
    rotaryRequiredCombinedArcMm - rotaryMeasuredArcMm <=
      Math.max(
        1,
        rotaryCircumferenceMm ?? 0,
        rotaryRequiredCombinedArcMm,
      ) *
        1e-12
      ? `Use less than ${formatConstraint(rotaryRequiredCombinedArcMm)} mm so the calculated counterpart remains positive.`
      : null;
  const isIllustrativeProject = useMemo(
    () => serialiseProject(project) === DEMONSTRATION_PROJECT_JSON,
    [project],
  );
  const reportDetailLineCount = project.report.engineDetails.split(/\r\n?|\n/u).length;
  const reportDetailsError =
    reportDetailLineCount > 3 ? "Use no more than three lines." : null;
  const canPrint =
    portableProject.ok && analysis.validGeometry && analysis.cylinderLift.valid;
  const localSaveMessage =
    localSaveState === "saved"
      ? "Saved locally"
      : localSaveState === "invalid"
        ? "Not saved: invalid inputs"
        : localSaveState === "paused"
          ? "Local saving paused"
        : localSaveState === "unavailable"
          ? "Local saving unavailable"
          : "Checking local save";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let restored = false;
      if (window.location.hash.startsWith("#p=")) {
        const decoded = decodeProjectFragment(window.location.hash);
        if (decoded.ok) {
          setProject(decoded.project);
          setActionStatus("Shared project loaded in this browser.");
          restored = true;
        } else {
          setActionStatus(decoded.message);
        }
      }
      if (!restored) {
        const stored = loadProjectFromStorage(window.localStorage);
        if (stored.ok && stored.project) {
          setProject(stored.project);
          setActionStatus("Last valid local project restored.");
        } else if (!stored.ok && stored.status === "invalid") {
          setAutosaveBlocked(true);
          setLocalSaveState("paused");
          setActionStatus(
            "Stored project was invalid and was preserved. Local saving is paused until you edit, import, reset or clear it.",
          );
        } else if (!stored.ok) {
          setActionStatus(stored.message);
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const prepare = () => setReportGeneratedAt(formatGeneratedAt(new Date()));
    window.addEventListener("beforeprint", prepare);
    return () => {
      window.removeEventListener("beforeprint", prepare);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (autosaveBlocked) {
      return;
    }
    let nextSaveState: typeof localSaveState;
    let saveFailureMessage: string | null = null;

    if (
      !analysis.validGeometry ||
      !analysis.cylinderLift.valid ||
      !portableProject.ok
    ) {
      nextSaveState = "invalid";
    } else {
      try {
        window.localStorage.setItem(
          PROJECT_STORAGE_KEY,
          serialiseProject(portableProject.project),
        );
        nextSaveState = "saved";
      } catch {
        nextSaveState = "unavailable";
        saveFailureMessage = "Automatic local save is unavailable in this browser.";
      }
    }

    const timer = window.setTimeout(() => {
      setLocalSaveState(nextSaveState);
      if (saveFailureMessage) setActionStatus(saveFailureMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    analysis.cylinderLift.valid,
    analysis.validGeometry,
    autosaveBlocked,
    hydrated,
    portableProject,
  ]);

  function noteEdit() {
    setAutosaveBlocked(false);
    setActionStatus(
      "Changes calculated in real time. Local save follows the latest valid project inputs.",
    );
  }

  function switchMobileView(view: "inputs" | "map" | "results") {
    setMobileView(view);
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  }

  function setPrimarySectionOpen(
    section: keyof typeof openPrimarySections,
    open: boolean,
  ) {
    setOpenPrimarySections((current) =>
      current[section] === open ? current : { ...current, [section]: open },
    );
  }

  function updateGeometry(
    key: keyof EngineProjectDraft["geometry"],
    value: string,
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      geometry: { ...current.geometry, [key]: value },
    }));
  }

  function updateReport<K extends keyof EngineProjectDraft["report"]>(
    key: K,
    value: EngineProjectDraft["report"][K],
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      report: { ...current.report, [key]: value },
    }));
  }

  function updateCompression<K extends keyof EngineProjectDraft["compression"]>(
    key: K,
    value: EngineProjectDraft["compression"][K],
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      compression: { ...current.compression, [key]: value },
    }));
  }

  function nudgeCylinderLift(deltaMm: number) {
    const current = requestedCylinderLiftMm ?? 0;
    const maximum = analysis.cylinderLift.maximumThicknessMm ?? Number.POSITIVE_INFINITY;
    const next = Math.min(maximum, Math.max(0, current + deltaMm));
    updateCompression(
      "baseSpacerThicknessMm",
      String(Number(next.toFixed(6))),
    );
  }

  function updateSquish<K extends keyof EngineProjectDraft["squish"]>(
    key: K,
    value: EngineProjectDraft["squish"][K],
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      squish: { ...current.squish, [key]: value },
    }));
  }

  function updateInduction<K extends keyof EngineProjectDraft["induction"]>(
    key: K,
    value: EngineProjectDraft["induction"][K],
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      induction: { ...current.induction, [key]: value },
    }));
  }

  function updateCharacter<K extends keyof EngineProjectDraft["character"]>(
    key: K,
    value: EngineProjectDraft["character"][K],
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      character: { ...current.character, [key]: value },
    }));
  }

  function updateTransmission<
    K extends keyof EngineProjectDraft["transmission"],
  >(key: K, value: EngineProjectDraft["transmission"][K]) {
    noteEdit();
    setProject((current) => ({
      ...current,
      transmission: { ...current.transmission, [key]: value },
    }));
  }

  function updateTransmissionGear(
    index: number,
    patch: Partial<EngineProjectDraft["transmission"]["gears"][number]>,
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      transmission: {
        ...current.transmission,
        gears: current.transmission.gears.map((gear, gearIndex) =>
          gearIndex === index ? { ...gear, ...patch } : gear,
        ),
      },
    }));
  }

  function setRotaryMeasuredArc(
    measuredArc: EngineProjectDraft["induction"]["measuredArc"],
  ) {
    if (measuredArc === project.induction.measuredArc) return;
    noteEdit();
    setProject((current) => ({
      ...current,
      induction: changeRotaryMeasuredArc(
        current.induction,
        measuredArc,
        analysis.induction.geometry,
      ),
    }));
  }

  function updatePort(id: string, patch: Partial<PortDraft>) {
    noteEdit();
    let resolvedPatch = patch;
    if (patch.sourceMode) {
      const currentAnalysis = analysis.cylinderLift.ports.find(
        (port) => port.id === id,
      );
      const strokeMm = parseLocaleNumber(project.geometry.strokeMm);
      const deckPositionMm = parseLocaleNumber(project.geometry.deckPositionMm) ?? 0;
      if (currentAnalysis && strokeMm !== null) {
        const converted =
          patch.sourceMode === "travel-from-tdc"
            ? currentAnalysis.baselineTravelFromTdcMm
            : patch.sourceMode === "height-above-bdc"
              ? strokeMm - currentAnalysis.baselineTravelFromTdcMm
              : patch.sourceMode === "depth-from-deck"
                ? currentAnalysis.baselineTravelFromTdcMm + deckPositionMm
                : patch.sourceMode === "opening-angle"
                  ? currentAnalysis.baselineOpeningAngleDeg
                  : currentAnalysis.baselineDurationDeg;
        resolvedPatch = {
          ...patch,
          sourceValue: String(Number(converted.toFixed(8))),
        };
      }
    }
    setProject((current) => ({
      ...current,
      ports: current.ports.map((port) =>
        port.id === id ? { ...port, ...resolvedPatch } : port,
      ),
    }));
  }

  function addTransfer() {
    noteEdit();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `transfer-${Date.now()}`;
    const port: PortDraft = {
      id,
      label: "Additional transfer",
      kind: "primary-transfer",
      enabled: true,
      sourceMode: "travel-from-tdc",
      sourceValue: "40",
      widthMm: "10",
      heightMm: "8",
      count: "1",
      uncertaintyMm: "0.10",
    };
    setProject((current) => ({ ...current, ports: [...current.ports, port] }));
  }

  function removePort(id: string) {
    noteEdit();
    setProject((current) => ({
      ...current,
      ports: current.ports.filter((port) => port.id !== id),
    }));
  }

  function resetProject() {
    if (!window.confirm("Reset every field to the illustrative project?")) return;
    setProject(cloneDemonstrationProject());
    setAutosaveBlocked(false);
    setBaseline(null);
    setActionStatus("Illustrative project restored.");
    window.location.hash = "";
  }

  function clearLocalData() {
    if (
      !window.confirm(
        "Clear locally saved project data from this browser? The current fields will remain open and automatic local saving will pause until the next edit.",
      )
    ) {
      return;
    }
    const cleared = clearProjectFromStorage(window.localStorage);
    if (!cleared.ok) {
      setActionStatus(cleared.message);
      return;
    }
    setAutosaveBlocked(true);
    setLocalSaveState("paused");
    setActionStatus(
      "Local project data cleared. Current fields remain open; local saving resumes after the next edit.",
    );
  }

  function exportProject() {
    if (!portableProject.ok) {
      setActionStatus(`Project not exported: ${portableProject.message}`);
      return;
    }
    downloadText(
      serialiseProject(portableProject.project),
      "application/json;charset=utf-8",
      `${safeProjectFilename(project.name)}-project.json`,
    );
    setActionStatus("Project JSON exported.");
  }

  function exportSvg() {
    const svg = document.getElementById("phase360-diagram");
    if (!(svg instanceof SVGElement)) {
      setActionStatus("The diagram is not ready to export.");
      return;
    }
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    downloadText(
      new XMLSerializer().serializeToString(copy),
      "image/svg+xml;charset=utf-8",
      `${safeProjectFilename(project.name)}-timing-diagram.svg`,
    );
    setActionStatus("Timing diagram SVG exported.");
  }

  function printReport() {
    if (!canPrint) {
      setActionStatus(
        "Print unavailable: complete the valid project geometry and report details first.",
      );
      return;
    }
    const generatedAt = formatGeneratedAt(new Date());
    setReportGeneratedAt(generatedAt);
    setActionStatus("A4 report prepared. Use the print dialogue to print or save as PDF.");
    window.requestAnimationFrame(() => window.print());
  }

  async function shareProject() {
    if (!portableProject.ok) {
      setActionStatus(`Project not shared: ${portableProject.message}`);
      return;
    }
    const encoded = encodeProjectFragment(portableProject.project);
    if (encoded.length > MAX_SHARE_FRAGMENT_LENGTH) {
      setActionStatus("This project is too large for a reliable link. Export JSON instead.");
      return;
    }
    const url = new URL(shareBaseUrl ?? window.location.href);
    url.hash = `p=${encoded}`;
    if (updateLocationOnShare) {
      window.history.replaceState(null, "", url);
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setActionStatus("Private fragment link copied. Project data was not sent to a server.");
    } catch {
      setActionStatus(
        updateLocationOnShare
          ? "Share link created in the address bar. Copy it from there."
          : "The web share link could not be copied. Export JSON instead.",
      );
    }
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 48_000) {
      setActionStatus("Import rejected: the project file is too large.");
      return;
    }
    let contents: string;
    try {
      contents = await file.text();
    } catch {
      setActionStatus("Import rejected: the project file could not be read.");
      return;
    }
    const parsed = parseProjectJson(contents);
    if (!parsed.ok) {
      setActionStatus(`Import rejected: ${parsed.message}`);
      return;
    }
    setProject(parsed.project);
    setAutosaveBlocked(false);
    setBaseline(null);
    setActionStatus("Project imported and all results recalculated.");
  }

  const timingPhases = useMemo<TimingPhaseArc[]>(() => {
    const portArcs = analysis.ports.map((port, index) => ({
      id: port.id,
      start: port.openingAngleDeg,
      end: port.closingAngleDeg,
      colour: port.colour,
      label: port.label,
      category: port.kind === "exhaust" ? "Exhaust" : "Transfers",
      ring: index,
    }));
    if (analysis.rotary) {
      portArcs.push({
        id: "rotary-inlet",
        start: analysis.rotary.interval.startDeg,
        end: analysis.rotary.interval.endDeg,
        colour: "#f0bd50",
        label: "Rotary inlet",
        category: "Induction",
        ring: analysis.ports.length,
      });
    }
    if (project.presentation.showAnalysisOverlays) {
      if (
        analysis.exhaust &&
        analysis.timing.globalBlowdownDeg !== null &&
        analysis.timing.globalBlowdownDeg > 0
      ) {
        portArcs.push({
          id: "global-blowdown",
          start: analysis.exhaust.openingAngleDeg,
          end:
            analysis.exhaust.openingAngleDeg + analysis.timing.globalBlowdownDeg,
          colour: "#f5e0a3",
          label: "Blowdown window",
          category: "Analysis",
          ring: analysis.ports.length + 1,
        });
      }
      analysis.rotary?.unionTransferOverlapSegments.forEach((segment, index) => {
        portArcs.push({
          id: `inlet-transfer-overlap-${index}`,
          start: segment.startDeg,
          end: segment.endDeg,
          colour: "#f7d35f",
          label: "Inlet and transfer overlap",
          category: "Analysis",
          ring: analysis.ports.length + 2,
        });
      });
      analysis.rotary?.tripleOverlapSegments.forEach((segment, index) => {
        portArcs.push({
          id: `triple-overlap-${index}`,
          start: segment.startDeg,
          end: segment.endDeg,
          colour: "#ef7fa5",
          label: "Inlet, exhaust and transfer overlap",
          category: "Analysis",
          ring: analysis.ports.length + 3,
        });
      });
    }
    return portArcs;
  }, [analysis, project.presentation.showAnalysisOverlays]);

  const timingMarkers = useMemo<TimingMarker[]>(() => {
    if (!project.presentation.showReferenceLabels) return [];
    const currentMarkers = analysis.ports.flatMap((port) => [
      {
        id: `${port.id}-opens`,
        angle: port.openingAngleDeg,
        label: `${port.label} opens`,
        colour: port.colour,
      },
      {
        id: `${port.id}-closes`,
        angle: port.closingAngleDeg,
        label: `${port.label} closes`,
        colour: port.colour,
      },
    ]);
    const baselineMarkers =
      showCylinderLiftReferenceMarkers
        ? analysis.cylinderLift.ports.flatMap((port) => [
            {
              id: `${port.id}-baseline-opens`,
              angle: port.baselineOpeningAngleDeg,
              label: `${port.label} no-spacer opening`,
              colour: "#a9ada3",
            },
            {
              id: `${port.id}-baseline-closes`,
              angle: 360 - port.baselineOpeningAngleDeg,
              label: `${port.label} no-spacer closing`,
              colour: "#a9ada3",
            },
          ])
        : [];
    const rotaryMarkers = analysis.rotary
      ? [
          {
            id: "rotary-inlet-opens",
            angle: analysis.rotary.interval.startDeg,
            label: "Rotary inlet opens",
            colour: "#f0bd50",
          },
          {
            id: "rotary-inlet-closes",
            angle: analysis.rotary.interval.endDeg,
            label: "Rotary inlet closes",
            colour: "#f0bd50",
          },
        ]
      : [];
    return [...currentMarkers, ...rotaryMarkers, ...baselineMarkers];
  }, [
    analysis.cylinderLift,
    analysis.ports,
    analysis.rotary,
    project.presentation.showReferenceLabels,
    showCylinderLiftReferenceMarkers,
  ]);

  const selectedTimingPhase = useMemo(
    () => timingPhases.find((phase) => phase.id === selectedArc) ?? null,
    [selectedArc, timingPhases],
  );
  const selectedTimingMarker = useMemo(
    () => timingMarkers.find((marker) => marker.id === selectedArc) ?? null,
    [selectedArc, timingMarkers],
  );
  const selectedLiftComparison = useMemo(
    () =>
      analysis.cylinderLift.ports.find((port) => port.id === selectedArc) ?? null,
    [analysis.cylinderLift.ports, selectedArc],
  );

  function revealPortEditor(portId: string) {
    setMobileView("inputs");
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`port-${portId}`);
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const scenarioEffects = useMemo(() => {
    const boreMm = parseLocaleNumber(project.geometry.boreMm);
    const strokeMm = parseLocaleNumber(project.geometry.strokeMm);
    const rodLengthMm = parseLocaleNumber(project.geometry.rodLengthMm);
    const clearanceVolumeCc = analysis.compression.clearanceVolumeCc;
    if (
      boreMm === null ||
      strokeMm === null ||
      rodLengthMm === null ||
      clearanceVolumeCc === null ||
      !analysis.exhaust ||
      analysis.squish.meanGapMm === null
    ) {
      return [];
    }
    const baseInput = {
      boreMm,
      strokeMm,
      rodLengthMm,
      clearanceVolumeCc,
      squishGapMm: analysis.squish.meanGapMm,
      exhaustRoofTravelFromTdcMm: analysis.exhaust.travelFromTdcMm,
      transferRoofTravelsFromTdcMm: Object.fromEntries(
        analysis.transfers.map((transfer) => [
          transfer.port.id,
          transfer.port.travelFromTdcMm,
        ]),
      ),
    };
    const changes = [
      {
        label: "Head gasket",
        value: parseLocaleNumber(project.compression.headGasketThicknessMm),
        change: (amount: number) =>
          ({ kind: "head-gasket", thicknessMm: amount }) as const,
      },
      {
        label: "Exhaust roof raise",
        value: parseLocaleNumber(project.compression.exhaustRaiseMm),
        change: (amount: number) =>
          ({ kind: "exhaust-roof-raise", heightMm: amount }) as const,
      },
    ];
    return changes.flatMap((entry) => {
      if (entry.value === null || entry.value <= 0) return [];
      const result = evaluateCompressionScenario(baseInput, entry.change(entry.value));
      if (!result.value) return [];
      return [
        {
          label: entry.label,
          amountMm: entry.value,
          compressionDelta:
            result.value.after.geometricCompressionRatio -
            result.value.before.geometricCompressionRatio,
          trappedDelta:
            result.value.after.trappedCompressionRatio -
            result.value.before.trappedCompressionRatio,
          squishDelta:
            result.value.after.squishGapMm - result.value.before.squishGapMm,
          exhaustDurationDelta:
            result.value.after.exhaustTiming.durationDeg -
            result.value.before.exhaustTiming.durationDeg,
        },
      ];
    });
  }, [analysis, project]);

  const primaryTransfer = analysis.transfers[0] ?? null;
  const exhaustLiftComparison = analysis.cylinderLift.ports.find(
    (port) => port.id === analysis.exhaust?.id,
  );
  const primaryLiftComparison = analysis.cylinderLift.ports.find(
    (port) => port.id === primaryTransfer?.port.id,
  );
  const comparisonBlowdown = baseline?.timing.globalBlowdownDeg ?? null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="Phase 360 home">
          <span className="brand-mark" aria-hidden="true">
            360
          </span>
          <span>
            <strong>PHASE</strong>
            <small>Two-stroke workbench</small>
          </span>
        </a>
        <div
          className={`privacy-state is-${localSaveState}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true" />
          {localSaveMessage}
        </div>
        <nav className="top-actions" aria-label="Project actions">
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importProject}
          />
          <details className="project-menu">
            <summary>Project</summary>
            <div className="project-menu-popover">
              <button type="button" onClick={() => importInputRef.current?.click()}>
                Import project
              </button>
              <button type="button" onClick={exportProject}>
                Export project
              </button>
              <button type="button" onClick={exportSvg}>
                Export diagram
              </button>
              <button type="button" onClick={clearLocalData}>
                Clear local data
              </button>
            </div>
          </details>
          <button
            className="button-print"
            type="button"
            onClick={printReport}
            disabled={!canPrint}
            title={
              canPrint
                ? "Print the A4 project report"
                : "Complete valid project geometry and report details before printing"
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="none"
            >
              <path d="M5 7V2.75h10V7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 14H3.5A1.5 1.5 0 0 1 2 12.5v-4A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5v4a1.5 1.5 0 0 1-1.5 1.5H15"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M5 11.5h10v5.75H5z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="15.25" cy="9.5" r=".75" fill="currentColor" />
            </svg>
            <span>Print</span>
          </button>
          <button className="button-primary" type="button" onClick={shareProject}>
            Share
          </button>
        </nav>
      </header>

      <nav className="mobile-view-nav" aria-label="Workbench view">
        <div className="mobile-view-switcher">
          {(["inputs", "map", "results"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mobileView === view}
              onClick={() => switchMobileView(view)}
            >
              {view === "inputs" ? "Setup" : view === "map" ? "Timing map" : "Results"}
            </button>
          ))}
        </div>
        <div className="mobile-live-readout">
          <span
            aria-label={`Exhaust duration ${formatNumber(analysis.exhaust?.durationDeg, 1)} degrees`}
          >
            <small aria-hidden="true">EXH</small>{" "}
            <strong aria-hidden="true">
              {formatNumber(analysis.exhaust?.durationDeg, 1)}°
            </strong>
          </span>
          <span
            aria-label={`Blowdown ${formatNumber(analysis.timing.globalBlowdownDeg, 1)} degrees`}
          >
            <small aria-hidden="true">BD</small>{" "}
            <strong aria-hidden="true">
              {formatNumber(analysis.timing.globalBlowdownDeg, 1)}°
            </strong>
          </span>
          <span
            aria-label={`Cylinder lift ${formatNumber(analysis.cylinderLift.appliedThicknessMm, 1)} millimetres`}
          >
            <small aria-hidden="true">LIFT</small>{" "}
            <strong aria-hidden="true">
              +{formatNumber(analysis.cylinderLift.appliedThicknessMm, 1)} mm
            </strong>
          </span>
          <span
            aria-label={`Rotary inlet duration ${formatNumber(analysis.rotary?.durationDeg, 1)} degrees`}
          >
            <small aria-hidden="true">IN</small>{" "}
            <strong aria-hidden="true">
              {formatNumber(analysis.rotary?.durationDeg, 1)}°
            </strong>
          </span>
        </div>
      </nav>

      <main id="top" className="workbench" data-mobile-view={mobileView}>
        <aside className="control-panel" aria-labelledby="engine-setup-heading">
          <div className="control-intro">
            <div className="project-context">
              <h2 id="engine-setup-heading">Engine setup</h2>
              {isIllustrativeProject ? <strong>Sample data</strong> : <strong>Your setup</strong>}
            </div>
            <input
              className="project-name-input"
              value={project.name}
              maxLength={80}
              aria-label="Project name"
              onChange={(event) => {
                noteEdit();
                setProject((current) => ({
                  ...current,
                  name: event.target.value,
                }));
              }}
            />
            <p>Every valid measurement updates the timing map immediately.</p>
          </div>

          <div className="control-scroll">
            <details
              className="control-section report-identity-section"
              open={openPrimarySections.report}
              onToggle={(event) =>
                setPrimarySectionOpen("report", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Project report</strong>
                  <small>Code, date and engine specification</small>
                </span>
              </summary>
              <div className="control-section-body">
                <div className="field-grid field-grid-2">
                  <label className="field field-compact">
                    <span className="field-label">Project code</span>
                    <span className="input-shell report-input-shell">
                      <input
                        type="text"
                        value={project.report.projectCode}
                        maxLength={40}
                        placeholder="e.g. P360-001"
                        onChange={(event) =>
                          updateReport("projectCode", event.target.value)
                        }
                      />
                    </span>
                  </label>
                  <label className="field field-compact">
                    <span className="field-label">Project date</span>
                    <span className="input-shell report-input-shell">
                      <input
                        type="date"
                        value={project.report.projectDate}
                        onChange={(event) =>
                          updateReport("projectDate", event.target.value)
                        }
                      />
                    </span>
                  </label>
                </div>
                <label className="field report-details-field">
                  <span className="field-label">Engine details</span>
                  <span
                    className={`textarea-shell ${reportDetailsError ? "input-invalid" : ""}`}
                  >
                    <textarea
                      value={project.report.engineDetails}
                      rows={3}
                      maxLength={360}
                      aria-invalid={reportDetailsError !== null}
                      aria-describedby={
                        reportDetailsError
                          ? "engine-details-help engine-details-error"
                          : "engine-details-help"
                      }
                      placeholder={
                        "Cylinder, crankshaft and connecting rod\nInduction, carburettor and exhaust\nMachining, ignition or test notes"
                      }
                      onChange={(event) =>
                        updateReport("engineDetails", event.target.value)
                      }
                    />
                  </span>
                  <span className="report-field-help" id="engine-details-help">
                    Up to three short lines. Printed beneath the project title.
                  </span>
                  {reportDetailsError ? (
                    <span className="field-error" id="engine-details-error">
                      {reportDetailsError}
                    </span>
                  ) : null}
                </label>
              </div>
            </details>

            <details
              className="control-section"
              open={openPrimarySections.geometry}
              onToggle={(event) =>
                setPrimarySectionOpen("geometry", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Engine geometry</strong>
                  <small>Slider-crank and operating point</small>
                </span>
              </summary>
              <div className="control-section-body">
                <div className="field-grid field-grid-2">
                  <NumberField
                    compact
                    label="Bore"
                    value={project.geometry.boreMm}
                    unit="mm"
                    minimum={0}
                    exclusiveMinimum
                    onChange={(value) => updateGeometry("boreMm", value)}
                  />
                  <NumberField
                    compact
                    label="Stroke"
                    value={project.geometry.strokeMm}
                    unit="mm"
                    minimum={0}
                    exclusiveMinimum
                    onChange={(value) => updateGeometry("strokeMm", value)}
                  />
                  <NumberField
                    compact
                    label="Rod length"
                    value={project.geometry.rodLengthMm}
                    unit="mm"
                    minimum={
                      geometryStrokeMm !== null
                        ? Math.max(0, geometryStrokeMm / 2)
                        : 0
                    }
                    exclusiveMinimum
                    help="Centre-to-centre connecting-rod length."
                    onChange={(value) => updateGeometry("rodLengthMm", value)}
                  />
                  <NumberField
                    compact
                    label="Engine speed"
                    value={project.geometry.rpm}
                    unit="RPM"
                    minimum={0}
                    exclusiveMinimum
                    onChange={(value) => updateGeometry("rpm", value)}
                  />
                </div>
                <NumberField
                  label="Piston crown below deck at TDC"
                  value={project.geometry.deckPositionMm}
                  unit="mm"
                  help="Signed assembled position. Positive means the crown is below the cylinder deck. Used as a measurement reference."
                  onChange={(value) => updateGeometry("deckPositionMm", value)}
                />
                <div className="inline-result">
                  <span>Displacement</span>
                  <strong>{formatNumber(analysis.displacementCc, 1)} cc</strong>
                </div>
                <div className="inline-result">
                  <span>Mean piston speed</span>
                  <strong>{formatNumber(analysis.meanPistonSpeedMps, 1)} m/s</strong>
                </div>
              </div>
            </details>

            <details
              className="control-section control-section-lift"
              open={openPrimarySections.cylinderLift}
              onToggle={(event) =>
                setPrimarySectionOpen("cylinderLift", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Cylinder lift study</strong>
                  <small>Raise every cylinder port together</small>
                </span>
                <b className="control-summary-value">
                  +{formatNumber(analysis.cylinderLift.appliedThicknessMm, 1)} mm
                </b>
              </summary>
              <div className="control-section-body cylinder-lift-control">
                <p className="control-explainer">
                  Apply installed spacer thickness beneath the cylinder. The deck,
                  exhaust roof and every transfer roof move upwards while stroke and
                  rod length stay unchanged.
                </p>
                <div
                  className="cylinder-lift-stepper"
                  role="group"
                  aria-label="Adjust cylinder lift in 0.1 millimetre steps"
                >
                  <button
                    className="button-secondary spacer-step"
                    type="button"
                    aria-label="Decrease cylinder lift by 0.1 millimetres"
                    disabled={
                      requestedCylinderLiftMm === null ||
                      requestedCylinderLiftMm <= 0
                    }
                    onClick={() => nudgeCylinderLift(-0.1)}
                  >
                    −0.1
                  </button>
                  <NumberField
                    compact
                    label="Installed cylinder lift"
                    value={project.compression.baseSpacerThicknessMm}
                    unit="mm"
                    minimum={0}
                    maximum={analysis.cylinderLift.maximumThicknessMm ?? undefined}
                    help="Use the installed, compressed thickness beneath the cylinder. The original port measurements remain the no-spacer baseline."
                    onChange={(value) =>
                      updateCompression("baseSpacerThicknessMm", value)
                    }
                  />
                  <button
                    className="button-secondary spacer-step"
                    type="button"
                    aria-label="Increase cylinder lift by 0.1 millimetres"
                    disabled={
                      !analysis.cylinderLift.valid ||
                      (analysis.cylinderLift.maximumThicknessMm !== null &&
                        analysis.cylinderLift.appliedThicknessMm >=
                          analysis.cylinderLift.maximumThicknessMm)
                    }
                    onClick={() => nudgeCylinderLift(0.1)}
                  >
                    +0.1
                  </button>
                </div>
                <div className="cylinder-lift-readout" aria-label="Cylinder lift effects">
                  <span>
                    <small>Port movement</small>
                    <strong>
                      +{formatNumber(analysis.cylinderLift.appliedThicknessMm, 2)} mm
                      towards TDC
                    </strong>
                  </span>
                  <span>
                    <small>Effective deck position</small>
                    <strong>
                      {formatSigned(analysis.cylinderLift.effectiveDeckPositionMm, 2)} mm
                    </strong>
                  </span>
                </div>
                {analysis.cylinderLift.appliedThicknessMm > 0 ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => updateCompression("baseSpacerThicknessMm", "0")}
                  >
                    Reset cylinder lift
                  </button>
                ) : null}
                <p className="fine-print">
                  Assumes the cylinder and head move together, with no corrective
                  machining. Port, clearance-volume and squish inputs elsewhere remain
                  the no-spacer baseline while this lift is active.
                </p>
              </div>
            </details>

            <details
              className="control-section"
              open={openPrimarySections.ports}
              onToggle={(event) =>
                setPrimarySectionOpen("ports", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Port timing</strong>
                  <small>Exhaust and transfer groups</small>
                </span>
              </summary>
              <div className="control-section-body port-list">
                {project.ports.map((port, index) => (
                  <PortEditor
                    key={port.id}
                    port={port}
                    analysis={analysis.ports.find((item) => item.id === port.id)}
                    liftComparison={analysis.cylinderLift.ports.find(
                      (item) => item.id === port.id,
                    )}
                    strokeMm={geometryStrokeMm}
                    onUpdate={(patch) => updatePort(port.id, patch)}
                    onRemove={index > 3 ? () => removePort(port.id) : undefined}
                    onSelect={() => setSelectedArc(port.id)}
                  />
                ))}
                <button className="button-secondary full-width" type="button" onClick={addTransfer}>
                  Add transfer group
                </button>
              </div>
            </details>

            <details
              className="control-section"
              open={openPrimarySections.induction}
              onToggle={(event) =>
                setPrimarySectionOpen("induction", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Induction</strong>
                  <small>Rotary valve, reed or none</small>
                </span>
              </summary>
              <div className="control-section-body">
                <div
                  className="segmented-control"
                  aria-label="Induction mode"
                  role="group"
                >
                  {(["rotary", "reed", "none"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={project.induction.mode === mode ? "is-active" : ""}
                      aria-pressed={project.induction.mode === mode}
                      onClick={() => {
                        noteEdit();
                        setProject((current) => ({
                          ...current,
                          induction: { ...current.induction, mode },
                        }));
                      }}
                    >
                      {mode === "rotary" ? "Rotary" : mode === "reed" ? "Reed" : "None"}
                    </button>
                  ))}
                </div>
                {project.induction.mode === "rotary" ? (
                  <>
                    <div
                      className="segmented-control segmented-control-2"
                      aria-label="Rotary calculation mode"
                      role="group"
                    >
                      <button
                        type="button"
                        className={
                          project.induction.timingSource === "direct-angles"
                            ? "is-active"
                            : ""
                        }
                        aria-pressed={
                          project.induction.timingSource === "direct-angles"
                        }
                        onClick={() =>
                          updateInduction("timingSource", "direct-angles")
                        }
                      >
                        Timing only
                      </button>
                      <button
                        type="button"
                        className={
                          project.induction.timingSource ===
                          "crank-and-case-arcs"
                            ? "is-active"
                            : ""
                        }
                        aria-pressed={
                          project.induction.timingSource ===
                          "crank-and-case-arcs"
                        }
                        onClick={() =>
                          updateInduction(
                            "timingSource",
                            "crank-and-case-arcs",
                          )
                        }
                      >
                        Size physical arcs
                      </button>
                    </div>

                    <div className="field-grid field-grid-2">
                      <NumberField
                        compact
                        label="Desired inlet opening"
                        value={project.induction.advanceBtdcDeg}
                        unit="° BTDC"
                        minimum={0}
                        maximum={360}
                        validationMessage={rotaryTimingValidationMessage}
                        onChange={(value) =>
                          updateInduction("advanceBtdcDeg", value)
                        }
                      />
                      <NumberField
                        compact
                        label="Desired inlet closing"
                        value={project.induction.delayAtdcDeg}
                        unit="° ATDC"
                        minimum={0}
                        maximum={360}
                        validationMessage={rotaryTimingValidationMessage}
                        onChange={(value) =>
                          updateInduction("delayAtdcDeg", value)
                        }
                      />
                    </div>
                    {!analysis.induction.direct ? (
                      <p className="mode-note">
                        Complete both desired timing edges to position the rotary
                        inlet on the 360° map.
                      </p>
                    ) : null}

                    {project.induction.timingSource ===
                    "crank-and-case-arcs" ? (
                      <fieldset className="rotary-geometry-fields">
                        <legend>Rotary geometry solver</legend>
                        <p className="rotary-assumption-note">
                          Desired opening plus closing defines the total arc. Enter
                          the timing-track diameter and one physical length; the
                          other length is calculated automatically.
                        </p>
                        <div className="field-grid field-grid-2">
                          <NumberField
                            label="Valve timing-track diameter"
                            value={project.induction.crankshaftDiameterMm}
                            unit="mm"
                            minimum={0}
                            exclusiveMinimum
                            help="Diameter of the circular measurement path on the crank-web rotary-valve face. The measured and calculated arcs use this same path."
                            onChange={(value) =>
                              updateInduction("crankshaftDiameterMm", value)
                            }
                          />
                          <NumberField
                            label="Diameter uncertainty"
                            value={
                              project.induction
                                .crankshaftDiameterUncertaintyMm
                            }
                            unit="± mm"
                            minimum={0}
                            help="Optional deterministic plus-or-minus measurement bound. It is not a standard deviation or confidence interval."
                            onChange={(value) =>
                              updateInduction(
                                "crankshaftDiameterUncertaintyMm",
                                value,
                              )
                            }
                          />
                        </div>
                        <fieldset className="rotary-measurement-choice">
                          <legend>Manual arc measurement</legend>
                          <div
                            className="segmented-control segmented-control-2"
                            aria-label="Manual arc measurement"
                            role="group"
                          >
                            <button
                              type="button"
                              className={
                                project.induction.measuredArc ===
                                "crank-cutaway"
                                  ? "is-active"
                                  : ""
                              }
                              aria-pressed={
                                project.induction.measuredArc ===
                                "crank-cutaway"
                              }
                              onClick={() =>
                                setRotaryMeasuredArc("crank-cutaway")
                              }
                            >
                              Crank cut-away
                            </button>
                            <button
                              type="button"
                              className={
                                project.induction.measuredArc ===
                                "crankcase-opening"
                                  ? "is-active"
                                  : ""
                              }
                              aria-pressed={
                                project.induction.measuredArc ===
                                "crankcase-opening"
                              }
                              onClick={() =>
                                setRotaryMeasuredArc("crankcase-opening")
                              }
                            >
                              Crankcase opening
                            </button>
                          </div>
                        </fieldset>
                        <div className="rotary-solver-pair">
                          <NumberField
                            label={
                              project.induction.measuredArc ===
                              "crank-cutaway"
                                ? "Measured crank cut-away arc"
                                : "Measured crankcase valve opening"
                            }
                            value={project.induction.measuredArcMm}
                            unit="mm"
                            minimum={0}
                            exclusiveMinimum
                            validationMessage={
                              rotaryMeasuredArcValidationMessage
                            }
                            help="Measure this circumferential length along the timing track, not as a straight chord. This is the only manually entered arc."
                            onChange={(value) =>
                              updateInduction("measuredArcMm", value)
                            }
                          />
                          <output
                            className="rotary-derived-output"
                            aria-live="polite"
                            aria-label={
                              project.induction.measuredArc ===
                              "crank-cutaway"
                                ? "Calculated crankcase valve opening"
                                : "Calculated crank cut-away arc"
                            }
                          >
                            <span>
                              {project.induction.measuredArc ===
                              "crank-cutaway"
                                ? "Calculated crankcase valve opening"
                                : "Calculated crank cut-away arc"}
                            </span>
                            <strong>
                              {analysis.induction.geometry
                                ? `${formatNumber(
                                    analysis.induction.geometry.derivedArcMm,
                                    2,
                                  )} mm`
                                : "Waiting for valid inputs"}
                            </strong>
                            <small>
                              Total required arc minus the manual measurement
                            </small>
                          </output>
                        </div>
                        <div className="field-grid">
                          <NumberField
                            label="Measured arc uncertainty"
                            value={project.induction.measuredArcUncertaintyMm}
                            unit="± mm"
                            minimum={0}
                            help="Optional deterministic plus-or-minus bound for the one authoritative manual arc measurement."
                            onChange={(value) =>
                              updateInduction(
                                "measuredArcUncertaintyMm",
                                value,
                              )
                            }
                          />
                        </div>
                        {rotaryRequiredCombinedArcMm !== null ? (
                          <p className="rotary-formula-note">
                            {formatNumber(rotaryDesiredDurationDeg, 2)}° desired at
                            Ø {formatNumber(rotaryDiameterMm, 2)} mm requires
                            {" "}{formatNumber(rotaryRequiredCombinedArcMm, 2)} mm
                            total arc.
                          </p>
                        ) : null}
                        <p className="fine-print">
                          Assumes the crankcase timing-track diameter equals the
                          crank-web timing-track diameter. Measure along the arc,
                          not as a straight chord.
                        </p>
                      </fieldset>
                    ) : analysis.induction.direct &&
                      analysis.induction.direct.equivalentCombinedArcMm !==
                        null ? (
                      <p className="rotary-comparison-note">
                        At the entered timing-track diameter, the direct duration is
                        equivalent to {formatNumber(
                          analysis.induction.direct?.equivalentCombinedArcMm,
                          2,
                        )} mm of combined circumferential arc.
                      </p>
                    ) : null}

                    {project.induction.timingSource ===
                      "crank-and-case-arcs" &&
                    analysis.induction.geometry ? (
                      <RotaryArcConversion analysis={analysis} />
                    ) : null}

                    <fieldset className="rotary-area-source">
                      <legend>Inlet area source</legend>
                      <div
                        className="segmented-control segmented-control-2"
                        aria-label="Rotary inlet area source"
                        role="group"
                      >
                        <button
                          type="button"
                          className={
                            project.induction.areaSource ===
                            "cylindrical-overlap"
                              ? "is-active"
                              : ""
                          }
                          aria-pressed={
                            project.induction.areaSource ===
                            "cylindrical-overlap"
                          }
                          onClick={() =>
                            updateInduction(
                              "areaSource",
                              "cylindrical-overlap",
                            )
                          }
                        >
                          Arc overlap
                        </button>
                        <button
                          type="button"
                          className={
                            project.induction.areaSource === "constant-area"
                              ? "is-active"
                              : ""
                          }
                          aria-pressed={
                            project.induction.areaSource === "constant-area"
                          }
                          onClick={() =>
                            updateInduction("areaSource", "constant-area")
                          }
                        >
                          Constant estimate
                        </button>
                      </div>
                      {project.induction.areaSource ===
                      "cylindrical-overlap" ? (
                        <>
                          <NumberField
                            label="Common axial overlap width"
                            value={
                              project.induction.commonAxialOverlapWidthMm
                            }
                            unit="mm"
                            minimum={0}
                            exclusiveMinimum
                            help="Measured axial width shared by the crank cut-away and crankcase window. Combined with their instantaneous circumferential overlap, it gives the idealised geometric opening area."
                            onChange={(value) =>
                              updateInduction(
                                "commonAxialOverlapWidthMm",
                                value,
                              )
                            }
                          />
                          <NumberField
                            label="Axial width uncertainty"
                            value={
                              project.induction
                                .commonAxialOverlapWidthUncertaintyMm
                            }
                            unit="± mm"
                            minimum={0}
                            help="Optional deterministic plus-or-minus bound for the shared axial sealing width."
                            onChange={(value) =>
                              updateInduction(
                                "commonAxialOverlapWidthUncertaintyMm",
                                value,
                              )
                            }
                          />
                          <p className="fine-print">
                            Arc overlap requires valid physical arc sizing. It
                            models a sharp-edged rectangular sealing-surface
                            overlap, not duct area or discharged airflow.
                          </p>
                        </>
                      ) : (
                        <>
                          <NumberField
                            label="Constant effective inlet area"
                            value={project.induction.effectiveWindowAreaMm2}
                            unit="mm²"
                            minimum={0}
                            exclusiveMinimum
                            help="Backward-compatible idealisation that applies one entered area across the full inlet duration."
                            onChange={(value) =>
                              updateInduction("effectiveWindowAreaMm2", value)
                            }
                          />
                          <p className="fine-print">
                            This approximation preserves older projects but does
                            not describe the changing crank-to-case overlap.
                          </p>
                        </>
                      )}
                    </fieldset>
                    <p className="fine-print">
                      Desired timing drives the map, overlap and time-area in
                      realtime. Geometry mode sizes the crank and case arcs without
                      changing those desired angles.
                    </p>
                  </>
                ) : (
                  <p className="mode-note">
                    {project.induction.mode === "reed"
                      ? "A reed valve responds to pressure, so fixed crank-angle timing is intentionally not invented."
                      : "Induction timing metrics are marked not applicable."}
                  </p>
                )}
              </div>
            </details>

            <details
              className="control-section"
              open={openPrimarySections.character}
              onToggle={(event) =>
                setPrimarySectionOpen("character", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Character view</strong>
                  <small>Context profile and RPM sweep</small>
                </span>
              </summary>
              <div className="control-section-body">
                <label className="field">
                  <span className="field-label">Interpretation profile</span>
                  <span className="select-shell">
                    <select
                      value={project.character.profile}
                      onChange={(event) =>
                        updateCharacter(
                          "profile",
                          event.target.value as CharacterProfile,
                        )
                      }
                    >
                      {characterProfileOptions.map((profile) => (
                        <option value={profile.value} key={profile.value}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <p className="mode-note">
                  {
                    characterProfileOptions.find(
                      (profile) =>
                        profile.value === project.character.profile,
                    )?.description
                  }
                </p>
                <div className="field-grid field-grid-2">
                  <NumberField
                    compact
                    label="Sweep start"
                    value={project.character.rpmMinimum}
                    unit="RPM"
                    minimum={500}
                    maximum={19900}
                    integer
                    onChange={(value) =>
                      updateCharacter("rpmMinimum", value)
                    }
                  />
                  <NumberField
                    compact
                    label="Sweep end"
                    value={project.character.rpmMaximum}
                    unit="RPM"
                    minimum={600}
                    maximum={20000}
                    integer
                    onChange={(value) =>
                      updateCharacter("rpmMaximum", value)
                    }
                  />
                  <NumberField
                    compact
                    label="Sample step"
                    value={project.character.rpmStep}
                    unit="RPM"
                    minimum={100}
                    maximum={2000}
                    integer
                    onChange={(value) => updateCharacter("rpmStep", value)}
                  />
                </div>
                <p className="fine-print">
                  Profile reference {project.character.referenceSetVersion}.
                  Profiles affect only contextual annotations. Geometry and
                  time-area calculations remain unchanged.
                </p>
              </div>
            </details>

            <details
              className="control-section transmission-control"
              open={openPrimarySections.transmission}
              onToggle={(event) =>
                setPrimarySectionOpen("transmission", event.currentTarget.open)
              }
            >
              <summary>
                <span>
                  <strong>Transmission</strong>
                  <small>Primary, 4 or 5 gears and road speed</small>
                </span>
                <b className="control-summary-value">
                  {analysis.transmission.result
                    ? `${formatNumber(analysis.transmission.result.maximumSpeedKmh, 0)} km/h`
                    : project.transmission.enabled
                      ? "Incomplete"
                      : "Off"}
                </b>
              </summary>
              <div className="control-section-body">
                <div className="toggle-row transmission-toggle-row">
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={project.transmission.enabled}
                      onChange={(event) =>
                        updateTransmission("enabled", event.target.checked)
                      }
                    />
                    <span aria-hidden="true" />
                    Include gearing analysis
                  </label>
                </div>
                <p className="control-explainer">
                  Enter the tooth counts fitted to the engine. Every displayed
                  ratio and road-speed line is calculated from these values.
                </p>
                <fieldset
                  className="transmission-fields"
                  disabled={!project.transmission.enabled}
                >
                  <div className="transmission-field-group">
                    <h3>Primary drive</h3>
                    <div className="field-grid field-grid-2">
                      <NumberField
                        compact
                        label="Drive pinion"
                        value={project.transmission.primaryDrivePinionTeeth}
                        unit="teeth"
                        minimum={1}
                        maximum={200}
                        integer
                        required={project.transmission.enabled}
                        onChange={(value) =>
                          updateTransmission("primaryDrivePinionTeeth", value)
                        }
                      />
                      <NumberField
                        compact
                        label="Driven gear"
                        value={project.transmission.primaryDrivenGearTeeth}
                        unit="teeth"
                        minimum={1}
                        maximum={200}
                        integer
                        required={project.transmission.enabled}
                        onChange={(value) =>
                          updateTransmission("primaryDrivenGearTeeth", value)
                        }
                      />
                    </div>
                    <p className="fine-print">
                      Primary reduction = driven gear teeth ÷ drive pinion teeth.
                    </p>
                  </div>

                  <div className="transmission-field-group">
                    <h3>Gearbox</h3>
                    <div
                      className="segmented-control segmented-control-2"
                      aria-label="Number of transmission gears"
                    >
                      {[4, 5].map((count) => (
                        <button
                          type="button"
                          className={
                            project.transmission.gearCount === count
                              ? "is-active"
                              : ""
                          }
                          aria-pressed={project.transmission.gearCount === count}
                          key={count}
                          onClick={() =>
                            updateTransmission(
                              "gearCount",
                              count as TransmissionGearCount,
                            )
                          }
                        >
                          {count} gears
                        </button>
                      ))}
                    </div>
                    <div className="gear-input-list">
                      {project.transmission.gears
                        .slice(0, project.transmission.gearCount)
                        .map((gear, index) => (
                          <div className="gear-input-row" key={gear.id}>
                            <h4>{gear.label}</h4>
                            <div className="field-grid field-grid-2">
                              <NumberField
                                compact
                                label="Cluster pinion"
                                inputAriaLabel={`${gear.label} cluster pinion teeth`}
                                value={gear.clusterPinionTeeth}
                                unit="teeth"
                                minimum={1}
                                maximum={200}
                                integer
                                required={project.transmission.enabled}
                                onChange={(value) =>
                                  updateTransmissionGear(index, {
                                    clusterPinionTeeth: value,
                                  })
                                }
                              />
                              <NumberField
                                compact
                                label="Gear wheel"
                                inputAriaLabel={`${gear.label} gear wheel teeth`}
                                value={gear.drivenGearTeeth}
                                unit="teeth"
                                minimum={1}
                                maximum={200}
                                integer
                                required={project.transmission.enabled}
                                onChange={(value) =>
                                  updateTransmissionGear(index, {
                                    drivenGearTeeth: value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                    <p className="fine-print">
                      Gear reduction = gear wheel teeth ÷ cluster pinion teeth.
                    </p>
                  </div>

                  <div className="transmission-field-group">
                    <h3>Wheel and graph</h3>
                    <div className="field-grid field-grid-2">
                      <NumberField
                        compact
                        label="Rolling circumference"
                        value={
                          project.transmission.wheelRollingCircumferenceMm
                        }
                        unit="mm"
                        minimum={500}
                        maximum={5000}
                        required={project.transmission.enabled}
                        help="Measure one loaded wheel revolution on the ground. Nominal tyre sizes can differ."
                        onChange={(value) =>
                          updateTransmission(
                            "wheelRollingCircumferenceMm",
                            value,
                          )
                        }
                      />
                      <NumberField
                        compact
                        label="Graph maximum"
                        value={project.transmission.maximumRpm}
                        unit="RPM"
                        minimum={500}
                        maximum={20000}
                        integer
                        required={project.transmission.enabled}
                        onChange={(value) =>
                          updateTransmission("maximumRpm", value)
                        }
                      />
                    </div>
                  </div>
                </fieldset>
                {analysis.transmission.result ? (
                  <div className="inline-result transmission-inline-result">
                    <span>Highest plotted speed</span>
                    <strong>
                      {formatNumber(
                        analysis.transmission.result.maximumSpeedKmh,
                        1,
                      )} km/h
                    </strong>
                  </div>
                ) : null}
              </div>
            </details>

            <p className="control-group-label">Advanced measurements</p>

            <details className="control-section">
              <summary>
                <span>
                  <strong>Compression and squish</strong>
                  <small>Measured volumes and four-point gap</small>
                </span>
              </summary>
              <div className="control-section-body">
                {analysis.cylinderLift.appliedThicknessMm > 0 ? (
                  <p className="baseline-authority-note">
                    <strong>No-spacer baseline:</strong> the clearance volume and
                    four squish gaps entered here must describe the assembly before
                    the active cylinder lift. If they were measured after fitting the
                    spacer, reset cylinder lift to 0 to avoid counting it twice.
                  </p>
                ) : null}
                <div className="segmented-control segmented-control-2" aria-label="Clearance volume source">
                  <button
                    type="button"
                    className={project.compression.volumeMode === "measured-total" ? "is-active" : ""}
                    aria-pressed={project.compression.volumeMode === "measured-total"}
                    onClick={() => updateCompression("volumeMode", "measured-total")}
                  >
                    Measured total
                  </button>
                  <button
                    type="button"
                    className={project.compression.volumeMode === "component-breakdown" ? "is-active" : ""}
                    aria-pressed={project.compression.volumeMode === "component-breakdown"}
                    onClick={() => updateCompression("volumeMode", "component-breakdown")}
                  >
                    Component sum
                  </button>
                </div>
                {project.compression.volumeMode === "measured-total" ? (
                  <NumberField
                    label="Clearance volume"
                    value={project.compression.clearanceVolumeCc}
                    unit="cc"
                    minimum={0}
                    exclusiveMinimum
                    help="Assembled no-spacer baseline volume above the piston at TDC. When cylinder lift is active, its geometric volume is added separately."
                    onChange={(value) =>
                      updateCompression("clearanceVolumeCc", value)
                    }
                  />
                ) : (
                  <>
                    <div className="field-grid field-grid-2">
                      <NumberField
                        compact
                        label="Head chamber"
                        value={project.compression.headChamberVolumeCc}
                        unit="cc"
                        minimum={0}
                        exclusiveMinimum
                        onChange={(value) => updateCompression("headChamberVolumeCc", value)}
                      />
                      <NumberField
                        compact
                        label="Gasket or shim"
                        value={project.compression.gasketVolumeCc}
                        unit="cc"
                        onChange={(value) => updateCompression("gasketVolumeCc", value)}
                      />
                      <NumberField
                        compact
                        label="Deck volume"
                        value={project.compression.deckVolumeCc}
                        unit="cc"
                        onChange={(value) => updateCompression("deckVolumeCc", value)}
                      />
                      <NumberField
                        compact
                        label="Piston crown"
                        value={project.compression.pistonCrownVolumeCc}
                        unit="± cc"
                        help="Use a positive value when the crown adds clearance volume and a negative value for a dome that displaces volume."
                        onChange={(value) => updateCompression("pistonCrownVolumeCc", value)}
                      />
                    </div>
                    <NumberField
                      label="Custom correction"
                      value={project.compression.customCorrectionCc}
                      unit="± cc"
                      onChange={(value) => updateCompression("customCorrectionCc", value)}
                    />
                    <div className="inline-result">
                      <span>Calculated clearance volume</span>
                      <strong>{formatNumber(analysis.compression.clearanceVolumeCc, 2)} cc</strong>
                    </div>
                  </>
                )}
                <NumberField
                  label="Target trapped CR"
                  value={project.compression.targetTrappedRatio}
                  unit=":1"
                  minimum={1}
                  exclusiveMinimum
                  onChange={(value) =>
                    updateCompression("targetTrappedRatio", value)
                  }
                />
                <p className="fine-print">
                  Squish gaps are the no-spacer baseline. Active cylinder lift is added
                  to each reading under the stated cylinder-and-head movement assumption.
                </p>
                <div className="measurement-map" aria-label="Four point squish measurements">
                  <span className="piston-disc" aria-hidden="true">N</span>
                  <NumberField
                    compact
                    label="North gap"
                    value={project.squish.gapNorthMm}
                    unit="mm"
                    minimum={0}
                    onChange={(value) => updateSquish("gapNorthMm", value)}
                  />
                  <NumberField
                    compact
                    label="East gap"
                    value={project.squish.gapEastMm}
                    unit="mm"
                    minimum={0}
                    onChange={(value) => updateSquish("gapEastMm", value)}
                  />
                  <NumberField
                    compact
                    label="South gap"
                    value={project.squish.gapSouthMm}
                    unit="mm"
                    minimum={0}
                    onChange={(value) => updateSquish("gapSouthMm", value)}
                  />
                  <NumberField
                    compact
                    label="West gap"
                    value={project.squish.gapWestMm}
                    unit="mm"
                    minimum={0}
                    onChange={(value) => updateSquish("gapWestMm", value)}
                  />
                </div>
                <div className="segmented-control segmented-control-2" aria-label="Squish band geometry source">
                  <button
                    type="button"
                    className={project.squish.geometryMode === "bowl-diameter" ? "is-active" : ""}
                    aria-pressed={project.squish.geometryMode === "bowl-diameter"}
                    onClick={() => updateSquish("geometryMode", "bowl-diameter")}
                  >
                    Bowl diameter
                  </button>
                  <button
                    type="button"
                    className={project.squish.geometryMode === "band-width" ? "is-active" : ""}
                    aria-pressed={project.squish.geometryMode === "band-width"}
                    onClick={() => updateSquish("geometryMode", "band-width")}
                  >
                    Band width
                  </button>
                </div>
                <div className="field-grid field-grid-2">
                  {project.squish.geometryMode === "bowl-diameter" ? (
                    <NumberField
                      compact
                      label="Bowl diameter"
                      value={project.squish.bowlDiameterMm}
                      unit="mm"
                      minimum={0}
                      maximum={geometryBoreMm ?? undefined}
                      onChange={(value) => updateSquish("bowlDiameterMm", value)}
                    />
                  ) : (
                    <NumberField
                      compact
                      label="Radial band width"
                      value={project.squish.bandWidthMm}
                      unit="mm"
                      minimum={0}
                      maximum={
                        geometryBoreMm !== null ? geometryBoreMm / 2 : undefined
                      }
                      onChange={(value) => updateSquish("bandWidthMm", value)}
                    />
                  )}
                  <NumberField
                    compact
                    label="Documented minimum"
                    value={project.squish.manufacturerMinimumMm}
                    unit="mm"
                    minimum={0}
                    help="Optional. Enter only a minimum supported by your piston, cylinder or engine supplier."
                    onChange={(value) =>
                      updateSquish("manufacturerMinimumMm", value)
                    }
                  />
                </div>
              </div>
            </details>

            <details className="control-section">
              <summary>
                <span>
                  <strong>What-if changes</strong>
                  <small>Evaluate each change from the current baseline</small>
                </span>
              </summary>
              <div className="control-section-body">
                <NumberField
                  label="Add head gasket"
                  value={project.compression.headGasketThicknessMm}
                  unit="mm"
                  minimum={0}
                  onChange={(value) =>
                    updateCompression("headGasketThicknessMm", value)
                  }
                />
                <NumberField
                  label="Raise exhaust roof"
                  value={project.compression.exhaustRaiseMm}
                  unit="mm"
                  minimum={0}
                  onChange={(value) => updateCompression("exhaustRaiseMm", value)}
                />
                <p className="fine-print">
                  Each effect is calculated independently from the current baseline.
                  Values are not compounded.
                </p>
              </div>
            </details>
          </div>

          <div className="control-footer">
            <button className="text-button" type="button" onClick={resetProject}>
              Reset illustrative data
            </button>
            <span>{localSaveMessage}</span>
          </div>
        </aside>

        <section className="analysis-panel" aria-label="Calculated results">
          <header className="print-report-header">
            <div className="print-report-brand">
              <span>PHASE 360</span>
              <strong>Two-stroke timing report</strong>
            </div>
            <div className="print-report-title">
              <h1>{project.name || "Untitled engine"}</h1>
              {project.report.engineDetails.trim() ? (
                <div className="print-report-details">
                  {project.report.engineDetails.split(/\r\n?|\n/u).map((line, index) => (
                    <p key={`${index}-${line}`}>{line || "\u00a0"}</p>
                  ))}
                </div>
              ) : (
                <p className="print-report-empty">No engine specification entered.</p>
              )}
            </div>
            <dl className="print-report-meta">
              <div>
                <dt>Project code</dt>
                <dd>{project.report.projectCode || "Not set"}</dd>
              </div>
              <div>
                <dt>Project date</dt>
                <dd>
                  {project.report.projectDate ? (
                    <time dateTime={project.report.projectDate}>
                      {formatProjectDate(project.report.projectDate)}
                    </time>
                  ) : (
                    "Not set"
                  )}
                </dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd suppressHydrationWarning>{reportGeneratedAt}</dd>
              </div>
            </dl>
          </header>

          <div className="analysis-workspace">
            <div className="analysis-intro">
              <div>
                <h1>{project.name || "Untitled engine"}</h1>
                <p>
                  Live slider-crank geometry across one complete crankshaft cycle.
                </p>
              </div>
              <div className="analysis-intro-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    setBaseline(analysis);
                    setActionStatus("Current blowdown saved as the comparison baseline.");
                  }}
                >
                  Set blowdown baseline
                </button>
                {baseline ? (
                  <button className="text-button" type="button" onClick={() => setBaseline(null)}>
                    Clear baseline
                  </button>
                ) : null}
              </div>
            </div>

            <div className="status-line" role="status" aria-live="polite">
              <span className={analysis.validGeometry ? "status-ok" : "status-warning"}>
                {analysis.validGeometry
                  ? "Core geometry calculable"
                  : "Core geometry incomplete"}
              </span>
              {isIllustrativeProject ? <span className="sample-state">Sample data</span> : null}
              <span className="scope-state">Calculation only, not assembly approval</span>
              <span className="status-message">{actionStatus}</span>
              {analysis.diagnostics.length ? (
                <a href="#model-notes">
                  {analysis.diagnostics.length} model {analysis.diagnostics.length === 1 ? "note" : "notes"}
                </a>
              ) : null}
            </div>

            <div className="metric-ribbon">
              <Metric
                label="Exhaust"
                value={formatNumber(analysis.exhaust?.durationDeg, 1)}
                unit="°"
                detail={
                  analysis.cylinderLift.appliedThicknessMm > 0 &&
                  exhaustLiftComparison
                    ? `${formatSigned(exhaustLiftComparison.durationDeltaDeg, 1)}° from cylinder lift`
                    : "Total open duration"
                }
                tone="accent"
              />
              <Metric
                label={primaryTransfer?.port.label ?? "Primary transfer"}
                value={formatNumber(primaryTransfer?.port.durationDeg, 1)}
                unit="°"
                detail={
                  analysis.cylinderLift.appliedThicknessMm > 0 &&
                  primaryLiftComparison
                    ? `${formatSigned(primaryLiftComparison.durationDeltaDeg, 1)}° from cylinder lift`
                    : "Total open duration"
                }
              />
              <Metric
                label="Blowdown"
                value={formatNumber(analysis.timing.globalBlowdownDeg, 1)}
                unit="°"
                detail={
                  analysis.cylinderLift.appliedThicknessMm > 0
                    ? `${formatSigned(analysis.cylinderLift.globalBlowdownDeltaDeg, 1)}° from cylinder lift`
                    : baseline &&
                  comparisonBlowdown !== null &&
                  analysis.timing.globalBlowdownDeg !== null
                    ? `${formatSigned(analysis.timing.globalBlowdownDeg - comparisonBlowdown, 1)}° vs baseline`
                    : "Exhaust to first transfer"
                }
                tone={
                  analysis.timing.globalBlowdownDeg !== null &&
                  analysis.timing.globalBlowdownDeg <= 0
                    ? "warning"
                    : "neutral"
                }
              />
              <Metric
                label="Inlet to transfer"
                value={formatSigned(analysis.rotary?.signedTransferMarginDeg, 1)}
                unit="°"
                detail={
                  analysis.rotary?.signedTransferMarginUncertainty
                    ? `${formatSigned(analysis.rotary.signedTransferMarginUncertainty.minimumDeg, 1)}° to ${formatSigned(analysis.rotary.signedTransferMarginUncertainty.maximumDeg, 1)}° measurement bounds`
                    : analysis.rotary?.transferRelationship === "overlap"
                      ? "Positive overlap"
                      : analysis.rotary?.transferRelationship === "gap"
                        ? "Negative value is a gap"
                        : analysis.rotary?.transferRelationship === "indeterminate"
                          ? "Measurement bounds cross zero"
                          : "Rotary induction only"
                }
              />
            </div>

            <section className="diagram-section card-dark" id="timing-map">
            <SectionHeading
              title="360° timing map"
              detail="TDC is at the top and angles increase clockwise. Select a phase below the dial for exact values."
              action={
                <div className="diagram-toggles">
                  <label>
                    <input
                      type="checkbox"
                      checked={project.presentation.showAnalysisOverlays}
                      onChange={(event) => {
                        noteEdit();
                        setProject((current) => ({
                          ...current,
                          presentation: {
                            ...current.presentation,
                            showAnalysisOverlays: event.target.checked,
                          },
                        }));
                      }}
                    />
                    Analysis arcs
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={project.presentation.showReferenceLabels}
                      onChange={(event) => {
                        noteEdit();
                        setProject((current) => ({
                          ...current,
                          presentation: {
                            ...current.presentation,
                            showReferenceLabels: event.target.checked,
                          },
                        }));
                      }}
                    />
                    Event markers
                  </label>
                </div>
              }
            />
            <div className="timing-workspace">
              <TimingDial
                className="timing-dial"
                phases={timingPhases}
                markers={timingMarkers}
                selectedId={selectedArc}
                onSelect={(id) => setSelectedArc((current) => (current === id ? null : id))}
                ariaLabel={`Timing diagram for ${project.name}${
                  analysis.cylinderLift.appliedThicknessMm > 0
                    ? ` with ${formatNumber(analysis.cylinderLift.appliedThicknessMm, 1)} millimetres of cylinder lift${showCylinderLiftReferenceMarkers ? " and no-spacer reference markers" : ""}`
                    : ""
                }`}
              />
              <aside className="phase-inspector" aria-live="polite">
                {selectedTimingPhase ? (
                  <>
                    <div className="phase-inspector-heading">
                      <span
                        className="phase-inspector-colour"
                        style={{ background: selectedTimingPhase.colour }}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{selectedTimingPhase.label}</strong>
                        <span>{selectedTimingPhase.category}</span>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>Opens</dt>
                        <dd>{formatNumber(normaliseAngle(selectedTimingPhase.start), 1)}°</dd>
                      </div>
                      <div>
                        <dt>Closes</dt>
                        <dd>{formatNumber(normaliseAngle(selectedTimingPhase.end), 1)}°</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{formatNumber(clockwiseDuration(selectedTimingPhase.start, selectedTimingPhase.end), 1)}°</dd>
                      </div>
                    </dl>
                    {selectedLiftComparison &&
                    analysis.cylinderLift.appliedThicknessMm > 0 ? (
                      <p className="phase-inspector-delta">
                        No-spacer duration {formatNumber(
                          selectedLiftComparison.baselineDurationDeg,
                          1,
                        )}°. Cylinder lift adds {formatSigned(
                          selectedLiftComparison.durationDeltaDeg,
                          1,
                        )}°.
                      </p>
                    ) : null}
                    {project.ports.some((port) => port.id === selectedTimingPhase.id) ? (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => revealPortEditor(selectedTimingPhase.id)}
                      >
                        Edit measurements
                      </button>
                    ) : null}
                    <button className="text-button" type="button" onClick={() => setSelectedArc(null)}>
                      Clear selection
                    </button>
                  </>
                ) : selectedTimingMarker ? (
                  <>
                    <strong>{selectedTimingMarker.label}</strong>
                    <p>{formatNumber(normaliseAngle(selectedTimingMarker.angle), 1)}° crank angle</p>
                    <button className="text-button" type="button" onClick={() => setSelectedArc(null)}>
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Inspect a phase</strong>
                    <p>Select a labelled row below the dial to read its opening, closing and duration.</p>
                  </>
                )}
              </aside>
            </div>
            {showCylinderLiftReferenceMarkers ? (
              <p className="lift-diagram-key">
                <strong>No-spacer reference:</strong> grey event markers show the
                original port boundaries; coloured arcs show the lifted cylinder.
              </p>
            ) : null}
            <p className="geometric-boundary">
              Overlap indicates simultaneous geometric opening only. It does not by
              itself predict flow direction, pressure behaviour, power or safety.
            </p>
          </section>

          <section className="print-input-summary" aria-label="Authoritative project inputs">
            <div className="print-section-heading">
              <h2>Authoritative project inputs</h2>
              <p>Original editable measurements used to generate this report.</p>
            </div>
            <dl className="print-geometry-grid">
              <div>
                <dt>Bore</dt>
                <dd>{formatSourceValue(project.geometry.boreMm, "mm")}</dd>
              </div>
              <div>
                <dt>Stroke</dt>
                <dd>{formatSourceValue(project.geometry.strokeMm, "mm")}</dd>
              </div>
              <div>
                <dt>Connecting rod</dt>
                <dd>{formatSourceValue(project.geometry.rodLengthMm, "mm")}</dd>
              </div>
              <div>
                <dt>Deck position</dt>
                <dd>{formatSourceValue(project.geometry.deckPositionMm, "mm")}</dd>
              </div>
              <div>
                <dt>Engine speed</dt>
                <dd>{formatSourceValue(project.geometry.rpm, "RPM")}</dd>
              </div>
              <div>
                <dt>Cylinder lift</dt>
                <dd>
                  {formatSourceValue(
                    project.compression.baseSpacerThicknessMm,
                    "mm",
                  )}
                </dd>
              </div>
              <div>
                <dt>Displacement</dt>
                <dd>{formatNumber(analysis.displacementCc, 2)} cc</dd>
              </div>
              <div>
                <dt>Mean piston speed</dt>
                <dd>{formatNumber(analysis.meanPistonSpeedMps, 2)} m/s</dd>
              </div>
            </dl>

            <h3>Port measurements</h3>
            <div className="table-scroll">
              <table className="data-table print-source-table">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Source measurement</th>
                    <th scope="col">Window</th>
                    <th scope="col">Uncertainty</th>
                    <th scope="col">Calculated timing</th>
                  </tr>
                </thead>
                <tbody>
                  {project.ports.map((port) => {
                    const calculated = analysis.ports.find(
                      (candidate) => candidate.id === port.id,
                    );
                    return (
                      <tr key={port.id}>
                        <th scope="row">
                          {port.label}
                          {!port.enabled ? (
                            <small className="table-sublabel">disabled</small>
                          ) : null}
                        </th>
                        <td>
                          {sourceLabel(port.sourceMode)}: {formatSourceValue(
                            port.sourceValue,
                            sourceUnits[port.sourceMode],
                          )}
                        </td>
                        <td>
                          {port.widthMm && port.heightMm && port.count
                            ? `${port.widthMm} × ${port.heightMm} mm × ${port.count}`
                            : "Not set"}
                        </td>
                        <td>
                          {port.uncertaintyMm
                            ? `±${port.uncertaintyMm} mm`
                            : "Not set"}
                        </td>
                        <td>
                          {calculated
                            ? `${formatNumber(calculated.openingAngleDeg, 2)}° ATDC / ${formatNumber(calculated.durationDeg, 2)}° duration`
                            : "Unavailable"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="print-induction-summary">
              <h3>Induction source</h3>
              <dl>
                <div>
                  <dt>Mode</dt>
                  <dd>{project.induction.mode}</dd>
                </div>
                <div>
                  <dt>Timing source</dt>
                  <dd>
                    {project.induction.mode === "rotary"
                      ? project.induction.timingSource === "crank-and-case-arcs"
                        ? "Arc sizing solver"
                        : "Timing only"
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Desired timing</dt>
                  <dd>
                    {project.induction.mode === "rotary"
                      ? `${formatSourceValue(project.induction.advanceBtdcDeg, "° BTDC")} / ${formatSourceValue(project.induction.delayAtdcDeg, "° ATDC")}`
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Arc geometry</dt>
                  <dd>
                    {project.induction.mode === "rotary"
                      ? analysis.induction.geometry
                        ? `Ø ${formatNumber(analysis.induction.geometry.crankshaftDiameterMm, 2)} mm; crank ${formatNumber(analysis.induction.geometry.crankCutawayArcMm, 2)} mm; case ${formatNumber(analysis.induction.geometry.crankcaseWindowArcMm, 2)} mm; ${analysis.induction.geometry.measuredArc === "crank-cutaway" ? "crank measured" : "case measured"}`
                        : `Ø ${formatSourceValue(project.induction.crankshaftDiameterMm, "mm")}; ${project.induction.measuredArc === "crank-cutaway" ? "crank" : "case"} measured ${formatSourceValue(project.induction.measuredArcMm, "mm")}; complement unavailable`
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Inlet area source</dt>
                  <dd>
                    {project.induction.areaSource === "cylindrical-overlap"
                      ? `Arc overlap, ${formatSourceValue(project.induction.commonAxialOverlapWidthMm, "mm axial width")}`
                      : `Constant estimate, ${formatSourceValue(project.induction.effectiveWindowAreaMm2, "mm²")}`}
                  </dd>
                </div>
                <div>
                  <dt>Character context</dt>
                  <dd>
                    {characterProfileOptions.find(
                      (profile) => profile.value === project.character.profile,
                    )?.label ?? "No profile"}
                    {` · ${project.character.rpmMinimum}-${project.character.rpmMaximum} RPM · ${project.character.referenceSetVersion}`}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="print-induction-summary print-transmission-summary">
              <h3>Transmission source</h3>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {project.transmission.enabled
                      ? "Included in this report"
                      : "Not included"}
                  </dd>
                </div>
                <div>
                  <dt>Primary teeth</dt>
                  <dd>
                    {project.transmission.enabled
                      ? `${formatSourceValue(project.transmission.primaryDrivePinionTeeth, "drive")} / ${formatSourceValue(project.transmission.primaryDrivenGearTeeth, "driven")}`
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Gear pairs</dt>
                  <dd>
                    {project.transmission.enabled
                      ? project.transmission.gears
                          .slice(0, project.transmission.gearCount)
                          .map(
                            (gear) =>
                              `${gear.label}: ${gear.clusterPinionTeeth || "?"}/${gear.drivenGearTeeth || "?"}`,
                          )
                          .join("; ")
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Rolling circumference</dt>
                  <dd>
                    {project.transmission.enabled
                      ? formatSourceValue(
                          project.transmission.wheelRollingCircumferenceMm,
                          "mm",
                        )
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt>Graph maximum</dt>
                  <dd>
                    {project.transmission.enabled
                      ? formatSourceValue(
                          project.transmission.maximumRpm,
                          "RPM",
                        )
                      : "Not applicable"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
          </div>

          <header className="mobile-results-context">
            <span>Calculated results</span>
            <h1>{project.name || "Untitled engine"}</h1>
          </header>

          <nav className="result-navigation" aria-label="Result sections">
            {analysis.cylinderLift.appliedThicknessMm > 0 ? (
              <a href="#cylinder-lift-results">Cylinder lift</a>
            ) : null}
            <a href="#timing-results">Timing</a>
            <a href="#head-results">Compression & squish</a>
            <a href="#flow-results">Time-area</a>
            <a href="#character-results">Character</a>
            {analysis.transmission.enabled ? (
              <a href="#gearing-results">Gearing</a>
            ) : null}
            <a href="#diagnostic-results">Diagnostics</a>
            <a href="#methodology">Method</a>
          </nav>

          <div className="analysis-detail">

          {analysis.cylinderLift.appliedThicknessMm > 0 ? (
            <section className="result-section cylinder-lift-results" id="cylinder-lift-results">
              <SectionHeading
                title="Cylinder lift comparison"
                detail={`Every port is raised by ${formatNumber(analysis.cylinderLift.appliedThicknessMm, 2)} mm. Stroke, rod length and rotary-valve timing remain unchanged.`}
              />
              <div className="lift-metric-grid">
                <Metric
                  label="Blowdown change"
                  value={formatSigned(analysis.cylinderLift.globalBlowdownDeltaDeg, 2)}
                  unit="°"
                  detail="Exhaust to earliest transfer"
                />
                <Metric
                  label="Transfer spread change"
                  value={formatSigned(analysis.cylinderLift.transferOpeningSpreadDeltaDeg, 2)}
                  unit="°"
                  detail="Opening spread between transfer groups"
                />
                <Metric
                  label="Exhaust overlap change"
                  value={formatSigned(analysis.cylinderLift.exhaustTransferOverlapDeltaDeg, 2)}
                  unit="°"
                  detail="Exhaust and transfer union"
                />
                <Metric
                  label="Inlet overlap change"
                  value={formatSigned(analysis.cylinderLift.rotaryTransferOverlapDeltaDeg, 2)}
                  unit="°"
                  detail="Rotary inlet and transfer union"
                />
              </div>
              <div className="table-scroll">
                <table className="data-table cylinder-lift-table">
                  <caption className="visually-hidden">
                    Port timing before and after the installed cylinder lift
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Port</th>
                      <th scope="col">Opening, no spacer</th>
                      <th scope="col">Opening, lifted</th>
                      <th scope="col">Opening change</th>
                      <th scope="col">Duration, no spacer</th>
                      <th scope="col">Duration, lifted</th>
                      <th scope="col">Duration change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.cylinderLift.ports.map((port) => (
                      <tr key={port.id}>
                        <th scope="row">
                          <span
                            className="table-phase-dot"
                            style={{ background: port.colour }}
                            aria-hidden="true"
                          />
                          {port.label}
                        </th>
                        <td>{formatNumber(port.baselineOpeningAngleDeg, 2)}° ATDC</td>
                        <td>{formatNumber(port.liftedOpeningAngleDeg, 2)}° ATDC</td>
                        <td>{formatSigned(port.openingDeltaDeg, 2)}°</td>
                        <td>{formatNumber(port.baselineDurationDeg, 2)}°</td>
                        <td>{formatNumber(port.liftedDurationDeg, 2)}°</td>
                        <td><strong>{formatSigned(port.durationDeltaDeg, 2)}°</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="model-note">
                With the head moving together with the cylinder, this model also adds
                {" "}{formatNumber(analysis.cylinderLift.clearanceVolumeDeltaCc, 3)} cc
                of clearance volume and {formatSigned(analysis.cylinderLift.squishGapDeltaMm, 2)} mm
                to the entered squish readings. Physical measurements remain authoritative.
              </p>
            </section>
          ) : null}

          <section className="result-section" id="timing-results">
            <SectionHeading
              title="Timing interactions"
              detail="Phase margins are more informative than a universal inlet-to-transfer ratio."
            />
            <div className="relation-grid">
              <article className="relation-card">
                <div>
                  <span className="relation-label">Exhaust to transfers</span>
                  <strong>
                    {formatNumber(analysis.timing.globalBlowdownDeg, 1)}° blowdown
                  </strong>
                  <p>
                    {analysis.timing.globalBlowdownMs === null
                      ? "Set RPM to see elapsed time."
                      : `${formatNumber(analysis.timing.globalBlowdownMs, 2)} ms before the earliest transfer opens.`}
                  </p>
                </div>
              </article>
              <article className="relation-card">
                <div>
                  <span className="relation-label">Rotary inlet to transfers</span>
                  <strong>
                    {analysis.rotary?.signedTransferMarginDeg === null ||
                    analysis.rotary?.signedTransferMarginDeg === undefined
                      ? "Not applicable"
                      : `${formatSigned(analysis.rotary.signedTransferMarginDeg, 1)}° margin`}
                  </strong>
                  <p>
                    {analysis.rotary?.transferRelationship === "overlap"
                      ? "The inlet opens before at least one transfer has closed."
                      : analysis.rotary?.transferRelationship === "gap"
                        ? "Every transfer closes before the inlet opens."
                        : analysis.rotary?.transferRelationship === "coincident"
                          ? "The final transfer closure and inlet opening coincide."
                          : analysis.rotary?.transferRelationship === "indeterminate"
                            ? "The measurement bounds cross zero, so overlap versus gap is indeterminate."
                          : "Fixed timing is available only for rotary induction."}
                  </p>
                </div>
              </article>
              <article className="relation-card">
                <div>
                  <span className="relation-label">Rotary inlet closing</span>
                  <strong>
                    {analysis.rotary
                      ? `${formatNumber(analysis.rotary.inletCloseAfterTdcDeg, 1)}° ATDC`
                      : "Not applicable"}
                  </strong>
                  <p>
                    {analysis.rotary?.inletCloseAfterTdcMs === null ||
                    analysis.rotary?.inletCloseAfterTdcMs === undefined
                      ? "Set RPM to see time after TDC."
                      : `${formatNumber(analysis.rotary.inletCloseAfterTdcMs, 2)} ms after TDC, analysed separately from opening overlap.`}
                  </p>
                </div>
              </article>
              <article className="relation-card">
                <div>
                  <span className="relation-label">Simultaneous opening</span>
                  <strong>
                    {formatNumber(analysis.timing.exhaustTransferUnionOverlapDeg, 1)}°
                  </strong>
                  <p>Exhaust and at least one transfer are open together, with unions counted once.</p>
                </div>
              </article>
              <article className="relation-card">
                <div>
                  <span className="relation-label">Transfer staging</span>
                  <strong>
                    {formatNumber(analysis.timing.transferOpeningSpreadDeg, 1)}° spread
                  </strong>
                  <p>Difference between earliest and latest enabled transfer opening.</p>
                </div>
              </article>
              <article className="relation-card">
                <div>
                  <span className="relation-label">Rotary and transfers</span>
                  <strong>
                    {formatNumber(analysis.rotary?.unionTransferOverlapDeg, 1)}°
                  </strong>
                  <p>
                    Union overlap across every enabled transfer, counted once.
                  </p>
                </div>
              </article>
            </div>

            <div className="blowdown-family" aria-label="Complete blowdown result">
              <div>
                <span>Crank interval</span>
                <strong>
                  {formatBoundedMeasure(
                    analysis.timing.globalBlowdownDeg,
                    analysis.timing.uncertainty?.globalBlowdownMinDeg,
                    analysis.timing.uncertainty?.globalBlowdownMaxDeg,
                    "°",
                    2,
                  )}
                </strong>
              </div>
              <div>
                <span>Elapsed at {project.geometry.rpm || "set RPM"}</span>
                <strong>
                  {formatBoundedMeasure(
                    analysis.timing.globalBlowdownMs,
                    analysis.timing.uncertainty?.globalBlowdownMinMs,
                    analysis.timing.uncertainty?.globalBlowdownMaxMs,
                    " ms",
                    3,
                  )}
                </strong>
              </div>
              <div>
                <span>Exhaust angle-area</span>
                <strong>
                  {formatBoundedMeasure(
                    analysis.timing.blowdownAngleAreaMm2Deg,
                    analysis.timing.uncertainty?.blowdownAngleAreaMinMm2Deg,
                    analysis.timing.uncertainty?.blowdownAngleAreaMaxMm2Deg,
                    " mm²·deg",
                    0,
                  )}
                </strong>
              </div>
              <div>
                <span>Geometric specific time-area</span>
                <strong>
                  {formatTimeArea(analysis.timing.blowdownSpecificTimeArea)}
                  {analysis.timing.blowdownSpecificTimeArea === null
                    ? ""
                    : " s·mm²/cc"}
                </strong>
                {analysis.timing.uncertainty?.blowdownSpecificTimeAreaMin !==
                  null &&
                analysis.timing.uncertainty?.blowdownSpecificTimeAreaMin !==
                  undefined &&
                analysis.timing.uncertainty?.blowdownSpecificTimeAreaMax !==
                  null &&
                analysis.timing.uncertainty?.blowdownSpecificTimeAreaMax !==
                  undefined ? (
                  <small>
                    {formatTimeArea(
                      analysis.timing.uncertainty
                        .blowdownSpecificTimeAreaMin,
                    )} to {formatTimeArea(
                      analysis.timing.uncertainty
                        .blowdownSpecificTimeAreaMax,
                    )}
                  </small>
                ) : null}
              </div>
            </div>
            <p className="model-note blowdown-boundary">
              Blowdown uses exhaust opening to the earliest enabled transfer
              opening. Degrees describe event order; angle-area and specific
              time-area describe geometric opportunity, not sufficient flow.
            </p>

            {analysis.transfers.length ? (
              <div className="table-scroll relation-table-wrap">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th scope="col">Transfer group</th>
                      <th scope="col">Blowdown</th>
                      <th scope="col">Exhaust phase difference</th>
                      <th scope="col">Exhaust overlap</th>
                      <th scope="col">Valve overlap</th>
                      <th scope="col">Valve margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.transfers.map((transfer) => (
                      <tr key={transfer.port.id}>
                        <th scope="row">{transfer.port.label}</th>
                        <td>{formatNumber(transfer.blowdownDeg, 1)}°</td>
                        <td>{formatNumber(transfer.exhaustDurationDifferenceDeg, 1)}°</td>
                        <td>{formatNumber(transfer.exhaustOverlapDeg, 1)}°</td>
                        <td>{formatNumber(transfer.valveOverlapDeg, 1)}°</td>
                        <td>
                          {transfer.valveMarginDeg === null
                            ? "Not applicable"
                            : `${formatSigned(transfer.valveMarginDeg, 1)}°`}
                          {transfer.valveRelationship !== "not-applicable" ? (
                            <small className="table-sublabel">{transfer.valveRelationship}</small>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="result-section card-light">
            <SectionHeading
              title="Port and inlet timing"
              detail="All displayed values are derived from the authoritative input shown for each event."
            />
            {project.induction.mode === "rotary" &&
            analysis.induction.geometry ? (
              <article className="rotary-result-bridge">
                <div>
                  <span className="evidence-level calculation">
                    {analysis.rotary?.source === "crank-and-case-arcs"
                      ? "Active arc sizing"
                      : "Optional arc sizing"}
                  </span>
                  <h3>Crank web and crankcase opening</h3>
                  <p>
                    Desired opening and closing define the total circumferential
                    length at the entered diameter. One physical arc is measured;
                    the other is calculated automatically without changing timing.
                  </p>
                </div>
                <RotaryArcConversion analysis={analysis} />
              </article>
            ) : null}
            <PortTimingTable analysis={analysis} />
          </section>

          <section className="result-section split-results" id="head-results">
            <article className="result-card">
              <SectionHeading
                title="Compression"
                detail="Geometric and exhaust-closure-based ratios use the same assembled clearance-volume basis and explicit geometry changes."
              />
              <div className="result-stat-grid">
                <Metric
                  label="Geometric CR"
                  value={formatNumber(analysis.compression.geometricRatio, 2)}
                  unit=":1"
                  detail="Full swept volume"
                />
                <Metric
                  label="Trapped CR"
                  value={formatNumber(analysis.compression.trappedRatio, 2)}
                  unit=":1"
                  detail="Volume after exhaust closure"
                  tone="accent"
                />
                <Metric
                  label="Trapped swept volume"
                  value={formatNumber(analysis.compression.trappedSweptVolumeCc, 1)}
                  unit="cc"
                />
                <Metric
                  label="Target chamber volume"
                  value={formatNumber(analysis.compression.targetClearanceVolumeCc, 2)}
                  unit="cc"
                  detail={
                    analysis.compression.targetTrappedRatio
                      ? `For ${formatNumber(analysis.compression.targetTrappedRatio, 2)}:1 trapped CR`
                      : "Enter a target trapped ratio"
                  }
                />
              </div>
              {analysis.compression.clearanceVolumeMode === "component-breakdown" ? (
                <dl className="volume-breakdown">
                  <div>
                    <dt>Head chamber</dt>
                    <dd>{formatNumber(analysis.compression.componentBreakdownCc.headChamber, 2)} cc</dd>
                  </div>
                  <div>
                    <dt>Gasket or shim</dt>
                    <dd>{formatNumber(analysis.compression.componentBreakdownCc.gasket, 2)} cc</dd>
                  </div>
                  <div>
                    <dt>Deck volume</dt>
                    <dd>{formatNumber(analysis.compression.componentBreakdownCc.deck, 2)} cc</dd>
                  </div>
                  <div>
                    <dt>Piston crown</dt>
                    <dd>{formatSigned(analysis.compression.componentBreakdownCc.pistonCrown, 2)} cc</dd>
                  </div>
                  <div>
                    <dt>Custom correction</dt>
                    <dd>{formatSigned(analysis.compression.componentBreakdownCc.customCorrection, 2)} cc</dd>
                  </div>
                  {analysis.cylinderLift.appliedThicknessMm > 0 ? (
                    <div>
                      <dt>Cylinder lift</dt>
                      <dd>
                        {formatSigned(
                          analysis.cylinderLift.clearanceVolumeDeltaCc,
                          2,
                        )} cc
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <p className="model-note">
                Trapped compression is a geometric volume ratio starting at exhaust
                closure. It is not a dynamic pressure or detonation prediction.
              </p>
            </article>

            <article className="result-card">
              <SectionHeading
                title="Squish geometry"
                detail="Four-point gap statistics reveal minimum clearance and assembly asymmetry."
              />
              <div className="squish-visual">
                <div className="squish-ring" aria-hidden="true">
                  <span>{formatNumber(analysis.squish.areaPercent, 1)}%</span>
                  <small>band area</small>
                </div>
                <dl>
                  <div>
                    <dt>Minimum gap</dt>
                    <dd>{formatNumber(analysis.squish.minimumGapMm, 2)} mm</dd>
                  </div>
                  <div>
                    <dt>Mean gap</dt>
                    <dd>{formatNumber(analysis.squish.meanGapMm, 2)} mm</dd>
                  </div>
                  <div>
                    <dt>Four-point range</dt>
                    <dd>{formatNumber(analysis.squish.gapRangeMm, 2)} mm</dd>
                  </div>
                  <div>
                    <dt>Radial band width</dt>
                    <dd>{formatNumber(analysis.squish.bandWidthMm, 2)} mm</dd>
                  </div>
                </dl>
              </div>
              {analysis.squish.belowManufacturerMinimum ? (
                <p className="warning-note">
                  The measured minimum is below the manufacturer minimum you entered.
                  Verify the source and physical clearances before assembly.
                </p>
              ) : (
                <p className="model-note">
                  No universal safe squish target is applied. Enter a documented
                  manufacturer minimum if you want a source-specific check.
                </p>
              )}
            </article>
          </section>

          <section className="result-section card-light" id="flow-results">
            <SectionHeading
              title="Time-area"
              detail="Disclosed geometric area models integrated over crank angle at the selected RPM."
            />
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Maximum area</th>
                    <th scope="col">Angle-area</th>
                    <th scope="col">Specific time-area</th>
                    <th scope="col">Model</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.ports.map((port) => (
                    <tr key={port.id}>
                      <th scope="row">{port.label}</th>
                      <td>{formatNumber(port.maximumAreaMm2, 1)} mm²</td>
                      <td>{formatNumber(port.angleAreaMm2Deg, 0)} mm²·deg</td>
                      <td>{formatTimeArea(port.specificTimeArea)} s·mm²/cc</td>
                      <td>Rectangular window</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Exhaust blowdown, downstroke</th>
                    <td>Variable</td>
                    <td>{formatNumber(analysis.timing.blowdownAngleAreaMm2Deg, 0)} mm²·deg</td>
                    <td>{formatTimeArea(analysis.timing.blowdownSpecificTimeArea)} s·mm²/cc</td>
                    <td>Exhaust opening to first transfer</td>
                  </tr>
                  {analysis.rotary ? (
                    <tr>
                      <th scope="row">Rotary inlet estimate</th>
                      <td>{formatNumber(analysis.rotary.maximumOpenAreaMm2, 1)} mm²</td>
                      <td>{formatNumber(analysis.rotary.overlapAngleAreaMm2Deg, 0)} mm²·deg</td>
                      <td>{formatTimeArea(analysis.rotary.overlapSpecificTimeArea)} s·mm²/cc</td>
                      <td>
                        {analysis.rotary.areaModel === "cylindrical-overlap"
                          ? "Crank-to-case arc overlap"
                          : analysis.rotary.areaModel === "constant-area"
                            ? "Constant-area approximation"
                            : "Unavailable"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <p className="model-note">
              Compare these values only when RPM, port reference, window definition
              and modelling assumptions are the same. Duct angle, radius, chamfer,
              discharge coefficient, pressure and gas dynamics are excluded.
            </p>
          </section>

          <EngineCharacterEstimate analysis={analysis} project={project} />

          <TransmissionResults analysis={analysis} project={project} />

          <DiagnosticLevels analysis={analysis} />

          {scenarioEffects.length ? (
            <section className="result-section">
              <SectionHeading
                title="Individual what-if effects"
                detail="Each entered change is evaluated independently against the current configuration."
              />
              <div className="scenario-grid">
                {scenarioEffects.map((scenario) => (
                  <article className="scenario-card" key={scenario.label}>
                    <span>{scenario.label}</span>
                    <strong>+{formatNumber(scenario.amountMm, 2)} mm</strong>
                    <dl>
                      <div>
                        <dt>Geometric CR</dt>
                        <dd>{formatSigned(scenario.compressionDelta, 2)}</dd>
                      </div>
                      <div>
                        <dt>Trapped CR</dt>
                        <dd>{formatSigned(scenario.trappedDelta, 2)}</dd>
                      </div>
                      <div>
                        <dt>Squish gap</dt>
                        <dd>{formatSigned(scenario.squishDelta, 2)} mm</dd>
                      </div>
                      <div>
                        <dt>Exhaust duration</dt>
                        <dd>{formatSigned(scenario.exhaustDurationDelta, 1)}°</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="result-section methodology-section" id="methodology">
            <SectionHeading
              title="What the workbench can and cannot say"
              detail="Recommendations are deliberately separated by evidence level."
            />
            <div className="evidence-grid">
              <article>
                <span className="evidence-level calculated-geometry">
                  Calculated geometry
                </span>
                <h3>Exact within the stated model</h3>
                <p>
                  Millimetre-to-degree conversion, event order, signed margins,
                  compression geometry and disclosed area integrals follow the
                  current inputs and equations.
                </p>
              </article>
              <article>
                <span className="evidence-level profile-heuristic">
                  Profile heuristic
                </span>
                <h3>Conditional context</h3>
                <p>
                  Touring box, sport box, road expansion and race expansion alter
                  only the interpretation lens. They never change geometry or
                  become universal tuning targets.
                </p>
              </article>
              <article>
                <span className="evidence-level measured-or-modelled">
                  Measured or modelled
                </span>
                <h3>Provenance required</h3>
                <p>
                  Measurement bounds and geometric area models name their source
                  and exclusions. Real engine behaviour still requires degree-wheel,
                  road or dyno verification.
                </p>
              </article>
            </div>
            <div className="print-method-details">
              <h3>Equations, measurement conventions and model limits</h3>
              <MethodologyDetailsContent />
            </div>
            <details className="method-details">
              <summary>Equations, measurement conventions and model limits</summary>
              <MethodologyDetailsContent />
            </details>
          </section>

          {analysis.diagnostics.length ? (
            <section className="diagnostic-section" id="model-notes" aria-label="Model diagnostics">
              <h2>Model notes</h2>
              <ul>
                {analysis.diagnostics.map((diagnostic) => (
                  <li key={diagnostic}>{diagnostic}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="site-footer">
            <div>
              <strong>PHASE 360</strong>
              <span>Private-by-default two-stroke geometry.</span>
            </div>
            <p>
              Calculation is local to this browser. No account, project API or backend
              storage is used in this MVP.
            </p>
          </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
