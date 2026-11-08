// Apply the shared preference before the first paint on every website page.
(() => {
  let stored;
  try { stored = localStorage.getItem("velair-site-theme"); } catch { /* Storage may be disabled. */ }
  const theme = stored === "light" || stored === "dark"
    ? stored
    : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
