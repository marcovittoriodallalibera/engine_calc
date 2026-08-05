export type EngineCharacterProfile =
  | "touring-box"
  | "sport-box"
  | "road-expansion"
  | "race-expansion";

export interface NumericRange {
  minimum: number;
  maximum: number;
}

export interface EngineCharacterProfileDefinition {
  id: EngineCharacterProfile;
  label: string;
  shortLabel: string;
  description: string;
  nominalRpmBias: number;
  nominalBreadth: number;
}

export const ENGINE_CHARACTER_MODEL_VERSION = "phase360-character-mvp-1";

export const ENGINE_CHARACTER_PROFILES: Record<
  EngineCharacterProfile,
  EngineCharacterProfileDefinition
> = {
  "touring-box": {
    id: "touring-box",
    label: "Touring box",
    shortLabel: "Touring",
    description: "Broad road delivery with low and mid-range emphasis.",
    nominalRpmBias: 18,
    nominalBreadth: 82,
  },
  "sport-box": {
    id: "sport-box",
    label: "Sport box",
    shortLabel: "Sport",
    description: "Road-biased response with stronger upper mid-range breathing.",
    nominalRpmBias: 38,
    nominalBreadth: 70,
  },
  "road-expansion": {
    id: "road-expansion",
    label: "Road expansion",
    shortLabel: "Road pipe",
    description: "Upper mid-range and high-speed emphasis with a usable road band.",
    nominalRpmBias: 65,
    nominalBreadth: 58,
  },
  "race-expansion": {
    id: "race-expansion",
    label: "Race expansion",
    shortLabel: "Race pipe",
    description: "Peak-speed and over-rev emphasis with a narrower useful band.",
    nominalRpmBias: 86,
    nominalBreadth: 42,
  },
};

export interface EngineCharacterInputs {
  profile: EngineCharacterProfile;
  exhaustDurationDeg: number;
  transferDurationDeg: number;
  blowdownDeg: number;
  inletAdvanceBtdcDeg: number;
  inletCloseAtdcDeg: number;
  inletTransferMarginDeg: number;
  exhaustSpecificTimeArea?: number | null;
  inletSpecificTimeArea?: number | null;
}

export interface EngineCharacterUncertainty {
  exhaustDurationDeg?: NumericRange;
  transferDurationDeg?: NumericRange;
  blowdownDeg?: NumericRange;
  inletTransferMarginDeg?: NumericRange;
}

export interface CharacterScore {
  value: number;
  minimum: number;
  maximum: number;
}

export interface EngineCharacterResult {
  profile: EngineCharacterProfileDefinition;
  rpmBias: CharacterScore;
  lowSpeedResponse: CharacterScore;
  midRangeBreadth: CharacterScore;
  overRevTendency: CharacterScore;
  pullEmphasis: "low-to-mid" | "mid-range" | "upper-range";
  speedEmphasis: "mid-range" | "upper-mid" | "high-speed";
  bandShape: "broad" | "balanced" | "focused";
  summary: string;
  modelStatement: string;
  modelVersion: typeof ENGINE_CHARACTER_MODEL_VERSION;
}

