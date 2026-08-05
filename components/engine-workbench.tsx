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
import { evaluateCompressionScenario } from "@/lib/engine";
import {
  analyseProject,
  type CylinderLiftPortComparison,
  type EngineProjectAnalysis,
  type PortAnalysis,
} from "@/lib/presentation/analyse-project";
import {
  MAX_SHARE_FRAGMENT_LENGTH,
  PROJECT_STORAGE_KEY,
  cloneDemonstrationProject,
  decodeProjectFragment,
  encodeProjectFragment,
  parseLocaleNumber,
  parseProjectJson,
  safeProjectFilename,
  serialiseProject,
  type EngineProjectDraft,
  type PortDraft,
  type PortSourceMode,
} from "@/lib/project/model";

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
  validationMessage?: string | null;
}

function NumberField({
  label,
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
  validationMessage,
}: NumberFieldProps) {
  const numericValue = parseLocaleNumber(value);
  let errorMessage: string | null = null;

  if (value.trim() !== "") {
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
            <th scope="col">Opens ATDC</th>
            <th scope="col">Closes BTDC</th>
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
              <td>{formatNumber(port.openingAngleDeg, 1)}°</td>
              <td>{formatNumber(360 - port.closingAngleDeg, 1)}°</td>
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
              <td>Measured crank timing</td>
              <td>Not applicable</td>
              <td colSpan={2}>Crosses TDC</td>
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

export function EngineWorkbench() {
  const [project, setProject] = useState<EngineProjectDraft>(() =>
    cloneDemonstrationProject(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [actionStatus, setActionStatus] = useState(
    "Illustrative values loaded. Edit any field to begin.",
  );
  const [localSaveState, setLocalSaveState] = useState<
    "checking" | "saved" | "invalid" | "unavailable"
  >("checking");
  const [selectedArc, setSelectedArc] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<EngineProjectAnalysis | null>(null);
  const [mobileView, setMobileView] = useState<"inputs" | "map" | "results">(
    "map",
  );
  const [openPrimarySections, setOpenPrimarySections] = useState({
    geometry: true,
    cylinderLift: true,
    ports: true,
    induction: true,
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  const analysis = useMemo(() => analyseProject(project), [project]);
  const geometryBoreMm = parseLocaleNumber(project.geometry.boreMm);
  const geometryStrokeMm = parseLocaleNumber(project.geometry.strokeMm);
  const requestedCylinderLiftMm = parseLocaleNumber(
    project.compression.baseSpacerThicknessMm,
  );
  const rotaryAdvanceDeg = parseLocaleNumber(project.induction.advanceBtdcDeg);
  const rotaryDelayDeg = parseLocaleNumber(project.induction.delayAtdcDeg);
  const showCylinderLiftReferenceMarkers =
    analysis.cylinderLift.appliedThicknessMm > 0 &&
    project.presentation.showAnalysisOverlays &&
    project.presentation.showReferenceLabels;
  const rotaryTimingValidationMessage =
    rotaryAdvanceDeg !== null &&
    rotaryDelayDeg !== null &&
    rotaryAdvanceDeg + rotaryDelayDeg > 360
      ? "Opening advance and closing delay must total 360° or less."
      : null;
  const isIllustrativeProject = useMemo(
    () => serialiseProject(project) === DEMONSTRATION_PROJECT_JSON,
    [project],
  );
  const localSaveMessage =
    localSaveState === "saved"
      ? "Saved locally"
      : localSaveState === "invalid"
        ? "Not saved: invalid inputs"
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
        try {
          const stored = window.localStorage.getItem(PROJECT_STORAGE_KEY);
          if (stored) {
            const parsed = parseProjectJson(stored);
            if (parsed.ok) {
              setProject(parsed.project);
              setActionStatus("Last valid local project restored.");
            } else {
              setActionStatus("Stored project was invalid. Illustrative values were kept.");
            }
          }
        } catch {
          setActionStatus("Local recovery is unavailable. Calculation still works in this session.");
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let nextSaveState: typeof localSaveState;
    let saveFailureMessage: string | null = null;

    if (!analysis.validGeometry || !analysis.cylinderLift.valid) {
      nextSaveState = "invalid";
    } else {
      try {
        window.localStorage.setItem(PROJECT_STORAGE_KEY, serialiseProject(project));
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
  }, [analysis.cylinderLift.valid, analysis.validGeometry, hydrated, project]);

  function noteEdit() {
    setActionStatus(
      "Changes calculated in real time. Local save follows valid core geometry.",
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

  function updateInduction(
    key: keyof EngineProjectDraft["induction"],
    value: string,
  ) {
    noteEdit();
    setProject((current) => ({
      ...current,
      induction: { ...current.induction, [key]: value },
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
    setBaseline(null);
    setActionStatus("Illustrative project restored.");
    window.location.hash = "";
  }

  function exportProject() {
    downloadText(
      serialiseProject(project),
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

  async function shareProject() {
    const encoded = encodeProjectFragment(project);
    if (encoded.length > MAX_SHARE_FRAGMENT_LENGTH) {
      setActionStatus("This project is too large for a reliable link. Export JSON instead.");
      return;
    }
    const url = new URL(window.location.href);
    url.hash = `p=${encoded}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.toString());
      setActionStatus("Private fragment link copied. Project data was not sent to a server.");
    } catch {
      setActionStatus("Share link created in the address bar. Copy it from there.");
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
    const parsed = parseProjectJson(await file.text());
    if (!parsed.ok) {
      setActionStatus(`Import rejected: ${parsed.message}`);
      return;
    }
    setProject(parsed.project);
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
    return [...currentMarkers, ...baselineMarkers];
  }, [
    analysis.cylinderLift,
    analysis.ports,
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
              <button type="button" onClick={() => window.print()}>
                Print report
              </button>
            </div>
          </details>
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
                <div className="segmented-control" aria-label="Induction mode">
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
                    <div className="field-grid field-grid-2">
                      <NumberField
                        compact
                        label="Inlet opens"
                        value={project.induction.advanceBtdcDeg}
                        unit="° BTDC"
                        minimum={0}
                        maximum={360}
                        validationMessage={rotaryTimingValidationMessage}
                        onChange={(value) => updateInduction("advanceBtdcDeg", value)}
                      />
                      <NumberField
                        compact
                        label="Inlet closes"
                        value={project.induction.delayAtdcDeg}
                        unit="° ATDC"
                        minimum={0}
                        maximum={360}
                        validationMessage={rotaryTimingValidationMessage}
                        onChange={(value) => updateInduction("delayAtdcDeg", value)}
                      />
                    </div>
                    <NumberField
                      label="Effective inlet window area"
                      value={project.induction.effectiveWindowAreaMm2}
                      unit="mm²"
                      minimum={0}
                      help="Used only for an idealised constant-area inlet time-area estimate. The actual opening curve is not modelled."
                      onChange={(value) =>
                        updateInduction("effectiveWindowAreaMm2", value)
                      }
                    />
                    <p className="fine-print">
                      Rotary timing is referenced around TDC. Positive advance opens
                      before TDC; positive delay closes after TDC.
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
                value={formatSigned(primaryTransfer?.valveMarginDeg, 1)}
                unit="°"
                detail={
                  primaryTransfer?.valveRelationship === "overlap"
                    ? "Positive overlap"
                    : primaryTransfer?.valveRelationship === "gap"
                      ? "Negative value is a gap"
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
                    {primaryTransfer?.valveMarginDeg === null ||
                    primaryTransfer?.valveMarginDeg === undefined
                      ? "Not applicable"
                      : `${formatSigned(primaryTransfer.valveMarginDeg, 1)}° margin`}
                  </strong>
                  <p>
                    {primaryTransfer?.valveRelationship === "overlap"
                      ? "The inlet opens before the selected transfer event has closed."
                      : primaryTransfer?.valveRelationship === "gap"
                        ? "The transfer closes before the inlet opens."
                        : primaryTransfer?.valveRelationship === "coincident"
                          ? "The two boundaries coincide geometrically."
                          : "Fixed timing is available only for rotary induction."}
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
            </div>

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
              detail="Idealised rectangular projected area integrated over crank angle at the selected RPM."
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
                      <td>
                        {project.induction.effectiveWindowAreaMm2
                          ? `${project.induction.effectiveWindowAreaMm2} mm²`
                          : "Not set"}
                      </td>
                      <td>{formatNumber(analysis.rotary.idealisedAngleAreaMm2Deg, 0)} mm²·deg</td>
                      <td>{formatTimeArea(analysis.rotary.idealisedSpecificTimeArea)} s·mm²/cc</td>
                      <td>Constant effective area</td>
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
                <span className="evidence-level calculation">Calculated</span>
                <h3>Deterministic geometry</h3>
                <p>
                  Millimetre-to-degree conversion, durations, overlaps, compression
                  volumes, squish geometry and idealised time-area follow the inputs
                  and stated equations.
                </p>
              </article>
              <article>
                <span className="evidence-level documented">Documented reference</span>
                <h3>Source-specific limits</h3>
                <p>
                  Manufacturer clearance limits belong here. The calculator never
                  turns a generic forum number into a universal safe target.
                </p>
              </article>
              <article>
                <span className="evidence-level hypothesis">Tuning hypothesis</span>
                <h3>Requires physical verification</h3>
                <p>
                  Power, torque, temperature, detonation margin and flow direction
                  require engine-specific evidence, measurement and responsible testing.
                </p>
              </article>
            </div>
            <details className="method-details">
              <summary>Equations, measurement conventions and model limits</summary>
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
                  href="https://saemobilus.sae.org/papers/relationship-port-shape-engine-performance-two-stroke-engines-1999-01-3333"
                  target="_blank"
                  rel="noreferrer"
                >
                  SAE 1999-01-3333 on transfer shape
                </a>
                <a
                  href="https://api.sip-scootershop.com/api/files/download/1/pdf/fd38cfbd-e197-4fe7-9c64-4904a6cdf2a3/SIP%2BBFA%2BEngine%2BInstructions.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  SIP-BFA kit-specific squish guidance
                </a>
              </div>
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
