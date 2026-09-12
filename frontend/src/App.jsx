import React from "react";
import { Routes, Route } from "react-router-dom";
import { MonthProvider } from "./context/MonthContext.jsx";
import Masthead from "./components/layout/Masthead.jsx";
import TopNav from "./components/layout/TopNav.jsx";
import Footer from "./components/layout/Footer.jsx";

import OverviewPage from "./pages/OverviewPage.jsx";
import StockPage from "./pages/StockPage.jsx";
import ProcurementPage from "./pages/ProcurementPage.jsx";
import AllocationPage from "./pages/AllocationPage.jsx";
import NFSAPage from "./pages/NFSAPage.jsx";
import DistributionPage from "./pages/DistributionPage.jsx";
import TradePage from "./pages/TradePage.jsx";
import MapPage from "./pages/MapPage.jsx";
import DataExplorerPage from "./pages/DataExplorerPage.jsx";
import ProductionPage from "./pages/ProductionPage.jsx";
import ReliefPage from "./pages/ReliefPage.jsx";
import StateIntelligencePage from "./pages/StateIntelligencePage.jsx";
import MoMComparisonPage from "./pages/MoMComparisonPage.jsx";
import DynamicPermutationsPage from "./pages/DynamicPermutationsPage.jsx";
import UnitaryComparisonPage from "./pages/UnitaryComparisonPage.jsx";

const routes = [
  ["/", OverviewPage],
  ["/unitary-comparison", UnitaryComparisonPage],
  ["/mom-comparison", MoMComparisonPage],
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

export default function App() {
  return (
    <MonthProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Masthead />
        <TopNav />
        <main id="main-content" className="page-wrap">
          <div className="container-fluid dashboard-container">
            <Routes>
              {routes.map(([path, Component]) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </MonthProvider>
  );
}
