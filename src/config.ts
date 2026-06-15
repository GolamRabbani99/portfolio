/**
 * Single source of truth for identity and links.
 * Change GITHUB_USER once; every link on the site updates at runtime.
 */
export const config = {
  GITHUB_USER: "GolamRabbani99", // <-- the only edit needed before deploy
  EMAIL: "golamrabbani6174@gmail.com",
  LOG_STREAM_INTERVAL_MS: 4200,
  TYPE_SPEED_MS: 16,
} as const;

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isMobileViewport = (): boolean =>
  window.matchMedia("(max-width: 780px)").matches;

export const isFinePointer = (): boolean =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
