export const IA = {
  routes: [
    { path: "/", view: "Home" },
    { path: "/sectors/:sectorId", view: "Sector" },
    { path: "/sectors/:sectorId/datasets/:datasetId", view: "Dataset" }
  ],
  panes: {
    nav: ["SectorList", "Search"],
    scope: ["ScopeSelector", "ProfilePicker"],
    main: ["VisualizationCanvas"],
    inspect: ["ReferencePanel"]
  }
} as const;
