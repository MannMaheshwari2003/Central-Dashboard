const { db } = require('../db');

let initialized = false;

function init() {
  if (initialized) return;
  // The project ships with a ready-to-use SQLite database. No external
  // database server, schema import, or seed step is required.
  db.prepare('SELECT 1').get();
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

function getSourceRegistry() {
  init();
  try {
    return db.prepare(`SELECT table_name, dataset_name, description, first_period, latest_period, max_source_columns FROM source_table_catalog ORDER BY dataset_name`).all().map(r => ({
      id: r.table_name,
      label: r.dataset_name,
      category: "Source Tables",
      unit: "Source Excel values",
      source_file: r.dataset_name,
      description: r.description,
      first_period: r.first_period,
      latest_period: r.latest_period,
      max_source_columns: r.max_source_columns,
      source_table: true
    }));
  } catch (_) { return []; }
}

function fullRegistry() { return [...TABLE_REGISTRY, ...getSourceRegistry()]; }

function isValidTable(tableName) {
  return fullRegistry().some(t => t.id === tableName);
}

function listDatasets() {
  init();
  return fullRegistry().map(t => {
    let count = 0;
    try {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${t.id}`).get();
      count = row ? row.c : 0;
    } catch {
      // A missing table is represented as an empty dataset in the registry.
    }
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
  const found = fullRegistry().find(t => t.id === tableName);
  if (!found) return null;
  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM ${tableName}`).get();
  return {
    ...found,
    status: "active",
    record_count: Number(countRow?.c || 0),
    database: "Project-local SQLite (Relational + Source Tables)"
  };
}

function getAllMetadata() {
  return listDatasets().map(d => getDatasetMeta(d.id));
}

function getDataset(tableName, month) {
  init();
  if (!isValidTable(tableName)) return null;
  let whereClause = '';
  const params = [];
  if (month && month !== 'all') {
    try {
      const colCheck = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const hasMonth = colCheck.some(c => c.name === 'data_month');
      const hasPeriod = colCheck.some(c => c.name === 'reporting_period');
      if (hasMonth) {
        const cnt = db.prepare(`SELECT COUNT(*) AS c FROM ${tableName} WHERE LOWER(data_month) = ?`).get(month.toLowerCase())?.c || 0;
        if (cnt > 0) { whereClause = `WHERE LOWER(data_month) = ?`; params.push(month.toLowerCase()); }
      } else if (hasPeriod) {
        const monthMap = {january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'};
        const mm = monthMap[String(month).toLowerCase()];
        if (mm) { whereClause = `WHERE substr(reporting_period,6,2) = ?`; params.push(mm); }
      }
    } catch {
      // Tables without a reporting-month column are returned unfiltered.
    }
  }
  const rows = db.prepare(`SELECT * FROM ${tableName} ${whereClause} ORDER BY id`).all(...params);
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
    } catch {
      // Ignore unsupported filter keys; only real table columns are accepted.
    }
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
    } catch {
      // A table without text columns cannot participate in text search.
    }
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

function getAvailableMonths() {
  init();
  try {
    const rows = db.prepare("SELECT DISTINCT data_month FROM central_pool_stocks WHERE data_month IS NOT NULL AND data_month != ''").all();
    const months = rows.map(r => r.data_month);
    // Custom month sorting order if standard month names
    const order = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months.sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    });
    return months;
  } catch (_) {
    return ['June', 'July'];
  }
}

module.exports = {
  init,
  listDatasets,
  getDatasetMeta,
  getAllMetadata,
  getDataset,
  queryDataset,
  getGeoJson,
  getAvailableMonths,
  TABLE_REGISTRY,
  getSourceRegistry
};
