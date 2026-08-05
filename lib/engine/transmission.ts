import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  positiveNumberDiagnostic,
  warningDiagnostic,
  type CalculationResult,
} from "./result.ts";

export interface TransmissionGearInput {
  id: string;
  label: string;
  clusterPinionTeeth: number;
  drivenGearTeeth: number;
}

export interface TransmissionInput {
  primaryDrivePinionTeeth: number;
  primaryDrivenGearTeeth: number;
  wheelRollingCircumferenceMm: number;
  maximumRpm: number;
  gears: TransmissionGearInput[];
}

export interface TransmissionGearResult extends TransmissionGearInput {
  gearNumber: number;
  gearRatio: number;
  overallReduction: number;
  wheelRpmAtMaximumRpm: number;
  speedKmhPer1000Rpm: number;
  speedAtMaximumRpmKmh: number;
  rpmAfterUpshiftAtMaximumRpm: number | null;
  rpmDropPercent: number | null;
}

export interface TransmissionResult {
  primaryRatio: number;
  wheelRollingCircumferenceMm: number;
  maximumRpm: number;
  maximumSpeedKmh: number;
  gears: TransmissionGearResult[];
}

function wholeToothDiagnostic(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    return positiveNumberDiagnostic(value, field);
  }
  if (!Number.isInteger(value)) {
    return errorDiagnostic(
        "TOOTH_COUNT_NOT_INTEGER",
        `${field} must be a whole number of teeth.`,
        field,
      );
  }
  return value <= 200
    ? null
    : errorDiagnostic(
        "TOOTH_COUNT_OUT_OF_RANGE",
        `${field} must be 200 teeth or fewer.`,
        field,
      );
}

function boundedNumberDiagnostic(input: {
  value: number;
  field: string;
  minimum: number;
  maximum: number;
  whole?: boolean;
}) {
  const positive = positiveNumberDiagnostic(input.value, input.field);
  if (positive) return positive;
  if (input.whole && !Number.isInteger(input.value)) {
    return errorDiagnostic(
      "VALUE_NOT_INTEGER",
      `${input.field} must be a whole number.`,
      input.field,
    );
  }
  return input.value >= input.minimum && input.value <= input.maximum
    ? null
    : errorDiagnostic(
        "VALUE_OUT_OF_RANGE",
        `${input.field} must be between ${input.minimum} and ${input.maximum}.`,
        input.field,
      );
}

export function theoreticalRoadSpeedKmh(input: {
  engineRpm: number;
  overallReduction: number;
  wheelRollingCircumferenceMm: number;
}): number {
  return (
    (input.engineRpm * input.wheelRollingCircumferenceMm * 60) /
    (input.overallReduction * 1_000_000)
  );
}

export function engineRpmAtRoadSpeed(input: {
  speedKmh: number;
  overallReduction: number;
  wheelRollingCircumferenceMm: number;
}): number {
  return (
    (input.speedKmh * input.overallReduction * 1_000_000) /
    (input.wheelRollingCircumferenceMm * 60)
  );
}

export function calculateTransmission(
  input: TransmissionInput,
): CalculationResult<TransmissionResult> {
  const diagnostics = collectDiagnostics(
    wholeToothDiagnostic(
      input.primaryDrivePinionTeeth,
      "primaryDrivePinionTeeth",
    ),
    wholeToothDiagnostic(
      input.primaryDrivenGearTeeth,
      "primaryDrivenGearTeeth",
    ),
    boundedNumberDiagnostic({
      value: input.wheelRollingCircumferenceMm,
      field: "wheelRollingCircumferenceMm",
      minimum: 500,
      maximum: 5_000,
    }),
    boundedNumberDiagnostic({
      value: input.maximumRpm,
      field: "maximumRpm",
      minimum: 500,
      maximum: 20_000,
      whole: true,
    }),
  );

  if (input.gears.length !== 4 && input.gears.length !== 5) {
    diagnostics.push(
      errorDiagnostic(
        "GEAR_COUNT_UNSUPPORTED",
        "A Vespa transmission study must contain four or five gears.",
        "gears",
      ),
    );
  }

  const gearIds = new Set<string>();
  input.gears.forEach((gear, index) => {
    const duplicateId = gear.id.trim() !== "" && gearIds.has(gear.id);
    gearIds.add(gear.id);
    diagnostics.push(
      ...collectDiagnostics(
        gear.id.trim()
          ? null
          : errorDiagnostic(
              "GEAR_ID_EMPTY",
              `Gear ${index + 1} must have an id.`,
              `gears.${index}.id`,
            ),
        gear.label.trim()
          ? null
          : errorDiagnostic(
              "GEAR_LABEL_EMPTY",
              `Gear ${index + 1} must have a label.`,
              `gears.${index}.label`,
            ),
        duplicateId
          ? errorDiagnostic(
              "GEAR_ID_DUPLICATE",
              `Gear id ${gear.id} is used more than once.`,
              `gears.${index}.id`,
            )
          : null,
        wholeToothDiagnostic(
          gear.clusterPinionTeeth,
          `gears.${index}.clusterPinionTeeth`,
        ),
        wholeToothDiagnostic(
          gear.drivenGearTeeth,
          `gears.${index}.drivenGearTeeth`,
        ),
      ),
    );
  });

  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const primaryRatio =
    input.primaryDrivenGearTeeth / input.primaryDrivePinionTeeth;
  const baseGears = input.gears.map((gear, index) => {
    const gearRatio = gear.drivenGearTeeth / gear.clusterPinionTeeth;
    const overallReduction = primaryRatio * gearRatio;
    return {
      ...gear,
      gearNumber: index + 1,
      gearRatio,
      overallReduction,
      wheelRpmAtMaximumRpm: input.maximumRpm / overallReduction,
      speedKmhPer1000Rpm: theoreticalRoadSpeedKmh({
        engineRpm: 1_000,
        overallReduction,
        wheelRollingCircumferenceMm: input.wheelRollingCircumferenceMm,
      }),
      speedAtMaximumRpmKmh: theoreticalRoadSpeedKmh({
        engineRpm: input.maximumRpm,
        overallReduction,
        wheelRollingCircumferenceMm: input.wheelRollingCircumferenceMm,
      }),
    };
  });

  for (let index = 1; index < baseGears.length; index += 1) {
    if (
      baseGears[index].overallReduction >=
      baseGears[index - 1].overallReduction
    ) {
      diagnostics.push(
        warningDiagnostic(
          "GEAR_PROGRESSION_NOT_DESCENDING",
          `Gear ${index + 1} is not taller than gear ${index}. Check the entered tooth pairing.`,
          `gears.${index}`,
        ),
      );
    }
  }

  const gears: TransmissionGearResult[] = baseGears.map((gear, index) => {
    const next = baseGears[index + 1];
    const rpmAfterUpshiftAtMaximumRpm = next
      ? input.maximumRpm * (next.overallReduction / gear.overallReduction)
      : null;
    return {
      ...gear,
      rpmAfterUpshiftAtMaximumRpm,
      rpmDropPercent:
        rpmAfterUpshiftAtMaximumRpm === null
          ? null
          : 100 * (1 - rpmAfterUpshiftAtMaximumRpm / input.maximumRpm),
    };
  });

  return calculationResult(
    {
      primaryRatio,
      wheelRollingCircumferenceMm: input.wheelRollingCircumferenceMm,
      maximumRpm: input.maximumRpm,
      maximumSpeedKmh: Math.max(
        0,
        ...gears.map((gear) => gear.speedAtMaximumRpmKmh),
      ),
      gears,
    },
    diagnostics,
  );
}
