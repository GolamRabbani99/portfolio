/** Hero terminal: types log lines, then streams new ones indefinitely. */
import { config, prefersReducedMotion } from "../config";

interface LogMessage {
  tag: string;
  level: string;
  text: string;
}

const EXTRA_LINES: LogMessage[] = [
  { tag: "[OK]", level: "lv-ok", text: "[OK] retry idempotent · event_id stable · count unchanged" },
  { tag: "[INFO]", level: "lv-info", text: "[INFO] pii hashed at boundary · plaintext=0 downstream" },
  { tag: "[OK]", level: "lv-ok", text: "[OK] roas pipeline nominal · cpa £700 vs ltv £2,000" },
  { tag: "[ALERT]", level: "lv-warn", text: "[ALERT] crm write failed → human paged · enq replayable" },
];

// Full escape: these values feed an innerHTML sink, including a quoted
// attribute (class="..."), so " and > must be neutralised too — not just & and <.
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderLine(el: HTMLElement, tag: string, level: string, text: string, cursor: boolean): void {
  const rest = text.slice(tag.length);
  el.innerHTML =
    `<b class="${esc(level)}">${esc(tag)}</b>` +
    esc(rest) +
    (cursor ? '<span class="type-cursor"></span>' : "");
}

function typeLine(el: HTMLElement, msg: LogMessage, done?: () => void): void {
  let i = msg.tag.length;
  renderLine(el, msg.tag, msg.level, msg.tag, true);
  const iv = window.setInterval(() => {
    i++;
    renderLine(el, msg.tag, msg.level, msg.text.slice(0, i), true);
    if (i >= msg.text.length) {
      window.clearInterval(iv);
      renderLine(el, msg.tag, msg.level, msg.text, false);
      done?.();
    }
  }, config.TYPE_SPEED_MS);
}

export function initTypewriter(): void {
  const lines = Array.from(
    document.querySelectorAll<HTMLElement>("#hero-log span")
  );
  if (lines.length === 0) return;

  const initial: LogMessage[] = lines.map((el) => ({
    tag: el.dataset.tag ?? "[OK]",
    level: el.dataset.level ?? "lv-ok",
    text: el.dataset.line ?? "",
  }));

  if (prefersReducedMotion()) {
    lines.forEach((el, i) =>
      renderLine(el, initial[i].tag, initial[i].level, initial[i].text, false)
    );
    return;
  }

  let idx = 0;
  const next = (): void => {
    if (idx < lines.length) {
      const el = lines[idx];
      typeLine(el, initial[idx], next);
      idx++;
    } else {
      let pool = 0;
      window.setInterval(() => {
        for (let s = 0; s < lines.length - 1; s++) {
          lines[s].innerHTML = lines[s + 1].innerHTML;
        }
        typeLine(lines[lines.length - 1], EXTRA_LINES[pool++ % EXTRA_LINES.length]);
      }, config.LOG_STREAM_INTERVAL_MS);
    }
  };
  window.setTimeout(next, 1500);
}
