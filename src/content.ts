/**
 * Runtime content layer.
 *
 * Hydrates the page from `content.json` so the site is editable through a
 * Git-based CMS (Pages CMS) WITHOUT a rebuild step — the CMS commits the JSON
 * (and images) to the live branch and the change shows on next load.
 *
 * Safety / resilience:
 *  - All rendering uses DOM APIs + textContent (never innerHTML), so a value
 *    in content.json can never inject markup or script — even though only the
 *    repo owner can edit it.
 *  - Every section is wrapped so a missing/garbled field falls back to the
 *    HTML already in the page. The site is fully readable even if the fetch
 *    fails (offline, 404, bad JSON). "Never silently fail" — but never blank.
 */

interface HeadingSeg { text: string; accent?: boolean; }
interface Metric { count?: string; prefix?: string; suffix?: string; from?: string; label?: string; }
interface Decision { tag?: string; text?: string; }
interface Project {
  title?: string; stack?: string[]; description?: string;
  decisions?: Decision[]; repo_url?: string; image?: string;
}
interface Principle { code?: string; lead?: string; body?: string; }
interface Cred { status?: string; education?: string[]; stack?: string; base?: string; }
interface GalleryItem {
  image?: string; title?: string; summary?: string; tags?: string[];
  description?: string; link_url?: string; link_label?: string;
}
interface Gallery { label?: string; heading?: string; intro?: string; items?: GalleryItem[]; }
interface Content {
  hero?: { eyebrow?: string; heading?: HeadingSeg[]; sub?: string };
  metrics?: Metric[];
  projects?: Project[];
  gallery?: Gallery;
  principles?: Principle[];
  about?: { photo?: string; paragraphs?: string[]; cred?: Cred };
  contact?: { email?: string; phone?: string; linkedin?: string };
}

/* Resolve a stored media path against the page base (handles absolute URLs,
   data: URIs, root-absolute paths, and repo-relative paths alike). */
function resolveSrc(src: string): string {
  if (/^(https?:|data:|\/)/i.test(src)) return src;
  return new URL(src, document.baseURI).href;
}

/* Rich text: only backtick `code` spans are interpreted — everything else is
   inserted as a text node, so no markup from the data can reach the DOM. */
