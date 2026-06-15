/**
 * Entry point. Orchestration order is a performance decision:
 *  1. CSS + content render immediately (static HTML, no JS required to read).
 *  2. Lightweight animations (GSAP ~70 KB gz) start on DOM ready.
 *  3. three.js (~150 KB gz) is code-split and loaded AFTER first paint via
 *     requestIdleCallback — the hero canvas fades in when ready. A visitor
 *     on a slow connection reads the headline before the GPU warms up.
 */
import "./styles.css";
import { config } from "./config";
import { applyContent } from "./content";
import { initTypewriter } from "./modules/typewriter";
import { initAnimations } from "./modules/animations";
import { initGallery } from "./modules/gallery";

/* ---- apply config-driven links (one edit in config.ts updates the site) ---- */
function applyConfigLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    if (a.href.includes("YOUR-USERNAME")) {
      a.href = a.href.replace("YOUR-USERNAME", config.GITHUB_USER);
    }
  });
}

/* ---- WebGL feature detection ---- */
function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/* ---- lazy-load the 3D scene as its own chunk ---- */
function scheduleHeroScene(): void {
  const canvas = document.getElementById("flow-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  if (!webglAvailable()) {
    canvas.style.background =
      "radial-gradient(80% 80% at 70% 40%, #14233E 0%, #0B1220 70%)";
    return;
  }

  const load = (): void => {
    import("./modules/hero-scene")
      .then((m) => m.initHeroScene(canvas))
      .catch(() => {
        // chunk failed (offline/CDN issue): graceful gradient, page still works
        canvas.style.background =
          "radial-gradient(80% 80% at 70% 40%, #14233E 0%, #0B1220 70%)";
      });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 1500 });
  } else {
    window.setTimeout(load, 350);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Hydrate from content.json first so the typewriter and GSAP read the
  // final DOM; if it fails, the page's built-in HTML is already correct.
  void applyContent().finally(() => {
    applyConfigLinks();
    initTypewriter();
    initAnimations();
    initGallery();
    scheduleHeroScene();
  });
});
