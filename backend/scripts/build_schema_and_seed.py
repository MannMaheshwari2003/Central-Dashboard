import os
import glob
import re
import json
import sqlite3
import pandas as pd

SOURCE_DIR = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\backend\source-data"
DB_PATH = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\backend\database\food_pds.db"
SCHEMA_PATH = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\backend\database\schema.sql"

def clean_state(val):
    if not val or pd.isna(val):
        return ""
    s = str(val).strip()
    s = re.sub(r'^\d+\s*\|\s*', '', s)
    match = re.search(r'[A-Za-z\&\s\.\(\)\-\,]{2,}', s)
    if match:
        name = match.group(0).strip()
        name_map = {
            "Andaman and Nicobar Island": "Andaman and Nicobar Islands",
            "Andaman & Nicobar Islands": "Andaman and Nicobar Islands",
            "Dadra and Nagar Haveli and Daman and Diu": "Dadra & Nagar Haveli and Daman & Diu",
            "Dadra and Nagar Haveli": "Dadra & Nagar Haveli and Daman & Diu",
            "Daman and Diu": "Dadra & Nagar Haveli and Daman & Diu",
            "Jammu and Kashmir": "Jammu & Kashmir",
            "Jammu & Kashmir": "Jammu & Kashmir",
            "Uttrakhand": "Uttarakhand",
            "Orissa": "Odisha",
            "Telengana": "Telangana"
        }
        return name_map.get(name, name)
    return s

def to_num(val):
    if pd.isna(val) or val is None:
        return 0.0
    s = str(val).strip().replace(',', '')
    if s in ['', '-', '*', '#', '$', 'N.A.', 'NA']:
        return 0.0
    try:
        return float(s)
    except:
        return 0.0

