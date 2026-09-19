import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MonthProvider } from "./context/MonthContext.jsx";
import { UnitProvider, useUnit } from "./context/UnitContext.jsx";
import Masthead from "./components/layout/Masthead.jsx";
import TopNav from "./components/layout/TopNav.jsx";
import Footer from "./components/layout/Footer.jsx";

const OverviewPage = lazy(() => import("./pages/OverviewPage.jsx"));
const StockPage = lazy(() => import("./pages/StockPage.jsx"));
const ProcurementPage = lazy(() => import("./pages/ProcurementPage.jsx"));
const AllocationPage = lazy(() => import("./pages/AllocationPage.jsx"));
const NFSAPage = lazy(() => import("./pages/NFSAPage.jsx"));
const DistributionPage = lazy(() => import("./pages/DistributionPage.jsx"));
const TradePage = lazy(() => import("./pages/TradePage.jsx"));
const MapPage = lazy(() => import("./pages/MapPage.jsx"));
const DataExplorerPage = lazy(() => import("./pages/DataExplorerPage.jsx"));
const ProductionPage = lazy(() => import("./pages/ProductionPage.jsx"));
const ReliefPage = lazy(() => import("./pages/ReliefPage.jsx"));
const StateIntelligencePage = lazy(() => import("./pages/StateIntelligencePage.jsx"));
const DynamicPermutationsPage = lazy(() => import("./pages/DynamicPermutationsPage.jsx"));
const ComparisonEnginePage = lazy(() => import("./pages/ComparisonEnginePage.jsx"));

const routes = [
  ["/", OverviewPage],
  ["/comparison-engine", ComparisonEnginePage],
  ["/permutations", DynamicPermutationsPage],
  ["/production", ProductionPage],
  ["/relief", ReliefPage],
  ["/stock", StockPage],
  ["/procurement", ProcurementPage],
  ["/allocation", AllocationPage],
  ["/nfsa", NFSAPage],
  ["/distribution", DistributionPage],
  ["/trade", TradePage],
  ["/map", MapPage],
  ["/state-intelligence", StateIntelligencePage],
  ["/explorer", DataExplorerPage],
];

function DashboardShell() {
  const { unit } = useUnit();
  return (
    <MonthProvider>
      <div className="app-shell" key={unit}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Masthead />
        <TopNav />
        <main id="main-content" className="page-wrap">
          <div className="container-fluid dashboard-container">
            <Suspense fallback={<div className="loading-inline">Loading dashboard view…</div>}>
              <Routes>
                {routes.map(([path, Component]) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
                <Route path="/unitary-comparison" element={<Navigate to="/comparison-engine" replace />} />
                <Route path="/mom-comparison" element={<Navigate to="/comparison-engine" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
        <Footer />
      </div>
    </MonthProvider>
  );
}

export default function App() {
  return <UnitProvider><DashboardShell /></UnitProvider>;
}
