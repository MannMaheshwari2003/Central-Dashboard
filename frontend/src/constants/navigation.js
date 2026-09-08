/**
 * constants/navigation.js — the top-nav / route table lives here so
 * TopNav.jsx, Footer.jsx and App.jsx all reference the same list instead
 * of duplicating it.
 */
export const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "fa-tachometer" },
  { path: "/production", label: "Production", icon: "fa-leaf" },
  { path: "/relief", label: "Relief Allocation", icon: "fa-ambulance" },
  { path: "/stock", label: "Stock Position", icon: "fa-cubes" },
  { path: "/procurement", label: "Procurement", icon: "fa-shopping-basket" },
  { path: "/allocation", label: "Allocation & Offtake", icon: "fa-truck" },
  { path: "/nfsa", label: "NFSA Coverage", icon: "fa-users" },
  { path: "/distribution", label: "Distribution", icon: "fa-line-chart" },
  { path: "/trade", label: "Export / Import", icon: "fa-globe" },
  { path: "/map", label: "State Map", icon: "fa-map-marker" },
  { path: "/state-intelligence", label: "State Intelligence", icon: "fa-line-chart" },
  { path: "/explorer", label: "Data Explorer", icon: "fa-database" },
];