def build_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if os.path.exists(DB_PATH):
        try: os.remove(DB_PATH)
        except: pass

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    ddl_statements = []

    # 1. production_foodgrains
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS production_foodgrains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crop TEXT NOT NULL,
        season TEXT NOT NULL,
        year TEXT NOT NULL,
        production_mt REAL NOT NULL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS production_foodgrains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crop TEXT NOT NULL,
        season TEXT NOT NULL,
        year TEXT NOT NULL,
        production_mt REAL NOT NULL
    );""")

    f1 = os.path.join(SOURCE_DIR, "AllIndiaProductionOfFoodgrains.xls")
    df1 = pd.read_excel(f1, header=None)
    years1 = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    current_crop = "Rice"
    for idx, row in df1.iterrows():
        if idx < 4: continue
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "अनाज" in r0 or "Grains" in r0 or "चावल" in r0 or "Rice" in r0:
            current_crop = "Rice"
        elif "गेहूँ" in r0 or "Wheat" in r0:
            current_crop = "Wheat"
        elif "मोटा अनाज" in r0 or "Coarse Grains" in r0 or "Nutri" in r0:
            current_crop = "Coarse Grains"
        elif "दलहन" in r0 or "Pulses" in r0:
            current_crop = "Pulses"
        elif "कुल खाद्यान्न" in r0 or "Total Foodgrains" in r0:
            current_crop = "Total Foodgrains"
        
        season = ""
        if "खरीफ" in r0 or "Kharif" in r0: season = "Kharif"
        elif "रबी" in r0 or "Rabi" in r0: season = "Rabi"
        elif "जायद" in r0 or "Summer" in r0: season = "Summer"
        elif "कुल" in r0 or "Total" in r0: season = "Total"

        if season:
            for col_idx, yr in enumerate(years1, start=1):
                val = to_num(row[col_idx])
                cursor.execute(
                    "INSERT INTO production_foodgrains (crop, season, year, production_mt) VALUES (?, ?, ?, ?)",
                    (current_crop, season, yr, val)
                )

    # 2. nfsa_coverage
    cursor.execute("""
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
        aay_families_lakh REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS nfsa_coverage (
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
        aay_families_lakh REAL
    );""")

    f2 = os.path.join(SOURCE_DIR, "NFSACoverageStatement.xls")
    df2 = pd.read_excel(f2, header=None)
    for idx, row in df2.iterrows():
        if idx < 5: continue
        sl = to_num(row[0])
        st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        impl = str(row[2]).strip() if pd.notna(row[2]) else ""
        pop = to_num(row[3])
        r_pct = to_num(row[4]); u_pct = to_num(row[5]); t_pct = to_num(row[6])
        r_acc = to_num(row[7]); u_acc = to_num(row[8]); t_acc = to_num(row[9])
        alloc = to_num(row[10]); aay = to_num(row[11])
        cursor.execute("""
            INSERT INTO nfsa_coverage (sl_no, state, impl_month, population_lakh, coverage_rural_pct, coverage_urban_pct, coverage_total_pct, accepted_rural_lakh, accepted_urban_lakh, accepted_total_lakh, foodgrains_allocation_lmt, aay_families_lakh)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sl, st, impl, pop, r_pct, u_pct, t_pct, r_acc, u_acc, t_acc, alloc, aay))

    # 3. central_pool_stocks
    cursor.execute("""
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
        as_on_date TEXT DEFAULT '2026-06-30'
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS central_pool_stocks (
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
        as_on_date TEXT DEFAULT '2026-06-30'
    );""")

    f3 = os.path.join(SOURCE_DIR, "TotalStockInCentralPool.xls")
    df3 = pd.read_excel(f3, header=None)
    curr_region = "East"
    for idx, row in df3.iterrows():
        if idx < 8: continue
        r2 = str(row[2]).strip() if pd.notna(row[2]) else ""
        if "Total" in r2 or "Zonal" in r2 or "All India" in r2 or "Grand Total" in r2:
            continue
        if "Zone" in r2 or "Region" in r2:
            curr_region = r2
            continue
        st = clean_state(r2)
        if not st: continue
        sl = to_num(row[0])
        fci_r = to_num(row[3]); fci_w = to_num(row[4]); fci_t = to_num(row[5])
        st_r = to_num(row[7]); st_w = to_num(row[8]); st_t = to_num(row[9])
        tot_r = to_num(row[10]); tot_w = to_num(row[11]); tot_s = tot_r + tot_w
        cursor.execute("""
            INSERT INTO central_pool_stocks (sl_no, region, state, fci_rice_lmt, fci_wheat_lmt, fci_total_lmt, state_rice_lmt, state_wheat_lmt, state_total_lmt, total_rice_lmt, total_wheat_lmt, total_stock_lmt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sl, curr_region, st, fci_r, fci_w, fci_t, st_r, st_w, st_t, tot_r, tot_w, tot_s))

    # 4. monthwise_stocks_norm
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthwise_stocks_norm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        as_on_date TEXT NOT NULL,
        wheat_actual_lmt REAL,
        wheat_norm_lmt REAL,
        rice_actual_lmt REAL,
        rice_norm_lmt REAL,
        total_actual_lmt REAL,
        total_norm_lmt REAL,
        coarse_actual_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS monthwise_stocks_norm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        as_on_date TEXT NOT NULL,
        wheat_actual_lmt REAL,
        wheat_norm_lmt REAL,
        rice_actual_lmt REAL,
        rice_norm_lmt REAL,
        total_actual_lmt REAL,
        total_norm_lmt REAL,
        coarse_actual_lmt REAL
    );""")

    f4 = os.path.join(SOURCE_DIR, "MonthWise_Stocks_in_CP (1).xls")
    df4 = pd.read_excel(f4, header=None)
    for idx, row in df4.iterrows():
        if idx < 6: continue
        dt = str(row[0]).strip() if pd.notna(row[0]) else ""
        if not dt or "Note" in dt or "Source" in dt: continue
        w_act = to_num(row[1]); w_norm = to_num(row[2])
        r_act = to_num(row[3]); r_norm = to_num(row[4])
        t_act = to_num(row[6]); t_norm = to_num(row[7])
        c_act = to_num(row[8])
        cursor.execute("""
            INSERT INTO monthwise_stocks_norm (as_on_date, wheat_actual_lmt, wheat_norm_lmt, rice_actual_lmt, rice_norm_lmt, total_actual_lmt, total_norm_lmt, coarse_actual_lmt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (dt, w_act, w_norm, r_act, r_norm, t_act, t_norm, c_act))

    # 5. statewise_procurement
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS statewise_procurement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        year TEXT NOT NULL,
        rice_lmt REAL,
        wheat_lmt REAL,
        coarse_lmt REAL,
        total_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS statewise_procurement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        year TEXT NOT NULL,
        rice_lmt REAL,
        wheat_lmt REAL,
        coarse_lmt REAL,
        total_lmt REAL
    );""")

    f5 = os.path.join(SOURCE_DIR, "StatewiseProcurementRWCG (1).xls")
    df5 = pd.read_excel(f5, header=None)
    proc_years = ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]
    for idx, row in df5.iterrows():
        if idx < 6: continue
        st_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        for i, yr in enumerate(proc_years):
            base_c = 2 + i * 3
            if base_c < len(row):
                r = to_num(row[base_c])
                w = to_num(row[base_c + 1]) if base_c + 1 < len(row) else 0.0
                c = to_num(row[base_c + 2]) if base_c + 2 < len(row) else 0.0
                tot = r + w + c
                cursor.execute("""
                    INSERT INTO statewise_procurement (state, year, rice_lmt, wheat_lmt, coarse_lmt, total_lmt)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (st, yr, r, w, c, tot))

    # 6. annual_nfsa_allocation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS annual_nfsa_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        aay_kt REAL,
        phh_kt REAL,
        tide_over_kt REAL,
        total_kt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS annual_nfsa_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        aay_kt REAL,
        phh_kt REAL,
        tide_over_kt REAL,
        total_kt REAL
    );""")

    f6 = os.path.join(SOURCE_DIR, "AnnualAllocationUnderNFSA.xls")
    df6 = pd.read_excel(f6, header=None)
    for idx, row in df6.iterrows():
        if idx < 5: continue
        st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[0])
        aay = to_num(row[2]); phh = to_num(row[3]); tide = to_num(row[4]); tot = to_num(row[5])
        cursor.execute("""
            INSERT INTO annual_nfsa_allocation (sl_no, state, year, aay_kt, phh_kt, tide_over_kt, total_kt)
            VALUES (?, ?, '2026-27', ?, ?, ?, ?)
        """, (sl, st, aay, phh, tide, tot))

    # 7. offtake_distribution
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS offtake_distribution (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        period_type TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        alloc_aay_kt REAL, alloc_phh_kt REAL, alloc_tide_over_kt REAL, alloc_total_kt REAL,
        offtake_aay_kt REAL, offtake_phh_kt REAL, offtake_tide_over_kt REAL, offtake_total_kt REAL,
        distrib_aay_kt REAL, distrib_phh_kt REAL, distrib_total_kt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS offtake_distribution (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        period_type TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        alloc_aay_kt REAL, alloc_phh_kt REAL, alloc_tide_over_kt REAL, alloc_total_kt REAL,
        offtake_aay_kt REAL, offtake_phh_kt REAL, offtake_tide_over_kt REAL, offtake_total_kt REAL,
        distrib_aay_kt REAL, distrib_phh_kt REAL, distrib_total_kt REAL
    );""")

    for ptype, fname in [("month", "FoodgrainOfftakeDistributionForMonth.xls"), ("upto_month", "FoodgrainOfftakeDistributionUptoMonth.xls")]:
        fpath = os.path.join(SOURCE_DIR, fname)
        df7 = pd.read_excel(fpath, header=None)
        for idx, row in df7.iterrows():
            if idx < 7: continue
            st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
            if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
            st = clean_state(st_raw)
            sl = to_num(row[0])
            al_aay = to_num(row[2]); al_phh = to_num(row[3]); al_tide = to_num(row[4]); al_tot = to_num(row[5])
            off_aay = to_num(row[6]); off_phh = to_num(row[7]); off_tide = to_num(row[8]); off_tot = to_num(row[9])
            dis_aay = to_num(row[10]); dis_phh = to_num(row[11]); dis_tot = dis_aay + dis_phh
            cursor.execute("""
                INSERT INTO offtake_distribution (sl_no, state, period_type, month, alloc_aay_kt, alloc_phh_kt, alloc_tide_over_kt, alloc_total_kt, offtake_aay_kt, offtake_phh_kt, offtake_tide_over_kt, offtake_total_kt, distrib_aay_kt, distrib_phh_kt, distrib_total_kt)
                VALUES (?, ?, ?, 'June 2026', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (sl, st, ptype, al_aay, al_phh, al_tide, al_tot, off_aay, off_phh, off_tide, off_tot, dis_aay, dis_phh, dis_tot))

    # 8. welfare_institutions_allocation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS welfare_institutions_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        alloc_wheat_kt REAL, alloc_rice_kt REAL, alloc_total_kt REAL,
        offtake_wheat_kt REAL, offtake_rice_kt REAL, offtake_total_kt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS welfare_institutions_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        alloc_wheat_kt REAL, alloc_rice_kt REAL, alloc_total_kt REAL,
        offtake_wheat_kt REAL, offtake_rice_kt REAL, offtake_total_kt REAL
    );""")

    f8 = os.path.join(SOURCE_DIR, "AllocationOfftakeWelfareInstitutions.xls")
    df8 = pd.read_excel(f8, header=None)
    for idx, row in df8.iterrows():
        if idx < 6: continue
        st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[0])
        aw = to_num(row[2]); ar = to_num(row[3]); at = to_num(row[4])
        ow = to_num(row[6]); ord_r = to_num(row[7]); ot = to_num(row[8])
        cursor.execute("""
            INSERT INTO welfare_institutions_allocation (sl_no, state, year, alloc_wheat_kt, alloc_rice_kt, alloc_total_kt, offtake_wheat_kt, offtake_rice_kt, offtake_total_kt)
            VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?, ?)
        """, (sl, st, aw, ar, at, ow, ord_r, ot))

    # 9. other_welfare_schemes_offtake
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS other_welfare_schemes_offtake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        bal_vatika_wheat_kt REAL, bal_vatika_rice_kt REAL, bal_vatika_total_kt REAL,
        pm_poshan_primary_wheat_kt REAL, pm_poshan_primary_rice_kt REAL, pm_poshan_primary_total_kt REAL,
        pm_poshan_upper_primary_wheat_kt REAL, pm_poshan_upper_primary_rice_kt REAL, pm_poshan_upper_primary_total_kt REAL,
        wbnp_wheat_kt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS other_welfare_schemes_offtake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        bal_vatika_wheat_kt REAL, bal_vatika_rice_kt REAL, bal_vatika_total_kt REAL,
        pm_poshan_primary_wheat_kt REAL, pm_poshan_primary_rice_kt REAL, pm_poshan_primary_total_kt REAL,
        pm_poshan_upper_primary_wheat_kt REAL, pm_poshan_upper_primary_rice_kt REAL, pm_poshan_upper_primary_total_kt REAL,
        wbnp_wheat_kt REAL
    );""")

    f9 = os.path.join(SOURCE_DIR, "OfftakeUnderOWSchemes.xls")
    df9 = pd.read_excel(f9, header=None)
    for idx, row in df9.iterrows():
        if idx < 6: continue
        st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[0])
        bv_w = to_num(row[2]); bv_r = to_num(row[3]); bv_t = to_num(row[4])
        p1_w = to_num(row[5]); p1_r = to_num(row[6]); p1_t = to_num(row[7])
        p2_w = to_num(row[8]); p2_r = to_num(row[9]); p2_t = to_num(row[10])
        wbnp = to_num(row[11])
        cursor.execute("""
            INSERT INTO other_welfare_schemes_offtake (sl_no, state, year, bal_vatika_wheat_kt, bal_vatika_rice_kt, bal_vatika_total_kt, pm_poshan_primary_wheat_kt, pm_poshan_primary_rice_kt, pm_poshan_primary_total_kt, pm_poshan_upper_primary_wheat_kt, pm_poshan_upper_primary_rice_kt, pm_poshan_upper_primary_total_kt, wbnp_wheat_kt)
            VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sl, st, bv_w, bv_r, bv_t, p1_w, p1_r, p1_t, p2_w, p2_r, p2_t, wbnp))

    # 10. storage_capacity
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS storage_capacity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        fci_owned_covered_lmt REAL, fci_hired_covered_lmt REAL,
        fci_owned_cap_lmt REAL, fci_hired_cap_lmt REAL,
        fci_total_covered_lmt REAL, fci_total_cap_lmt REAL, fci_total_storage_lmt REAL,
        state_agencies_storage_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS storage_capacity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        fci_owned_covered_lmt REAL, fci_hired_covered_lmt REAL,
        fci_owned_cap_lmt REAL, fci_hired_cap_lmt REAL,
        fci_total_covered_lmt REAL, fci_total_cap_lmt REAL, fci_total_storage_lmt REAL,
        state_agencies_storage_lmt REAL
    );""")

    f10 = os.path.join(SOURCE_DIR, "CPStorageCapacityFCIStateAgencies.xls")
    df10 = pd.read_excel(f10, header=None)
    curr_z = "East"
    for idx, row in df10.iterrows():
        if idx < 6: continue
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "Zone" in r0 or "East" in r0 or "West" in r0 or "North" in r0 or "South" in r0 or "NE" in r0:
            curr_z = r0
        st_raw = str(row[3]).strip() if pd.notna(row[3]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[2])
        oc = to_num(row[4]); hc = to_num(row[5]); ocap = to_num(row[6]); hcap = to_num(row[7])
        tcov = to_num(row[8]); tcap = to_num(row[9]); tot_fci = to_num(row[10]); st_ag = to_num(row[11])
        cursor.execute("""
            INSERT INTO storage_capacity (zone, sl_no, state, fci_owned_covered_lmt, fci_hired_covered_lmt, fci_owned_cap_lmt, fci_hired_cap_lmt, fci_total_covered_lmt, fci_total_cap_lmt, fci_total_storage_lmt, state_agencies_storage_lmt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (curr_z, sl, st, oc, hc, ocap, hcap, tcov, tcap, tot_fci, st_ag))

    # 11. monthly_avg_storage_capacity
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthly_avg_storage_capacity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        fci_owned_lmt REAL, silo_lmt REAL, total_owned_lmt REAL,
        hired_state_govt_lmt REAL, cwc_lmt REAL, swc_lmt REAL, peg_lmt REAL, pws_lmt REAL, hired_silo_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS monthly_avg_storage_capacity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        fci_owned_lmt REAL, silo_lmt REAL, total_owned_lmt REAL,
        hired_state_govt_lmt REAL, cwc_lmt REAL, swc_lmt REAL, peg_lmt REAL, pws_lmt REAL, hired_silo_lmt REAL
    );""")

    f11 = os.path.join(SOURCE_DIR, "MonthlyAvgStorageCapacity.xls")
    df11 = pd.read_excel(f11, header=None)
    curr_z11 = "East"
    for idx, row in df11.iterrows():
        if idx < 6: continue
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "Zone" in r0: curr_z11 = r0
        st_raw = str(row[2]).strip() if pd.notna(row[2]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[1])
        own = to_num(row[3]); silo = to_num(row[4]); tot_own = to_num(row[5])
        st_g = to_num(row[6]); cwc = to_num(row[7]); swc = to_num(row[8]); peg = to_num(row[9]); pws = to_num(row[10]); h_silo = to_num(row[11])
        cursor.execute("""
            INSERT INTO monthly_avg_storage_capacity (zone, sl_no, state, month, fci_owned_lmt, silo_lmt, total_owned_lmt, hired_state_govt_lmt, cwc_lmt, swc_lmt, peg_lmt, pws_lmt, hired_silo_lmt)
            VALUES (?, ?, ?, 'June 2026', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (curr_z11, sl, st, own, silo, tot_own, st_g, cwc, swc, peg, pws, h_silo))

    # 12. stock_paddy_coarsegrain
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_paddy_coarsegrain (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        as_on_date TEXT DEFAULT '30.06.2026',
        paddy_fci_lmt REAL, paddy_state_lmt REAL, paddy_total_lmt REAL,
        coarse_fci_lmt REAL, coarse_state_lmt REAL, coarse_total_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS stock_paddy_coarsegrain (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        as_on_date TEXT DEFAULT '30.06.2026',
        paddy_fci_lmt REAL, paddy_state_lmt REAL, paddy_total_lmt REAL,
        coarse_fci_lmt REAL, coarse_state_lmt REAL, coarse_total_lmt REAL
    );""")

    f12 = os.path.join(SOURCE_DIR, "StockPositionPaddyCG.xls")
    df12 = pd.read_excel(f12, header=None)
    for idx, row in df12.iterrows():
        if idx < 8: continue
        st_raw = str(row[2]).strip() if pd.notna(row[2]) else ""
        if not st_raw or "Total" in st_raw or "Zonal" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[0])
        p_fci = to_num(row[3]); p_st = to_num(row[4]); p_tot = to_num(row[6])
        c_fci = to_num(row[8]); c_st = to_num(row[9]); c_tot = to_num(row[10])
        cursor.execute("""
            INSERT INTO stock_paddy_coarsegrain (sl_no, state, as_on_date, paddy_fci_lmt, paddy_state_lmt, paddy_total_lmt, coarse_fci_lmt, coarse_state_lmt, coarse_total_lmt)
            VALUES (?, ?, '30.06.2026', ?, ?, ?, ?, ?, ?)
        """, (sl, st, p_fci, p_st, p_tot, c_fci, c_st, c_tot))

    # 13. msp_comparison
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS msp_comparison (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commodity TEXT NOT NULL,
        crop_year TEXT NOT NULL,
        marketing_year TEXT NOT NULL,
        msp_rs_qtl REAL NOT NULL,
        pct_increase REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS msp_comparison (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commodity TEXT NOT NULL,
        crop_year TEXT NOT NULL,
        marketing_year TEXT NOT NULL,
        msp_rs_qtl REAL NOT NULL,
        pct_increase REAL
    );""")

    f13 = os.path.join(SOURCE_DIR, "YearWiseComparisionOfMSPWRCG.xls")
    df13 = pd.read_excel(f13, header=None)
    curr_comm = "Wheat"
    for idx, row in df13.iterrows():
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "Wheat" in r0 or "गेहूँ" in r0: curr_comm = "Wheat"
        elif "Paddy" in r0 or "धान" in r0: curr_comm = "Paddy"
        elif "Coarse" in r0 or "मोटा अनाज" in r0 or "Jowar" in r0 or "Bajra" in r0: curr_comm = "Coarse Grains"

        if idx < 7: continue
        cy = str(row[0]).strip() if pd.notna(row[0]) else ""
        my = str(row[2]).strip() if pd.notna(row[2]) else ""
        if re.match(r'^\d{4}\-\d{2}', cy) and re.match(r'^\d{4}\-\d{2}', my):
            msp = to_num(row[3])
            pct = to_num(row[9]) if len(row) > 9 else 0.0
            if msp > 0:
                cursor.execute("""
                    INSERT INTO msp_comparison (commodity, crop_year, marketing_year, msp_rs_qtl, pct_increase)
                    VALUES (?, ?, ?, ?, ?)
                """, (curr_comm, cy, my, msp, pct))

    # 14. consumer_subsidy
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consumer_subsidy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_nfsa_rs_qtl REAL, wheat_other_rs_qtl REAL,
        rice_nfsa_rs_qtl REAL, rice_other_rs_qtl REAL,
        subsidy_dcp_crores REAL, subsidy_fci_crores REAL, total_subsidy_crores REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS consumer_subsidy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_nfsa_rs_qtl REAL, wheat_other_rs_qtl REAL,
        rice_nfsa_rs_qtl REAL, rice_other_rs_qtl REAL,
        subsidy_dcp_crores REAL, subsidy_fci_crores REAL, total_subsidy_crores REAL
    );""")

    f14 = os.path.join(SOURCE_DIR, "ConsumerSubsidyOnRW.xls")
    df14 = pd.read_excel(f14, header=None)
    for idx, row in df14.iterrows():
        if idx < 5: continue
        yr = str(row[0]).strip() if pd.notna(row[0]) else ""
        if re.match(r'^\d{4}\-\d{2}', yr):
            w_nfsa = to_num(row[1]); w_oth = to_num(row[2])
            r_nfsa = to_num(row[3]); r_oth = to_num(row[4])
            dcp = to_num(row[5]); fci = to_num(row[6]); tot = to_num(row[7])
            cursor.execute("""
                INSERT INTO consumer_subsidy (year, wheat_nfsa_rs_qtl, wheat_other_rs_qtl, rice_nfsa_rs_qtl, rice_other_rs_qtl, subsidy_dcp_crores, subsidy_fci_crores, total_subsidy_crores)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (yr, w_nfsa, w_oth, r_nfsa, r_oth, dcp, fci, tot))

    # 15. food_subsidy_fci_state
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_subsidy_fci_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_or_state TEXT NOT NULL,
        year TEXT NOT NULL,
        amount_crores REAL NOT NULL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS food_subsidy_fci_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_or_state TEXT NOT NULL,
        year TEXT NOT NULL,
        amount_crores REAL NOT NULL
    );""")

    f15 = os.path.join(SOURCE_DIR, "FoodSubsidyToFCIStateGovt_Portrait.xls")
    df15 = pd.read_excel(f15, header=None)
    subsidy_years = ["2026-27", "2025-26", "2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20"]
    for idx, row in df15.iterrows():
        if idx < 4: continue
        cat_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
        if not cat_raw or "Total" in cat_raw: continue
        cat = clean_state(cat_raw)
        for i, yr in enumerate(subsidy_years, start=1):
            amt = to_num(row[i])
            cursor.execute("""
                INSERT INTO food_subsidy_fci_state (category_or_state, year, amount_crores)
                VALUES (?, ?, ?)
            """, (cat, yr, amt))

    # 16. procurement_incidentals
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS procurement_incidentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        rice_msp_qtl REAL, wheat_msp_qtl REAL,
        rice_incidental_qtl REAL, wheat_incidental_qtl REAL,
        rice_distribution_qtl REAL, wheat_distribution_qtl REAL,
        rice_economic_cost_qtl REAL, wheat_economic_cost_qtl REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS procurement_incidentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        rice_msp_qtl REAL, wheat_msp_qtl REAL,
        rice_incidental_qtl REAL, wheat_incidental_qtl REAL,
        rice_distribution_qtl REAL, wheat_distribution_qtl REAL,
        rice_economic_cost_qtl REAL, wheat_economic_cost_qtl REAL
    );""")

    f16 = os.path.join(SOURCE_DIR, "ProcurementIncidentals.xls")
    df16 = pd.read_excel(f16, header=None)
    for idx, row in df16.iterrows():
        if idx < 6: continue
        yr = str(row[0]).strip() if pd.notna(row[0]) else ""
        if re.match(r'^\d{4}\-\d{2}', yr):
            rm = to_num(row[1]); wm = to_num(row[2])
            ri = to_num(row[3]); wi = to_num(row[4])
            rd = to_num(row[5]); wd = to_num(row[6])
            re_cost = to_num(row[7]); we_cost = to_num(row[8])
            cursor.execute("""
                INSERT INTO procurement_incidentals (year, rice_msp_qtl, wheat_msp_qtl, rice_incidental_qtl, wheat_incidental_qtl, rice_distribution_qtl, wheat_distribution_qtl, rice_economic_cost_qtl, wheat_economic_cost_qtl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (yr, rm, wm, ri, wi, rd, wd, re_cost, we_cost))

    # 17. portability_transactions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portability_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        interstate_txns INTEGER, interstate_distrib_mt REAL,
        intrastate_txns INTEGER, intrastate_distrib_mt REAL,
        total_aadhaar_txns INTEGER, ytd_cumulative_portability_counts INTEGER
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS portability_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        month TEXT DEFAULT 'June 2026',
        interstate_txns INTEGER, interstate_distrib_mt REAL,
        intrastate_txns INTEGER, intrastate_distrib_mt REAL,
        total_aadhaar_txns INTEGER, ytd_cumulative_portability_counts INTEGER
    );""")

    f17 = os.path.join(SOURCE_DIR, "PortabilityTransactionDistribution.xls")
    df17 = pd.read_excel(f17, header=None)
    for idx, row in df17.iterrows():
        if idx < 6: continue
        st_raw = str(row[2]).strip() if pd.notna(row[2]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[1])
        inter_t = int(to_num(row[3])); inter_d = to_num(row[4])
        intra_t = int(to_num(row[5])); intra_d = to_num(row[6])
        tot_a = int(to_num(row[7])); ytd = int(to_num(row[8]))
        cursor.execute("""
            INSERT INTO portability_transactions (sl_no, state, month, interstate_txns, interstate_distrib_mt, intrastate_txns, intrastate_distrib_mt, total_aadhaar_txns, ytd_cumulative_portability_counts)
            VALUES (?, ?, 'June 2026', ?, ?, ?, ?, ?, ?)
        """, (sl, st, inter_t, inter_d, intra_t, intra_d, tot_a, ytd))

    # 18. fair_price_shops
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fair_price_shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        total_fps_count INTEGER NOT NULL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS fair_price_shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no INTEGER,
        state TEXT NOT NULL,
        total_fps_count INTEGER NOT NULL
    );""")

    f18 = os.path.join(SOURCE_DIR, "StatementStateWiseTotalFPS.xls")
    df18 = pd.read_excel(f18, header=None)
    for idx, row in df18.iterrows():
        if idx < 3: continue
        st_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not st_raw or "Total" in st_raw or "योग" in st_raw: continue
        st = clean_state(st_raw)
        sl = to_num(row[0]); fps = int(to_num(row[2]))
        cursor.execute("""
            INSERT INTO fair_price_shops (sl_no, state, total_fps_count)
            VALUES (?, ?, ?)
        """, (sl, st, fps))

    # 19. omss_domestic
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS omss_domestic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_lmt REAL,
        rice_lmt REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS omss_domestic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_lmt REAL,
        rice_lmt REAL
    );""")

    f19 = os.path.join(SOURCE_DIR, "OMSSDomestic.xls")
    df19 = pd.read_excel(f19, header=None)
    for idx, row in df19.iterrows():
        if idx < 5: continue
        yr = str(row[0]).strip() if pd.notna(row[0]) else ""
        if re.match(r'^\d{4}\-\d{2}', yr):
            w = to_num(row[1]) / 100000.0
            r = to_num(row[2]) / 100000.0
            cursor.execute("""
                INSERT INTO omss_domestic (year, wheat_lmt, rice_lmt)
                VALUES (?, ?, ?)
            """, (yr, round(w, 2), round(r, 2)))

    # 20. export_import
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS export_import (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_lakh_tons REAL,
        rice_lakh_tons REAL,
        total_lakh_tons REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS export_import (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        wheat_lakh_tons REAL,
        rice_lakh_tons REAL,
        total_lakh_tons REAL
    );""")

    f20 = os.path.join(SOURCE_DIR, "ExportImportFoodgrains (1).xls")
    df20 = pd.read_excel(f20, header=None)
    for idx, row in df20.iterrows():
        if idx < 5: continue
        yr = str(row[0]).strip() if pd.notna(row[0]) else ""
        if re.match(r'^\d{4}\-\d{2}', yr):
            w = to_num(row[1]); r = to_num(row[2]); tot = to_num(row[3])
            cursor.execute("""
                INSERT INTO export_import (year, wheat_lakh_tons, rice_lakh_tons, total_lakh_tons)
                VALUES (?, ?, ?, ?)
            """, (yr, w, r, tot))

    # 21. export_prices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS export_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variety TEXT NOT NULL,
        country TEXT,
        port TEXT,
        month_year TEXT NOT NULL,
        price_range_usd TEXT,
        price_min_usd REAL,
        price_max_usd REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS export_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variety TEXT NOT NULL,
        country TEXT,
        port TEXT,
        month_year TEXT NOT NULL,
        price_range_usd TEXT,
        price_min_usd REAL,
        price_max_usd REAL
    );""")

    f21 = os.path.join(SOURCE_DIR, "ExportPrices.xls")
    df21 = pd.read_excel(f21, header=None)
    months21 = ["December 2025", "January 2026", "February 2026", "March 2026", "April 2026", "May 2026", "June 2026"]
    for idx, row in df21.iterrows():
        if idx < 3: continue
        var = str(row[0]).strip() if pd.notna(row[0]) else ""
        if not var or "-" not in var: continue
        cntry = str(row[1]).strip() if pd.notna(row[1]) else ""
        port = str(row[2]).strip() if pd.notna(row[2]) else ""
        for i, m_yr in enumerate(months21, start=3):
            rng = str(row[i]).strip() if i < len(row) and pd.notna(row[i]) else ""
            if rng and rng != "-":
                parts = rng.split("-")
                pmin = to_num(parts[0]) if len(parts) > 0 else 0.0
                pmax = to_num(parts[1]) if len(parts) > 1 else pmin
                cursor.execute("""
                    INSERT INTO export_prices (variety, country, port, month_year, price_range_usd, price_min_usd, price_max_usd)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (var, cntry, port, m_yr, rng, pmin, pmax))

    # 22. sugar_production
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sugar_production (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        month TEXT NOT NULL,
        production_lakh_tons REAL NOT NULL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS sugar_production (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        month TEXT NOT NULL,
        production_lakh_tons REAL NOT NULL
    );""")

    f22 = os.path.join(SOURCE_DIR, "MonthWiseProductionOfSugar.xls")
    df22 = pd.read_excel(f22, header=None)
    sugar_months = ["October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August"]
    for idx, row in df22.iterrows():
        if idx < 6: continue
        yr = str(row[0]).strip() if pd.notna(row[0]) else ""
        if re.match(r'^\d{4}\-\d{2}', yr):
            for i, mth in enumerate(sugar_months, start=1):
                prod = to_num(row[i])
                cursor.execute("""
                    INSERT INTO sugar_production (year, month, production_lakh_tons)
                    VALUES (?, ?, ?)
                """, (yr, mth, prod))

    # 23. festivals_calamity_allocation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS festivals_calamity_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        state TEXT NOT NULL,
        rice_kt REAL, wheat_kt REAL, total_kt REAL,
        issue_price_cip TEXT, date_of_issue TEXT, remarks TEXT
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS festivals_calamity_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT NOT NULL,
        state TEXT NOT NULL,
        rice_kt REAL, wheat_kt REAL, total_kt REAL,
        issue_price_cip TEXT, date_of_issue TEXT, remarks TEXT
    );""")

    f23 = os.path.join(SOURCE_DIR, "FestivalsCalamityAllocation.xls")
    df23 = pd.read_excel(f23, header=None)
    curr_yr23 = "2025-26"
    for idx, row in df23.iterrows():
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "2025-26" in r0: curr_yr23 = "2025-26"
        elif "2026-27" in r0: curr_yr23 = "2026-27"
        if idx < 5: continue
        st_raw = r0
        if not st_raw or "Total" in st_raw or "योग" in st_raw or "State" in st_raw: continue
        st = clean_state(st_raw)
        r_kt = to_num(row[1]); w_kt = to_num(row[2]); tot_kt = to_num(row[3])
        cip = str(row[4]).strip() if pd.notna(row[4]) else ""
        dt = str(row[5]).strip() if pd.notna(row[5]) else ""
        rem = str(row[6]).strip() if pd.notna(row[6]) else ""
        if tot_kt > 0 or st:
            cursor.execute("""
                INSERT INTO festivals_calamity_allocation (year, state, rice_kt, wheat_kt, total_kt, issue_price_cip, date_of_issue, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (curr_yr23, st, r_kt, w_kt, tot_kt, cip, dt, rem))

    # 24. central_issue_price
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS central_issue_price (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        scheme TEXT NOT NULL,
        rice_normal_rs_qtl REAL,
        rice_grade_a_rs_qtl REAL,
        wheat_rs_qtl REAL,
        nutri_cereals_rs_qtl REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS central_issue_price (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        scheme TEXT NOT NULL,
        rice_normal_rs_qtl REAL,
        rice_grade_a_rs_qtl REAL,
        wheat_rs_qtl REAL,
        nutri_cereals_rs_qtl REAL
    );""")

    f24 = os.path.join(SOURCE_DIR, "CentralIssuePriceRWCG.xls")
    df24 = pd.read_excel(f24, header=None)
    curr_pd = ""
    for idx, row in df24.iterrows():
        if idx < 6: continue
        p_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
        if p_raw and ("to" in p_raw or "से" in p_raw or "Onwards" in p_raw or "दिनांक" in p_raw):
            curr_pd = p_raw
        sch = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not sch: continue
        rn = to_num(row[2]); rga = to_num(row[3]); w = to_num(row[4]); nc = to_num(row[5])
        cursor.execute("""
            INSERT INTO central_issue_price (period, scheme, rice_normal_rs_qtl, rice_grade_a_rs_qtl, wheat_rs_qtl, nutri_cereals_rs_qtl)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (curr_pd or "Current", sch, rn, rga, w, nc))

    # 25. comparative_allocation_offtake
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comparative_allocation_offtake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme TEXT NOT NULL,
        commodity TEXT NOT NULL,
        year TEXT NOT NULL,
        allocation_lakh_tons REAL,
        offtake_lakh_tons REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS comparative_allocation_offtake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme TEXT NOT NULL,
        commodity TEXT NOT NULL,
        year TEXT NOT NULL,
        allocation_lakh_tons REAL,
        offtake_lakh_tons REAL
    );""")

    f25 = os.path.join(SOURCE_DIR, "ComparativeAllocationOfftake.xls")
    df25 = pd.read_excel(f25, header=None)
    comp_years = ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]
    curr_sch = "TPDS/NFSA"
    for idx, row in df25.iterrows():
        if idx < 6: continue
        sch_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
        if sch_raw: curr_sch = sch_raw
        comm = str(row[2]).strip() if pd.notna(row[2]) else ""
        if not comm: continue
        for i, yr in enumerate(comp_years):
            al_col = 3 + i * 2
            off_col = al_col + 1
            if off_col < len(row):
                al = to_num(row[al_col]); off = to_num(row[off_col])
                cursor.execute("""
                    INSERT INTO comparative_allocation_offtake (scheme, commodity, year, allocation_lakh_tons, offtake_lakh_tons)
                    VALUES (?, ?, ?, ?, ?)
                """, (curr_sch, comm, yr, al, off))

    # 26. annual_allocation_summary
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS annual_allocation_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_group TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        rice_lakh_tons REAL, wheat_lakh_tons REAL, nutri_cereals_lakh_tons REAL, total_lakh_tons REAL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS annual_allocation_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_group TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        year TEXT DEFAULT '2026-27',
        rice_lakh_tons REAL, wheat_lakh_tons REAL, nutri_cereals_lakh_tons REAL, total_lakh_tons REAL
    );""")

    f26 = os.path.join(SOURCE_DIR, "AnnualAllocationOfFoodgrains.xls")
    df26 = pd.read_excel(f26, header=None)
    curr_grp = "TPDS/NFSA"
    for idx, row in df26.iterrows():
        if idx < 5: continue
        r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if "TPDS" in r0 or "NFSA" in r0: curr_grp = "TPDS/NFSA"
        elif "WELFARE" in r0 or "OTHER" in r0: curr_grp = "OTHER WELFARE SCHEMES"

        s_name = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not s_name: continue
        r = to_num(row[2]); w = to_num(row[4]); nc = to_num(row[5]); tot = to_num(row[6])
        cursor.execute("""
            INSERT INTO annual_allocation_summary (scheme_group, scheme_name, year, rice_lakh_tons, wheat_lakh_tons, nutri_cereals_lakh_tons, total_lakh_tons)
            VALUES (?, ?, '2026-27', ?, ?, ?, ?)
        """, (curr_grp, s_name, r, w, nc, tot))

    # 27. salient_features
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS salient_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_number INTEGER,
        topic TEXT NOT NULL,
        text_hi TEXT,
        text_en TEXT
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS salient_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_number INTEGER,
        topic TEXT NOT NULL,
        text_hi TEXT,
        text_en TEXT
    );""")

    f27 = os.path.join(SOURCE_DIR, "SalientFeatures.xls")
    df27 = pd.read_excel(f27, header=None)
    for idx, row in df27.iterrows():
        if idx < 2: continue
        txt = str(row[0]).strip() if pd.notna(row[0]) else ""
        if txt and len(txt) > 20:
            feat_num = 1 if "Procurement" in txt or "अधिप्राप्ति" in txt else (2 if "Stock" in txt or "स्टॉक" in txt else 3)
            topic = "Procurement" if feat_num == 1 else ("Stock" if feat_num == 2 else "Offtake")
            if re.search(r'[\u0900-\u097F]', txt):
                cursor.execute("INSERT INTO salient_features (feature_number, topic, text_hi) VALUES (?, ?, ?)", (feat_num, topic, txt))
            else:
                cursor.execute("INSERT INTO salient_features (feature_number, topic, text_en) VALUES (?, ?, ?)", (feat_num, topic, txt))

    # 28. geo_data
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS geo_data (
        id TEXT PRIMARY KEY,
        content_json TEXT NOT NULL
    );
    """)
    ddl_statements.append("""CREATE TABLE IF NOT EXISTS geo_data (
        id TEXT PRIMARY KEY,
        content_json TEXT NOT NULL
    );""")

    geo_path = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\frontend\src\constants\india-states.json"
    if os.path.exists(geo_path):
        with open(geo_path, "r", encoding="utf-8") as gf:
            cursor.execute("INSERT INTO geo_data (id, content_json) VALUES ('india-states', ?)", (gf.read(),))

    # Add indices for fast query performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prod_crop_season ON production_foodgrains(crop, season, year);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_nfsa_state ON nfsa_coverage(state);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_state ON central_pool_stocks(state);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_proc_state_yr ON statewise_procurement(state, year);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alloc_state ON annual_nfsa_allocation(state);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_offtake_state ON offtake_distribution(state, period_type);")

    conn.commit()

    # Dump schema.sql
    with open(SCHEMA_PATH, "w", encoding="utf-8") as sf:
        sf.write("PRAGMA foreign_keys = ON;\n\n")
        for stmt in ddl_statements:
            sf.write(stmt + "\n\n")
        sf.write("CREATE INDEX IF NOT EXISTS idx_prod_crop_season ON production_foodgrains(crop, season, year);\n")
        sf.write("CREATE INDEX IF NOT EXISTS idx_nfsa_state ON nfsa_coverage(state);\n")
        sf.write("CREATE INDEX IF NOT EXISTS idx_stocks_state ON central_pool_stocks(state);\n")
        sf.write("CREATE INDEX IF NOT EXISTS idx_proc_state_yr ON statewise_procurement(state, year);\n")

    print("Database built successfully at:", DB_PATH)
    conn.close()

if __name__ == "__main__":
    build_database()
