const { db } = require('../db');
const database = require('./database.service');

const num = (v) => Number(v) || 0;
const pct = (a, b) => (num(b) ? (num(a) / num(b)) * 100 : null);
const round = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? null : Number(Number(v).toFixed(d)));

function aggregateProduction() {
  database.init();
  const rows = db.prepare(`
    SELECT year, production_mt FROM production_foodgrains
    WHERE crop = 'Total Foodgrains' AND season = 'Total'
    ORDER BY id ASC
  `).all();

  return rows.map((r, i) => {
    const total = num(r.production_mt);
    const previous = i > 0 ? num(rows[i - 1].production_mt) : null;
    return {
      year: r.year,
      total_mt: round(total, 2),
      yoy_growth_pct: previous ? round(pct(total - previous, previous), 2) : null
    };
  });
}

function productionDetail() {
  database.init();
  const latestYearRow = db.prepare(`SELECT year FROM production_foodgrains ORDER BY id DESC LIMIT 1`).get();
  const latest = latestYearRow?.year || '2025-26';
  const prevYearRow = db.prepare(`SELECT DISTINCT year FROM production_foodgrains ORDER BY id DESC LIMIT 1 OFFSET 1`).get();
  const previous = prevYearRow?.year || '2024-25';

  const crops = ['Rice', 'Wheat', 'Coarse Grains', 'Pulses'];
  const byCrop = crops.map(crop => {
    const curr = db.prepare(`SELECT SUM(production_mt) AS s FROM production_foodgrains WHERE crop = ? AND year = ? AND season != 'Total'`).get(crop, latest);
    const prev = db.prepare(`SELECT SUM(production_mt) AS s FROM production_foodgrains WHERE crop = ? AND year = ? AND season != 'Total'`).get(crop, previous);
    const cVal = num(curr?.s);
    const pVal = num(prev?.s);
    return {
      crop,
      latest_year: latest,
      latest_mt: round(cVal, 2),
      previous_mt: round(pVal, 2),
      yoy_growth_pct: pVal ? round(pct(cVal - pVal, pVal), 2) : null
    };
  }).sort((a, b) => b.latest_mt - a.latest_mt);

  const seasons = ['Kharif', 'Rabi', 'Summer'].map(season => {
    const cRow = db.prepare(`SELECT production_mt FROM production_foodgrains WHERE crop = 'Total Foodgrains' AND season = ? AND year = ?`).get(season, latest);
    const pRow = db.prepare(`SELECT production_mt FROM production_foodgrains WHERE crop = 'Total Foodgrains' AND season = ? AND year = ?`).get(season, previous);
    const cVal = num(cRow?.production_mt);
    const pVal = num(pRow?.production_mt);
    return {
      season,
      latest_mt: round(cVal, 2),
      previous_mt: round(pVal, 2),
      yoy_growth_pct: pVal ? round(pct(cVal - pVal, pVal), 2) : null
    };
  });

  const totalLatestRow = db.prepare(`SELECT production_mt FROM production_foodgrains WHERE crop = 'Total Foodgrains' AND season = 'Total' AND year = ?`).get(latest);
  const totalLatest = num(totalLatestRow?.production_mt);

  return {
    latest_year: latest,
    previous_year: previous,
    by_crop: byCrop,
    seasons,
    latest_total_mt: round(totalLatest, 2),
    crop_share: byCrop.map(r => ({ crop: r.crop, share_pct: totalLatest ? round(pct(r.latest_mt, totalLatest), 2) : null }))
  };
}

function procurementByYear() {
  database.init();
  const years = db.prepare(`SELECT DISTINCT year FROM statewise_procurement ORDER BY year ASC`).all().map(r => r.year);

  return years.map(yr => {
    const agg = db.prepare(`
      SELECT SUM(rice_lmt) AS rice, SUM(wheat_lmt) AS wheat, SUM(coarse_lmt) AS coarse
      FROM statewise_procurement WHERE year = ?
    `).get(yr) || {};
    const r = num(agg.rice), w = num(agg.wheat), c = num(agg.coarse);
    return {
      year: yr,
      rice: round(r, 2),
      wheat: round(w, 2),
      coarse: round(c, 2),
      total: round(r + w + c, 2)
    };
  });
}

