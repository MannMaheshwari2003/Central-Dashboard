const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const config = require('../config');

let initialized = false;

function init() {
  if (initialized) return;
  const schemaPath = path.join(config.paths.root, 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }
  initialized = true;
}

const TABLE_REGISTRY = [
  { id: "production_foodgrains", label: "All India Foodgrains Production", category: "Production", unit: "Million Tons", source_file: "AllIndiaProductionOfFoodgrains.xls" },
  { id: "sugar_production", label: "Sugar Production", category: "Production", unit: "Lakh Tons", source_file: "MonthWiseProductionOfSugar.xls" },
  { id: "central_pool_stocks", label: "Central Pool Stocks Position", category: "Stocks & Storage", unit: "Lakh Metric Tons (LMT)", source_file: "TotalStockInCentralPool.xls" },
  { id: "monthwise_stocks_norm", label: "Month-wise Stocks vs Norms", category: "Stocks & Storage", unit: "Lakh Metric Tons (LMT)", source_file: "MonthWise_Stocks_in_CP (1).xls" },
  { id: "storage_capacity", label: "FCI & State Storage Capacity", category: "Stocks & Storage", unit: "Lakh Metric Tons (LMT)", source_file: "CPStorageCapacityFCIStateAgencies.xls" },
  { id: "monthly_avg_storage_capacity", label: "Monthly Avg Storage Capacity", category: "Stocks & Storage", unit: "Lakh Metric Tons (LMT)", source_file: "MonthlyAvgStorageCapacity.xls" },
  { id: "stock_paddy_coarsegrain", label: "Stock Position of Paddy & Coarse Grains", category: "Stocks & Storage", unit: "Lakh Metric Tons (LMT)", source_file: "StockPositionPaddyCG.xls" },
  { id: "statewise_procurement", label: "State-wise Grain Procurement", category: "Procurement", unit: "Lakh Tons", source_file: "StatewiseProcurementRWCG (1).xls" },
  { id: "msp_comparison", label: "Minimum Support Price (MSP) Comparison", category: "Procurement", unit: "Rs. / Quintal", source_file: "YearWiseComparisionOfMSPWRCG.xls" },
  { id: "procurement_incidentals", label: "Procurement Incidentals & Economic Cost", category: "Procurement", unit: "Rs. / Quintal", source_file: "ProcurementIncidentals.xls" },
  { id: "annual_nfsa_allocation", label: "Annual NFSA Allocation", category: "Allocation & Offtake", unit: "Thousand Tons", source_file: "AnnualAllocationUnderNFSA.xls" },
  { id: "annual_allocation_summary", label: "Annual Allocation Summary", category: "Allocation & Offtake", unit: "Lakh Tons", source_file: "AnnualAllocationOfFoodgrains.xls" },
  { id: "comparative_allocation_offtake", label: "Comparative Position Allocation & Offtake", category: "Allocation & Offtake", unit: "Lakh Tons", source_file: "ComparativeAllocationOfftake.xls" },
  { id: "offtake_distribution", label: "Foodgrains Offtake & Distribution", category: "Allocation & Offtake", unit: "Thousand Tons", source_file: "FoodgrainOfftakeDistributionForMonth.xls" },
  { id: "welfare_institutions_allocation", label: "Welfare Institutions Allocation & Offtake", category: "Allocation & Offtake", unit: "Thousand Tons", source_file: "AllocationOfftakeWelfareInstitutions.xls" },
  { id: "other_welfare_schemes_offtake", label: "Other Welfare Schemes Offtake", category: "Allocation & Offtake", unit: "Thousand Tons", source_file: "OfftakeUnderOWSchemes.xls" },
  { id: "nfsa_coverage", label: "NFSA Coverage Statement", category: "Distribution & NFSA", unit: "Lakh Persons / %", source_file: "NFSACoverageStatement.xls" },
  { id: "fair_price_shops", label: "Fair Price Shops (FPS) Count", category: "Distribution & NFSA", unit: "Count", source_file: "StatementStateWiseTotalFPS.xls" },
  { id: "portability_transactions", label: "Portability Transactions & Distribution", category: "Distribution & NFSA", unit: "Transactions / MT", source_file: "PortabilityTransactionDistribution.xls" },
  { id: "export_import", label: "Export & Import of Foodgrains", category: "Trade & Pricing", unit: "Lakh Tons", source_file: "ExportImportFoodgrains (1).xls" },
  { id: "export_prices", label: "International Export Prices", category: "Trade & Pricing", unit: "USD / Ton", source_file: "ExportPrices.xls" },
  { id: "omss_domestic", label: "Open Market Sales Scheme (OMSS)", category: "Trade & Pricing", unit: "Lakh Metric Tons (LMT)", source_file: "OMSSDomestic.xls" },
  { id: "central_issue_price", label: "Central Issue Price (CIP)", category: "Trade & Pricing", unit: "Rs. / Quintal", source_file: "CentralIssuePriceRWCG.xls" },
  { id: "consumer_subsidy", label: "Consumer Subsidy & Total Subsidy", category: "Subsidy & Finance", unit: "Rs. / Quintal & Rs. Crores", source_file: "ConsumerSubsidyOnRW.xls" },
  { id: "food_subsidy_fci_state", label: "Food Subsidy Released to FCI & States", category: "Subsidy & Finance", unit: "Rs. Crores", source_file: "FoodSubsidyToFCIStateGovt_Portrait.xls" },
  { id: "festivals_calamity_allocation", label: "Festivals & Calamity Relief Allocation", category: "Subsidy & Finance", unit: "Thousand Tons", source_file: "FestivalsCalamityAllocation.xls" },
  { id: "salient_features", label: "Salient Executive Features", category: "Governance", unit: "Text Statement", source_file: "SalientFeatures.xls" }
];

