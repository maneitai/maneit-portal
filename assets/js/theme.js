const root = document.documentElement;
const STORAGE_KEY = "maneit-theme";

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) root.dataset.theme = saved;

document.addEventListener("click", e => {
  const t = e.target.dataset.theme;
  if (!t) return;

  root.dataset.theme = t;
  localStorage.setItem(STORAGE_KEY, t);
});
