const { db } = require('../db');
const database = require('./database.service');

function loadRegistry() { return database.listDatasets(); }
function loadDataset(id, month) { return database.getDataset(id, month); }
function listDatasets() {
  const reg = loadRegistry();
  const grouped = {};
  reg.forEach(d => { (grouped[d.category] ||= []).push(d); });
  return { count: reg.length, categories: Object.keys(grouped), datasets: reg, grouped };
}
function queryDataset(id, options = {}) { return database.queryDataset(id, options); }
function getDatasetMeta(id) { return database.getDatasetMeta(id); }
function getAllMetadata() { return database.getAllMetadata(); }

function computeKpis(monthParam) {
  database.init();
  const months = database.getAvailableMonths();
  const selected = (!monthParam || monthParam === 'latest') ? (months[months.length - 1] || 'July') : monthParam;
  const isMonthSpecific = selected && selected !== 'all';

  const mClause = isMonthSpecific ? 'WHERE LOWER(data_month) = ?' : '';
  const mParams = isMonthSpecific ? [selected.toLowerCase()] : [];

  const stockAgg = db.prepare(`
    SELECT
      SUM(total_rice_lmt) AS rice,
      SUM(total_wheat_lmt) AS wheat,
      SUM(total_stock_lmt) AS total
    FROM central_pool_stocks
    ${mClause}
  `).get(...mParams) || {};

  const nfsaAgg = db.prepare(`
    SELECT
      SUM(population_lakh) AS pop,
      SUM(accepted_rural_lakh) AS accepted_rural,
      SUM(accepted_urban_lakh) AS accepted_urban,
      SUM(accepted_total_lakh) AS accepted
    FROM nfsa_coverage
    ${mClause}
  `).get(...mParams) || {};

  const prodLatest = db.prepare(`
    SELECT MAX(production_mt) AS production_mt FROM production_foodgrains
    WHERE crop = 'Total Foodgrains' AND season = 'Total' AND year = '2025-26' AND production_mt > 0
  `).get();

  const prodPrev = db.prepare(`
    SELECT MAX(production_mt) AS production_mt FROM production_foodgrains
    WHERE crop = 'Total Foodgrains' AND season = 'Total' AND year = '2024-25' AND production_mt > 0
  `).get();

  const procAgg = db.prepare(`
    SELECT
      SUM(rice_lmt) AS rice,
      SUM(wheat_lmt) AS wheat,
      SUM(coarse_lmt) AS coarse
    FROM statewise_procurement
    WHERE year = '2025-26' ${isMonthSpecific ? 'AND LOWER(data_month) = ?' : ''}
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : [])) || {};

  const tradeLatest = db.prepare(`
    SELECT year, total_lakh_tons FROM export_import
    ${isMonthSpecific ? 'WHERE LOWER(data_month) = ?' : ''}
    ORDER BY id DESC LIMIT 1
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : [])) || {};

  const officialCompAgg = db.prepare(`
    SELECT allocation_lakh_tons AS alloc, offtake_lakh_tons AS off
    FROM comparative_allocation_offtake
    WHERE year = '2026-27' AND scheme = 'Official Total' ${isMonthSpecific ? 'AND LOWER(data_month) = ?' : ''}
    LIMIT 1
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : []));

  const compAgg = officialCompAgg || db.prepare(`
    SELECT
      SUM(allocation_lakh_tons) AS alloc,
      SUM(offtake_lakh_tons) AS off
    FROM comparative_allocation_offtake
    WHERE year = '2026-27' AND scheme <> 'Official Total' ${isMonthSpecific ? 'AND LOWER(data_month) = ?' : ''}
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : [])) || {};

  const allocSum = Number(compAgg.alloc || 0);
  const offtakeSum = Number(compAgg.off || 0);
  const popSum = Number(nfsaAgg.pop || 0);
  const accRuralSum = Number(nfsaAgg.accepted_rural || 0);
  const accUrbanSum = Number(nfsaAgg.accepted_urban || 0);
  const accSum = Number(nfsaAgg.accepted || 0);

  const commodityComp = db.prepare(`
    SELECT
      commodity,
      SUM(allocation_lakh_tons) AS allocation,
      SUM(offtake_lakh_tons) AS offtake
    FROM comparative_allocation_offtake
    WHERE year = '2026-27'
      AND scheme <> 'Official Total'
      ${isMonthSpecific ? 'AND LOWER(data_month) = ?' : ''}
    GROUP BY commodity
  `).all(...(isMonthSpecific ? [selected.toLowerCase()] : []));

  const commodityValue = (commodity, field) => {
    const row = commodityComp.find(r => String(r.commodity || '').toLowerCase() === commodity.toLowerCase());
    return Math.round(Number(row?.[field] || 0) * 100) / 100;
  };

  const asOnDateRow = db.prepare(`
    SELECT as_on_date FROM central_pool_stocks
    ${mClause}
    ORDER BY id DESC LIMIT 1
  `).get(...mParams);

  const distribAgg = db.prepare(`
    SELECT
      SUM(distrib_total_kt) AS distrib_total,
      SUM(distrib_aay_kt) AS distrib_aay,
      SUM(distrib_phh_kt) AS distrib_phh
    FROM offtake_distribution
    WHERE period_type = 'month' ${isMonthSpecific ? 'AND LOWER(data_month) = ?' : ''}
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : [])) || {};

  const fpsAgg = db.prepare(`
    SELECT
      SUM(total_fps_count) AS total_fps,
      COUNT(DISTINCT state) AS states_count
    FROM fair_price_shops
    ${isMonthSpecific ? 'WHERE LOWER(data_month) = ?' : ''}
  `).get(...(isMonthSpecific ? [selected.toLowerCase()] : [])) || {};

  return {
    generated_at: new Date().toISOString(),
    selected_month: selected,
    total_central_pool_stock_lmt: stockAgg.total == null ? null : Math.round(stockAgg.total * 100) / 100,
    total_stock_rice_lmt: stockAgg.rice == null ? null : Math.round(stockAgg.rice * 100) / 100,
    total_stock_wheat_lmt: stockAgg.wheat == null ? null : Math.round(stockAgg.wheat * 100) / 100,
    stock_as_on: asOnDateRow?.as_on_date || null,
    nfsa_persons_covered_lakh: accSum ? Math.round(accSum * 100) / 100 : null,
    nfsa_population_lakh: popSum ? Math.round(popSum * 100) / 100 : null,
    nfsa_accepted_rural_lakh: accRuralSum ? Math.round(accRuralSum * 100) / 100 : null,
    nfsa_accepted_urban_lakh: accUrbanSum ? Math.round(accUrbanSum * 100) / 100 : null,
    nfsa_accepted_total_lakh: accSum ? Math.round(accSum * 100) / 100 : null,
    nfsa_pct_accepted: popSum ? Math.round((accSum / popSum) * 10000) / 100 : null,
    production_latest_year: "2025-26",
    production_latest_value_mt: prodLatest?.production_mt ?? null,
    production_prev_value_mt: prodPrev?.production_mt ?? null,
    procurement_year: "2025-26",
    procurement_rice_lakh: procAgg.rice == null ? null : Math.round(procAgg.rice * 100) / 100,
    procurement_wheat_lakh: procAgg.wheat == null ? null : Math.round(procAgg.wheat * 100) / 100,
    procurement_coarse_lakh: procAgg.coarse == null ? null : Math.round(procAgg.coarse * 100) / 100,
    trade_latest_year: tradeLatest.year || null,
    trade_latest_total_lakh: tradeLatest.total_lakh_tons ?? null,
    fy2627_allocation_lakh: Math.round(allocSum * 100) / 100,
    fy2627_allocation_rice_lakh: commodityValue('Rice', 'allocation'),
    fy2627_allocation_wheat_lakh: commodityValue('Wheat', 'allocation'),
    fy2627_allocation_coarse_lakh: commodityValue('Coarse Grains', 'allocation'),
    fy2627_offtake_lakh: Math.round(offtakeSum * 100) / 100,
    fy2627_offtake_rice_lakh: commodityValue('Rice', 'offtake'),
    fy2627_offtake_wheat_lakh: commodityValue('Wheat', 'offtake'),
    fy2627_offtake_coarse_lakh: commodityValue('Coarse Grains', 'offtake'),
    fy2627_offtake_rate_pct: allocSum ? Math.round((offtakeSum / allocSum) * 10000) / 100 : null,
    distrib_total_kt: distribAgg.distrib_total ? Math.round(distribAgg.distrib_total * 100) / 100 : null,
    distrib_aay_kt: distribAgg.distrib_aay ? Math.round(distribAgg.distrib_aay * 100) / 100 : null,
    distrib_phh_kt: distribAgg.distrib_phh ? Math.round(distribAgg.distrib_phh * 100) / 100 : null,
    total_fair_price_shops: fpsAgg.total_fps || 551736,
    fps_states_count: fpsAgg.states_count || 34
  };
}

function getStateInfo(name) {
  database.init();
  const key = String(name || '').toLowerCase().trim();
  const findState = (table) => {
    return db.prepare(`SELECT * FROM ${table} WHERE LOWER(state) = ? LIMIT 1`).get(key);
  };

  const nfsaRow = findState('nfsa_coverage');
  const stockRow = findState('central_pool_stocks');
  const allocRow = findState('annual_nfsa_allocation');
  const procRow = findState('statewise_procurement');
  const offtakeRow = findState('offtake_distribution');
  const welfareRow = findState('welfare_institutions_allocation');
  const paddyRow = findState('stock_paddy_coarsegrain');

  if (!nfsaRow && !stockRow && !allocRow && !procRow) return null;

  return {
    state: name,
    nfsa_coverage: nfsaRow || null,
    central_pool_stock: stockRow || null,
    annual_nfsa_allocation: allocRow || null,
    procurement: procRow || null,
    offtake_upto_month: offtakeRow || null,
    welfare_institutions: welfareRow || null,
    paddy_coarsegrain_stock: paddyRow || null
  };
}

module.exports = {
  loadRegistry,
  loadDataset,
  listDatasets,
  queryDataset,
  getDatasetMeta,
  getAllMetadata,
  computeKpis,
  getStateInfo
};
