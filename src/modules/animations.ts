/** GSAP choreography: hero intro, scramble, reveals, counters, card tilt. */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isFinePointer, prefersReducedMotion } from "../config";

export function showEverythingStatic(): void {
  document
    .querySelectorAll<HTMLElement>(".reveal, .decisions li")
    .forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  // ensure metric numbers show final values
  document.querySelectorAll<HTMLElement>(".metric .num em").forEach((el) => {
    const target = el.dataset.count ?? "";
    el.textContent = (el.dataset.prefix ?? "") + target + (el.dataset.suffix ?? "");
  });
}

export function initAnimations(): void {
  if (prefersReducedMotion()) {
    showEverythingStatic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // hero load sequence
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from("#hero-eyebrow", { y: 18, opacity: 0, duration: 0.55 })
    .from("#hero-h1", { y: 34, opacity: 0, duration: 0.8 }, "-=0.25")
    .from("#hero-sub", { y: 24, opacity: 0, duration: 0.6 }, "-=0.45")
    .from("#hero-ctas", { y: 18, opacity: 0, duration: 0.5 }, "-=0.35");

  // scramble-in on accent words
  const SCRAMBLE = "▮▯/\\|=+*<>#";
  document
    .querySelectorAll<HTMLElement>("#hero-h1 .accent")
    .forEach((el, n) => {
      const finalText = el.textContent ?? "";
      let frame = 0;
      const total = 26;
      const run = (): void => {
        frame++;
        el.textContent = finalText
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            return i / finalText.length < frame / total
              ? ch
              : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
          })
          .join("");
        if (frame < total) requestAnimationFrame(run);
        else el.textContent = finalText;
      };
      window.setTimeout(run, 600 + n * 350);
    });

  // scroll reveals
  gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 86%", once: true },
    });
  });

  // metric count-ups
  gsap.utils.toArray<HTMLElement>(".metric .num em").forEach((el) => {
    const target = parseFloat(el.dataset.count ?? "0");
    const from = el.dataset.from ? parseFloat(el.dataset.from) : 0;
    const prefix = el.dataset.prefix ?? "";
    const suffix = el.dataset.suffix ?? "";
    const obj = { v: from };
    gsap.to(obj, {
      v: target, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => { el.textContent = prefix + Math.round(obj.v) + suffix; },
      onComplete: () => { el.textContent = prefix + target + suffix; },
    });
  });

  // project cards: entrance + decision log stagger
  gsap.utils.toArray<HTMLElement>(".project").forEach((card, n) => {
    gsap.from(card, {
      y: 46, opacity: 0, rotateX: 6, transformOrigin: "center bottom",
      duration: 0.8, delay: n * 0.12, ease: "power3.out",
      scrollTrigger: { trigger: card, start: "top 85%", once: true },
    });
    gsap.to(card.querySelectorAll(".decisions li"), {
      opacity: 1, x: 0, duration: 0.45, stagger: 0.12, ease: "power2.out",
      scrollTrigger: { trigger: card, start: "top 72%", once: true },
    });
  });

  // 3D tilt + cursor glow (fine pointers only)
  if (isFinePointer()) {
    document.querySelectorAll<HTMLElement>(".project").forEach((card) => {
      card.addEventListener("mousemove", (ev: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        gsap.to(card, {
          rotateY: (px - 0.5) * 7,
          rotateX: (0.5 - py) * 6,
          transformPerspective: 800,
          duration: 0.4, ease: "power2.out",
        });
      }, { passive: true });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
      });
    });
  }
}
