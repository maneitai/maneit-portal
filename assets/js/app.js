/* Maneit Portal JS – minimal (no shortcuts) */
(() => {
  "use strict";

  // Active tab highlight
  const currentPath = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".tab").forEach(t => {
    const href = t.getAttribute("href") || "";
    const hrefFile = href.split("/").pop();
    if (hrefFile === currentPath) {
      t.setAttribute("aria-current", "page");
      t.style.borderColor = "rgba(74,222,128,.45)";
      t.style.background = "rgba(74,222,128,.08)";
    }
  });

  // Copy buttons
  document.querySelectorAll("[data-copy-target]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const sel = btn.getAttribute("data-copy-target");
      const el = sel ? document.querySelector(sel) : null;
      const text = el ? (el.innerText || el.textContent || "") : "";
      if (!text.trim()) return;

      try {
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = old), 900);
      } catch {
        // ignore
      }
    });
  });
})();
