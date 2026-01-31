/* core.js — shared tiny helpers only.
   Keep this stable to avoid cross-page breakage.
*/
(() => {
  "use strict";

  // Highlight active top tab if data-active isn't used.
  // (Safe: no-op if it can't find anything)
  function markActiveTab() {
    const path = (location.pathname || "").toLowerCase();
    const tabs = document.querySelectorAll(".tabsTop .tab");
    if (!tabs || tabs.length === 0) return;

    // If one is explicitly marked active, respect it.
    if (document.querySelector('.tabsTop .tab[data-active="true"]')) return;

    tabs.forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!href) return;
      if (path.endsWith("/" + href) || path.endsWith(href)) {
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
