/* assets/js/theme.js
   Theme + tiny shared DOM conveniences.
   Keep stable. Only additive changes.
*/
(() => {
  "use strict";

  function pathIsPages() {
    return location.pathname.includes("/pages/");
  }

  function ensureTab(label, hrefInPages, hrefInRoot) {
    const nav = document.querySelector(".tabs");
    if (!nav) return;

    const exists = Array.from(nav.querySelectorAll("a.tab")).some(a =>
      (a.textContent || "").trim().toLowerCase() === label.toLowerCase()
    );
    if (exists) return;

    const a = document.createElement("a");
    a.className = "tab";
    a.href = pathIsPages() ? hrefInPages : hrefInRoot;
    a.textContent = label;

    nav.appendChild(a);
  }

  function initThemeButton() {
    const btn = document.getElementById("btnTheme");
    if (!btn) return;
    btn.addEventListener("click", () => {
      // If you already have theme logic elsewhere, this just triggers it if present.
      // Otherwise it becomes a no-op.
      const ev = new CustomEvent("maneit:theme:toggle");
      window.dispatchEvent(ev);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Add GameDesign page tab across portal without editing every HTML file.
    ensureTab("GameDesign", "./gamedesign.html", "pages/gamedesign.html");

    initThemeButton();
  });
})();
