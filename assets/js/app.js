/* =========================================================
   Maneit Portal – Core JS
   Minimal, deterministic, no framework
   ========================================================= */

(() => {
  "use strict";

  const pathFile = () => location.pathname.split("/").pop() || "index.html";
  const inPages = () => location.pathname.includes("/pages/");

  /* ---------- Active tab highlight ---------- */
  const currentPath = pathFile();
  document.querySelectorAll(".tab").forEach(tab => {
    const href = tab.getAttribute("href");
    if (!href) return;
    if (href.endsWith(currentPath)) {
      tab.style.borderColor = "rgba(74,222,128,.45)";
      tab.style.background = "rgba(74,222,128,.08)";
    }
  });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();

    switch (k) {
      case "h": goRoot("index.html"); break;
      case "w": go("pages/work.html"); break;
      case "p": go("pages/projects.html"); break;
      case "a": go("pages/agents.html"); break;
      case "n": go("pages/notes.html"); break;
      case "s": go("pages/system.html"); break;

      case "u": go("pages/hub.html"); break;          // hUb
      case "c": go("pages/novelcrafter.html"); break; // Crafter
      case "f": go("pages/agentfactory.html"); break; // Factory
      case "l": go("pages/pipelines.html"); break;    // fLows
      case "t": go("pages/stream.html"); break;       // sTream
    }
  });

  function go(target) {
    const href = inPages() ? "../" + target : target;
    window.location.href = href;
  }

  function goRoot(file) {
    window.location.href = inPages() ? "../" + file : file;
  }

  /* ---------- Copy buttons (any element with data-copy-target) ---------- */
  document.querySelectorAll("[data-copy-target]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const sel = btn.getAttribute("data-copy-target");
      const el = sel ? document.querySelector(sel) : null;
      const text = el ? (el.innerText || el.textContent || "") : "";

      if (!text.trim()) return;

      try {
        await navigator.clipboard.writeText(text);
        flash(btn, "Copied");
      } catch {
        // fallback
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          flash(btn, "Copied");
        } catch {
          flash(btn, "No access");
        }
      }
    });
  });

  function flash(btn, label) {
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => (btn.textContent = old), 900);
  }

  /* ---------- Notes autosave + drafts (pages/notes.html) ---------- */
  const notesArea = document.querySelector("[data-notes]");
  if (notesArea) {
    const KEY = "maneit.notes.v1";
    const DRAFTS = "maneit.drafts.v1";

    // load
    try {
      const existing = localStorage.getItem(KEY);
      if (existing && !notesArea.value) notesArea.value = existing;
    } catch {}

    // save
    let t = null;
    notesArea.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(KEY, notesArea.value); } catch {}
      }, 250);
    });

    // draft save button
    const saveDraftBtn = document.querySelector("[data-save-draft]");
    const draftTitleEl = document.querySelector("[data-draft-title]");
    const draftsList = document.querySelector("[data-drafts-list]");

    const renderDrafts = () => {
      if (!draftsList) return;
      draftsList.innerHTML = "";
      const drafts = loadDrafts(DRAFTS);

      drafts.slice(0, 30).forEach((d, idx) => {
        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `<strong>${escapeHtml(d.title || "Untitled")}</strong>
                         <small class="muted">${escapeHtml(d.when)}</small>`;
        div.addEventListener("click", () => {
          notesArea.value = d.body || "";
          try { localStorage.setItem(KEY, notesArea.value); } catch {}
        });

        // delete
        const del = document.createElement("button");
        del.className = "btn";
        del.style.marginTop = "10px";
        del.textContent = "Delete";
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const drafts2 = loadDrafts(DRAFTS);
          drafts2.splice(idx, 1);
          try { localStorage.setItem(DRAFTS, JSON.stringify(drafts2)); } catch {}
          renderDrafts();
        });

        div.appendChild(del);
        draftsList.appendChild(div);
      });
    };

    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", () => {
        const title = (draftTitleEl?.value || "").trim() || "Draft";
        const body = notesArea.value || "";
        const when = new Date().toISOString();

        const drafts = loadDrafts(DRAFTS);
        drafts.unshift({ title, body, when });
        try { localStorage.setItem(DRAFTS, JSON.stringify(drafts)); } catch {}

        if (draftTitleEl) draftTitleEl.value = "";
        renderDrafts();
        flash(saveDraftBtn, "Saved");
      });
    }

    renderDrafts();
  }

  function loadDrafts(key) {
    try {
      const raw = localStorage.getItem(key);
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }

  /* ---------- Local state (reserved) ---------- */
  try {
    localStorage.setItem("maneit.portal", JSON.stringify({
      version: "v1",
      lastVisit: new Date().toISOString()
    }));
  } catch {}
})();