function chooseLatestProcurementYear() {
  const all = procurementByYear();
  return [...all].reverse().find(x => x.total > 0)?.year || all[all.length - 1]?.year || "2025-26";
}

function stateSummary() {
  database.init();
  const procYear = chooseLatestProcurementYear();

  // Get distinct state names across all state tables
  const sql = `
    SELECT DISTINCT state FROM (
      SELECT state FROM central_pool_stocks
      UNION SELECT state FROM nfsa_coverage
      UNION SELECT state FROM annual_nfsa_allocation
      UNION SELECT state FROM offtake_distribution
      UNION SELECT state FROM welfare_institutions_allocation
      UNION SELECT state FROM stock_paddy_coarsegrain
      UNION SELECT state FROM statewise_procurement
    ) WHERE state IS NOT NULL AND TRIM(state) != '' ORDER BY state ASC
  `;

  const stateList = db.prepare(sql).all().map(r => r.state);

  return stateList.map(st => {
    const key = st.toLowerCase().trim();

    const stock = db.prepare(`SELECT * FROM central_pool_stocks WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const nfsa = db.prepare(`SELECT * FROM nfsa_coverage WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const alloc = db.prepare(`SELECT * FROM annual_nfsa_allocation WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const off = db.prepare(`SELECT * FROM offtake_distribution WHERE LOWER(state) = ? AND period_type = 'upto_month' LIMIT 1`).get(key) || {};
    const welfare = db.prepare(`SELECT * FROM welfare_institutions_allocation WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const paddy = db.prepare(`SELECT * FROM stock_paddy_coarsegrain WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const proc = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? AND year = ? LIMIT 1`).get(key, procYear) || {};
    const fps = db.prepare(`SELECT total_fps_count FROM fair_price_shops WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};
    const port = db.prepare(`SELECT * FROM portability_transactions WHERE LOWER(state) = ? LIMIT 1`).get(key) || {};

    const procTotal = num(proc.rice_lmt) + num(proc.wheat_lmt) + num(proc.coarse_lmt);
    const fci = num(stock.fci_total_lmt);
    const stateAgency = num(stock.state_total_lmt);
    const central = num(stock.total_stock_lmt) || (fci + stateAgency);
    const offAllocation = num(off.alloc_total_kt);
    const offTake = num(off.offtake_total_kt);

    return {
      state: st,
      nfsa_coverage_pct: num(nfsa.coverage_total_pct),
      rural_coverage_pct: num(nfsa.coverage_rural_pct),
      urban_coverage_pct: num(nfsa.coverage_urban_pct),
      population_lakh: num(nfsa.population_lakh),
      present_coverage_lakh: num(nfsa.accepted_total_lakh),
      nfsa_allocation_kt: num(nfsa.foodgrains_allocation_lmt) * 100,
      annual_nfsa_allocation_kt: num(alloc.total_kt),
      aay_kt: num(alloc.aay_kt), phh_kt: num(alloc.phh_kt), tide_over_kt: num(alloc.tide_over_kt),
      central_stock_lmt: central, rice_stock_lmt: num(stock.total_rice_lmt), wheat_stock_lmt: num(stock.total_wheat_lmt),
      fci_stock_lmt: fci, state_agency_stock_lmt: stateAgency, fci_share_pct: pct(fci, central),
      procurement_year: procYear, procurement_total_lakh: round(procTotal, 2), procurement_rice_lakh: num(proc.rice_lmt), procurement_wheat_lakh: num(proc.wheat_lmt), procurement_coarse_lakh: num(proc.coarse_lmt),
      upto_june_allocation_kt: offAllocation, upto_june_offtake_kt: offTake, offtake_rate_pct: pct(offTake, offAllocation), offtake_gap_kt: round(offAllocation - offTake, 2),
      welfare_allocation_kt: num(welfare.alloc_total_kt), welfare_offtake_kt: num(welfare.offtake_total_kt), welfare_utilization_pct: pct(welfare.offtake_total_kt, welfare.alloc_total_kt),
      paddy_stock_lmt: num(paddy.paddy_total_lmt), coarse_stock_lmt: num(paddy.coarse_total_lmt),
      rural_urban_gap_pct: round(num(nfsa.coverage_rural_pct) - num(nfsa.coverage_urban_pct), 2),
      total_fps_count: num(fps.total_fps_count),
      portability_txns: num(port.total_aadhaar_txns) || (num(port.interstate_txns) + num(port.intrastate_txns))
    };
  }).sort((a, b) => b.central_stock_lmt - a.central_stock_lmt);
}

function stockAnalytics() {
  database.init();
  const rows = db.prepare(`SELECT * FROM monthwise_stocks_norm ORDER BY id ASC`).all();
  const latest = rows[rows.length - 1] || {};
  const previous = rows[rows.length - 2] || {};
  const normLatest = [...rows].reverse().find(r => r.total_norm_lmt > 0) || {};

  const latestAdequacy = pct(latest.total_actual_lmt, normLatest.total_norm_lmt);

  return {
    latest_date: latest.as_on_date || "01.06.2026",
    latest_total_lmt: num(latest.total_actual_lmt),
    latest_rice_lmt: num(latest.rice_actual_lmt),
    latest_wheat_lmt: num(latest.wheat_actual_lmt),
    latest_coarse_lmt: num(latest.coarse_actual_lmt),
    latest_total_norm_lmt: normLatest.total_norm_lmt ?? null,
    latest_adequacy_pct: round(latestAdequacy, 2),
    month_on_month_change_lmt: round(num(latest.total_actual_lmt) - num(previous.total_actual_lmt), 2),
    series: rows.map(r => ({
      date: r.as_on_date,
      total_actual: r.total_actual_lmt,
      total_norm: r.total_norm_lmt,
      rice_actual: r.rice_actual_lmt,
      wheat_actual: r.wheat_actual_lmt,
      coarse_actual: r.coarse_actual_lmt
    }))
  };
}

function allocationOfftakeAnalytics() {
  database.init();
  const years = db.prepare(`SELECT DISTINCT year FROM comparative_allocation_offtake ORDER BY year ASC`).all().map(r => r.year);

  const yearly = years.map(yr => {
    const agg = db.prepare(`
      SELECT SUM(allocation_lakh_tons) AS alloc, SUM(offtake_lakh_tons) AS off
      FROM comparative_allocation_offtake WHERE year = ?
    `).get(yr) || {};
    const a = num(agg.alloc);
    const o = num(agg.off);
    return {
      year: yr,
      allocation_lakh: round(a, 2),
      offtake_lakh: round(o, 2),
      rate_pct: round(pct(o, a), 2)
    };
  });

  const current = yearly[yearly.length - 1] || {};
  return { yearly, current };
}

function nfsaAnalytics() {
  database.init();
  const agg = db.prepare(`
    SELECT
      SUM(population_lakh) AS pop,
      SUM(accepted_total_lakh) AS accepted,
      AVG(coverage_rural_pct) AS avg_rural,
      AVG(coverage_urban_pct) AS avg_urban
  FROM nfsa_coverage
  `).get() || {};

  const pop = num(agg.pop);
  const acc = num(agg.accepted);

  return {
    population_lakh: round(pop, 2),
    accepted_persons_lakh: round(acc, 2),
    present_coverage_lakh: round(acc, 2),
    pct_accepted: round(pct(acc, pop), 2),
    rural_coverage_pct: round(agg.avg_rural, 2),
    urban_coverage_pct: round(agg.avg_urban, 2),
    rural_urban_gap_avg_pct: round(agg.avg_rural - agg.avg_urban, 2),
    implementation_years: ["2013", "2014", "2015", "2016"]
  };
}

function tradeAnalytics() {
  database.init();
  const rows = db.prepare(`SELECT * FROM export_import ORDER BY id ASC`).all();
  const total = rows.reduce((s, r) => s + num(r.total_lakh_tons), 0);
  const wheat = rows.reduce((s, r) => s + num(r.wheat_lakh_tons), 0);
  const rice = rows.reduce((s, r) => s + num(r.rice_lakh_tons), 0);
  return {
    cumulative_lakh: round(total, 3),
    wheat_lakh: round(wheat, 3),
    rice_lakh: round(rice, 3),
    rows
  };
}

function reliefAnalytics() {
  database.init();
  const years = db.prepare(`SELECT DISTINCT year FROM festivals_calamity_allocation ORDER BY year ASC`).all().map(r => r.year);
  const out = {};
  for (const yr of years) {
    const agg = db.prepare(`
      SELECT COUNT(*) AS c, SUM(total_kt) AS tot, SUM(rice_kt) AS r, SUM(wheat_kt) AS w
      FROM festivals_calamity_allocation WHERE year = ?
    `).get(yr) || {};
    out[yr] = {
      records: agg.c,
      total_kt: round(agg.tot, 2),
      rice_kt: round(agg.r, 2),
      wheat_kt: round(agg.w, 2)
    };
  }
  return out;
}

function overview() {
  const production = aggregateProduction();
  const procurement = procurementByYear();
  const states = stateSummary();
  const stock = stockAnalytics();
  const alloc = allocationOfftakeAnalytics();
  const nfsa = nfsaAnalytics();
  const trade = tradeAnalytics();
  return {
    generated_at: new Date().toISOString(),
    datasets: database.listDatasets().length,
    production,
    production_detail: productionDetail(),
    procurement,
    stock,
    allocation_offtake: alloc,
    nfsa,
    trade,
    relief: reliefAnalytics(),
    states: states.slice(0, 10),
    state_count: states.length,
    procurement_latest_year: chooseLatestProcurementYear()
  };
}

function stateInfo(name) {
  database.init();
  const key = String(name || '').trim().toLowerCase();
  const summary = stateSummary().find(r => r.state.toLowerCase() === key);
  if (!summary) return null;

  const procRows = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? ORDER BY year ASC`).all(key);
  const production = aggregateProduction();

  return {
    ...summary,
    procurement_history: procRows.map(r => ({
      year: r.year,
      rice: r.rice_lmt,
      wheat: r.wheat_lmt,
      coarse: r.coarse_lmt,
      total: round(num(r.rice_lmt) + num(r.wheat_lmt) + num(r.coarse_lmt), 2)
    })),
    reporting: {
      stock_as_on: "30.06.2026",
      offtake_period: "Upto June 2026",
      welfare_period: "2026-27",
      procurement_year: chooseLatestProcurementYear()
    },
    notes: production.length ? [`National foodgrain production latest year: ${production[production.length - 1].year}`] : []
  };
}

function insights() {
  const o = overview();
  const p = o.production, s = o.stock, a = o.allocation_offtake, states = stateSummary();
  const out = [];

  if (p.length >= 2) {
    const x = p[p.length - 1];
    if (x.yoy_growth_pct != null) {
      out.push({
        type: x.yoy_growth_pct >= 0 ? 'positive' : 'warning',
        text: `Foodgrain production changed ${x.yoy_growth_pct >= 0 ? '+' : ''}${x.yoy_growth_pct}% in ${x.year} versus ${p[p.length - 2].year}.`
      });
    }
  }

  if (s.latest_adequacy_pct != null) {
    out.push({
      type: s.latest_adequacy_pct >= 100 ? 'positive' : 'warning',
      text: `Latest total Central Pool stock is at ${round(s.latest_adequacy_pct, 1)}% of the latest available total buffer norm.`
    });
  }

  if (a.current?.rate_pct != null) {
    out.push({
      type: 'info',
      text: `${a.current.year} allocation-to-offtake utilization is ${a.current.rate_pct}%; based on official DFPD records.`
    });
  }

  const top = [...states].sort((x, y) => num(y.central_stock_lmt) - num(x.central_stock_lmt))[0];
  if (top) {
    out.push({
      type: 'info',
      text: `${top.state} has the highest reported Central Pool stock among state/region records (${round(top.central_stock_lmt, 2)} Lakh MT).`
    });
  }

  const gap = [...states].filter(x => x.rural_urban_gap_pct != null).sort((x, y) => y.rural_urban_gap_pct - x.rural_urban_gap_pct)[0];
  if (gap) {
    out.push({
      type: 'warning',
      text: `${gap.state} has the largest rural-vs-urban NFSA coverage gap in state records (${round(gap.rural_urban_gap_pct, 2)} percentage points).`
    });
  }

  return out;
}

module.exports = { overview, stateSummary, stateInfo, insights };
