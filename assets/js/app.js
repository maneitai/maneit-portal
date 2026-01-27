/* =========================================================
   Maneit Portal – Core JS (bulletproof nav)
   ========================================================= */

(() => {
  "use strict";

  const pathFile = () => location.pathname.split("/").pop() || "index.html";
  const inPages = () => location.pathname.includes("/pages/");
  const currentPath = pathFile();

  /* ---------- Active tab highlight (robust) ---------- */
  const tabs = Array.from(document.querySelectorAll(".tab"));
  let active = null;

  for (const t of tabs) {
    const href = t.getAttribute("href") || "";
    const hrefFile = href.split("/").pop();
    if (hrefFile === currentPath) {
      active = t;
      t.setAttribute("aria-current", "page");
      // keep your existing inline highlight too (works even if css is stale)
      t.style.borderColor = "rgba(74,222,128,.45)";
      t.style.background = "rgba(74,222,128,.08)";
    }
  }

  // Auto-scroll the nav so the active tab is visible
  const nav = document.querySelector(".tabs");
  if (nav && active) {
    try {
      const navRect = nav.getBoundingClientRect();
      const aRect = active.getBoundingClientRect();
      const leftOverflow = aRect.left < navRect.left;
      const rightOverflow = aRect.right > navRect.right;
      if (leftOverflow || rightOverflow) {
        active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    } catch {}
  }

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();

    switch (k) {
      case "h": goRoot("index.html"); break;
      case "u": go("pages/hub.html"); break;
      case "w": go("pages/work.html"); break;
      case "p": go("pages/projects.html"); break;
      case "a": go("pages/agents.html"); break;
      case "n": go("pages/notes.html"); break;
      case "s": go("pages/system.html"); break;
      case "c": go("pages/novelcrafter.html"); break;
      case "f": go("pages/agentfactory.html"); break;
      case "l": go("pages/pipelines.html"); break;
      case "t": go("pages/stream.html"); break;
    }
  });

  function go(target) {
    const href = inPages() ? "../" + target : target;
    window.location.href = href;
  }

  function goRoot(file) {
    window.location.href = inPages() ? "../" + file : file;
  }

  /* ---------- Copy buttons ---------- */
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
        flash(btn, "No access");
      }
    });
  });

  function flash(btn, label) {
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => (btn.textContent = old), 900);
  }

  /* ---------- Notes autosave + drafts ---------- */
  const notesArea = document.querySelector("[data-notes]");
  if (notesArea) {
    const KEY = "maneit.notes.v1";
    const DRAFTS = "maneit.drafts.v1";

    try {
      const existing = localStorage.getItem(KEY);
      if (existing && !notesArea.value) notesArea.value = existing;
    } catch {}

    let t = null;
    notesArea.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(KEY, notesArea.value); } catch {}
      }, 250);
    });

    const saveDraftBtn = document.querySelector("[data-save-draft]");
    const draftTitleEl = document.querySelector("[data-draft-title]");
    const draftsList = document.querySelector("[data-drafts-list]");

    const loadDrafts = () => {
      try {
        const raw = localStorage.getItem(DRAFTS);
        const v = raw ? JSON.parse(raw) : [];
        return Array.isArray(v) ? v : [];
      } catch { return []; }
    };

    const renderDrafts = () => {
      if (!draftsList) return;
      draftsList.innerHTML = "";
      const drafts = loadDrafts();

      drafts.slice(0, 30).forEach((d, idx) => {
        const div = document.createElement("div");
        div.className = "card";
        div.style.padding = "12px";
        div.style.cursor = "pointer";
        div.innerHTML = `<strong>${escapeHtml(d.title || "Untitled")}</strong>
                         <div class="mono" style="margin-top:6px;">${escapeHtml(d.when || "")}</div>`;
        div.addEventListener("click", () => {
          notesArea.value = d.body || "";
          try { localStorage.setItem(KEY, notesArea.value); } catch {}
        });

        const del = document.createElement("button");
        del.className = "btn";
        del.style.marginTop = "10px";
        del.textContent = "Delete";
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const drafts2 = loadDrafts();
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

        const drafts = loadDrafts();
        drafts.unshift({ title, body, when });
        try { localStorage.setItem(DRAFTS, JSON.stringify(drafts)); } catch {}

        if (draftTitleEl) draftTitleEl.value = "";
        renderDrafts();
        flash(saveDraftBtn, "Saved");
      });
    }

    renderDrafts();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }
})();
