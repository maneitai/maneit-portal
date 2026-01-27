/* =========================================================
   Maneit Portal – Core JS
   Minimal, deterministic, no framework
   ========================================================= */

(() => {
  "use strict";

  /* ---------- Active tab highlight ---------- */
  const currentPath = location.pathname.split("/").pop() || "index.html";

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
      case "h": navigateRoot("index.html"); break;
      case "w": navigate("pages/work.html"); break;
      case "p": navigate("pages/projects.html"); break;
      case "a": navigate("pages/agents.html"); break;
      case "n": navigate("pages/notes.html"); break;
      case "s": navigate("pages/system.html"); break;

      // New
      case "c": navigate("pages/novelcrafter.html"); break;     // Crafter
      case "f": navigate("pages/agentfactory.html"); break;     // Factory
      case "l": navigate("pages/pipelines.html"); break;        // fLows/pipelines
      case "t": navigate("pages/stream.html"); break;           // sTream
    }
  });

  function navigate(path) {
    // Works from root and from /pages
    const isInPages = location.pathname.includes("/pages/");
    const target = isInPages ? "../" + path : path;
    if (location.href.endsWith(target)) return;
    window.location.href = target;
  }

  function navigateRoot(file) {
    const isInPages = location.pathname.includes("/pages/");
    window.location.href = isInPages ? "../" + file : file;
  }

  /* ---------- Local state (reserved) ---------- */
  const state = {
    version: "v1",
    lastVisit: new Date().toISOString()
  };

  try {
    localStorage.setItem("maneit.portal", JSON.stringify(state));
  } catch (_) {
    // portal must work without storage
  }
})();
