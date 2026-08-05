import path from "node:path";

export const APP_SCHEME = "phase360";
export const APP_HOST = "app";
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const APP_URL = `${APP_ORIGIN}/`;
export const SESSION_PARTITION = "persist:phase360";

export const DESKTOP_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "media-src 'none'",
].join("; ");

export const EXTERNAL_REFERENCE_ORIGINS = new Set([
  "https://api.sip-scootershop.com",
  "https://catalogue.polini.com",
  "https://patents.google.com",
  "https://saemobilus.sae.org",
  "https://wiki.germanscooterforum.de",
  "https://www.bridgestonemotorcycle.com",
  "https://www.sip-scootershop.com",
  "https://www.youtube.com",
]);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function isAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === `${APP_SCHEME}:` &&
      url.hostname === APP_HOST &&
      url.username === "" &&
      url.password === "" &&
      url.port === ""
    );
  } catch {
    return false;
  }
}

export function isAllowedAppNavigation(rawUrl) {
  if (!isAppUrl(rawUrl)) return false;
  const url = new URL(rawUrl);
  return url.pathname === "/" || url.pathname === "/index.html";
}

export function isAllowedExternalReference(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      EXTERNAL_REFERENCE_ORIGINS.has(url.origin)
    );
  } catch {
    return false;
  }
}

export function resolvePackagedAsset(rawUrl, rendererRoot) {
  if (!isAppUrl(rawUrl)) return null;

  const url = new URL(rawUrl);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const segments = relativePath.split("/");
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    segments.some(
      (segment) =>
        !segment || segment === "." || segment === ".." || segment.includes(":"),
    )
  ) {
    return null;
  }

  const candidate = path.resolve(rendererRoot, ...segments);
  const containment = path.relative(rendererRoot, candidate);
  if (
    containment === ".." ||
    containment.startsWith(`..${path.sep}`) ||
    path.isAbsolute(containment)
  ) {
    return null;
  }
  return candidate;
}

export function contentTypeForAsset(assetPath) {
  return MIME_TYPES.get(path.extname(assetPath).toLowerCase()) ?? null;
}

export function isAllowedDownload(downloadUrl, filename) {
  const safeFilename = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(json|svg)$/u.test(filename);
  return safeFilename && downloadUrl.startsWith(`blob:${APP_ORIGIN}/`);
}
