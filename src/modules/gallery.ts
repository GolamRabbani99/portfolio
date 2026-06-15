/**
 * Gallery lightbox: clicking (or Enter/Space on) a `.gallery-card` opens the
 * `#work-modal` pop-up populated from the card's data-* attributes.
 *
 * Accessible: focus moves into the dialog and is trapped, Escape / backdrop /
 * close button dismiss it, body scroll locks, and focus returns to the card.
 * Listeners are delegated on the grid, so cards rebuilt by content.ts still work.
 */
export function initGallery(): void {
  const grid = document.getElementById("gallery-grid");
  const modal = document.getElementById("work-modal");
  if (!grid || !modal) return;

  const img = modal.querySelector<HTMLImageElement>("#lb-img");
  const tags = modal.querySelector<HTMLElement>("#lb-tags");
  const title = modal.querySelector<HTMLElement>("#lb-title");
  const desc = modal.querySelector<HTMLElement>("#lb-desc");
  const link = modal.querySelector<HTMLAnchorElement>("#lb-link");
  const closeBtn = modal.querySelector<HTMLElement>(".lightbox-close");
  let lastFocus: HTMLElement | null = null;

  const open = (card: HTMLElement): void => {
    if (title) title.textContent = card.dataset.title ?? "";
    if (desc) desc.textContent = card.dataset.desc ?? "";

    if (img) {
      const src = card.dataset.image ?? "";
      if (src) { img.src = src; img.alt = card.dataset.title ?? ""; img.hidden = false; }
      else { img.removeAttribute("src"); img.hidden = true; }
    }

    if (tags) {
      tags.textContent = "";
      let arr: string[] = [];
      try { arr = JSON.parse(card.dataset.tags ?? "[]"); } catch { arr = []; }
      for (const t of arr) {
        const s = document.createElement("span");
        s.textContent = t;
        tags.appendChild(s);
      }
    }

    if (link) {
      if (card.dataset.linkUrl) {
        link.href = card.dataset.linkUrl;
        link.textContent = (card.dataset.linkLabel || "Open") + " ↗";
        link.hidden = false;
      } else {
        link.hidden = true;
        link.removeAttribute("href");
      }
    }

    lastFocus = document.activeElement as HTMLElement | null;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  };

  const close = (): void => {
    modal.hidden = true;
    document.body.style.overflow = "";
    lastFocus?.focus();
  };

  grid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".gallery-card");
    if (card) open(card);
  });
  grid.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    const card = (ke.target as HTMLElement).closest<HTMLElement>(".gallery-card");
    if (card) { ke.preventDefault(); open(card); }
  });

  modal.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) close();
  });

  document.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && !modal.hidden) close();
  });

  // simple focus trap inside the dialog
  modal.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Tab" || modal.hidden) return;
    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>("button, a[href]")
    ).filter((el) => !el.hidden && el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (ke.shiftKey && document.activeElement === first) { ke.preventDefault(); last.focus(); }
    else if (!ke.shiftKey && document.activeElement === last) { ke.preventDefault(); first.focus(); }
  });
}
