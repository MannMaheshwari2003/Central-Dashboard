const { db } = require('../db');
const database = require('./database.service');

const num = (v) => Number(v) || 0;
const pct = (a, b) => (num(b) ? (num(a) / num(b)) * 100 : null);
const round = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? null : Number(Number(v).toFixed(d)));

function getAvailableMonths() {
  return database.getAvailableMonths();
}

function resolveMonth(monthParam) {
  const months = getAvailableMonths();
  if (!months.length) return 'June';
  if (!monthParam || monthParam === 'latest') {
    return months[months.length - 1];
  }
  if (monthParam === 'all') return 'all';
  const found = months.find(m => m.toLowerCase() === String(monthParam).toLowerCase());
  return found || months[months.length - 1];
}

function aggregateProduction(monthParam) {
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

function procurementByYear(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  const monthClause = selected !== 'all' ? `WHERE data_month = '${selected}'` : '';
  const years = db.prepare(`SELECT DISTINCT year FROM statewise_procurement ORDER BY year ASC`).all().map(r => r.year);

  return years.map(yr => {
    const whereStr = selected !== 'all' ? `WHERE year = ? AND data_month = ?` : `WHERE year = ?`;
    const params = selected !== 'all' ? [yr, selected] : [yr];
    const agg = db.prepare(`
      SELECT SUM(rice_lmt) AS rice, SUM(wheat_lmt) AS wheat, SUM(coarse_lmt) AS coarse
      FROM statewise_procurement ${whereStr}
    `).get(...params) || {};
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
  const found = [...all].reverse().find(x => x.rice > 0 && x.wheat > 0);
  return found?.year || "2025-26";
}

function stateSummary(monthParam) {
  database.init();
  const procYear = chooseLatestProcurementYear();
  const selected = resolveMonth(monthParam);

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

    const monthClause = selected !== 'all' ? ' AND LOWER(data_month) = ?' : '';
    const mParams = selected !== 'all' ? [key, selected.toLowerCase()] : [key];

    const stock = db.prepare(`SELECT * FROM central_pool_stocks WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    const nfsa = db.prepare(`SELECT * FROM nfsa_coverage WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    const alloc = db.prepare(`SELECT * FROM annual_nfsa_allocation WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    const off = db.prepare(`SELECT * FROM offtake_distribution WHERE LOWER(state) = ? AND period_type = 'upto_month'${monthClause} LIMIT 1`).get(...mParams) || {};
    const welfare = db.prepare(`SELECT * FROM welfare_institutions_allocation WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    const paddy = db.prepare(`SELECT * FROM stock_paddy_coarsegrain WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    
    const procParams = selected !== 'all' ? [key, procYear, selected] : [key, procYear];
    let proc = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? AND year = ?${selected !== 'all' ? ' AND data_month = ?' : ''} LIMIT 1`).get(...procParams);
    if (!proc || (!num(proc.rice_lmt) && !num(proc.wheat_lmt) && !num(proc.coarse_lmt))) {
      proc = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? AND year = ? LIMIT 1`).get(key, procYear) || {};
    }
    let procTotal = num(proc.rice_lmt) + num(proc.wheat_lmt) + num(proc.coarse_lmt);
    if (!procTotal) {
      const fb = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? AND (rice_lmt > 0 OR wheat_lmt > 0) ORDER BY year DESC LIMIT 1`).get(key);
      if (fb) {
        proc = fb;
        procTotal = num(proc.rice_lmt) + num(proc.wheat_lmt) + num(proc.coarse_lmt);
      }
    }

    const fps = db.prepare(`SELECT total_fps_count FROM fair_price_shops WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};
    const port = db.prepare(`SELECT * FROM portability_transactions WHERE LOWER(state) = ?${monthClause} LIMIT 1`).get(...mParams) || {};

    const fci = num(stock.fci_total_lmt);
    const stateAgency = num(stock.state_total_lmt);
    const central = num(stock.total_stock_lmt) || (fci + stateAgency);
    const offAllocation = num(off.alloc_total_kt);
    const offTake = num(off.offtake_total_kt);

    return {
      state: st,
      data_month: selected,
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

function stockAnalytics(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  let rows = [];
  if (selected !== 'all') {
    rows = db.prepare(`SELECT * FROM monthwise_stocks_norm WHERE data_month = ? ORDER BY id ASC`).all(selected);
  }
  if (!rows || rows.length < 5) {
    rows = db.prepare(`SELECT * FROM monthwise_stocks_norm ORDER BY id ASC`).all();
  }
  const latest = rows[rows.length - 1] || {};
  const previous = rows[rows.length - 2] || {};
  const normLatest = [...rows].reverse().find(r => r.total_norm_lmt > 0) || {};

  const latestAdequacy = pct(latest.total_actual_lmt, normLatest.total_norm_lmt);

  return {
    latest_date: latest.as_on_date || "01.07.2026",
    latest_total_lmt: num(latest.total_actual_lmt),
    latest_rice_lmt: num(latest.rice_actual_lmt),
    latest_wheat_lmt: num(latest.wheat_actual_lmt),
    latest_coarse_lmt: num(latest.coarse_actual_lmt),
    latest_total_norm_lmt: normLatest.total_norm_lmt ?? null,
    latest_adequacy_pct: round(latestAdequacy, 2),
    month_on_month_change_lmt: round(num(latest.total_actual_lmt) - num(previous.total_actual_lmt), 2),
    series: rows.map(r => {
      const w = num(r.wheat_actual_lmt);
      const rc = num(r.rice_actual_lmt);
      const tot = num(r.total_actual_lmt) || round(w + rc, 2);
      return {
        date: r.as_on_date,
        total_actual: tot,
        total_norm: r.total_norm_lmt,
        rice_actual: rc,
        wheat_actual: w,
        coarse_actual: num(r.coarse_actual_lmt)
      };
    })
  };
}

function allocationOfftakeAnalytics(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  const years = db.prepare(`SELECT DISTINCT year FROM comparative_allocation_offtake ORDER BY year ASC`).all().map(r => r.year);

  const yearly = years.map(yr => {
    const whereStr = selected !== 'all' ? `WHERE year = ? AND data_month = ?` : `WHERE year = ?`;
    const params = selected !== 'all' ? [yr, selected] : [yr];
    const agg = db.prepare(`
      SELECT SUM(allocation_lakh_tons) AS alloc, SUM(offtake_lakh_tons) AS off
      FROM comparative_allocation_offtake ${whereStr}
    `).get(...params) || {};
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

function nfsaAnalytics(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  const whereStr = selected !== 'all' ? `WHERE data_month = '${selected}'` : '';
  const agg = db.prepare(`
    SELECT
      SUM(population_lakh) AS pop,
      SUM(accepted_total_lakh) AS accepted,
      AVG(coverage_rural_pct) AS avg_rural,
      AVG(coverage_urban_pct) AS avg_urban
    FROM nfsa_coverage ${whereStr}
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

function tradeAnalytics(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  const whereStr = selected !== 'all' ? `WHERE data_month = '${selected}'` : '';
  const rows = db.prepare(`SELECT * FROM export_import ${whereStr} ORDER BY id ASC`).all();
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

function reliefAnalytics(monthParam) {
  database.init();
  const selected = resolveMonth(monthParam);
  const years = db.prepare(`SELECT DISTINCT year FROM festivals_calamity_allocation ORDER BY year ASC`).all().map(r => r.year);
  const out = {};
  for (const yr of years) {
    const whereStr = selected !== 'all' ? `WHERE year = ? AND data_month = ?` : `WHERE year = ?`;
    const params = selected !== 'all' ? [yr, selected] : [yr];
    const agg = db.prepare(`
      SELECT COUNT(*) AS c, SUM(total_kt) AS tot, SUM(rice_kt) AS r, SUM(wheat_kt) AS w
      FROM festivals_calamity_allocation ${whereStr}
    `).get(...params) || {};
    out[yr] = {
      records: agg.c,
      total_kt: round(agg.tot, 2),
      rice_kt: round(agg.r, 2),
      wheat_kt: round(agg.w, 2)
    };
  }
  return out;
}

function momComparisonAnalytics(baseMonth = 'June', targetMonth = 'July') {
  database.init();
  const bSummary = stateSummary(baseMonth);
  const tSummary = stateSummary(targetMonth);

  const totalBaseStock = bSummary.reduce((s, r) => s + num(r.central_stock_lmt), 0);
  const totalTargetStock = tSummary.reduce((s, r) => s + num(r.central_stock_lmt), 0);
  const stockDiff = totalTargetStock - totalBaseStock;
  const stockPctChange = pct(stockDiff, totalBaseStock);

  const totalBaseFPS = bSummary.reduce((s, r) => s + num(r.total_fps_count), 0);
  const totalTargetFPS = tSummary.reduce((s, r) => s + num(r.total_fps_count), 0);
  const fpsDiff = totalTargetFPS - totalBaseFPS;

  const totalBasePort = bSummary.reduce((s, r) => s + num(r.portability_txns), 0);
  const totalTargetPort = tSummary.reduce((s, r) => s + num(r.portability_txns), 0);
  const portDiff = totalTargetPort - totalBasePort;
  const portPctChange = pct(portDiff, totalBasePort);

  // State comparison matrix
  const stateComparison = tSummary.map(tState => {
    const bState = bSummary.find(b => b.state.toLowerCase() === tState.state.toLowerCase()) || {};
    
    const stockChange = round(num(tState.central_stock_lmt) - num(bState.central_stock_lmt), 2);
    const stockPct = round(pct(stockChange, bState.central_stock_lmt), 2);

    const fpsChange = num(tState.total_fps_count) - num(bState.total_fps_count);
    const portChange = num(tState.portability_txns) - num(bState.portability_txns);
    const portPct = round(pct(portChange, bState.portability_txns), 2);

    return {
      state: tState.state,
      base_stock_lmt: round(num(bState.central_stock_lmt), 2),
      target_stock_lmt: round(num(tState.central_stock_lmt), 2),
      stock_change_lmt: stockChange,
      stock_change_pct: stockPct,
      base_fps_count: num(bState.total_fps_count),
      target_fps_count: num(tState.total_fps_count),
      fps_change: fpsChange,
      base_portability_txns: num(bState.portability_txns),
      target_portability_txns: num(tState.portability_txns),
      portability_change: portChange,
      portability_change_pct: portPct
    };
  }).sort((a, b) => Math.abs(b.stock_change_lmt) - Math.abs(a.stock_change_lmt));

  return {
    base_month: baseMonth,
    target_month: targetMonth,
    kpis: {
      total_central_stock: {
        base: round(totalBaseStock, 2),
        target: round(totalTargetStock, 2),
        change_lmt: round(stockDiff, 2),
        change_pct: round(stockPctChange, 2)
      },
      total_fps_count: {
        base: totalBaseFPS,
        target: totalTargetFPS,
        change: fpsDiff
      },
      total_portability_txns: {
        base: totalBasePort,
        target: totalTargetPort,
        change: portDiff,
        change_pct: round(portPctChange, 2)
      }
    },
    state_comparison: stateComparison
  };
}

const STATE_REGION_MAP = {
  'punjab': 'North', 'haryana': 'North', 'rajasthan': 'North', 'uttar pradesh': 'North',
  'himachal pradesh': 'North', 'jammu & kashmir': 'North', 'ladakh': 'North', 'chandigarh': 'North', 'delhi': 'North', 'uttarakhand': 'North',
  'andhra pradesh': 'South', 'telangana': 'South', 'karnataka': 'South', 'tamil nadu': 'South', 'kerala': 'South', 'puducherry': 'South', 'lakshadweep': 'South', 'andaman & nicobar islands': 'South',
  'bihar': 'East', 'jharkhand': 'East', 'odisha': 'East', 'west bengal': 'East',
  'gujarat': 'West', 'maharashtra': 'West', 'goa': 'West', 'dadra & nagar haveli and daman & diu': 'West',
  'madhya pradesh': 'Central', 'chhattisgarh': 'Central',
  'assam': 'North-East', 'arunachal pradesh': 'North-East', 'manipur': 'North-East', 'meghalaya': 'North-East', 'mizoram': 'North-East', 'nagaland': 'North-East', 'tripura': 'North-East', 'sikkim': 'North-East'
};

function permutationAnalytics(options = {}) {
  database.init();
  const metric = options.metric || 'central_stock';
  const selectedMonth = resolveMonth(options.month);
  const groupBy = options.groupBy || 'state'; // state | region | month | tier
  const regionFilter = options.region || 'all';
  const commodityFilter = options.commodity || 'all'; // all | wheat | rice | coarse
  const searchTerm = (options.state || '').toLowerCase().trim();

  const states = stateSummary(selectedMonth);

  // Define metric extractor per state
  const getVal = (s) => {
    switch (metric) {
      case 'central_stock':
        if (commodityFilter === 'wheat') return num(s.wheat_stock_lmt);
        if (commodityFilter === 'rice') return num(s.rice_stock_lmt);
        return num(s.central_stock_lmt);
      case 'wheat_stock': return num(s.wheat_stock_lmt);
      case 'rice_stock': return num(s.rice_stock_lmt);
      case 'fci_stock': return num(s.fci_stock_lmt);
      case 'state_agency_stock': return num(s.state_agency_stock_lmt);
      case 'procurement':
        if (commodityFilter === 'wheat') return num(s.procurement_wheat_lakh);
        if (commodityFilter === 'rice') return num(s.procurement_rice_lakh);
        if (commodityFilter === 'coarse') return num(s.procurement_coarse_lakh);
        return num(s.procurement_total_lakh);
      case 'procurement_wheat': return num(s.procurement_wheat_lakh);
      case 'procurement_rice': return num(s.procurement_rice_lakh);
      case 'allocation': return num(s.annual_nfsa_allocation_kt);
      case 'offtake': return num(s.upto_june_offtake_kt);
      case 'offtake_gap': return num(s.offtake_gap_kt);
      case 'offtake_rate': return num(s.offtake_rate_pct);
      case 'paddy_stock': return num(s.paddy_stock_lmt);
      case 'fps_count': return num(s.total_fps_count);
      case 'portability_txns': return num(s.portability_txns);
      default: return num(s.central_stock_lmt);
    }
  };

  // Filter states
  let filtered = states.map(s => ({
    state: s.state,
    region: STATE_REGION_MAP[s.state.toLowerCase()] || 'Other',
    value: getVal(s),
    raw: s
  }));

  if (regionFilter !== 'all') {
    filtered = filtered.filter(f => f.region.toLowerCase() === regionFilter.toLowerCase());
  }
  if (searchTerm) {
    filtered = filtered.filter(f => f.state.toLowerCase().includes(searchTerm));
  }

  const totalAgg = round(filtered.reduce((sum, f) => sum + f.value, 0), 2);

  // Grouping
  let groupedData = [];
  if (groupBy === 'region') {
    const regMap = {};
    filtered.forEach(f => {
      regMap[f.region] = (regMap[f.region] || 0) + f.value;
    });
    groupedData = Object.entries(regMap)
      .map(([label, val]) => ({
        label,
        total_value: round(val, 2),
        pct_share: totalAgg ? round((val / totalAgg) * 100, 1) : 0,
        record_count: filtered.filter(x => x.region === label).length
      }))
      .sort((a, b) => b.total_value - a.total_value);
  } else if (groupBy === 'month') {
    const months = getAvailableMonths();
    groupedData = months.map(m => {
      const mStates = stateSummary(m);
      const mVal = mStates.reduce((acc, s) => {
        if (searchTerm && !s.state.toLowerCase().includes(searchTerm)) return acc;
        const reg = STATE_REGION_MAP[s.state.toLowerCase()] || 'Other';
        if (regionFilter !== 'all' && reg.toLowerCase() !== regionFilter.toLowerCase()) return acc;
        return acc + getVal(s);
      }, 0);
      return {
        label: `${m} 2026`,
        total_value: round(mVal, 2),
        pct_share: 0,
        record_count: mStates.length
      };
    });
  } else if (groupBy === 'tier') {
    const sorted = [...filtered].sort((a, b) => b.value - a.value);
    const high = sorted.filter(x => x.value >= 25);
    const med = sorted.filter(x => x.value >= 5 && x.value < 25);
    const low = sorted.filter(x => x.value < 5);
    groupedData = [
      { label: 'Tier 1: High Volume (≥25)', total_value: round(high.reduce((s, x) => s + x.value, 0), 2), record_count: high.length },
      { label: 'Tier 2: Medium Volume (5-25)', total_value: round(med.reduce((s, x) => s + x.value, 0), 2), record_count: med.length },
      { label: 'Tier 3: Low Volume (<5)', total_value: round(low.reduce((s, x) => s + x.value, 0), 2), record_count: low.length }
    ].map(t => ({ ...t, pct_share: totalAgg ? round((t.total_value / totalAgg) * 100, 1) : 0 }));
  } else {
    // Default: group by state
    groupedData = filtered
      .map(f => ({
        label: f.state,
        region: f.region,
        total_value: round(f.value, 2),
        pct_share: totalAgg ? round((f.value / totalAgg) * 100, 1) : 0,
        record_count: 1
      }))
      .sort((a, b) => b.total_value - a.total_value);
  }

  // Regional breakdown for charts
  const regionalBreakdown = {};
  filtered.forEach(f => {
    regionalBreakdown[f.region] = round((regionalBreakdown[f.region] || 0) + f.value, 2);
  });

  // Calculate summary metrics
  const sortedValues = [...filtered].sort((a, b) => b.value - a.value);
  const topEntity = sortedValues[0] || { state: 'N/A', value: 0 };
  const bottomEntity = sortedValues.filter(x => x.value > 0).slice(-1)[0] || sortedValues.slice(-1)[0] || { state: 'N/A', value: 0 };
  const avgVal = filtered.length ? round(totalAgg / filtered.length, 2) : 0;
  const top4Sum = sortedValues.slice(0, 4).reduce((s, x) => s + x.value, 0);
  const top4Share = totalAgg ? round((top4Sum / totalAgg) * 100, 1) : 0;

  // Generate automated takeaways
  const insights = [];
  if (topEntity.value > 0) {
    insights.push(`Leader: ${topEntity.state} leads with ${topEntity.value.toLocaleString()}, contributing ${totalAgg ? round((topEntity.value / totalAgg) * 100, 1) : 0}% of the aggregate.`);
  }
  if (top4Share > 50) {
    insights.push(`High Concentration: The top 4 states (${sortedValues.slice(0, 4).map(x => x.state).join(', ')}) control ${top4Share}% of total volume.`);
  } else {
    insights.push(`Balanced Spread: Top 4 states represent ${top4Share}% of the national distribution.`);
  }
  const topRegionEntry = Object.entries(regionalBreakdown).sort((a, b) => b[1] - a[1])[0];
  if (topRegionEntry) {
    insights.push(`Dominant Zone: ${topRegionEntry[0]} region holds the primary share with ${topRegionEntry[1].toLocaleString()} (${totalAgg ? round((topRegionEntry[1] / totalAgg) * 100, 1) : 0}%).`);
  }
  insights.push(`Arithmetic Mean across ${filtered.length} entities stands at ${avgVal.toLocaleString()}.`);

  return {
    metric,
    groupBy,
    month: selectedMonth,
    region: regionFilter,
    commodity: commodityFilter,
    total_aggregate: totalAgg,
    summary: {
      leader: { label: topEntity.state, value: round(topEntity.value, 2), pct_share: totalAgg ? round((topEntity.value / totalAgg) * 100, 1) : 0 },
      bottom: { label: bottomEntity.state, value: round(bottomEntity.value, 2), pct_share: totalAgg ? round((bottomEntity.value / totalAgg) * 100, 1) : 0 },
      average_value: avgVal,
      top4_concentration_pct: top4Share,
      count: filtered.length
    },
    regional_breakdown: regionalBreakdown,
    insights,
    data: groupedData
  };
}

function unitaryAspectAnalytics(stateName = 'All India', metric = 'total_stock', baseMonth = 'June', targetMonth = 'July') {
  database.init();
  const bMonth = resolveMonth(baseMonth);
  const tMonth = resolveMonth(targetMonth);
  const isAllIndia = !stateName || stateName.toLowerCase() === 'all india' || stateName.toLowerCase() === 'national';

  const bSummary = stateSummary(bMonth);
  const tSummary = stateSummary(tMonth);

  const METRIC_DEFS = {
    total_stock: { label: 'Total Central Pool Stock', unit: 'Lakh MT', field: 'central_stock_lmt' },
    wheat_stock: { label: 'Central Pool Wheat Stock', unit: 'Lakh MT', field: 'wheat_stock_lmt' },
    rice_stock: { label: 'Central Pool Rice Stock', unit: 'Lakh MT', field: 'rice_stock_lmt' },
    fci_stock: { label: 'Stock Held with FCI', unit: 'Lakh MT', field: 'fci_stock_lmt' },
    state_agency_stock: { label: 'Stock with State Agencies', unit: 'Lakh MT', field: 'state_agency_stock_lmt' },
    total_procurement: { label: 'Grain Procurement (Total)', unit: 'Lakh MT', field: 'procurement_total_lakh' },
    wheat_procurement: { label: 'Wheat Procurement', unit: 'Lakh MT', field: 'procurement_wheat_lakh' },
    rice_procurement: { label: 'Rice Procurement', unit: 'Lakh MT', field: 'procurement_rice_lakh' },
    nfsa_allocation: { label: 'Annual NFSA Allocation', unit: 'Thousand Tons (KT)', field: 'annual_nfsa_allocation_kt' },
    aay_allocation: { label: 'AAY Families Allocation', unit: 'Thousand Tons (KT)', field: 'aay_kt' },
    phh_allocation: { label: 'PHH Priority Households Allocation', unit: 'Thousand Tons (KT)', field: 'phh_kt' },
    offtake_total: { label: 'Offtake Distribution Upto Month', unit: 'Thousand Tons (KT)', field: 'upto_june_offtake_kt' },
    offtake_rate: { label: 'Offtake Utilization Rate', unit: '%', field: 'offtake_rate_pct' },
    paddy_stock: { label: 'Paddy in Stock', unit: 'Lakh MT', field: 'paddy_stock_lmt' },
    fps_count: { label: 'Fair Price Shops (FPS) Count', unit: 'Outlets', field: 'total_fps_count' },
    portability_txns: { label: 'ONORC Portability Transactions', unit: 'Transactions', field: 'portability_txns' },
    buffer_coverage: { label: 'Buffer Coverage (Stock / Monthly Allocation)', unit: 'Months', computed: true }
  };

  const def = METRIC_DEFS[metric] || METRIC_DEFS.total_stock;

  const getMetricVal = (stateObj, mKey) => {
    if (!stateObj) return 0;
    if (mKey === 'buffer_coverage') {
      const stock = num(stateObj.central_stock_lmt);
      const monthlyAlloc = (num(stateObj.annual_nfsa_allocation_kt) / 12) / 100;
      return monthlyAlloc > 0 ? round(stock / monthlyAlloc, 2) : 0;
    }
    return num(stateObj[def.field]);
  };

  let bVal = 0;
  let tVal = 0;
  const bNatTotal = bSummary.reduce((s, r) => s + getMetricVal(r, metric), 0);
  const tNatTotal = tSummary.reduce((s, r) => s + getMetricVal(r, metric), 0);

  let bRank = null;
  let tRank = null;
  let bStateObj = null;
  let tStateObj = null;

  if (isAllIndia) {
    bVal = bNatTotal;
    tVal = tNatTotal;
  } else {
    bStateObj = bSummary.find(r => r.state.toLowerCase() === stateName.toLowerCase());
    tStateObj = tSummary.find(r => r.state.toLowerCase() === stateName.toLowerCase());
    bVal = getMetricVal(bStateObj, metric);
    tVal = getMetricVal(tStateObj, metric);

    const bSorted = [...bSummary].sort((x, y) => getMetricVal(y, metric) - getMetricVal(x, metric));
    const tSorted = [...tSummary].sort((x, y) => getMetricVal(y, metric) - getMetricVal(x, metric));
    bRank = bSorted.findIndex(r => r.state.toLowerCase() === stateName.toLowerCase()) + 1;
    tRank = tSorted.findIndex(r => r.state.toLowerCase() === stateName.toLowerCase()) + 1;
  }

  const delta = round(tVal - bVal, 2);
  const deltaPct = bVal ? round(((tVal - bVal) / bVal) * 100, 2) : null;
  const bShare = bNatTotal ? round((bVal / bNatTotal) * 100, 2) : 0;
  const tShare = tNatTotal ? round((tVal / tNatTotal) * 100, 2) : 0;
  const shareDelta = round(tShare - bShare, 2);

  const months = getAvailableMonths();
  const multiMonthTrend = months.map(m => {
    const sList = stateSummary(m);
    let val = 0;
    if (isAllIndia) {
      val = sList.reduce((acc, r) => acc + getMetricVal(r, metric), 0);
    } else {
      const st = sList.find(r => r.state.toLowerCase() === stateName.toLowerCase());
      val = getMetricVal(st, metric);
    }
    return { month: m, value: round(val, 2) };
  });

  const insights = [];
  const entityName = isAllIndia ? 'All India' : stateName;

  if (delta > 0) {
    insights.push(`${entityName} registered an expansion in ${def.label} by +${delta.toLocaleString()} ${def.unit} (+${deltaPct}% MoM) from ${bMonth} to ${tMonth} 2026.`);
  } else if (delta < 0) {
    insights.push(`${entityName} observed a net drawdown/reduction in ${def.label} of ${Math.abs(delta).toLocaleString()} ${def.unit} (${deltaPct}% MoM) between ${bMonth} and ${tMonth} 2026.`);
  } else {
    insights.push(`${entityName} held constant in ${def.label} at ${tVal.toLocaleString()} ${def.unit} across ${bMonth} and ${tMonth} 2026.`);
  }

  if (!isAllIndia) {
    insights.push(`National Share: ${entityName} accounts for ${tShare}% of India's total ${def.label.toLowerCase()} in ${tMonth} 2026 (Rank #${tRank || 'N/A'} nationally).`);
    if (shareDelta !== 0) {
      insights.push(`National footprint ${shareDelta > 0 ? 'grew' : 'contracted'} by ${Math.abs(shareDelta)} percentage points compared to ${bMonth} 2026.`);
    }

    if (metric.includes('stock')) {
      const stockVal = tVal;
      const allocObj = tStateObj;
      if (allocObj && allocObj.annual_nfsa_allocation_kt) {
        const monthlyAllocLmt = (allocObj.annual_nfsa_allocation_kt / 12) / 100;
        const coverageMonths = monthlyAllocLmt > 0 ? (stockVal / monthlyAllocLmt).toFixed(1) : 0;
        insights.push(`Buffer Autonomy: At current NFSA allocation levels, ${entityName}'s stock represents approx. ${coverageMonths} months of distribution security.`);
      }
      if (tStateObj && (tStateObj.wheat_stock_lmt || tStateObj.rice_stock_lmt)) {
        const total = (tStateObj.wheat_stock_lmt || 0) + (tStateObj.rice_stock_lmt || 0);
        if (total > 0) {
          const rRatio = round((tStateObj.rice_stock_lmt / total) * 100, 1);
          const wRatio = round((tStateObj.wheat_stock_lmt / total) * 100, 1);
          insights.push(`Grain Holding Mix: Stock composition is ${rRatio}% Rice and ${wRatio}% Wheat.`);
        }
      }
    } else if (metric.includes('procurement')) {
      if (tStateObj && tStateObj.procurement_total_lakh > 0) {
        const wPct = round((tStateObj.procurement_wheat_lakh / tStateObj.procurement_total_lakh) * 100, 1);
        const rPct = round((tStateObj.procurement_rice_lakh / tStateObj.procurement_total_lakh) * 100, 1);
        insights.push(`Crop Procurement Split: Comprises ${rPct}% Rice and ${wPct}% Wheat.`);
      }
    } else if (metric.includes('offtake')) {
      if (tStateObj && tStateObj.offtake_gap_kt > 0) {
        insights.push(`Offtake Efficiency: ${tStateObj.offtake_gap_kt} KT unlifted against quota, representing an offtake rate of ${tStateObj.offtake_rate_pct}%.`);
      }
    }
  } else {
    insights.push(`All-India aggregate volume stood at ${tVal.toLocaleString()} ${def.unit} in ${tMonth} 2026 versus ${bVal.toLocaleString()} ${def.unit} in ${bMonth} 2026.`);
  }

  const topStates = [...tSummary]
    .sort((x, y) => getMetricVal(y, metric) - getMetricVal(x, metric))
    .slice(0, 10)
    .map((r, idx) => ({
      rank: idx + 1,
      state: r.state,
      value: round(getMetricVal(r, metric), 2),
      share_pct: tNatTotal ? round((getMetricVal(r, metric) / tNatTotal) * 100, 1) : 0,
      is_selected: r.state.toLowerCase() === stateName.toLowerCase()
    }));

  const CORE_METRICS = [
    { id: 'total_stock', label: 'Central Pool Total Stock', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'wheat_stock', label: 'Wheat in Central Pool', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'rice_stock', label: 'Rice in Central Pool', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'fci_stock', label: 'Stock with FCI', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'state_agency_stock', label: 'Stock with State Agencies', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'paddy_stock', label: 'Paddy in Stock', unit: 'Lakh MT', category: 'Stock & Storage' },
    { id: 'total_procurement', label: 'Total Grain Procurement', unit: 'Lakh MT', category: 'Procurement' },
    { id: 'wheat_procurement', label: 'Wheat Procurement', unit: 'Lakh MT', category: 'Procurement' },
    { id: 'rice_procurement', label: 'Rice Procurement', unit: 'Lakh MT', category: 'Procurement' },
    { id: 'annual_nfsa_allocation', label: 'Annual NFSA Allocation', unit: 'KT', category: 'Allocation & Offtake' },
    { id: 'aay_allocation', label: 'AAY (Antyodaya) Allocation', unit: 'KT', category: 'Allocation & Offtake' },
    { id: 'phh_allocation', label: 'PHH (Priority HH) Allocation', unit: 'KT', category: 'Allocation & Offtake' },
    { id: 'offtake_total', label: 'Period Offtake Lifted', unit: 'KT', category: 'Allocation & Offtake' },
    { id: 'offtake_rate', label: 'Offtake Utilization Rate', unit: '%', category: 'Allocation & Offtake' },
    { id: 'fps_count', label: 'Active Fair Price Shops', unit: 'Outlets', category: 'Infrastructure & PDS' },
    { id: 'portability_txns', label: 'ONORC Portability Txns', unit: 'Txns', category: 'Infrastructure & PDS' },
    { id: 'buffer_coverage', label: 'Buffer Supply Coverage', unit: 'Months', category: 'Derived Intelligence' },
  ];

  const allMetricsComparison = CORE_METRICS.map(m => {
    let vA = 0, vB = 0;
    if (isAllIndia) {
      vA = bSummary.reduce((s, r) => s + getMetricVal(r, m.id), 0);
      vB = tSummary.reduce((s, r) => s + getMetricVal(r, m.id), 0);
    } else {
      vA = getMetricVal(bStateObj, m.id);
      vB = getMetricVal(tStateObj, m.id);
    }
    const d = round(vB - vA, 2);
    const dPct = vA ? round(((vB - vA) / vA) * 100, 1) : null;
    return {
      id: m.id,
      label: m.label,
      category: m.category,
      unit: m.unit,
      base_value: round(vA, 2),
      target_value: round(vB, 2),
      delta: d,
      delta_pct: dPct,
      direction: d > 0 ? 'increase' : d < 0 ? 'decrease' : 'stable'
    };
  });

  return {
    state: entityName,
    metric_id: metric,
    metric_label: def.label,
    metric_unit: def.unit,
    base_month: bMonth,
    target_month: tMonth,
    base_value: round(bVal, 2),
    target_value: round(tVal, 2),
    delta,
    delta_pct: deltaPct,
    direction: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'stable',
    base_rank: bRank,
    target_rank: tRank,
    base_national_total: round(bNatTotal, 2),
    target_national_total: round(tNatTotal, 2),
    base_national_share_pct: bShare,
    target_national_share_pct: tShare,
    national_share_delta_pct: shareDelta,
    multi_month_trend: multiMonthTrend,
    hidden_insights: insights,
    top_states: topStates,
    all_metrics_comparison: allMetricsComparison,
    base_state_profile: bStateObj || null,
    target_state_profile: tStateObj || null
  };
}

function overview(monthParam) {
  const selected = resolveMonth(monthParam);
  const production = aggregateProduction(selected);
  const procurement = procurementByYear(selected);
  const states = stateSummary(selected);
  const stock = stockAnalytics(selected);
  const alloc = allocationOfftakeAnalytics(selected);
  const nfsa = nfsaAnalytics(selected);
  const trade = tradeAnalytics(selected);
  const availableMonths = getAvailableMonths();

  return {
    generated_at: new Date().toISOString(),
    selected_month: selected,
    available_months: availableMonths,
    datasets: database.listDatasets().length,
    production,
    production_detail: productionDetail(),
    procurement,
    stock,
    allocation_offtake: alloc,
    nfsa,
    trade,
    relief: reliefAnalytics(selected),
    states: states.slice(0, 10),
    state_count: states.length,
    procurement_latest_year: chooseLatestProcurementYear()
  };
}

function stateInfo(name, monthParam) {
  database.init();
  const key = String(name || '').trim().toLowerCase();
  const selected = resolveMonth(monthParam);
  const summary = stateSummary(selected).find(r => r.state.toLowerCase() === key);
  if (!summary) return null;

  const procRows = db.prepare(`SELECT * FROM statewise_procurement WHERE LOWER(state) = ? ORDER BY year ASC`).all(key);
  const production = aggregateProduction(selected);

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
      stock_as_on: `01.${selected}.2026`,
      offtake_period: `Upto ${selected} 2026`,
      welfare_period: "2026-27",
      procurement_year: chooseLatestProcurementYear()
    },
    notes: production.length ? [`National foodgrain production latest year: ${production[production.length - 1].year}`] : []
  };
}

function insights(monthParam) {
  const o = overview(monthParam);
  const p = o.production, s = o.stock, a = o.allocation_offtake, states = stateSummary(monthParam);
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
      text: `${top.state} has the highest reported Central Pool stock in ${o.selected_month} (${round(top.central_stock_lmt, 2)} Lakh MT).`
    });
  }

  return out;
}

module.exports = {
  overview,
  stateSummary,
  stateInfo,
  insights,
  momComparisonAnalytics,
  permutationAnalytics,
  unitaryAspectAnalytics,
  getAvailableMonths
};