function isValidTable(tableName) {
  return TABLE_REGISTRY.some(t => t.id === tableName);
}

function listDatasets() {
  init();
  return TABLE_REGISTRY.map(t => {
    let count = 0;
    try {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${t.id}`).get();
      count = row ? row.c : 0;
    } catch (_) {}
    return {
      ...t,
      status: "active",
      has_rows: count > 0,
      record_count: count
    };
  });
}

function getDatasetMeta(tableName) {
  init();
  const found = TABLE_REGISTRY.find(t => t.id === tableName);
  if (!found) return null;
  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM ${tableName}`).get();
  return {
    ...found,
    status: "active",
    record_count: Number(countRow?.c || 0),
    database: "SQLite (Relational)"
  };
}

function getAllMetadata() {
  return listDatasets().map(d => getDatasetMeta(d.id));
}

function getDataset(tableName) {
  init();
  if (!isValidTable(tableName)) return null;
  const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY id`).all();
  return { rows };
}

function queryDataset(tableName, options = {}) {
  init();
  if (!isValidTable(tableName)) return null;

  const search = String(options.search || '').trim();
  const parsedLimit = Math.min(Math.max(Number(options.limit) || 50, 1), 1000);
  const parsedOffset = Math.max(Number(options.offset) || 0, 0);

  const filterClauses = [];
  const params = [];

  // Filter out system options
  const reservedKeys = ['search', 'limit', 'offset', 'group', 'sort', 'order'];

  for (const [key, value] of Object.entries(options)) {
    if (reservedKeys.includes(key) || value === '' || value == null) continue;

    // Check if column exists in table schema
    try {
      const colCheck = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const colNames = colCheck.map(c => c.name);
      if (colNames.includes(key)) {
        filterClauses.push(`${key} LIKE ?`);
        params.push(`%${value}%`);
      }
    } catch (_) {}
  }

  if (search) {
    try {
      const colCheck = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const textCols = colCheck.filter(c => c.type === 'TEXT').map(c => c.name);
      if (textCols.length) {
        const searchOrs = textCols.map(c => `${c} LIKE ?`).join(' OR ');
        filterClauses.push(`(${searchOrs})`);
        textCols.forEach(() => params.push(`%${search}%`));
      }
    } catch (_) {}
  }

  const whereStr = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM ${tableName} ${whereStr}`).get(...params);
  const total = Number(totalRow?.c || 0);

  const rows = db.prepare(`
    SELECT * FROM ${tableName}
    ${whereStr}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).all(...params, parsedLimit, parsedOffset);

  return {
    dataset: tableName,
    pagination: {
      total_records: total,
      limit: parsedLimit,
      offset: parsedOffset,
      has_next: parsedOffset + parsedLimit < total
    },
    data: rows,
    rows: rows // backwards compatibility
  };
}

function getGeoJson(id = 'india-states') {
  init();
  try {
    const row = db.prepare('SELECT content_json FROM geo_data WHERE id = ?').get(id);
    return row ? JSON.parse(row.content_json) : null;
  } catch (_) {
    return null;
  }
}

function clearDatabase() {
  init();
  TABLE_REGISTRY.forEach(t => {
    try { db.exec(`DELETE FROM ${t.id};`); } catch (_) {}
  });
}

module.exports = {
  init,
  listDatasets,
  getDatasetMeta,
  getAllMetadata,
  getDataset,
  queryDataset,
  getGeoJson,
  clearDatabase,
  TABLE_REGISTRY
};
