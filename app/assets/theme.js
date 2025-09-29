(function () {
  const root = document.documentElement;
  const storageKey = "theme-preference";

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const payload = JSON.parse(stored);
      if (payload && typeof payload === "object" && "data" in payload) {
        const value = payload.data;
        if (value === "light" || value === "dark") {
          root.setAttribute("data-theme", value);
          return;
        }
      }
    }
  } catch (error) {
    /* Ignore JSON parse errors and fall back to system preference. */
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
})();
