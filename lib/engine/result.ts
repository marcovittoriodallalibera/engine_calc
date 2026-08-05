export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  field?: string;
}

export interface CalculationResult<T> {
  value: T | null;
  diagnostics: Diagnostic[];
  valid: boolean;
}

export function errorDiagnostic(
  code: string,
  message: string,
  field?: string,
): Diagnostic {
  return { code, message, severity: "error", ...(field ? { field } : {}) };
}

export function warningDiagnostic(
  code: string,
  message: string,
  field?: string,
): Diagnostic {
  return { code, message, severity: "warning", ...(field ? { field } : {}) };
}

export function calculationResult<T = never>(
  value: null,
  diagnostics?: Diagnostic[],
): CalculationResult<T>;
export function calculationResult<T>(
  value: T,
  diagnostics?: Diagnostic[],
): CalculationResult<T>;
export function calculationResult<T>(
  value: T | null,
  diagnostics: Diagnostic[] = [],
): CalculationResult<T> {
  return {
    value,
    diagnostics,
    valid: value !== null && !diagnostics.some((item) => item.severity === "error"),
  };
}

export function finiteNumberDiagnostic(value: number, field: string): Diagnostic | null {
  return Number.isFinite(value)
    ? null
    : errorDiagnostic("NOT_FINITE", `${field} must be a finite number.`, field);
}

export function positiveNumberDiagnostic(value: number, field: string): Diagnostic | null {
  const finite = finiteNumberDiagnostic(value, field);
  if (finite) return finite;
  return value > 0
    ? null
    : errorDiagnostic("NOT_POSITIVE", `${field} must be greater than zero.`, field);
}

export function nonNegativeNumberDiagnostic(value: number, field: string): Diagnostic | null {
  const finite = finiteNumberDiagnostic(value, field);
  if (finite) return finite;
  return value >= 0
    ? null
    : errorDiagnostic("NEGATIVE_VALUE", `${field} must be zero or greater.`, field);
}

export function collectDiagnostics(
  ...items: Array<Diagnostic | null | undefined>
): Diagnostic[] {
  return items.filter((item): item is Diagnostic => item !== null && item !== undefined);
}
