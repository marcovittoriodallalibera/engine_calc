import {
  MAX_PROJECT_BYTES,
  MAX_SHARE_FRAGMENT_LENGTH,
  PROJECT_STORAGE_KEY,
  decodeProjectFragment,
  encodeProjectFragment,
  parseProjectJson,
  safeProjectFilename,
  serialiseProject,
  validateProjectDocument,
  type EngineProjectDraft,
  type ProjectValidation,
} from "./model.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type StorageLoadResult =
  | {
      ok: true;
      project: EngineProjectDraft | null;
      status: "loaded" | "empty";
      message: string;
    }
  | {
      ok: false;
      project: null;
      status: "unavailable" | "invalid";
      message: string;
    };

export type BrowserActionResult<T = undefined> =
  | { ok: true; value: T; message: string }
  | { ok: false; message: string };

export interface ImportableProjectFile {
  size: number;
  text(): Promise<string>;
}

export interface PreparedProjectDownload {
  blob: Blob;
  filename: string;
  json: string;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function resolveStorage(storage: StorageLike | null | undefined): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadProjectFromStorage(
  storage?: StorageLike | null,
  key = PROJECT_STORAGE_KEY,
): StorageLoadResult {
  const repository = resolveStorage(storage);
  if (!repository) {
    return {
      ok: false,
      project: null,
      status: "unavailable",
      message: "Local recovery is unavailable in this browser.",
    };
  }

  try {
    const stored = repository.getItem(key);
    if (stored === null) {
      return {
        ok: true,
        project: null,
        status: "empty",
        message: "No locally saved project was found.",
      };
    }
    const parsed = parseProjectJson(stored);
    if (!parsed.ok) {
      return {
        ok: false,
        project: null,
        status: "invalid",
        message: `The locally saved project was not loaded. ${parsed.message}`,
      };
    }
    return {
      ok: true,
      project: parsed.project,
      status: "loaded",
      message: "The locally saved project was restored.",
    };
  } catch {
    return {
      ok: false,
      project: null,
      status: "unavailable",
      message: "Local recovery is unavailable in this browser.",
    };
  }
}

export function saveProjectToStorage(
  project: EngineProjectDraft,
  storage?: StorageLike | null,
  key = PROJECT_STORAGE_KEY,
): BrowserActionResult {
  const validation = validateProjectDocument(project);
  if (!validation.ok) return validation;

  const json = serialiseProject(validation.project);
  if (byteLength(json) > MAX_PROJECT_BYTES) {
    return { ok: false, message: "The project is too large to save locally." };
  }

  const repository = resolveStorage(storage);
  if (!repository) {
    return {
      ok: false,
      message: "Automatic local recovery is unavailable in this browser.",
    };
  }

  try {
    repository.setItem(key, json);
    return {
      ok: true,
      value: undefined,
      message: "Project saved locally.",
    };
  } catch {
    return {
      ok: false,
      message: "The project could not be saved locally. This session remains usable.",
    };
  }
}

export function clearProjectFromStorage(
  storage?: StorageLike | null,
  key = PROJECT_STORAGE_KEY,
): BrowserActionResult {
  const repository = resolveStorage(storage);
  if (!repository?.removeItem) {
    return { ok: false, message: "Local project storage is unavailable." };
  }
  try {
    repository.removeItem(key);
    return { ok: true, value: undefined, message: "Local project removed." };
  } catch {
    return { ok: false, message: "The local project could not be removed." };
  }
}

export async function importProjectFile(
  file: ImportableProjectFile,
): Promise<ProjectValidation> {
  if (!Number.isFinite(file.size) || file.size < 0) {
    return { ok: false, message: "The selected file has an invalid size." };
  }
  if (file.size > MAX_PROJECT_BYTES) {
    return { ok: false, message: "The project file is too large." };
  }
  try {
    return parseProjectJson(await file.text());
  } catch {
    return { ok: false, message: "The project file could not be read." };
  }
}

export function projectJsonFilename(projectName: string): string {
  return `${safeProjectFilename(projectName)}.phase360.json`;
}

export function prepareProjectDownload(
  project: EngineProjectDraft,
): BrowserActionResult<PreparedProjectDownload> {
  const validation = validateProjectDocument(project);
  if (!validation.ok) return validation;

  const json = serialiseProject(validation.project);
  if (byteLength(json) > MAX_PROJECT_BYTES) {
    return { ok: false, message: "The project is too large to export." };
  }

  return {
    ok: true,
    value: {
      blob: new Blob([json], { type: "application/json;charset=utf-8" }),
      filename: projectJsonFilename(validation.project.name),
      json,
    },
    message: "Project export is ready.",
  };
}

export function downloadBlob(blob: Blob, filename: string): BrowserActionResult {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return { ok: false, message: "Downloads are unavailable in this environment." };
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    const urlToRevoke = objectUrl;
    globalThis.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0);
    return { ok: true, value: undefined, message: "Download started." };
  } catch {
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    return { ok: false, message: "The download could not be started." };
  }
}

