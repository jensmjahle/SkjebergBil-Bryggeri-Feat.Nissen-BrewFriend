function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configured = window.env?.VITE_API_URL || import.meta.env.VITE_API_URL;
  if (typeof configured === "string" && configured.trim()) {
    return trimTrailingSlash(configured.trim());
  }

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  // In production, default to same-origin so /api and /uploads can be reverse-proxied.
  return "";
}

export function toApiUrl(path = "") {
  const base = getApiBaseUrl();
  if (!path) return base;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
