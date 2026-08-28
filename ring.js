class GoodInternetting extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: "open"});
    const script = document.currentScript || [...document.scripts].find(s => /ring\.js(?:\?|$)/.test(s.src));
    const base = script?.src ? new URL(script.src).origin : location.origin;
    const endpoint = this.getAttribute("endpoint") || `${base}/.netlify/functions/feeds`;
    const count = Math.max(1, Math.min(12, Number(this.getAttribute("count") || 5)));

    root.innerHTML = `
      <style>
        :host {
          --gi-bg: transparent;
          --gi-fg: currentColor;
          --gi-muted: color-mix(in srgb, currentColor 60%, transparent);
          --gi-rule: color-mix(in srgb, currentColor 22%, transparent);
          --gi-accent: currentColor;
          display: block;
          color: var(--gi-fg);
          background: var(--gi-bg);
          font-family: "Courier New", Courier, monospace;
        }
        * { box-sizing: border-box; }
        .box { border-block: 1px solid var(--gi-rule); padding: 1rem 0; }
        header { display:flex; gap:1rem; align-items:baseline; justify-content:space-between; margin-bottom:.65rem; }
        h2 { font: inherit; font-weight: 800; letter-spacing:.02em; margin:0; text-transform:uppercase; }
        .tag { color:var(--gi-muted); font-size:.82em; }
        ol { margin:0; padding:0; list-style:none; }
        li { border-top:1px solid var(--gi-rule); padding:.65rem 0; }
        li:first-child { border-top:0; }
        a { color:var(--gi-accent); text-decoration-thickness:.08em; text-underline-offset:.16em; }
        .title { font-weight:650; }
        .meta { color:var(--gi-muted); display:block; font-size:.82em; margin-top:.14rem; }
        footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:.75rem; }
        button {
          appearance:none; background:none; border:1px solid var(--gi-rule);
          border-radius:999px; color:inherit; cursor:pointer; font:inherit;
          font-size:.85em; padding:.42rem .7rem;
        }
        button:hover { border-color:currentColor; }
        .brand { color:var(--gi-muted); font-size:.75em; text-decoration:none; }
        .error { color:var(--gi-muted); font-size:.9em; }
      </style>
      <section class="box" aria-label="Good Internetting">
        <header><h2>Good Internetting</h2><span class="tag">Serendipity, manually curated.</span></header>
        <div class="content" aria-live="polite">Finding good internet…</div>
        <footer style="display:none">
          <button type="button">Take me somewhere good</button>
          <a class="brand" href="${base}" target="_blank" rel="noopener">goodinternetting.com</a>
        </footer>
      </section>`;

    const content = root.querySelector(".content");
    const footer = root.querySelector("footer");
    const button = root.querySelector("button");

    fetch(endpoint)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const posts = (data.posts || []).slice(0, count);
        const members = data.members || [];
        if (!posts.length) throw new Error("No posts found");
        content.innerHTML = `<ol>${posts.map(p => `
          <li>
            <a class="title" href="${escapeAttr(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>
            <span class="meta">${escapeHtml(p.member)}${p.date ? ` · ${relativeDate(p.date)}` : ""}</span>
          </li>`).join("")}</ol>`;
        footer.style.display = "flex";
        button.onclick = () => {
          if (!members.length) return;
          const destination = members[Math.floor(Math.random() * members.length)];
          window.open(destination.home, "_blank", "noopener");
        };
      })
      .catch(err => {
        content.innerHTML = `<p class="error">The good internet is temporarily hiding. <a href="${base}" target="_blank" rel="noopener">Try the main site.</a></p>`;
        console.warn("Good Internetting:", err);
      });
  }
}

function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s="") { return escapeHtml(s); }
function relativeDate(value) {
  const d = new Date(value);
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return d.toLocaleDateString(undefined, {day:"numeric", month:"short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined});
}

if (!customElements.get("good-internetting")) {
  customElements.define("good-internetting", GoodInternetting);
}
