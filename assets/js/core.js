/* core.js — shared tiny helpers only.
   Keep this stable to avoid cross-page breakage.
*/
(() => {
  "use strict";

  function getBase(path) {
    const p = String(path || "").toLowerCase();
    const clean = p.split("#")[0].split("?")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }

  function markActiveTab() {
    const path = (location.pathname || "").toLowerCase();
    const pathBase = getBase(path);

    // Support both new and old nav containers
    const tabs = document.querySelectorAll(".tabsTop .tab, .tabs .tab");
    if (!tabs || tabs.length === 0) return;

    // If one is explicitly marked active, respect it.
    if (document.querySelector('.tabsTop .tab[data-active="true"], .tabs .tab[data-active="true"]')) return;

    tabs.forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!href) return;

      const hrefBase = getBase(href);

      // Match by basename first (most stable across relative paths)
      const isMatch = (hrefBase && hrefBase === pathBase)
        // fallback: direct endsWith on href (in case of folders)
        || (href && (path.endsWith("/" + href) || path.endsWith(href)));

      if (isMatch) {
        a.style.borderColor = "rgba(125,211,252,.45)";
        a.style.background = "rgba(125,211,252,.10)";
        a.style.opacity = "1";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markActiveTab);
  } else {
    markActiveTab();
  }
})();
