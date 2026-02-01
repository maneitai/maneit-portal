(function(){
  const KEY = "maneit-theme";
  const root = document.documentElement;

  // load saved theme
  const saved = localStorage.getItem(KEY);
  if (saved) root.dataset.theme = saved;

  document.addEventListener("click", e => {
    const t = e.target.dataset.theme;
    if (!t) return;

    root.dataset.theme = t;
    localStorage.setItem(KEY, t);
  });
})();