export function downloadProjectJson(
  project: EngineProjectDraft,
): BrowserActionResult {
  const prepared = prepareProjectDownload(project);
  if (!prepared.ok) return prepared;
  return downloadBlob(prepared.value.blob, prepared.value.filename);
}

function defaultShareBaseUrl(): string | null {
  try {
    return typeof globalThis.location === "undefined" ? null : globalThis.location.href;
  } catch {
    return null;
  }
}

export function buildProjectShareUrl(
  project: EngineProjectDraft,
  baseUrl?: string,
): BrowserActionResult<string> {
  const validation = validateProjectDocument(project);
  if (!validation.ok) return validation;

  const encoded = encodeProjectFragment(validation.project);
  if (encoded.length > MAX_SHARE_FRAGMENT_LENGTH) {
    return {
      ok: false,
      message: "This project is too large for a reliable link. Export the JSON file instead.",
    };
  }

  const base = baseUrl ?? defaultShareBaseUrl();
  if (!base) {
    return { ok: false, message: "A base URL is required to create a share link." };
  }
  return {
    ok: true,
    value: `${base.replace(/#.*$/u, "")}#p=${encoded}`,
    message: "Share link created.",
  };
}

export function parseProjectShareUrl(urlOrFragment: string): ProjectValidation {
  const hashIndex = urlOrFragment.indexOf("#");
  const fragment = hashIndex >= 0 ? urlOrFragment.slice(hashIndex) : urlOrFragment;
  return decodeProjectFragment(fragment);
}

function clipboardApi(): { writeText(value: string): Promise<void> } | null {
  try {
    const clipboard = globalThis.navigator?.clipboard;
    return clipboard && typeof clipboard.writeText === "function" ? clipboard : null;
  } catch {
    return null;
  }
}

function copyWithDocumentFallback(value: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return false;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
  }
}

export async function copyTextToClipboard(value: string): Promise<BrowserActionResult> {
  const clipboard = clipboardApi();
  if (clipboard) {
    try {
      await clipboard.writeText(value);
      return { ok: true, value: undefined, message: "Copied to the clipboard." };
    } catch {
      // Continue to the synchronous browser fallback.
    }
  }
  return copyWithDocumentFallback(value)
    ? { ok: true, value: undefined, message: "Copied to the clipboard." }
    : { ok: false, message: "Copy is unavailable. Select and copy the link manually." };
}

export async function copyProjectShareUrl(
  project: EngineProjectDraft,
  baseUrl?: string,
): Promise<BrowserActionResult<string>> {
  const share = buildProjectShareUrl(project, baseUrl);
  if (!share.ok) return share;
  const copied = await copyTextToClipboard(share.value);
  return copied.ok
    ? { ok: true, value: share.value, message: copied.message }
    : { ok: false, message: copied.message };
}
