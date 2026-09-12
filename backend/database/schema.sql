PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_foodgrains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop TEXT NOT NULL,
    season TEXT NOT NULL,
    year TEXT NOT NULL,
    production_mt REAL NOT NULL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS nfsa_coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    impl_month TEXT,
    population_lakh REAL,
    coverage_rural_pct REAL,
    coverage_urban_pct REAL,
    coverage_total_pct REAL,
    accepted_rural_lakh REAL,
    accepted_urban_lakh REAL,
    accepted_total_lakh REAL,
    foodgrains_allocation_lmt REAL,
    aay_families_lakh REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS central_pool_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    region TEXT,
    state TEXT NOT NULL,
    fci_rice_lmt REAL,
    fci_wheat_lmt REAL,
    fci_total_lmt REAL,
    state_rice_lmt REAL,
    state_wheat_lmt REAL,
    state_total_lmt REAL,
    total_rice_lmt REAL,
    total_wheat_lmt REAL,
    total_stock_lmt REAL,
    as_on_date TEXT DEFAULT '2026-06-30',
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS monthwise_stocks_norm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    as_on_date TEXT NOT NULL,
    wheat_actual_lmt REAL,
    wheat_norm_lmt REAL,
    rice_actual_lmt REAL,
    rice_norm_lmt REAL,
    total_actual_lmt REAL,
    total_norm_lmt REAL,
    coarse_actual_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS statewise_procurement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT NOT NULL,
    year TEXT NOT NULL,
    rice_lmt REAL,
    wheat_lmt REAL,
    coarse_lmt REAL,
    total_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS annual_nfsa_allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    year TEXT DEFAULT '2026-27',
    aay_kt REAL,
    phh_kt REAL,
    tide_over_kt REAL,
    total_kt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS offtake_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    period_type TEXT NOT NULL,
    month TEXT DEFAULT 'June 2026',
    alloc_aay_kt REAL, alloc_phh_kt REAL, alloc_tide_over_kt REAL, alloc_total_kt REAL,
    offtake_aay_kt REAL, offtake_phh_kt REAL, offtake_tide_over_kt REAL, offtake_total_kt REAL,
    distrib_aay_kt REAL, distrib_phh_kt REAL, distrib_total_kt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS welfare_institutions_allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    year TEXT DEFAULT '2026-27',
    alloc_wheat_kt REAL, alloc_rice_kt REAL, alloc_total_kt REAL,
    offtake_wheat_kt REAL, offtake_rice_kt REAL, offtake_total_kt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS other_welfare_schemes_offtake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    year TEXT DEFAULT '2026-27',
    bal_vatika_wheat_kt REAL, bal_vatika_rice_kt REAL, bal_vatika_total_kt REAL,
    pm_poshan_primary_wheat_kt REAL, pm_poshan_primary_rice_kt REAL, pm_poshan_primary_total_kt REAL,
    pm_poshan_upper_primary_wheat_kt REAL, pm_poshan_upper_primary_rice_kt REAL, pm_poshan_upper_primary_total_kt REAL,
    wbnp_wheat_kt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS storage_capacity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone TEXT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    fci_owned_covered_lmt REAL, fci_hired_covered_lmt REAL,
    fci_owned_cap_lmt REAL, fci_hired_cap_lmt REAL,
    fci_total_covered_lmt REAL, fci_total_cap_lmt REAL, fci_total_storage_lmt REAL,
    state_agencies_storage_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS monthly_avg_storage_capacity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone TEXT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    month TEXT DEFAULT 'June 2026',
    fci_owned_lmt REAL, silo_lmt REAL, total_owned_lmt REAL,
    hired_state_govt_lmt REAL, cwc_lmt REAL, swc_lmt REAL, peg_lmt REAL, pws_lmt REAL, hired_silo_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS stock_paddy_coarsegrain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone TEXT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    as_on_date TEXT DEFAULT '30.06.2026',
    paddy_fci_lmt REAL, paddy_state_lmt REAL, paddy_total_lmt REAL,
    coarse_fci_lmt REAL, coarse_state_lmt REAL, coarse_total_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS msp_comparison (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity TEXT NOT NULL,
    crop_year TEXT NOT NULL,
    marketing_year TEXT NOT NULL,
    msp_rs_qtl REAL NOT NULL,
    pct_increase REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS consumer_subsidy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    wheat_nfsa_rs_qtl REAL, wheat_other_rs_qtl REAL,
    rice_nfsa_rs_qtl REAL, rice_other_rs_qtl REAL,
    subsidy_dcp_crores REAL, subsidy_fci_crores REAL, total_subsidy_crores REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS food_subsidy_fci_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_or_state TEXT NOT NULL,
    year TEXT NOT NULL,
    amount_crores REAL NOT NULL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS procurement_incidentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    rice_msp_qtl REAL, wheat_msp_qtl REAL,
    rice_incidental_qtl REAL, wheat_incidental_qtl REAL,
    rice_distribution_qtl REAL, wheat_distribution_qtl REAL,
    rice_economic_cost_qtl REAL, wheat_economic_cost_qtl REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS portability_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    month TEXT DEFAULT 'June 2026',
    interstate_txns INTEGER, interstate_distrib_mt REAL,
    intrastate_txns INTEGER, intrastate_distrib_mt REAL,
    total_aadhaar_txns INTEGER, ytd_cumulative_portability_counts INTEGER,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS fair_price_shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no INTEGER,
    state TEXT NOT NULL,
    total_fps_count INTEGER NOT NULL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS omss_domestic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    wheat_lmt REAL,
    rice_lmt REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS export_import (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    wheat_lakh_tons REAL,
    rice_lakh_tons REAL,
    total_lakh_tons REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS export_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variety TEXT NOT NULL,
    country TEXT,
    port TEXT,
    month_year TEXT NOT NULL,
    price_range_usd TEXT,
    price_min_usd REAL,
    price_max_usd REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS sugar_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    month TEXT NOT NULL,
    production_lakh_tons REAL NOT NULL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS festivals_calamity_allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    state TEXT NOT NULL,
    rice_kt REAL, wheat_kt REAL, total_kt REAL,
    issue_price_cip TEXT, date_of_issue TEXT, remarks TEXT,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS central_issue_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    scheme TEXT NOT NULL,
    rice_normal_rs_qtl REAL,
    rice_grade_a_rs_qtl REAL,
    wheat_rs_qtl REAL,
    nutri_cereals_rs_qtl REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS comparative_allocation_offtake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme TEXT NOT NULL,
    commodity TEXT NOT NULL,
    year TEXT NOT NULL,
    allocation_lakh_tons REAL,
    offtake_lakh_tons REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS annual_allocation_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_group TEXT NOT NULL,
    scheme_name TEXT NOT NULL,
    year TEXT DEFAULT '2026-27',
    rice_lakh_tons REAL, wheat_lakh_tons REAL, nutri_cereals_lakh_tons REAL, total_lakh_tons REAL,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS salient_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_number INTEGER,
    topic TEXT NOT NULL,
    text_hi TEXT,
    text_en TEXT,
    data_month TEXT NOT NULL DEFAULT 'June'
);

CREATE TABLE IF NOT EXISTS geo_data (
    id TEXT PRIMARY KEY,
    content_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_crop_season ON production_foodgrains(data_month, crop, season, year);
CREATE INDEX IF NOT EXISTS idx_nfsa_state ON nfsa_coverage(data_month, state);
CREATE INDEX IF NOT EXISTS idx_stocks_state ON central_pool_stocks(data_month, state);
CREATE INDEX IF NOT EXISTS idx_proc_state_yr ON statewise_procurement(data_month, state, year);
CREATE INDEX IF NOT EXISTS idx_alloc_state ON annual_nfsa_allocation(data_month, state);
CREATE INDEX IF NOT EXISTS idx_offtake_state ON offtake_distribution(data_month, state, period_type);
CREATE INDEX IF NOT EXISTS idx_fps_state ON fair_price_shops(data_month, state);
CREATE INDEX IF NOT EXISTS idx_port_state ON portability_transactions(data_month, state);
