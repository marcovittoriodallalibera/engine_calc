"use client";

import { useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export interface TimingPhaseArc {
  id: string;
  start: number;
  end: number;
  colour: string;
  label: string;
  category: string;
  /** Optional logical ring. Lower values are placed further from the centre. */
  ring?: number;
}

export interface TimingMarker {
  id: string;
  angle: number;
  label: string;
  colour?: string;
}

export interface TimingDialProps {
  id?: string;
  phases?: readonly TimingPhaseArc[];
  markers?: readonly TimingMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

interface DialPoint {
  x: number;
  y: number;
}

interface PreparedPhase extends TimingPhaseArc {
  key: string;
  normalisedStart: number;
  normalisedEnd: number;
  span: number;
  logicalRing: number;
}

interface PreparedMarker extends TimingMarker {
  key: string;
  normalisedAngle: number;
  resolvedColour: string;
}

const VIEWBOX_SIZE = 640;
const CENTRE = VIEWBOX_SIZE / 2;
const OUTER_RING_RADIUS = 238;
const INNER_RING_RADIUS = 92;
const EPSILON = 0.0001;
const FALLBACK_COLOURS = [
  "#ff6b35",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#f5c451",
  "#f472b6",
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normaliseAngle(angle: number): number {
  const result = ((angle % 360) + 360) % 360;
  return Math.abs(result - 360) < EPSILON ? 0 : result;
}

function clockwiseSpan(start: number, end: number): number {
  const rawSpan = end - start;

  if (Math.abs(rawSpan) >= 360 - EPSILON) {
    return 360;
  }

  return normaliseAngle(rawSpan);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function pointAtAngle(angle: number, radius: number): DialPoint {
  const radians = (normaliseAngle(angle) * Math.PI) / 180;

  return {
    x: roundCoordinate(CENTRE + radius * Math.sin(radians)),
    y: roundCoordinate(CENTRE - radius * Math.cos(radians)),
  };
}

function arcPath(start: number, span: number, radius: number): string {
  const startPoint = pointAtAngle(start, radius);

  if (span >= 360 - EPSILON) {
    const oppositePoint = pointAtAngle(start + 180, radius);

    return [
      `M ${startPoint.x} ${startPoint.y}`,
      `A ${radius} ${radius} 0 1 1 ${oppositePoint.x} ${oppositePoint.y}`,
      `A ${radius} ${radius} 0 1 1 ${startPoint.x} ${startPoint.y}`,
    ].join(" ");
  }

  const endPoint = pointAtAngle(start + span, radius);
  const largeArcFlag = span > 180 ? 1 : 0;

  return [
    `M ${startPoint.x} ${startPoint.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`,
  ].join(" ");
}

function formatAngle(angle: number): string {
  const rounded = Math.round(normaliseAngle(angle) * 10) / 10;
  return `${rounded.toLocaleString("en-GB", { maximumFractionDigits: 1 })}°`;
}

function formatSpan(span: number): string {
  const rounded = Math.round(span * 10) / 10;
  return `${rounded.toLocaleString("en-GB", { maximumFractionDigits: 1 })}°`;
}

function phaseDescription(phase: PreparedPhase): string {
  const crossesTdc =
    phase.span < 360 - EPSILON &&
    phase.normalisedStart + phase.span >= 360 - EPSILON;
  const interval = crossesTdc
    ? `${formatAngle(phase.normalisedStart)} through TDC to ${formatAngle(phase.normalisedEnd)}`
    : `${formatAngle(phase.normalisedStart)} to ${formatAngle(phase.normalisedEnd)}`;

  return `${phase.label}, ${phase.category}. ${interval}. Duration ${formatSpan(phase.span)}.`;
}

export function TimingDial({
  id = "phase360-diagram",
  phases = [],
  markers = [],
  selectedId = null,
  onSelect,
  ariaLabel = "Engine timing diagram covering one 360 degree crankshaft cycle",
  className,
  style,
}: TimingDialProps) {
  const generatedId = useId().replace(/:/g, "");
  const titleId = `timing-dial-title-${generatedId}`;
  const descriptionId = `timing-dial-description-${generatedId}`;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const prepared = useMemo(() => {
    const phaseSource = Array.isArray(phases) ? phases : [];
    const categoryIndexes = new Map<string, number>();

    phaseSource.forEach((phase) => {
      const category =
        typeof phase?.category === "string" && phase.category.trim()
          ? phase.category.trim()
          : "Other";

      if (!categoryIndexes.has(category)) {
        categoryIndexes.set(category, categoryIndexes.size);
      }
    });

    const validPhases: PreparedPhase[] = [];

    phaseSource.forEach((phase, index) => {
      if (!phase || !Number.isFinite(phase.start) || !Number.isFinite(phase.end)) {
        return;
      }

      const span = clockwiseSpan(phase.start, phase.end);

      if (span < EPSILON) {
        return;
      }

      const category =
        typeof phase.category === "string" && phase.category.trim()
          ? phase.category.trim()
          : "Other";
      const id =
        typeof phase.id === "string" && phase.id.trim()
          ? phase.id.trim()
          : `phase-${index + 1}`;
      const label =
        typeof phase.label === "string" && phase.label.trim()
          ? phase.label.trim()
          : `Phase ${index + 1}`;
      const colour =
        typeof phase.colour === "string" && phase.colour.trim()
          ? phase.colour.trim()
          : FALLBACK_COLOURS[index % FALLBACK_COLOURS.length];
      const categoryRing = categoryIndexes.get(category) ?? 0;
      const logicalRing = Number.isFinite(phase.ring)
        ? Math.max(0, Math.floor(phase.ring as number))
        : categoryRing;

      validPhases.push({
        ...phase,
        id,
        label,
        category,
        colour,
        key: `phase-${id}-${index}`,
        normalisedStart: normaliseAngle(phase.start),
        normalisedEnd: normaliseAngle(phase.end),
        span,
        logicalRing,
      });
    });

    const markerSource = Array.isArray(markers) ? markers : [];
    const validMarkers: PreparedMarker[] = [];

    markerSource.forEach((marker, index) => {
      if (!marker || !Number.isFinite(marker.angle)) {
        return;
      }

      const id =
        typeof marker.id === "string" && marker.id.trim()
          ? marker.id.trim()
          : `marker-${index + 1}`;
      const label =
        typeof marker.label === "string" && marker.label.trim()
          ? marker.label.trim()
          : `Marker ${index + 1}`;

      validMarkers.push({
        ...marker,
        id,
        label,
        key: `marker-${id}-${index}`,
        normalisedAngle: normaliseAngle(marker.angle),
        resolvedColour:
          typeof marker.colour === "string" && marker.colour.trim()
            ? marker.colour.trim()
            : "#f8fafc",
      });
    });

    return {
      phases: validPhases,
      markers: validMarkers,
      omittedPhaseCount: Math.max(0, phaseSource.length - validPhases.length),
      omittedMarkerCount: Math.max(0, markerSource.length - validMarkers.length),
    };
  }, [markers, phases]);

  const ringGeometry = useMemo(() => {
    const requestedRings = Array.from(
      new Set(prepared.phases.map((phase) => phase.logicalRing)),
    ).sort((a, b) => a - b);
    const compressedRingIndexes = new Map(
      requestedRings.map((ring, index) => [ring, index]),
    );
    const ringCount = requestedRings.length;
    const step =
      ringCount > 1
        ? (OUTER_RING_RADIUS - INNER_RING_RADIUS) / (ringCount - 1)
        : 0;
    const strokeWidth =
      ringCount > 1 ? clamp(step * 0.62, 6, 26) : 26;

    return {
      requestedRings,
      strokeWidth,
      radiusFor(logicalRing: number): number {
        const compressedIndex = compressedRingIndexes.get(logicalRing) ?? 0;
        return OUTER_RING_RADIUS - compressedIndex * step;
      },
    };
  }, [prepared.phases]);

  const omittedCount =
    prepared.omittedPhaseCount + prepared.omittedMarkerCount;
  const containerStyle: CSSProperties = {
    width: "100%",
    margin: 0,
    padding: 0,
    overflow: "hidden",
    border: 0,
    background: "transparent",
    color: "#f5f4ee",
    ...style,
  };
  const primaryLegendPhases = prepared.phases.filter(
    (phase) => phase.category.toLowerCase() !== "analysis",
  );
  const analysisLegendPhases = prepared.phases.filter(
    (phase) => phase.category.toLowerCase() === "analysis",
  );

  function renderPhaseLegendRow(phase: PreparedPhase) {
    const isSelected = selectedId === phase.id;
    const isActive =
      isSelected || hoveredKey === phase.key || focusedKey === phase.key;
    const sharedStyle = {
      "--phase-colour": phase.colour,
    } as CSSProperties;
    const content = (
      <>
        <span className="timing-legend-bar" aria-hidden="true" />
        <span className="timing-legend-copy">
          <span className="timing-legend-label">{phase.label}</span>
          <span className="visually-hidden">{phase.category}</span>
        </span>
        <span className="timing-legend-value">{formatSpan(phase.span)}</span>
      </>
    );

    return onSelect ? (
      <button
        key={phase.key}
        type="button"
        className={`timing-legend-row ${isActive ? "is-active" : ""}`}
        aria-label={`Select ${phaseDescription(phase)}`}
        aria-pressed={isSelected}
        onMouseEnter={() => setHoveredKey(phase.key)}
        onMouseLeave={() => setHoveredKey(null)}
        onFocus={() => setFocusedKey(phase.key)}
        onBlur={() => setFocusedKey(null)}
        onClick={() => onSelect(phase.id)}
        style={sharedStyle}
      >
        {content}
      </button>
    ) : (
      <div
        key={phase.key}
        className={`timing-legend-row ${isActive ? "is-active" : ""}`}
        onMouseEnter={() => setHoveredKey(phase.key)}
        onMouseLeave={() => setHoveredKey(null)}
        style={sharedStyle}
      >
        {content}
      </div>
    );
  }

  function renderMarkerLegendRow(marker: PreparedMarker) {
    const isSelected = selectedId === marker.id;
    const isActive =
      isSelected || hoveredKey === marker.key || focusedKey === marker.key;
    const markerStyle = {
      "--marker-colour": marker.resolvedColour,
    } as CSSProperties;
    const content = (
      <>
        <span className="timing-marker-dot" aria-hidden="true" />
        <span>{marker.label}</span>
        <span className="timing-marker-angle">
          {formatAngle(marker.normalisedAngle)}
        </span>
      </>
    );

    return onSelect ? (
      <button
        key={marker.key}
        type="button"
        className={`timing-marker-row ${isActive ? "is-active" : ""}`}
        aria-label={`Select ${marker.label} at ${formatAngle(marker.normalisedAngle)}`}
        aria-pressed={isSelected}
        onMouseEnter={() => setHoveredKey(marker.key)}
        onMouseLeave={() => setHoveredKey(null)}
        onFocus={() => setFocusedKey(marker.key)}
        onBlur={() => setFocusedKey(null)}
        onClick={() => onSelect(marker.id)}
        style={markerStyle}
      >
        {content}
      </button>
    ) : (
      <span
        key={marker.key}
        className={`timing-marker-row ${isActive ? "is-active" : ""}`}
        style={markerStyle}
      >
        {content}
      </span>
    );
  }

  return (
    <figure className={className} style={containerStyle} aria-label={ariaLabel}>
      <svg
        id={id}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        width="100%"
        height="auto"
        role="group"
        aria-labelledby={`${titleId} ${descriptionId}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <title id={titleId}>{ariaLabel}</title>
        <desc id={descriptionId}>
          {prepared.phases.length > 0
            ? `${prepared.phases.length} timing phases and ${prepared.markers.length} reference markers. Use the labelled controls below the diagram to inspect each item${onSelect ? " and select it" : ""}.`
            : "No valid timing phases are available."}
        </desc>

        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="302"
          fill="#111510"
          stroke="rgba(225, 228, 218, 0.14)"
          strokeWidth="1"
        />
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="277"
          fill="none"
          stroke="rgba(225, 228, 218, 0.24)"
          strokeWidth="1"
        />

        {Array.from({ length: 72 }, (_, index) => {
          const angle = index * 5;
          const isThirtyDegreeTick = angle % 30 === 0;
          const isTenDegreeTick = angle % 10 === 0;
          const startRadius = isThirtyDegreeTick
            ? 260
            : isTenDegreeTick
              ? 266
              : 271;
          const start = pointAtAngle(angle, startRadius);
          const end = pointAtAngle(angle, 278);

          return (
            <line
              key={`tick-${angle}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={
                angle === 0 || angle === 180
                  ? "#f5f4ee"
                  : isThirtyDegreeTick
                    ? "rgba(210, 215, 203, 0.46)"
                    : isTenDegreeTick
                      ? "rgba(210, 215, 203, 0.28)"
                      : "rgba(210, 215, 203, 0.13)"
              }
              strokeWidth={isThirtyDegreeTick ? 2 : isTenDegreeTick ? 1.2 : 0.8}
            />
          );
        })}

        {Array.from({ length: 12 }, (_, index) => {
          const angle = index * 30;
          const point = pointAtAngle(angle, 291);

          return (
            <text
              key={`label-${angle}`}
              x={point.x}
              y={point.y}
              fill={angle === 0 || angle === 180 ? "#f5f4ee" : "#9ba398"}
              fontSize="11"
              fontWeight={angle === 0 || angle === 180 ? "700" : "500"}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {angle}°
            </text>
          );
        })}

        {ringGeometry.requestedRings.map((ring) => {
          const radius = ringGeometry.radiusFor(ring);

          return (
            <circle
              key={`ring-${ring}`}
              cx={CENTRE}
              cy={CENTRE}
              r={radius}
              fill="none"
              stroke="rgba(210, 215, 203, 0.1)"
              strokeWidth={ringGeometry.strokeWidth}
              aria-hidden="true"
            />
          );
        })}

        {prepared.phases.map((phase) => {
          const radius = ringGeometry.radiusFor(phase.logicalRing);
          const path = arcPath(phase.normalisedStart, phase.span, radius);
          const isSelected = selectedId === phase.id;
          const isActive =
            isSelected || hoveredKey === phase.key || focusedKey === phase.key;
          const select = onSelect ? () => onSelect(phase.id) : undefined;

          return (
            <g key={phase.key}>
              {isActive ? (
                <path
                  d={path}
                  fill="none"
                  stroke={isSelected ? "rgba(255, 255, 255, 0.76)" : phase.colour}
                  strokeWidth={ringGeometry.strokeWidth + (isSelected ? 10 : 7)}
                  strokeLinecap="round"
                  opacity={isSelected ? 0.28 : 0.16}
                  pointerEvents="none"
                  aria-hidden="true"
                />
              ) : null}
              <path
                d={path}
                fill="none"
                stroke={phase.colour}
                strokeWidth={
                  ringGeometry.strokeWidth + (isSelected ? 3 : isActive ? 1.5 : 0)
                }
                strokeLinecap="round"
                opacity={
                  isActive ? 1 : selectedId === null ? 0.86 : 0.32
                }
                aria-hidden="true"
                onMouseEnter={() => setHoveredKey(phase.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={select}
                style={{
                  cursor: onSelect ? "pointer" : "default",
                  outline: "none",
                }}
              >
                <title>{phaseDescription(phase)}</title>
              </path>
            </g>
          );
        })}

        {prepared.markers.map((marker) => {
          const inner = pointAtAngle(marker.normalisedAngle, 232);
          const outer = pointAtAngle(marker.normalisedAngle, 254);
          const cap = pointAtAngle(marker.normalisedAngle, 261);
          const isSelected = selectedId === marker.id;
          const isActive =
            isSelected || hoveredKey === marker.key || focusedKey === marker.key;
          const select = onSelect ? () => onSelect(marker.id) : undefined;
          const description = `${marker.label}. Reference marker at ${formatAngle(marker.normalisedAngle)}.`;

          return (
            <g
              key={marker.key}
              aria-hidden="true"
              onMouseEnter={() => setHoveredKey(marker.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={select}
              style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
            >
              <title>{description}</title>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={marker.resolvedColour}
                strokeWidth={isActive ? 2.5 : 1.25}
                strokeDasharray="4 7"
                opacity={isActive ? 0.95 : 0.55}
                pointerEvents="stroke"
              />
              <circle
                cx={cap.x}
                cy={cap.y}
                r={isActive ? 5.5 : 4}
                fill={marker.resolvedColour}
                stroke="#111510"
                strokeWidth="2"
              />
            </g>
          );
        })}

        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="73"
          fill="#171b17"
          stroke="rgba(225, 228, 218, 0.2)"
          strokeWidth="1.5"
          aria-hidden="true"
        />
        <text
          x={CENTRE}
          y={CENTRE - 11}
          fill="#f5f4ee"
          fontSize="20"
          fontWeight="760"
          textAnchor="middle"
          dominantBaseline="central"
          aria-hidden="true"
        >
          0° TDC
        </text>
        <text
          x={CENTRE}
          y={CENTRE + 17}
          fill="#c7cdc2"
          fontSize="14"
          fontWeight="650"
          textAnchor="middle"
          dominantBaseline="central"
          aria-hidden="true"
        >
          180° BDC
        </text>

        {prepared.phases.length === 0 ? (
          <g aria-hidden="true">
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={OUTER_RING_RADIUS}
              fill="none"
              stroke="rgba(148, 163, 184, 0.16)"
              strokeWidth="18"
              strokeDasharray="2 12"
            />
            <text
              x={CENTRE}
              y={CENTRE + 104}
              fill="#cbd5e1"
              fontSize="14"
              fontWeight="650"
              textAnchor="middle"
            >
              No valid phases
            </text>
            <text
              x={CENTRE}
              y={CENTRE + 126}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              Add a phase to populate the dial
            </text>
          </g>
        ) : null}
      </svg>

      {prepared.phases.length > 0 || prepared.markers.length > 0 ? (
        <figcaption className="timing-dial-caption">
          {prepared.phases.length > 0 ? (
            <>
              <div className="timing-phase-legend" aria-label="Timing phase legend">
                {primaryLegendPhases.map(renderPhaseLegendRow)}
              </div>
              {analysisLegendPhases.length > 0 ? (
                <details className="timing-legend-disclosure">
                  <summary>Analysis overlays ({analysisLegendPhases.length})</summary>
                  <div
                    className="timing-phase-legend"
                    aria-label="Analysis overlay legend"
                  >
                    {analysisLegendPhases.map(renderPhaseLegendRow)}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}

          {prepared.markers.length > 0 ? (
            <details className="timing-legend-disclosure">
              <summary>Event markers ({prepared.markers.length})</summary>
              <div className="timing-marker-legend" aria-label="Reference marker legend">
                {prepared.markers.map(renderMarkerLegendRow)}
              </div>
            </details>
          ) : null}
        </figcaption>
      ) : null}

      {omittedCount > 0 ? (
        <p className="timing-omitted-note" role="status">
          {omittedCount} invalid {omittedCount === 1 ? "item was" : "items were"} omitted
          from the diagram.
        </p>
      ) : null}
    </figure>
  );
}

export default TimingDial;
