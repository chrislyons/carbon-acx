(function () {
  "use strict";

  const resolveIndex = (meta) => {
    if (!meta) {
      return null;
    }
    if (typeof meta === "number") {
      return meta;
    }
    if (typeof meta.source_index_value === "number") {
      return meta.source_index_value;
    }
    if (typeof meta.source_index === "number") {
      return meta.source_index;
    }
    if (typeof meta.source_index === "string") {
      const parsed = parseInt(meta.source_index, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    const candidates = Array.isArray(meta.reference_indices)
      ? meta.reference_indices
      : meta.referenceIndices;
    if (Array.isArray(candidates)) {
      for (const value of candidates) {
        if (typeof value === "number") {
          return value;
        }
        if (typeof value === "string") {
          const parsed = parseInt(value, 10);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
      }
    }
    return null;
  };

  const initialise = () => {
    const referenceItems = Array.from(
      document.querySelectorAll(".references-list li[data-reference-index]")
    );
    const plots = Array.from(document.querySelectorAll(".js-plotly-plot"));

    if (!referenceItems.length || !plots.length) {
      return;
    }

    let activeIndex = null;
    const highlightByIndex = (index) => {
      const numericIndex = Number.isFinite(index) ? Number(index) : null;
      if (numericIndex === activeIndex) {
        return;
      }
      activeIndex = numericIndex;
      referenceItems.forEach((item) => {
        const itemIndex = parseInt(item.dataset.referenceIndex || "", 10);
        const isMatch = numericIndex !== null && itemIndex === numericIndex;
        item.classList.toggle("is-highlighted", isMatch);
      });
    };

    const handleHover = (event) => {
      const point = event?.points && event.points[0];
      if (!point) {
        highlightByIndex(null);
        return;
      }
      const meta = point.meta ?? (() => {
        if (!(point.data && Array.isArray(point.data.meta))) {
          return undefined;
        }
        const index =
          typeof point.pointIndex === "number"
            ? point.pointIndex
            : typeof point.pointNumber === "number"
              ? point.pointNumber
              : undefined;
        return typeof index === "number" ? point.data.meta[index] : undefined;
      })();
      const index = resolveIndex(meta);
      if (typeof index === "number" && index > 0) {
        highlightByIndex(index);
      } else {
        highlightByIndex(null);
      }
    };

    plots.forEach((plot) => {
      if (typeof plot.on !== "function") {
        return;
      }
      plot.on("plotly_hover", handleHover);
      plot.on("plotly_unhover", () => highlightByIndex(null));
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
