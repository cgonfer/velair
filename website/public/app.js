const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const themeLabel = toggle?.querySelector(".theme-label");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const navToggle = document.querySelector(".nav-toggle");
const navigation = document.querySelector("#site-navigation");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavigation = matchMedia("(max-width: 980px)");
let navigationFocusTimer;

function storedTheme() {
  try {
    const value = localStorage.getItem("velair-site-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, persist = false) {
  const nextTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  themeColor?.setAttribute("content", nextTheme === "dark" ? "#0f1418" : "#f5f8fa");

  document.querySelectorAll(".theme-image").forEach((image) => {
    const source = image.dataset[`${nextTheme}Src`];
    if (source && image.getAttribute("src") !== source) image.setAttribute("src", source);
  });

  const switchesTo = nextTheme === "dark" ? "light" : "dark";
  toggle?.setAttribute("aria-label", `Switch to ${switchesTo} theme`);
  toggle?.setAttribute("aria-pressed", String(nextTheme === "dark"));
  if (themeLabel) themeLabel.textContent = switchesTo === "light" ? "Light" : "Dark";

  if (persist) {
    try { localStorage.setItem("velair-site-theme", nextTheme); } catch { /* Storage may be disabled. */ }
  }
}

applyTheme(root.dataset.theme || (systemTheme.matches ? "dark" : "light"));

toggle?.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
});

systemTheme.addEventListener("change", (event) => {
  if (!storedTheme()) applyTheme(event.matches ? "dark" : "light");
});

function setNavigationOpen(open) {
  navToggle?.setAttribute("aria-expanded", String(open));
  navToggle?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  navigation?.classList.toggle("is-open", open);
}

navToggle?.addEventListener("click", () => {
  setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

navigation?.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a") : null;
  if (!link) return;
  setNavigationOpen(false);
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) {
    const destination = document.querySelector(href);
    if (!(destination instanceof HTMLElement)) return;
    event.preventDefault();
    if (!destination.hasAttribute("tabindex")) destination.setAttribute("tabindex", "-1");
    const revealContainer = destination.closest("[data-reveal]");
    revealContainer?.classList.add("is-visible", "reveal-immediately");
    history.pushState(null, "", href);
    clearTimeout(navigationFocusTimer);
    if (reducedMotion.matches) {
      destination.scrollIntoView({ behavior: "auto", block: "start" });
      destination.focus({ preventScroll: true });
      return;
    }
    if (mobileNavigation.matches) navToggle.focus();
    destination.scrollIntoView({ behavior: "smooth", block: "start" });
    navigationFocusTimer = setTimeout(() => destination.focus({ preventScroll: true }), 520);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || navToggle?.getAttribute("aria-expanded") !== "true") return;
  clearTimeout(navigationFocusTimer);
  setNavigationOpen(false);
  navToggle.focus();
});

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  root.classList.add("motion-ready");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
}
