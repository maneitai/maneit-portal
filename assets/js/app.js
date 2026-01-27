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
  document.addEventListener("keydown", e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    switch (e.key.toLowerCase()) {
      case "w":
        navigate("pages/work.html");
        break;
      case "p":
        navigate("pages/projects.html");
        break;
      case "a":
        navigate("pages/agents.html");
        break;
      case "n":
        navigate("pages/notes.html");
        break;
      case "s":
        navigate("pages/system.html");
        break;
    }
  });

  function navigate(path) {
    if (location.pathname.endsWith(path)) return;
    window.location.href = path;
  }

  /* ---------- Local state (reserved) ---------- */
  const state = {
    version: "v1",
    lastVisit: new Date().toISOString()
  };

  try {
    localStorage.setItem("maneit.portal", JSON.stringify(state));
  } catch (_) {
    // silent fail – portal must work without storage
  }

})();
