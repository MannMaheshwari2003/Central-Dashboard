import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LineChart, BarChart, DoughnutChart, HBarChart, GOV_PALETTE } from "../charts/index.js";
import { fmt } from "../../utils/format.js";

const METRIC_META = {
  production: { label: "Foodgrain Production", icon: "fa-leaf", accent: "green", page: "/production" },
  procurement: { label: "Procurement", icon: "fa-shopping-basket", accent: "warn", page: "/procurement" },
  stock: { label: "Central Pool Stock", icon: "fa-cubes", accent: "navy", page: "/stock" },
  allocation: { label: "Allocation", icon: "fa-truck", accent: "navy", page: "/allocation" },
  distribution: { label: "Distribution", icon: "fa-line-chart", accent: "teal", page: "/distribution" },
  offtake: { label: "Offtake", icon: "fa-check-circle", accent: "saffron", page: "/allocation" },
  nfsa: { label: "NFSA Coverage", icon: "fa-users", accent: "saffron", page: "/nfsa" },
  fps: { label: "Fair Price Shops Network", icon: "fa-shopping-cart", accent: "warn", page: "/nfsa" },
};

export default function KpiDetailModal({
  activeId,
  isExpanded = false,
  onClose,
  onToggleExpand,
  overview = {},
  kpis = {},
  states = [],
  selectedMonth = "July",
  distributionData = null
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!activeId) return null;

  const metricMeta = METRIC_META[activeId] || METRIC_META.production;

  // Raw helper values
  const productionKpi = overview.production_kpi || overview.production_detail || {};
  const productionBreakdown = productionKpi.commodity_breakdown || {};
  const procurementKpi = overview.procurement_kpi || {};
  const offtakeRate = kpis.fy2627_allocation_lakh ? ((kpis.fy2627_offtake_lakh / kpis.fy2627_allocation_lakh) * 100).toFixed(1) : "35.5";

  // Stock values
  const stockObj = overview.stock || {};
  const stockTotalLmt = stockObj.latest_total_lmt ?? kpis.total_central_pool_stock_lmt ?? 907.32;
  const stockRiceLmt = stockObj.latest_rice_lmt ?? kpis.total_stock_rice_lmt ?? 402.01;
  const stockWheatLmt = stockObj.latest_wheat_lmt ?? kpis.total_stock_wheat_lmt ?? 505.31;
  const stockFciLmt = states.reduce((s, r) => s + (r.fci_stock_lmt || 0), 0) || (stockTotalLmt * 0.62);
  const stockStateAgencyLmt = states.reduce((s, r) => s + (r.state_agency_stock_lmt || 0), 0) || (stockTotalLmt * 0.38);

  // Distribution values
  const distOverview = overview.distribution || distributionData || {};
  const monthDist = distOverview.month_summary || {};
  const distTotalKt = monthDist.distrib_kt ?? kpis.distrib_total_kt ?? 2773.62;
  const distAayKt = monthDist.distrib_aay_kt ?? kpis.distrib_aay_kt ?? 521.90;
  const distPhhKt = monthDist.distrib_phh_kt ?? kpis.distrib_phh_kt ?? 2251.72;
  const distRatePct = monthDist.rate_pct ?? (monthDist.offtake_kt ? ((distTotalKt / monthDist.offtake_kt) * 100).toFixed(1) : 80.7);

  // NFSA values
  const coveredLakh = overview.nfsa?.present_coverage_lakh ?? kpis.nfsa_persons_covered_lakh ?? 8122.2;
  const totalPopLakh = overview.nfsa?.population_lakh ?? kpis.nfsa_population_lakh ?? 12077.0;

  // -------------------------------------------------------------
  // Chart Data Generators
  // -------------------------------------------------------------

  // 1. PRODUCTION
  const prodYears = (overview.production || [
    { year: "2019-20", total_mt: 2975.0 },
    { year: "2020-21", total_mt: 3107.4 },
    { year: "2021-22", total_mt: 3156.2 },
    { year: "2022-23", total_mt: 3296.9 },
    { year: "2023-24", total_mt: 3323.0 },
    { year: "2024-25", total_mt: 3575.0 },
    { year: "2025-26", total_mt: 3765.6 }
  ]);
  const prodLineData = {
    labels: prodYears.map((p) => p.year),
    datasets: [
      {
        label: "Total Foodgrain Production (Million MT)",
        data: prodYears.map((p) => p.total_mt),
        borderColor: GOV_PALETTE[2],
        backgroundColor: GOV_PALETTE[2] + "22",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5
      }
    ]
  };
  const prodDonutData = {
    labels: ["Rice", "Wheat", "Coarse Grains"],
    datasets: [
      {
        data: [
          productionBreakdown.rice?.kharif_rabi_mt || 1428.7,
          productionBreakdown.wheat?.kharif_rabi_mt || 1206.6,
          productionBreakdown.coarse_grains?.kharif_rabi_mt || 685.1
        ],
        backgroundColor: [GOV_PALETTE[2], GOV_PALETTE[1], GOV_PALETTE[3]]
      }
    ]
  };

  // 2. PROCUREMENT
  const procYears = (overview.procurement || [
    { year: "2021-22", rice_lakh: 575.8, wheat_lakh: 433.4, coarse_lakh: 6.2, total_lakh: 1015.4 },
    { year: "2022-23", rice_lakh: 569.4, wheat_lakh: 187.9, coarse_lakh: 7.4, total_lakh: 764.7 },
    { year: "2023-24", rice_lakh: 525.4, wheat_lakh: 262.0, coarse_lakh: 8.9, total_lakh: 796.3 },
    { year: "2024-25", rice_lakh: 545.2, wheat_lakh: 266.0, coarse_lakh: 11.2, total_lakh: 822.4 },
    { year: "2025-26", rice_lakh: 570.89, wheat_lakh: 299.75, coarse_lakh: 15.77, total_lakh: 886.41 }
  ]);
  const procLineData = {
    labels: procYears.map((p) => p.year),
    datasets: [
      {
        label: "Total Procurement",
        data: procYears.map((p) => p.total_lakh || (Number(p.rice_lakh || 0) + Number(p.wheat_lakh || 0) + Number(p.coarse_lakh || 0))),
        borderColor: GOV_PALETTE[0],
        backgroundColor: "transparent",
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 4
      },
      {
        label: "Rice Procurement",
        data: procYears.map((p) => p.rice_lakh || 0),
        borderColor: GOV_PALETTE[2],
        backgroundColor: GOV_PALETTE[2] + "22",
        tension: 0.3,
        fill: true,
        pointRadius: 3
      },
      {
        label: "Wheat Procurement",
        data: procYears.map((p) => p.wheat_lakh || 0),
        borderColor: GOV_PALETTE[1],
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 3
      }
    ]
  };
  const topProcStates = [...states]
    .filter((s) => s.procurement_total_lakh > 0)
    .sort((a, b) => b.procurement_total_lakh - a.procurement_total_lakh)
    .slice(0, 6);
  const procBarData = {
    labels: topProcStates.map((s) => s.state),
    datasets: [
      {
        label: "Procurement (Lakh MT)",
        data: topProcStates.map((s) => s.procurement_total_lakh),
        backgroundColor: GOV_PALETTE[3]
      }
    ]
  };

  // 3. STOCK
  const stockSeries = overview.stock?.series || [];
  const recentStock = stockSeries.slice(-24);
  const stockLineData = {
    labels: recentStock.map((r) => r.date),
    datasets: [
      { label: "Wheat Stock", data: recentStock.map((r) => r.wheat_actual || 0), borderColor: GOV_PALETTE[1], backgroundColor: GOV_PALETTE[1] + "22", tension: 0.3, fill: true, pointRadius: 3 },
      { label: "Rice Stock", data: recentStock.map((r) => r.rice_actual || 0), borderColor: GOV_PALETTE[2], backgroundColor: GOV_PALETTE[2] + "22", tension: 0.3, fill: true, pointRadius: 3 },
      { label: "Total Stock", data: recentStock.map((r) => r.total_actual || ((r.wheat_actual || 0) + (r.rice_actual || 0))), borderColor: GOV_PALETTE[0], backgroundColor: "transparent", tension: 0.3, borderWidth: 2.5, pointRadius: 3.5 },
    ],
  };
  const stockSplitDonut = {
    labels: ["FCI Stock", "State Agencies"],
    datasets: [
      {
        data: [Number(stockFciLmt.toFixed(1)), Number(stockStateAgencyLmt.toFixed(1))],
        backgroundColor: [GOV_PALETTE[0], GOV_PALETTE[3]]
      }
    ]
  };

  // 4. ALLOCATION
  const allocOffData = overview.allocation_offtake?.yearly || [
    { year: "2022-23", allocation_lakh: 580.4, offtake_lakh: 520.1 },
    { year: "2023-24", allocation_lakh: 595.2, offtake_lakh: 540.8 },
    { year: "2024-25", allocation_lakh: 602.8, offtake_lakh: 558.4 },
    { year: "2025-26", allocation_lakh: 608.5, offtake_lakh: 572.2 },
    { year: "2026-27", allocation_lakh: 612.21, offtake_lakh: 217.43 }
  ];
  const allocLineData = {
    labels: allocOffData.map((d) => d.year),
    datasets: [
      {
        label: "Annual Allocation (Lakh MT)",
        data: allocOffData.map((d) => d.allocation_lakh),
        borderColor: GOV_PALETTE[0],
        backgroundColor: GOV_PALETTE[0] + "22",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        borderWidth: 2.5
      }
    ]
  };
  const allocDonutData = {
    labels: ["Rice Allocation", "Wheat Allocation"],
    datasets: [
      {
        data: [kpis.fy2627_allocation_rice_lakh || 389.89, kpis.fy2627_allocation_wheat_lakh || 222.33],
        backgroundColor: [GOV_PALETTE[2], GOV_PALETTE[1]]
      }
    ]
  };

  // 5. DISTRIBUTION
  const distTrendData = {
    labels: ["April", "May", "June", "July"],
    datasets: [
      {
        label: "Foodgrains Distributed (KT)",
        data: [2610.4, 2715.8, 3742.5, 2773.6],
        borderColor: "#0284c7",
        backgroundColor: "rgba(2, 132, 199, 0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        borderWidth: 2.5
      },
      {
        label: "Offtake Lifted (KT)",
        data: [3200.0, 3350.2, 4139.2, 3437.2],
        borderColor: GOV_PALETTE[1],
        backgroundColor: "transparent",
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 3
      }
    ]
  };
  const distDonutData = {
    labels: ["AAY Distribution", "PHH Distribution", "Tide Over"],
    datasets: [
      {
        data: [distAayKt, distPhhKt, Math.max(0, distTotalKt - distAayKt - distPhhKt)],
        backgroundColor: [GOV_PALETTE[1], GOV_PALETTE[0], GOV_PALETTE[3]]
      }
    ]
  };

  // 6. OFFTAKE
  const offtakeLineData = {
    labels: allocOffData.map((d) => d.year),
    datasets: [
      {
        label: "Allocation (Lakh MT)",
        data: allocOffData.map((d) => d.allocation_lakh),
        borderColor: GOV_PALETTE[0],
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 3
      },
      {
        label: "Offtake Lifted (Lakh MT)",
        data: allocOffData.map((d) => d.offtake_lakh),
        borderColor: GOV_PALETTE[1],
        backgroundColor: GOV_PALETTE[1] + "25",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        borderWidth: 2.5
      }
    ]
  };
  const offtakeBarData = {
    labels: allocOffData.map((d) => d.year),
    datasets: [
      { label: "Allocation (Lakh MT)", data: allocOffData.map((d) => d.allocation_lakh), backgroundColor: GOV_PALETTE[0] },
      { label: "Offtake (Lakh MT)", data: allocOffData.map((d) => d.offtake_lakh), backgroundColor: GOV_PALETTE[1] }
    ]
  };

  // 7. NFSA
  const topPopStates = [...states]
    .filter((s) => s.population_lakh > 0)
    .sort((a, b) => b.population_lakh - a.population_lakh)
    .slice(0, 8);
  const nfsaLineData = {
    labels: topPopStates.map((s) => s.state),
    datasets: [
      {
        label: "Rural Coverage %",
        data: topPopStates.map((s) => s.rural_coverage_pct || 0),
        borderColor: GOV_PALETTE[2],
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 4
      },
      {
        label: "Urban Coverage %",
        data: topPopStates.map((s) => s.urban_coverage_pct || 0),
        borderColor: GOV_PALETTE[1],
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 4
      }
    ]
  };
  const nfsaDonutData = {
    labels: ["Covered under NFSA", "Balance Population"],
    datasets: [
      {
        data: [coveredLakh, Math.max(totalPopLakh - coveredLakh, 0)],
        backgroundColor: [GOV_PALETTE[2], "#dde3ec"]
      }
    ]
  };

  // 8. FAIR PRICE SHOPS (FPS)
  const fpsStatesList = [...states]
    .filter((s) => (s.total_fps_count || 0) > 0)
    .sort((a, b) => (b.total_fps_count || 0) - (a.total_fps_count || 0));
  const topFpsStates = fpsStatesList.slice(0, 8);
  const totalFpsCount = overview.fps_kpi?.total_fps_count || kpis.total_fair_price_shops || fpsStatesList.reduce((s, r) => s + (r.total_fps_count || 0), 0) || 551736;
  const fpsBarData = {
    labels: topFpsStates.map((s) => s.state),
    datasets: [
      {
        label: "Fair Price Shops Count",
        data: topFpsStates.map((s) => s.total_fps_count),
        backgroundColor: GOV_PALETTE[3]
      }
    ]
  };
  const top5FpsSum = topFpsStates.slice(0, 5).reduce((s, r) => s + (r.total_fps_count || 0), 0);
  const fpsDonutData = {
    labels: [...topFpsStates.slice(0, 5).map((s) => s.state), "All Other States/UTs"],
    datasets: [
      {
        data: [...topFpsStates.slice(0, 5).map((s) => s.total_fps_count), Math.max(0, totalFpsCount - top5FpsSum)],
        backgroundColor: [GOV_PALETTE[0], GOV_PALETTE[1], GOV_PALETTE[2], GOV_PALETTE[3], GOV_PALETTE[4], "#cbd5e1"]
      }
    ]
  };

  // Render Metric Detail Content based on `activeId`
  const renderMetricContent = () => {
    switch (activeId) {
      case "production":
        return {
          title: "Foodgrain Production",
          subtitle: `All-India Annual Foodgrain Production (${productionKpi.latest_year || "2025-26"})`,
          primaryValue: `${fmt.num(productionKpi.latest_total_mt || 3765.6, 2)} Million MT`,
          deltaNote: productionKpi.yoy_growth_pct != null
            ? `${productionKpi.yoy_growth_pct >= 0 ? "▲" : "▼"} ${fmt.num(Math.abs(productionKpi.yoy_growth_pct), 1)}% vs ${productionKpi.previous_year || "2024-25"}`
            : "▲ 5.3% vs 2024-25",
          deltaUp: (productionKpi.yoy_growth_pct ?? 1) >= 0,
          summaryNote: "India's foodgrain production reached an all-time record output of 3,765.6 Million MT, bolstered by strong Rice, Wheat, and Coarse Grain harvests.",
          breakdownItems: [
            { label: "Rice", value: `${fmt.num(productionBreakdown.rice?.kharif_rabi_mt || 1428.7, 2)} Million MT`, share: "37.9%" },
            { label: "Wheat", value: `${fmt.num(productionBreakdown.wheat?.kharif_rabi_mt || 1206.6, 2)} Million MT`, share: "32.0%" },
            { label: "Coarse Grains", value: `${fmt.num(productionBreakdown.coarse_grains?.kharif_rabi_mt || 685.1, 2)} Million MT`, share: "18.2%" }
          ],
          ribbonStats: [
            { label: "Total Production", value: "3,765.6 M MT", sub: "Record harvest" },
            { label: "Rice", value: "1,428.7 M MT", sub: "Annual harvest" },
            { label: "Wheat", value: "1,206.6 M MT", sub: "Annual harvest" },
            { label: "Coarse Grains", value: "685.1 M MT", sub: "Nutri-cereals" }
          ],
          lineChart: <LineChart data={prodLineData} height={230} />,
          lineChartTitle: "Multi-Year Foodgrain Production Trend (Million MT)",
          sideChart: <DoughnutChart data={prodDonutData} height={210} unit="M MT" />,
          sideChartTitle: "Commodity Production Share",
          linkPath: "/production",
          linkLabel: "Open Production Intelligence"
        };

      case "procurement":
        return {
          title: "Foodgrain Procurement",
          subtitle: `State & Central Pool Grain Procurement (${procurementKpi.year || "2025-26"})`,
          primaryValue: `${fmt.num(procurementKpi.total_lakh || 886.41, 2)} Lakh MT`,
          deltaNote: "Rice + Wheat + Coarse Grains",
          deltaUp: true,
          summaryNote: "Procurement operations by FCI and State Agencies guarantee Minimum Support Price (MSP) payments directly to farmers and replenish Central Pool buffer stocks.",
          breakdownItems: [
            { label: "Rice", value: `${fmt.num(procurementKpi.rice_lakh || 570.89, 2)} Lakh MT`, share: "64.4%" },
            { label: "Wheat", value: `${fmt.num(procurementKpi.wheat_lakh || 299.75, 2)} Lakh MT`, share: "33.8%" },
            { label: "Coarse Grains", value: `${fmt.num(procurementKpi.coarse_lakh || 15.77, 2)} Lakh MT`, share: "1.8%" }
          ],
          ribbonStats: [
            { label: "Total Procured", value: "886.41 LMT", sub: "FY 2025-26" },
            { label: "Rice Procurement", value: "570.89 LMT", sub: "FCI + State agencies" },
            { label: "Wheat Procurement", value: "299.75 LMT", sub: "Rabi season" },
            { label: "Coarse Grains", value: "15.77 LMT", sub: "Millets & Maize" }
          ],
          lineChart: <LineChart data={procLineData} height={230} />,
          lineChartTitle: "Commodity-wise Multi-Year Procurement Trend (Lakh MT)",
          sideChart: <HBarChart data={procBarData} height={220} />,
          sideChartTitle: "Top Procuring States",
          linkPath: "/procurement",
          linkLabel: "Open Procurement Analysis"
        };

      case "stock":
        return {
          title: "Central Pool Stock Position",
          subtitle: `Physical Grain Storage in Central Pool as on ${selectedMonth} 2026`,
          primaryValue: `${fmt.num(stockTotalLmt, 2)} Lakh MT`,
          deltaNote: `All India Total · ${selectedMonth} 2026`,
          deltaUp: true,
          summaryNote: "Central Pool stock consists of wheat, rice, and coarse grains held by Food Corporation of India (FCI) and State Agencies for national food security buffers and PDS requirements.",
          breakdownItems: [
            { label: "Rice Stock", value: `${fmt.num(stockRiceLmt, 2)} Lakh MT`, share: `${stockTotalLmt ? ((stockRiceLmt / stockTotalLmt) * 100).toFixed(1) : 44.3}%` },
            { label: "Wheat Stock", value: `${fmt.num(stockWheatLmt, 2)} Lakh MT`, share: `${stockTotalLmt ? ((stockWheatLmt / stockTotalLmt) * 100).toFixed(1) : 55.7}%` },
            { label: "FCI Share", value: `${fmt.num(stockFciLmt, 2)} Lakh MT`, share: "Central custody" }
          ],
          ribbonStats: [
            { label: "Central Stock", value: `${fmt.num(stockTotalLmt, 1)} LMT`, sub: `${selectedMonth} Position` },
            { label: "Rice Holding", value: `${fmt.num(stockRiceLmt, 1)} LMT`, sub: "Central Pool" },
            { label: "Wheat Holding", value: `${fmt.num(stockWheatLmt, 1)} LMT`, sub: "Central Pool" },
            { label: "State Agency Share", value: `${fmt.num(stockStateAgencyLmt, 1)} LMT`, sub: "Decentralized stock" }
          ],
          lineChart: <LineChart data={stockLineData} height={230} />,
          lineChartTitle: "Central Pool Stock Position History (Lakh MT)",
          sideChart: <DoughnutChart data={stockSplitDonut} height={210} unit="LMT" />,
          sideChartTitle: "Stock Custody Split (FCI vs State Agencies)",
          linkPath: "/stock",
          linkLabel: "Open Central Pool Stock Portal"
        };

      case "allocation":
        return {
          title: "Foodgrain Allocation",
          subtitle: "Annual Central Pool Allocation for NFSA & Welfare Schemes (FY 2026-27)",
          primaryValue: `${fmt.num(kpis.fy2627_allocation_lakh || 612.21, 2)} Lakh MT`,
          deltaNote: "All schemes · Central Pool",
          deltaUp: true,
          summaryNote: "Statutory grain quotas allocated under NFSA (Antyodaya Anna Yojana & Priority Households), welfare institutions, and calamity relief.",
          breakdownItems: [
            { label: "Rice Quota", value: `${fmt.num(kpis.fy2627_allocation_rice_lakh || 389.89, 2)} Lakh MT`, share: "63.7%" },
            { label: "Wheat Quota", value: `${fmt.num(kpis.fy2627_allocation_wheat_lakh || 222.33, 2)} Lakh MT`, share: "36.3%" }
          ],
          ribbonStats: [
            { label: "Total Allocation", value: "612.21 LMT", sub: "FY 2026-27 Quota" },
            { label: "Rice Allocation", value: "389.89 LMT", sub: "All States & UTs" },
            { label: "Wheat Allocation", value: "222.33 LMT", sub: "Central Pool" },
            { label: "Active Schemes", value: "7 Schemes", sub: "Statutory + Welfare" }
          ],
          lineChart: <LineChart data={allocLineData} height={230} />,
          lineChartTitle: "Annual Allocation Evolution (Lakh MT)",
          sideChart: <DoughnutChart data={allocDonutData} height={210} unit="LMT" />,
          sideChartTitle: "Allocation Commodity Split",
          linkPath: "/allocation",
          linkLabel: "Open Allocation & Offtake"
        };

      case "distribution":
        return {
          title: "Foodgrain Distribution",
          subtitle: `Fair Price Shop Liftoff & PDS Delivery for ${selectedMonth} 2026`,
          primaryValue: `${fmt.num(distTotalKt, 1)} Thousand Tons`,
          deltaNote: `${distRatePct}% distribution rate`,
          deltaUp: true,
          summaryNote: "Actual distribution to ration card holders across 5.38 Lakh operational Fair Price Shops (FPS) under the National Food Security Act.",
          breakdownItems: [
            { label: "AAY Distribution", value: `${fmt.num(distAayKt, 1)} KT`, share: `${distTotalKt ? ((distAayKt / distTotalKt) * 100).toFixed(1) : 18.8}%` },
            { label: "PHH Distribution", value: `${fmt.num(distPhhKt, 1)} KT`, share: `${distTotalKt ? ((distPhhKt / distTotalKt) * 100).toFixed(1) : 81.2}%` },
            { label: "Distribution Rate", value: `${distRatePct}%`, share: "Of offtake lifted" }
          ],
          ribbonStats: [
            { label: "Monthly Distributed", value: `${fmt.num(distTotalKt, 0)} KT`, sub: `${selectedMonth} 2026` },
            { label: "AAY Distributed", value: `${fmt.num(distAayKt, 0)} KT`, sub: "Poorest families" },
            { label: "PHH Distributed", value: `${fmt.num(distPhhKt, 0)} KT`, sub: "Priority households" },
            { label: "Distribution Rate", value: `${distRatePct}%`, sub: "Liftoff efficiency" }
          ],
          lineChart: <LineChart data={distTrendData} height={230} />,
          lineChartTitle: "Monthly Distribution vs Offtake Performance (Thousand Tons)",
          sideChart: <DoughnutChart data={distDonutData} height={210} unit="KT" />,
          sideChartTitle: "Beneficiary Category Split",
          linkPath: "/distribution",
          linkLabel: "Open Distribution Dashboard"
        };

      case "offtake":
        return {
          title: "Foodgrain Offtake",
          subtitle: `Cumulative Lifting by States/UTs from Central Pool (FY 2026-27)`,
          primaryValue: `${fmt.num(kpis.fy2627_offtake_lakh || 217.43, 2)} Lakh MT`,
          deltaNote: `${offtakeRate}% of annual allocation lifted`,
          deltaUp: Number(offtakeRate) > 50,
          summaryNote: "Physical lifting of foodgrains from FCI depots by State Food & Civil Supplies departments for onward movement to fair price shops.",
          breakdownItems: [
            { label: "Rice Offtake", value: `${fmt.num(kpis.fy2627_offtake_rice_lakh || 146.32, 2)} Lakh MT`, share: "67.3%" },
            { label: "Wheat Offtake", value: `${fmt.num(kpis.fy2627_offtake_wheat_lakh || 71.10, 2)} Lakh MT`, share: "32.7%" }
          ],
          ribbonStats: [
            { label: "Total Offtake", value: "217.43 LMT", sub: "FY 2026-27 lifted" },
            { label: "Offtake Utilization", value: `${offtakeRate}%`, sub: "Of annual quota" },
            { label: "Rice Lifted", value: "146.32 LMT", sub: "Central Pool" },
            { label: "Wheat Lifted", value: "71.10 LMT", sub: "Central Pool" }
          ],
          lineChart: <LineChart data={offtakeLineData} height={230} />,
          lineChartTitle: "Allocation vs Offtake Trajectory (Lakh MT)",
          sideChart: <BarChart data={offtakeBarData} height={210} />,
          sideChartTitle: "Annual Allocation vs Lifting",
          linkPath: "/allocation",
          linkLabel: "Open Offtake Analytics"
        };

      case "fps":
        return {
          title: "Fair Price Shops (FPS) Network",
          subtitle: `Nationwide Public Distribution System Outlets (${selectedMonth} 2026)`,
          primaryValue: `${fmt.num(totalFpsCount / 100000, 2)} Lakh Shops`,
          deltaNote: `${fmt.num(totalFpsCount, 0)} operational outlets across ${fpsStatesList.length || 34} States & UTs`,
          deltaUp: true,
          summaryNote: "Fair Price Shops serve as the indispensable last-mile distribution touchpoint delivering monthly statutory grain quotas to over 81.35 Crore NFSA beneficiaries.",
          breakdownItems: [
            { label: "Top State (UP)", value: `${fmt.num(topFpsStates[0]?.total_fps_count || 73138, 0)} Shops`, share: `${totalFpsCount ? ((topFpsStates[0]?.total_fps_count / totalFpsCount) * 100).toFixed(1) : 13.3}%` },
            { label: "Top 5 States Share", value: `${fmt.num(top5FpsSum, 0)} Shops`, share: `${totalFpsCount ? ((top5FpsSum / totalFpsCount) * 100).toFixed(1) : 46.2}%` },
            { label: "Average per State", value: `${fmt.num(fpsStatesList.length ? Math.round(totalFpsCount / fpsStatesList.length) : 16228, 0)} Shops`, share: "National density" }
          ],
          ribbonStats: [
            { label: "Total Operational Outlets", value: `${fmt.num(totalFpsCount, 0)}`, sub: "Fair Price Shops" },
            { label: "States/UTs Covered", value: `${fpsStatesList.length || 34} States`, sub: "Nationwide PDS" },
            { label: "Beneficiary Density", value: "~1,475 Persons", sub: "Average per FPS" },
            { label: "e-PoS Connectivity", value: ">99%", sub: "Aadhaar-enabled PDS" }
          ],
          lineChart: <HBarChart data={fpsBarData} height={230} />,
          lineChartTitle: "Top 8 States by Fair Price Shops (FPS) Count",
          sideChart: <DoughnutChart data={fpsDonutData} height={210} unit="Shops" />,
          sideChartTitle: "State-wise FPS Share Concentration",
          linkPath: "/nfsa",
          linkLabel: "Open NFSA & FPS Portal"
        };

      case "nfsa":
      default:
        return {
          title: "NFSA Population Coverage",
          subtitle: "Statutory Coverage under the National Food Security Act, 2013",
          primaryValue: `${fmt.num(totalPopLakh / 100, 2)} Crore Population`,
          deltaNote: `${fmt.num(kpis.nfsa_pct_accepted || 67.25, 2)}% accepted under NFSA`,
          deltaUp: true,
          summaryNote: "Comprehensive statutory safety net covering 75% of rural and 50% of urban population (approx 81.35 Crore beneficiaries).",
          breakdownItems: [
            { label: "Accepted Rural", value: `${fmt.num(kpis.nfsa_accepted_rural_lakh || 6245.64, 2)} Lakh`, share: "76.9%" },
            { label: "Accepted Urban", value: `${fmt.num(kpis.nfsa_accepted_urban_lakh || 1876.50, 2)} Lakh`, share: "23.1%" },
            { label: "Total Covered", value: `${fmt.num(coveredLakh, 2)} Lakh`, share: "67.25% of total" }
          ],
          ribbonStats: [
            { label: "Census Population", value: `${fmt.num(totalPopLakh / 100, 2)} Cr`, sub: "2011 Base" },
            { label: "Covered Beneficiaries", value: `${fmt.num(coveredLakh / 100, 2)} Cr`, sub: "Subsidized grain" },
            { label: "Rural Coverage", value: "75.0%", sub: "Statutory ceiling" },
            { label: "Urban Coverage", value: "50.0%", sub: "Statutory ceiling" }
          ],
          lineChart: <LineChart data={nfsaLineData} height={230} />,
          lineChartTitle: "Rural vs Urban Coverage % Across Major States",
          sideChart: <DoughnutChart data={nfsaDonutData} height={210} unit="Lakh" />,
          sideChartTitle: "NFSA Population Coverage Share",
          linkPath: "/nfsa",
          linkLabel: "Open NFSA Coverage Portal"
        };
    }
  };

  const content = renderMetricContent();

  return (
    <div className="kpi-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`kpi-modal ${isExpanded ? "kpi-modal-expanded" : "kpi-modal-compact"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="kpi-modal-header">
          <div className="kpi-modal-header-left">
            <span className={`kpi-modal-icon-badge accent-${metricMeta.accent}`}>
              <i className={`fa ${metricMeta.icon}`}></i>
            </span>
            <div>
              <h3 className="kpi-modal-title">{content.title}</h3>
              <p className="kpi-modal-subtitle">{content.subtitle}</p>
            </div>
          </div>
          <div className="kpi-modal-header-actions">
            {/* Single Toggle Button to Expand / Collapse */}
            <button
              type="button"
              className="btn btn-sm kpi-modal-btn-expand"
              onClick={onToggleExpand}
              title={isExpanded ? "Contract to quick view" : "Expand to detailed visual view"}
            >
              <i className={`fa ${isExpanded ? "fa-compress" : "fa-expand"}`}></i>
              <span>{isExpanded ? " Contract" : " Expand"}</span>
            </button>
            <button type="button" className="btn btn-sm kpi-modal-btn-close" onClick={onClose} title="Close">
              <i className="fa fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="kpi-modal-body">
          {/* COMPACT MODE VIEW */}
          {!isExpanded && (
            <div className="kpi-compact-view">
              <div className="kpi-compact-hero">
                <div className="kpi-compact-main-val">
                  <span className="kpi-hero-number">{content.primaryValue}</span>
                  <span className={`badge delta-tag ${content.deltaUp ? "up" : "down"}`}>
                    {content.deltaNote}
                  </span>
                </div>
                <p className="kpi-compact-summary">{content.summaryNote}</p>
              </div>

              <div className="kpi-compact-breakdown">
                <div className="kpi-breakdown-heading">
                  <i className="fa fa-th-list"></i> Key Breakdown Highlights
                </div>
                <div className="kpi-compact-list">
                  {content.breakdownItems.map((item) => (
                    <div className="kpi-compact-row" key={item.label}>
                      <span className="kpi-row-label">{item.label}</span>
                      <span className="kpi-row-share badge pill-tag pill-navy">{item.share}</span>
                      <strong className="kpi-row-val">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXPANDED DETAILED VIEW */}
          {isExpanded && (
            <div className="kpi-expanded-view">
              {/* Ribbon Stats */}
              <div className="kpi-ribbon-grid">
                {content.ribbonStats.map((r, i) => (
                  <div className="kpi-ribbon-card" key={i}>
                    <div className="kpi-ribbon-label">{r.label}</div>
                    <div className="kpi-ribbon-val">{r.value}</div>
                    <div className="kpi-ribbon-sub">{r.sub}</div>
                  </div>
                ))}
              </div>

              {/* Visual Visualizations Grid */}
              <div className="kpi-charts-row">
                <div className="kpi-chart-card kpi-chart-card-large">
                  <div className="kpi-chart-header">
                    <h4>
                      <i className="fa fa-line-chart"></i> {content.lineChartTitle}
                    </h4>
                    <span className="badge panel-badge">Trend Analysis</span>
                  </div>
                  <div className="kpi-chart-content">{content.lineChart}</div>
                </div>

                <div className="kpi-chart-card kpi-chart-card-side">
                  <div className="kpi-chart-header">
                    <h4>
                      <i className="fa fa-pie-chart"></i> {content.sideChartTitle}
                    </h4>
                    <span className="badge panel-badge">Composition</span>
                  </div>
                  <div className="kpi-chart-content">{content.sideChart}</div>
                </div>
              </div>

              {/* Key Indicators / Fact Summary */}
              <div className="kpi-expanded-bottom">
                <div className="kpi-note-card">
                  <h5>
                    <i className="fa fa-info-circle"></i> Policy Context &amp; MIS Intelligence
                  </h5>
                  <p>{content.summaryNote}</p>
                </div>
                <div className="kpi-expanded-actions">
                  <Link to={content.linkPath} className="btn btn-primary" onClick={onClose}>
                    <i className="fa fa-external-link"></i> {content.linkLabel} &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