interface RawCharacterResult {
  rpmBias: number;
  lowSpeedResponse: number;
  midRangeBreadth: number;
  overRevTendency: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalise(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return 50;
  return clampScore(((value - minimum) / (maximum - minimum)) * 100);
}

function rawCharacter(input: EngineCharacterInputs): RawCharacterResult {
  const profile = ENGINE_CHARACTER_PROFILES[input.profile];
  const exhaustIndex = normalise(input.exhaustDurationDeg, 155, 210);
  const transferIndex = normalise(input.transferDurationDeg, 108, 142);
  const blowdownIndex = normalise(input.blowdownDeg, 18, 42);
  const inletDurationIndex = normalise(
    input.inletAdvanceBtdcDeg + input.inletCloseAtdcDeg,
    150,
    235,
  );
  const inletCloseIndex = normalise(input.inletCloseAtdcDeg, 35, 95);
  const timeAreaSignal =
    input.exhaustSpecificTimeArea !== null &&
    input.exhaustSpecificTimeArea !== undefined &&
    input.inletSpecificTimeArea !== null &&
    input.inletSpecificTimeArea !== undefined
      ? normalise(
          Math.log10(
            Math.max(
              1e-9,
              Math.sqrt(
                input.exhaustSpecificTimeArea * input.inletSpecificTimeArea,
              ),
            ),
          ),
          -5.4,
          -3.8,
        )
      : 50;
  const rpmBias = clampScore(
    profile.nominalRpmBias * 0.3 +
      exhaustIndex * 0.22 +
      transferIndex * 0.1 +
      blowdownIndex * 0.14 +
      inletDurationIndex * 0.1 +
      inletCloseIndex * 0.09 +
      timeAreaSignal * 0.05,
  );
  const overlapPenalty = Math.max(0, input.inletTransferMarginDeg) * 2.2;
  const lateClosePenalty = Math.max(0, input.inletCloseAtdcDeg - 72) * 0.8;
  const durationSpreadPenalty = Math.max(
    0,
    Math.abs(input.exhaustDurationDeg - input.transferDurationDeg) - 72,
  ) * 0.35;
  const lowSpeedResponse = clampScore(
    108 - rpmBias * 0.83 - overlapPenalty - lateClosePenalty,
  );
  const midRangeBreadth = clampScore(
    profile.nominalBreadth -
      durationSpreadPenalty -
      overlapPenalty * 0.35 -
      lateClosePenalty * 0.45,
  );
  const overRevTendency = clampScore(
    profile.nominalRpmBias * 0.35 +
      exhaustIndex * 0.24 +
      blowdownIndex * 0.2 +
      inletCloseIndex * 0.14 +
      timeAreaSignal * 0.07,
  );
  return {
    rpmBias,
    lowSpeedResponse,
    midRangeBreadth,
    overRevTendency,
  };
}

function variants(
  input: EngineCharacterInputs,
  uncertainty: EngineCharacterUncertainty | undefined,
): EngineCharacterInputs[] {
  if (!uncertainty) return [input];
  const keys = (
    [
      "exhaustDurationDeg",
      "transferDurationDeg",
      "blowdownDeg",
      "inletTransferMarginDeg",
    ] as const
  ).filter((key) => uncertainty[key] !== undefined);
  let result = [input];
  for (const key of keys) {
    const range = uncertainty[key];
    if (!range) continue;
    result = result.flatMap((entry) => [
      { ...entry, [key]: range.minimum },
      { ...entry, [key]: range.maximum },
    ]);
  }
  return result;
}

function scoreWithBounds(
  value: number,
  values: number[],
): CharacterScore {
  return {
    value,
    minimum: Math.min(value, ...values),
    maximum: Math.max(value, ...values),
  };
}

export function modelEngineCharacter(
  input: EngineCharacterInputs,
  uncertainty?: EngineCharacterUncertainty,
): EngineCharacterResult {
  const nominal = rawCharacter(input);
  const sampled = variants(input, uncertainty).map(rawCharacter);
  const rpmBias = scoreWithBounds(
    nominal.rpmBias,
    sampled.map((entry) => entry.rpmBias),
  );
  const lowSpeedResponse = scoreWithBounds(
    nominal.lowSpeedResponse,
    sampled.map((entry) => entry.lowSpeedResponse),
  );
  const midRangeBreadth = scoreWithBounds(
    nominal.midRangeBreadth,
    sampled.map((entry) => entry.midRangeBreadth),
  );
  const overRevTendency = scoreWithBounds(
    nominal.overRevTendency,
    sampled.map((entry) => entry.overRevTendency),
  );
  const pullEmphasis =
    rpmBias.value < 38
      ? "low-to-mid"
      : rpmBias.value < 64
        ? "mid-range"
        : "upper-range";
  const speedEmphasis =
    rpmBias.value < 36
      ? "mid-range"
      : rpmBias.value < 68
        ? "upper-mid"
        : "high-speed";
  const bandShape =
    midRangeBreadth.value >= 68
      ? "broad"
      : midRangeBreadth.value >= 48
        ? "balanced"
        : "focused";
  const profile = ENGINE_CHARACTER_PROFILES[input.profile];
  return {
    profile,
    rpmBias,
    lowSpeedResponse,
    midRangeBreadth,
    overRevTendency,
    pullEmphasis,
    speedEmphasis,
    bandShape,
    summary: `${profile.shortLabel} context with ${pullEmphasis} pull, ${speedEmphasis} speed emphasis and a ${bandShape} useful band.`,
    modelStatement:
      "Qualitative timing tendency only. The map is not a dyno curve, does not predict torque, power, airflow or safe RPM, and must be checked against measured engine behaviour.",
    modelVersion: ENGINE_CHARACTER_MODEL_VERSION,
  };
}
