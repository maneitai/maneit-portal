// assets/js/theme.js
(function () {
  const KEY = "maneit-theme";
  const root = document.documentElement;

  // Apply saved theme on load
  const saved = localStorage.getItem(KEY);
  if (saved) root.dataset.theme = saved;

  // Click handler (Theme app page uses data-theme buttons)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;

    const theme = btn.getAttribute("data-theme");
    if (!theme) return;

    root.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  });
})();