function appendRich(el: Element, text: string): void {
  for (const part of text.split(/(`[^`]+`)/)) {
    if (!part) continue;
    if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
      const code = document.createElement("code");
      code.textContent = part.slice(1, -1);
      el.appendChild(code);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  }
}
function setRich(el: Element | null, text?: string): void {
  if (!el || text == null) return;
  el.textContent = "";
  appendRich(el, text);
}
function setText(el: Element | null, text?: string): void {
  if (!el || text == null) return;
  el.textContent = text;
}

const guard = (fn: () => void): void => {
  try { fn(); } catch { /* keep existing HTML for this section */ }
};

function renderHero(hero?: Content["hero"]): void {
  if (!hero) return;
  setText(document.getElementById("hero-eyebrow"), hero.eyebrow);
  if (Array.isArray(hero.heading) && hero.heading.length) {
    const h1 = document.getElementById("hero-h1");
    if (h1) {
      h1.textContent = "";
      for (const seg of hero.heading) {
        if (seg.accent) {
          const span = document.createElement("span");
          span.className = "accent";
          span.textContent = seg.text ?? "";
          h1.appendChild(span);
        } else {
          h1.appendChild(document.createTextNode(seg.text ?? ""));
        }
      }
    }
  }
  setRich(document.getElementById("hero-sub"), hero.sub);
}

function renderMetrics(metrics?: Metric[]): void {
  if (!Array.isArray(metrics)) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>(".metrics .metric"));
  metrics.forEach((m, i) => {
    const el = els[i];
    if (!el) return;
    const em = el.querySelector<HTMLElement>(".num em");
    if (em && m.count != null) {
      em.dataset.count = m.count;
      if (m.prefix != null) em.dataset.prefix = m.prefix;
      if (m.suffix != null) em.dataset.suffix = m.suffix;
      if (m.from != null) em.dataset.from = m.from;
      em.textContent = (m.prefix ?? "") + m.count + (m.suffix ?? "");
    }
    setText(el.querySelector(".lbl"), m.label);
  });
}

function renderProjects(projects?: Project[]): void {
  if (!Array.isArray(projects)) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>(".projects .project"));
  projects.forEach((p, i) => {
    const el = els[i];
    if (!el) return;
    setText(el.querySelector("h3"), p.title);
    if (Array.isArray(p.stack)) {
      const stack = el.querySelector(".stack");
      if (stack) {
        stack.textContent = "";
        for (const s of p.stack) {
          const span = document.createElement("span");
          span.textContent = s;
          stack.appendChild(span);
        }
      }
    }
    setRich(el.querySelector("p"), p.description);
    if (Array.isArray(p.decisions)) {
      const ul = el.querySelector(".decisions");
      if (ul) {
        ul.textContent = "";
        for (const d of p.decisions) {
          const li = document.createElement("li");
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = d.tag ?? "";
          li.appendChild(tag);
          li.appendChild(document.createTextNode(" " + (d.text ?? "")));
          ul.appendChild(li);
        }
      }
    }
    if (p.repo_url) {
      const repo = el.querySelector<HTMLAnchorElement>(".links a");
      if (repo) repo.href = p.repo_url;
    }
    if (p.image) {
      let img = el.querySelector<HTMLImageElement>("img.project-thumb");
      if (!img) {
        img = document.createElement("img");
        img.className = "project-thumb";
        img.loading = "lazy";
        el.insertBefore(img, el.firstChild);
      }
      img.src = resolveSrc(p.image);
      img.alt = p.title ?? "";
    }
  });
}

function renderGallery(g?: Gallery): void {
  if (!g) return;
  setText(document.getElementById("gallery-label"), g.label);
  setText(document.getElementById("gallery-heading"), g.heading);
  setText(document.getElementById("gallery-intro"), g.intro);
  if (!Array.isArray(g.items)) return;
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  grid.textContent = "";
  for (const item of g.items) {
    const card = document.createElement("article");
    card.className = "gallery-card reveal";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "View " + (item.title ?? "project"));
    // detail stashed for the pop-up (read by modules/gallery.ts)
    card.dataset.title = item.title ?? "";
    card.dataset.desc = item.description ?? "";
    card.dataset.image = item.image ? resolveSrc(item.image) : "";
    card.dataset.tags = JSON.stringify(Array.isArray(item.tags) ? item.tags : []);
    if (item.link_url) {
      card.dataset.linkUrl = item.link_url;
      card.dataset.linkLabel = item.link_label || "Open";
    }

    if (item.image) {
      const img = document.createElement("img");
      img.className = "gallery-thumb";
      img.loading = "lazy";
      img.src = resolveSrc(item.image);
      img.alt = item.title ?? "";
      card.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "gallery-thumb gallery-thumb--empty";
      ph.setAttribute("aria-hidden", "true");
      const span = document.createElement("span");
      span.textContent = "screenshot";
      ph.appendChild(span);
      card.appendChild(ph);
    }

    const body = document.createElement("div");
    body.className = "gallery-card-body";
    const h3 = document.createElement("h3");
    h3.textContent = item.title ?? "";
    body.appendChild(h3);
    if (item.summary) {
      const p = document.createElement("p");
      p.className = "gallery-summary";
      p.textContent = item.summary;
      body.appendChild(p);
    }
    if (Array.isArray(item.tags) && item.tags.length) {
      const tagWrap = document.createElement("div");
      tagWrap.className = "gallery-tags";
      for (const t of item.tags) {
        const s = document.createElement("span");
        s.textContent = t;
        tagWrap.appendChild(s);
      }
      body.appendChild(tagWrap);
    }
    const more = document.createElement("span");
    more.className = "gallery-more";
    more.textContent = "View detail →";
    body.appendChild(more);
    card.appendChild(body);
    grid.appendChild(card);
  }
}

function renderPrinciples(principles?: Principle[]): void {
  if (!Array.isArray(principles)) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>(".principles .principle"));
  principles.forEach((pr, i) => {
    const el = els[i];
    if (!el) return;
    setText(el.querySelector(".code"), pr.code);
    const para = el.querySelector("p");
    if (para && (pr.lead != null || pr.body != null)) {
      para.textContent = "";
      if (pr.lead) {
        const b = document.createElement("b");
        b.textContent = pr.lead;
        para.appendChild(b);
        para.appendChild(document.createTextNode(" "));
      }
      if (pr.body) appendRich(para, pr.body);
    }
  });
}

function renderAbout(about?: Content["about"]): void {
  if (!about) return;
  const col = document.querySelector(".about-grid > div");
  if (col && Array.isArray(about.paragraphs) && about.paragraphs.length) {
    col.textContent = "";
    if (about.photo) {
      const img = document.createElement("img");
      img.className = "about-photo";
      img.loading = "lazy";
      img.src = resolveSrc(about.photo);
      img.alt = "Golam Rabbani";
      col.appendChild(img);
    }
    for (const t of about.paragraphs) {
      const p = document.createElement("p");
      appendRich(p, t);
      col.appendChild(p);
    }
  }

  const cred = about.cred;
  const credEl = document.querySelector(".cred");
  if (cred && credEl) {
    credEl.textContent = "";
    const label = (text: string): void => {
      const k = document.createElement("span");
      k.className = "k";
      k.textContent = text;
      credEl.appendChild(k);
      credEl.appendChild(document.createElement("br"));
    };
    const gap = (): void => {
      credEl.appendChild(document.createElement("br"));
      credEl.appendChild(document.createElement("br"));
    };
    if (cred.status) {
      label("status:");
      const b = document.createElement("b");
      b.textContent = cred.status;
      credEl.appendChild(b);
      gap();
    }
    if (Array.isArray(cred.education) && cred.education.length) {
      label("education:");
      cred.education.forEach((line) => {
        const b = document.createElement("b");
        b.textContent = line;
        credEl.appendChild(b);
        credEl.appendChild(document.createElement("br"));
      });
      credEl.appendChild(document.createElement("br"));
    }
    if (cred.stack) {
      label("stack:");
      credEl.appendChild(document.createTextNode(cred.stack));
      gap();
    }
    if (cred.base) {
      label("base:");
      credEl.appendChild(document.createTextNode(cred.base));
    }
  }
}

function renderContact(contact?: Content["contact"]): void {
  if (!contact) return;
  if (contact.email) {
    const big = document.querySelector<HTMLAnchorElement>(".contact .big-link");
    if (big) { big.href = "mailto:" + contact.email; big.textContent = contact.email; }
  }
  if (contact.linkedin) {
    const ln = document.querySelector<HTMLAnchorElement>(".contact-meta a[href*='linkedin']");
    if (ln) ln.href = contact.linkedin;
  }
  if (contact.phone) {
    const tel = document.querySelector<HTMLAnchorElement>(".contact-meta a[href^='tel:']");
    if (tel) { tel.href = "tel:" + contact.phone.replace(/\s+/g, ""); tel.textContent = contact.phone; }
  }
}

/** Fetch content.json and hydrate the page. Resolves even on failure. */
export async function applyContent(): Promise<void> {
  let data: Content;
  try {
    const res = await fetch(new URL("content.json", document.baseURI).href, { cache: "no-cache" });
    if (!res.ok) return;
    data = (await res.json()) as Content;
  } catch {
    return; // offline / 404 / bad JSON — page keeps its built-in content
  }
  guard(() => renderHero(data.hero));
  guard(() => renderMetrics(data.metrics));
  guard(() => renderProjects(data.projects));
  guard(() => renderGallery(data.gallery));
  guard(() => renderPrinciples(data.principles));
  guard(() => renderAbout(data.about));
  guard(() => renderContact(data.contact));
}
