import os
import sys
import glob
import re
import sqlite3
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(BASE_DIR, "source-data")
DB_PATH = os.path.join(BASE_DIR, "database", "food_pds.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "database", "schema.sql")

CANONICAL_STATES = {
    'andhra pradesh': 'Andhra Pradesh', 'arunachal pradesh': 'Arunachal Pradesh',
    'assam': 'Assam', 'bihar': 'Bihar', 'chhattisgarh': 'Chhattisgarh',
    'goa': 'Goa', 'gujarat': 'Gujarat', 'haryana': 'Haryana',
    'himachal pradesh': 'Himachal Pradesh', 'jharkhand': 'Jharkhand',
    'karnataka': 'Karnataka', 'kerala': 'Kerala', 'madhya pradesh': 'Madhya Pradesh',
    'maharashtra': 'Maharashtra', 'manipur': 'Manipur', 'meghalaya': 'Meghalaya',
    'mizoram': 'Mizoram', 'nagaland': 'Nagaland', 'odisha': 'Odisha',
    'punjab': 'Punjab', 'rajasthan': 'Rajasthan', 'sikkim': 'Sikkim',
    'tamil nadu': 'Tamil Nadu', 'telangana': 'Telangana', 'tripura': 'Tripura',
    'uttar pradesh': 'Uttar Pradesh', 'uttarakhand': 'Uttarakhand', 'west bengal': 'West Bengal',
    'andaman & nicobar islands': 'Andaman & Nicobar Islands', 'chandigarh': 'Chandigarh',
    'dadra & nagar haveli and daman & diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'delhi': 'Delhi', 'jammu & kashmir': 'Jammu & Kashmir', 'ladakh': 'Ladakh',
    'lakshadweep': 'Lakshadweep', 'puducherry': 'Puducherry'
}

ALIAS_MAP = {
    'andhra pra': 'Andhra Pradesh', 'andhra pr': 'Andhra Pradesh',
    'arunachal pra': 'Arunachal Pradesh', 'arunachal pr': 'Arunachal Pradesh',
    'arunachal pr.': 'Arunachal Pradesh', 'chhatisgarh': 'Chhattisgarh',
    'chattisgarh': 'Chhattisgarh', 'orissa': 'Odisha',
    'keralam': 'Kerala', 'kerela': 'Kerala', 'karnatka': 'Karnataka',
    'gujrat': 'Gujarat', 'rajashthan': 'Rajasthan',
    'tamilnadu': 'Tamil Nadu', 'telengana': 'Telangana', 'telangna': 'Telangana',
    'uttrakhand': 'Uttarakhand', 'uttarkhand': 'Uttarakhand',
    'uttarpradesh': 'Uttar Pradesh', 'uttar pr': 'Uttar Pradesh', 'uttar pra': 'Uttar Pradesh',
    'madhya pr': 'Madhya Pradesh', 'madhya pra': 'Madhya Pradesh',
    'up': 'Uttar Pradesh', 'mp': 'Madhya Pradesh',
    'h.p.': 'Himachal Pradesh', 'h.p': 'Himachal Pradesh', 'himachal pr': 'Himachal Pradesh',
    'himachal pr.': 'Himachal Pradesh', 'j&k': 'Jammu & Kashmir',
    'jammu and kashmir': 'Jammu & Kashmir', 'ladak': 'Ladakh',
    'a & n island': 'Andaman & Nicobar Islands', 'a&n island': 'Andaman & Nicobar Islands',
    'a&n islands': 'Andaman & Nicobar Islands', 'andaman and nicobar island': 'Andaman & Nicobar Islands',
    'andaman and nicobar islands': 'Andaman & Nicobar Islands',
    'andaman & nicobar': 'Andaman & Nicobar Islands', 'andeman & nico': 'Andaman & Nicobar Islands',
    'andaman and nicobar': 'Andaman & Nicobar Islands',
    'dadra and nagar haveli and daman and diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'dadra & nagar haveli': 'Dadra & Nagar Haveli and Daman & Diu',
    'daman & diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'daman and diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'd&n haveli and daman': 'Dadra & Nagar Haveli and Daman & Diu',
    'd&n h and daman & diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'dadar & nagar haveli & daman & diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'dadar & nagar': 'Dadra & Nagar Haveli and Daman & Diu',
    'pondicherry': 'Puducherry', 'pudducherry': 'Puducherry',
    'nct of delhi': 'Delhi'
}

def resolve_state(val):
    if val is None or pd.isna(val):
        return ""
    s = str(val).lower().strip()
    if re.match(r'^-?\d+(\.\d+)?$', s):
        return ""
    if any(w in s for w in ['total', 'zonal', 'all india', 'region', 'zone', 'sl no', 'sl.no', 's.no', 'summary', 'grand', 'target', 'foodgrains', 'figure', 'mandies', 'transit', 'wheat', 'rice', 'paddy', 'coarse', 'quantity in', 'in lakh tons', 'fig.in', 'source', 'part -', 'dbt', 'nef', 'nfsa for', 'offtake source']):
        return ""
    clean_s = re.sub(r'[^a-z0-9\s\&]', ' ', s)
    clean_s = ' '.join(clean_s.split())
    if clean_s in ['ut', 'uts', 'u t', 'u ts', 'states uts', 'state']:
        return ""
    if clean_s in CANONICAL_STATES:
        return CANONICAL_STATES[clean_s]
    if clean_s in ALIAS_MAP:
        return ALIAS_MAP[clean_s]
    for k, v in ALIAS_MAP.items():
        if f" {k} " in f" {clean_s} ":
            return v
    for k, v in CANONICAL_STATES.items():
        if f" {k} " in f" {clean_s} ":
            return v
    return ""

clean_state = resolve_state

def to_num(val):
    if pd.isna(val) or val is None:
        return 0.0
    s = str(val).strip().replace(',', '')
    if s in ['', '-', '*', '#', '$', 'N.A.', 'NA', 'None', 'nan']:
        return 0.0
    try:
        return float(s)
    except:
        return 0.0

def load_dataframe(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.xls':
        return pd.read_excel(file_path, header=None, engine='xlrd')
    elif ext == '.xlsx':
        return pd.read_excel(file_path, header=None, engine='openpyxl')
    else:
        raise ValueError(f"Unsupported extension {ext}")

def find_file_by_keywords(folder, keywords):
    files = glob.glob(os.path.join(folder, "*"))
    for f in files:
        fname = os.path.basename(f).lower()
        if all(kw.lower() in fname for kw in keywords):
            return f
    return None

def process_month_folder(conn, month_folder, month_name):
    cursor = conn.cursor()
    print(f"--> Processing month dataset: '{month_name}' from folder: {month_folder}")

    tables_to_clean = [
        "production_foodgrains", "nfsa_coverage", "central_pool_stocks",
        "monthwise_stocks_norm", "statewise_procurement", "annual_nfsa_allocation",
        "offtake_distribution", "welfare_institutions_allocation", "other_welfare_schemes_offtake",
        "storage_capacity", "monthly_avg_storage_capacity", "stock_paddy_coarsegrain",
        "msp_comparison", "consumer_subsidy", "food_subsidy_fci_state",
        "procurement_incidentals", "portability_transactions", "fair_price_shops",
        "omss_domestic", "export_import", "export_prices", "sugar_production",
        "festivals_calamity_allocation", "central_issue_price", "comparative_allocation_offtake",
        "annual_allocation_summary", "salient_features"
    ]

    for tbl in tables_to_clean:
        cursor.execute(f"DELETE FROM {tbl} WHERE data_month = ?", (month_name,))

    # 1. production_foodgrains
    f1 = find_file_by_keywords(month_folder, ["production"]) or find_file_by_keywords(month_folder, ["table02"])
    if f1:
        try:
            df = load_dataframe(f1)
            years1 = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
            current_crop = "Rice"
            for idx, row in df.iterrows():
                if idx < 4: continue
                r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
                if "अनाज" in r0 or "Grains" in r0 or "चावल" in r0 or "Rice" in r0: current_crop = "Rice"
                elif "गेहूँ" in r0 or "Wheat" in r0: current_crop = "Wheat"
                elif "मोटा अनाज" in r0 or "Coarse Grains" in r0 or "Nutri" in r0: current_crop = "Coarse Grains"
                elif "दलहन" in r0 or "Pulses" in r0: current_crop = "Pulses"
                elif "कुल खाद्यान्न" in r0 or "Total Foodgrains" in r0: current_crop = "Total Foodgrains"
                
                season = ""
                if "खरीफ" in r0 or "Kharif" in r0: season = "Kharif"
                elif "रबी" in r0 or "Rabi" in r0: season = "Rabi"
                elif "जायद" in r0 or "Summer" in r0: season = "Summer"
                elif "कुल" in r0 or "Total" in r0: season = "Total"

                if season:
                    for col_idx, yr in enumerate(years1, start=1):
                        if col_idx < len(row):
                            val = to_num(row[col_idx])
                            cursor.execute(
                                "INSERT INTO production_foodgrains (crop, season, year, production_mt, data_month) VALUES (?, ?, ?, ?, ?)",
                                (current_crop, season, yr, val, month_name)
                            )
        except Exception as e:
            print(f"Error in production_foodgrains for {month_name}: {e}")

    # 2. nfsa_coverage
    f2 = find_file_by_keywords(month_folder, ["nfsacoverage"]) or find_file_by_keywords(month_folder, ["table20"])
    if f2:
        try:
            df = load_dataframe(f2)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1])
                if not st and len(row) > 0:
                    st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[0]) if re.match(r'^\d+$', str(row[0]).strip()) else 0
                impl = str(row[2]).strip() if len(row) > 2 and pd.notna(row[2]) else ""
                pop = to_num(row[3]) if len(row) > 3 else 0
                r_pct = to_num(row[4]) if len(row) > 4 else 0
                u_pct = to_num(row[5]) if len(row) > 5 else 0
                t_pct = to_num(row[6]) if len(row) > 6 else 0
                r_acc = to_num(row[7]) if len(row) > 7 else 0
                u_acc = to_num(row[8]) if len(row) > 8 else 0
                t_acc = to_num(row[9]) if len(row) > 9 else 0
                alloc = to_num(row[10]) if len(row) > 10 else 0
                aay = to_num(row[11]) if len(row) > 11 else 0.0
                cursor.execute("""
                    INSERT INTO nfsa_coverage (sl_no, state, impl_month, population_lakh, coverage_rural_pct, coverage_urban_pct, coverage_total_pct, accepted_rural_lakh, accepted_urban_lakh, accepted_total_lakh, foodgrains_allocation_lmt, aay_families_lakh, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sl, st, impl, pop, r_pct, u_pct, t_pct, r_acc, u_acc, t_acc, alloc, aay, month_name))
        except Exception as e:
            print(f"Error in nfsa_coverage for {month_name}: {e}")

    # 3. central_pool_stocks
    f3 = find_file_by_keywords(month_folder, ["totalstockincentralpool"]) or find_file_by_keywords(month_folder, ["table11"])
    if f3:
        try:
            df = load_dataframe(f3)
            curr_region = "All India"
            for idx, row in df.iterrows():
                st = ""
                st_col = -1
                for c in range(min(4, len(row))):
                    cand = resolve_state(row[c])
                    if cand:
                        st = cand
                        st_col = c
                        break
                if not st:
                    continue

                num_vals = []
                for val in row[st_col + 1:]:
                    if pd.notna(val) and str(val).strip() not in ['', '-', '*', '#', '$', 'N.A.', 'NA', 'None', 'nan']:
                        num_vals.append(to_num(val))

                if len(num_vals) >= 9:
                    fci_r, fci_w, fci_t, st_r, st_w, st_t, tot_r, tot_w, tot_s = num_vals[:9]
                elif len(num_vals) >= 6:
                    fci_r, fci_w, fci_t, st_r, st_w, st_t = num_vals[:6]
                    tot_r = round(fci_r + st_r, 2)
                    tot_w = round(fci_w + st_w, 2)
                    tot_s = round(fci_t + st_t, 2)
                else:
                    continue

                cursor.execute("""
                    INSERT INTO central_pool_stocks (sl_no, region, state, fci_rice_lmt, fci_wheat_lmt, fci_total_lmt, state_rice_lmt, state_wheat_lmt, state_total_lmt, total_rice_lmt, total_wheat_lmt, total_stock_lmt, as_on_date, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (idx, curr_region, st, fci_r, fci_w, fci_t, st_r, st_w, st_t, tot_r, tot_w, tot_s, f"01.{month_name}.2026", month_name))
        except Exception as e:
            print(f"Error in central_pool_stocks for {month_name}: {e}")

    # 4. monthwise_stocks_norm
    f4 = find_file_by_keywords(month_folder, ["monthwise_stocks"]) or find_file_by_keywords(month_folder, ["monthwise", "stocks"]) or find_file_by_keywords(month_folder, ["table10"]) or find_file_by_keywords(month_folder, ["monthwise"])
    if f4:
        try:
            df = load_dataframe(f4)
            for idx, row in df.iterrows():
                if idx < 1: continue
                dt = str(row[0]).strip() if pd.notna(row[0]) else ""
                if not dt or not re.search(r'\d{2}\.\d{2}\.\d{4}', dt): continue
                num_vals = [to_num(val) for val in row[1:] if pd.notna(val) and str(val).strip() not in ['', '-', '*', '#', '$', 'N.A.', 'NA', 'None', 'nan']]
                if len(num_vals) < 4: continue
                w_act = num_vals[0] if len(num_vals) > 0 else 0.0
                w_norm = num_vals[1] if len(num_vals) > 1 else 0.0
                r_act = num_vals[2] if len(num_vals) > 2 else 0.0
                r_norm = num_vals[3] if len(num_vals) > 3 else 0.0
                t_act = num_vals[4] if len(num_vals) > 4 else 0.0
                t_norm = num_vals[5] if len(num_vals) > 5 else 0.0
                c_act = num_vals[6] if len(num_vals) > 6 else 0.0
                if t_act == 0.0 and (w_act > 0 or r_act > 0):
                    t_act = round(w_act + r_act, 2)
                cursor.execute("""
                    INSERT INTO monthwise_stocks_norm (as_on_date, wheat_actual_lmt, wheat_norm_lmt, rice_actual_lmt, rice_norm_lmt, total_actual_lmt, total_norm_lmt, coarse_actual_lmt, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (dt, w_act, w_norm, r_act, r_norm, t_act, t_norm, c_act, month_name))
        except Exception as e:
            print(f"Error in monthwise_stocks_norm for {month_name}: {e}")

    # 5. statewise_procurement
    f5 = find_file_by_keywords(month_folder, ["statewiseprocurement"]) or find_file_by_keywords(month_folder, ["table08"])
    if f5:
        try:
            df = load_dataframe(f5)
            proc_years = ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]
            is_shifted = False
            for r_chk in range(min(6, len(df))):
                if len(df.iloc[r_chk]) > 1 and pd.isna(df.iloc[r_chk, 1]):
                    is_shifted = True
                    break
            start_c = 2 if is_shifted else 1

            for idx, row in df.iterrows():
                if idx < 1: continue
                st = resolve_state(row[0])
                if not st and len(row) > 1:
                    st = resolve_state(row[1])
                if not st: continue
                for i, yr in enumerate(proc_years):
                    base_c = start_c + i * 3
                    if yr == "2026-27" and base_c >= len(row):
                        if len(row) > 13:
                            w = to_num(row[13])
                            cursor.execute("""
                                INSERT INTO statewise_procurement (state, year, rice_lmt, wheat_lmt, coarse_lmt, total_lmt, data_month)
                                VALUES (?, ?, 0.0, ?, 0.0, ?, ?)
                            """, (st, yr, w, w, month_name))
                        continue

                    if base_c < len(row):
                        r = to_num(row[base_c])
                        w = to_num(row[base_c + 1]) if base_c + 1 < len(row) else 0.0
                        c = to_num(row[base_c + 2]) if base_c + 2 < len(row) else 0.0
                        tot = round(r + w + c, 2)
                        cursor.execute("""
                            INSERT INTO statewise_procurement (state, year, rice_lmt, wheat_lmt, coarse_lmt, total_lmt, data_month)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (st, yr, r, w, c, tot, month_name))
        except Exception as e:
            print(f"Error in statewise_procurement for {month_name}: {e}")

    # 6. annual_nfsa_allocation
    f6 = find_file_by_keywords(month_folder, ["annualallocationunder"]) or find_file_by_keywords(month_folder, ["table18_allocation"])
    if f6:
        try:
            df = load_dataframe(f6)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[0])
                aay = to_num(row[2]) if len(row)>2 else 0
                phh = to_num(row[3]) if len(row)>3 else 0
                tide = to_num(row[4]) if len(row)>4 else 0.0
                tot = to_num(row[5]) if len(row)>5 else (aay+phh+tide)
                cursor.execute("""
                    INSERT INTO annual_nfsa_allocation (sl_no, state, year, aay_kt, phh_kt, tide_over_kt, total_kt, data_month)
                    VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?)
                """, (sl, st, aay, phh, tide, tot, month_name))
        except Exception as e:
            print(f"Error in annual_nfsa_allocation for {month_name}: {e}")

    # 7. offtake_distribution
    f7_month = find_file_by_keywords(month_folder, ["offtakedistributionformonth"]) or find_file_by_keywords(month_folder, ["table14"])
    f7_upto = find_file_by_keywords(month_folder, ["offtakedistributionuptomonth"]) or find_file_by_keywords(month_folder, ["table15"])
    
    for ptype, fpath in [("month", f7_month), ("upto_month", f7_upto)]:
        if fpath:
            try:
                df = load_dataframe(fpath)
                for idx, row in df.iterrows():
                    if idx < 1: continue
                    st = clean_state(row[1]) if len(row) > 1 else ""
                    if not st: st = clean_state(row[0])
                    if not st: continue
                    sl = to_num(row[0])
                    al_aay = to_num(row[2]) if len(row)>2 else 0; al_phh = to_num(row[3]) if len(row)>3 else 0; al_tide = to_num(row[4]) if len(row)>4 else 0; al_tot = to_num(row[5]) if len(row)>5 else (al_aay+al_phh+al_tide)
                    off_aay = to_num(row[6]) if len(row)>6 else 0; off_phh = to_num(row[7]) if len(row)>7 else 0; off_tide = to_num(row[8]) if len(row)>8 else 0; off_tot = to_num(row[9]) if len(row)>9 else (off_aay+off_phh+off_tide)
                    dis_aay = to_num(row[10]) if len(row)>10 else 0; dis_phh = to_num(row[11]) if len(row)>11 else 0; dis_tot = dis_aay + dis_phh
                    cursor.execute("""
                        INSERT INTO offtake_distribution (sl_no, state, period_type, month, alloc_aay_kt, alloc_phh_kt, alloc_tide_over_kt, alloc_total_kt, offtake_aay_kt, offtake_phh_kt, offtake_tide_over_kt, offtake_total_kt, distrib_aay_kt, distrib_phh_kt, distrib_total_kt, data_month)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (sl, st, ptype, f"{month_name} 2026", al_aay, al_phh, al_tide, al_tot, off_aay, off_phh, off_tide, off_tot, dis_aay, dis_phh, dis_tot, month_name))
            except Exception as e:
                print(f"Error in offtake_distribution ({ptype}) for {month_name}: {e}")

    # 8. welfare_institutions_allocation
    f8 = find_file_by_keywords(month_folder, ["welfareinstitutions"]) or find_file_by_keywords(month_folder, ["table21"])
    if f8:
        try:
            df = load_dataframe(f8)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[0])
                aw = to_num(row[2]) if len(row)>2 else 0; ar = to_num(row[3]) if len(row)>3 else 0; at = to_num(row[4]) if len(row)>4 else 0
                ow = to_num(row[5]) if len(row)>5 else 0; ord_r = to_num(row[6]) if len(row)>6 else 0; ot = to_num(row[7]) if len(row)>7 else (ow+ord_r)
                cursor.execute("""
                    INSERT INTO welfare_institutions_allocation (sl_no, state, year, alloc_wheat_kt, alloc_rice_kt, alloc_total_kt, offtake_wheat_kt, offtake_rice_kt, offtake_total_kt, data_month)
                    VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?, ?, ?)
                """, (sl, st, aw, ar, at, ow, ord_r, ot, month_name))
        except Exception as e:
            print(f"Error in welfare_institutions_allocation for {month_name}: {e}")

    # 9. other_welfare_schemes_offtake
    f9 = find_file_by_keywords(month_folder, ["owschemes"]) or find_file_by_keywords(month_folder, ["table22"])
    if f9:
        try:
            df = load_dataframe(f9)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[0])
                bv_w = to_num(row[2]) if len(row)>2 else 0; bv_r = to_num(row[3]) if len(row)>3 else 0; bv_t = to_num(row[4]) if len(row)>4 else 0
                p1_w = to_num(row[5]) if len(row)>5 else 0; p1_r = to_num(row[6]) if len(row)>6 else 0; p1_t = to_num(row[7]) if len(row)>7 else 0
                p2_w = to_num(row[8]) if len(row)>8 else 0; p2_r = to_num(row[9]) if len(row)>9 else 0; p2_t = to_num(row[10]) if len(row)>10 else 0
                wbnp = to_num(row[11]) if len(row)>11 else 0
                cursor.execute("""
                    INSERT INTO other_welfare_schemes_offtake (sl_no, state, year, bal_vatika_wheat_kt, bal_vatika_rice_kt, bal_vatika_total_kt, pm_poshan_primary_wheat_kt, pm_poshan_primary_rice_kt, pm_poshan_primary_total_kt, pm_poshan_upper_primary_wheat_kt, pm_poshan_upper_primary_rice_kt, pm_poshan_upper_primary_total_kt, wbnp_wheat_kt, data_month)
                    VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sl, st, bv_w, bv_r, bv_t, p1_w, p1_r, p1_t, p2_w, p2_r, p2_t, wbnp, month_name))
        except Exception as e:
            print(f"Error in other_welfare_schemes_offtake for {month_name}: {e}")

    # 10. storage_capacity
    f10 = find_file_by_keywords(month_folder, ["cpstorage"]) or find_file_by_keywords(month_folder, ["table24"])
    if f10:
        try:
            df = load_dataframe(f10)
            curr_z = "East"
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[3]) if len(row) > 3 else ""
                if not st: st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[2]) if len(row)>2 else 0
                oc = to_num(row[4]) if len(row)>4 else 0; hc = to_num(row[5]) if len(row)>5 else 0; ocap = to_num(row[6]) if len(row)>6 else 0; hcap = to_num(row[7]) if len(row)>7 else 0
                tcov = to_num(row[8]) if len(row)>8 else 0; tcap = to_num(row[9]) if len(row)>9 else 0; tot_fci = to_num(row[10]) if len(row)>10 else 0; st_ag = to_num(row[11]) if len(row)>11 else 0
                cursor.execute("""
                    INSERT INTO storage_capacity (zone, sl_no, state, fci_owned_covered_lmt, fci_hired_covered_lmt, fci_owned_cap_lmt, fci_hired_cap_lmt, fci_total_covered_lmt, fci_total_cap_lmt, fci_total_storage_lmt, state_agencies_storage_lmt, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (curr_z, sl, st, oc, hc, ocap, hcap, tcov, tcap, tot_fci, st_ag, month_name))
        except Exception as e:
            print(f"Error in storage_capacity for {month_name}: {e}")

    # 11. monthly_avg_storage_capacity
    f11 = find_file_by_keywords(month_folder, ["monthlyavgstorage"]) or find_file_by_keywords(month_folder, ["table25"])
    if f11:
        try:
            df = load_dataframe(f11)
            curr_z11 = "East"
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[2]) if len(row) > 2 else ""
                if not st: st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[1]) if len(row)>1 else 0
                own = to_num(row[3]) if len(row)>3 else 0; silo = to_num(row[4]) if len(row)>4 else 0; tot_own = to_num(row[5]) if len(row)>5 else 0
                st_g = to_num(row[6]) if len(row)>6 else 0; cwc = to_num(row[7]) if len(row)>7 else 0; swc = to_num(row[8]) if len(row)>8 else 0; peg = to_num(row[9]) if len(row)>9 else 0; pws = to_num(row[10]) if len(row)>10 else 0; h_silo = to_num(row[11]) if len(row)>11 else 0
                cursor.execute("""
                    INSERT INTO monthly_avg_storage_capacity (zone, sl_no, state, month, fci_owned_lmt, silo_lmt, total_owned_lmt, hired_state_govt_lmt, cwc_lmt, swc_lmt, peg_lmt, pws_lmt, hired_silo_lmt, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (curr_z11, sl, st, f"{month_name} 2026", own, silo, tot_own, st_g, cwc, swc, peg, pws, h_silo, month_name))
        except Exception as e:
            print(f"Error in monthly_avg_storage_capacity for {month_name}: {e}")

    # 12. stock_paddy_coarsegrain
    f12 = find_file_by_keywords(month_folder, ["stockpositionpaddy"]) or find_file_by_keywords(month_folder, ["table12"])
    if f12:
        try:
            df = load_dataframe(f12)
            for idx, row in df.iterrows():
                st = ""
                st_col = -1
                for c in range(min(4, len(row))):
                    cand = resolve_state(row[c])
                    if cand:
                        st = cand
                        st_col = c
                        break
                if not st: continue
                num_vals = [to_num(val) for val in row[st_col + 1:] if pd.notna(val) and str(val).strip() not in ['', '-', '*', '#', '$', 'N.A.', 'NA', 'None', 'nan']]
                p_fci = num_vals[0] if len(num_vals) > 0 else 0.0
                p_st = num_vals[1] if len(num_vals) > 1 else 0.0
                p_tot = num_vals[2] if len(num_vals) > 2 else round(p_fci + p_st, 2)
                c_fci = num_vals[3] if len(num_vals) > 3 else 0.0
                c_st = num_vals[4] if len(num_vals) > 4 else 0.0
                c_tot = num_vals[5] if len(num_vals) > 5 else round(c_fci + c_st, 2)
                cursor.execute("""
                    INSERT INTO stock_paddy_coarsegrain (sl_no, state, as_on_date, paddy_fci_lmt, paddy_state_lmt, paddy_total_lmt, coarse_fci_lmt, coarse_state_lmt, coarse_total_lmt, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (idx, st, f"01.{month_name}.2026", p_fci, p_st, p_tot, c_fci, c_st, c_tot, month_name))
        except Exception as e:
            print(f"Error in stock_paddy_coarsegrain for {month_name}: {e}")

    # 13. msp_comparison
    f13 = find_file_by_keywords(month_folder, ["msp"])
    if f13:
        try:
            df = load_dataframe(f13)
            curr_comm = "Wheat"
            for idx, row in df.iterrows():
                r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
                if "Wheat" in r0 or "गेहूँ" in r0: curr_comm = "Wheat"
                elif "Paddy" in r0 or "धान" in r0: curr_comm = "Paddy"
                elif "Coarse" in r0 or "मोटा अनाज" in r0 or "Jowar" in r0 or "Bajra" in r0: curr_comm = "Coarse Grains"

                if idx < 1: continue
                cy = str(row[0]).strip() if pd.notna(row[0]) else ""
                my = str(row[2]).strip() if len(row)>2 and pd.notna(row[2]) else ""
                if re.match(r'^\d{4}\-\d{2}', cy):
                    msp = to_num(row[3]) if len(row)>3 else 0.0
                    pct = to_num(row[4]) if len(row)>4 else 0.0
                    if msp > 0:
                        cursor.execute("""
                            INSERT INTO msp_comparison (commodity, crop_year, marketing_year, msp_rs_qtl, pct_increase, data_month)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (curr_comm, cy, my or cy, msp, pct, month_name))
        except Exception as e:
            print(f"Error in msp_comparison for {month_name}: {e}")

    # 14. consumer_subsidy
    f14 = find_file_by_keywords(month_folder, ["consumersubsidy"]) or find_file_by_keywords(month_folder, ["table36"])
    if f14:
        try:
            df = load_dataframe(f14)
            for idx, row in df.iterrows():
                if idx < 1: continue
                yr = str(row[0]).strip() if pd.notna(row[0]) else ""
                if re.match(r'^\d{4}\-\d{2}', yr):
                    w_nfsa = to_num(row[1]); w_oth = to_num(row[2])
                    r_nfsa = to_num(row[3]); r_oth = to_num(row[4])
                    dcp = to_num(row[5]) if len(row)>5 else 0; fci = to_num(row[6]) if len(row)>6 else 0; tot = to_num(row[7]) if len(row)>7 else (dcp+fci)
                    cursor.execute("""
                        INSERT INTO consumer_subsidy (year, wheat_nfsa_rs_qtl, wheat_other_rs_qtl, rice_nfsa_rs_qtl, rice_other_rs_qtl, subsidy_dcp_crores, subsidy_fci_crores, total_subsidy_crores, data_month)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (yr, w_nfsa, w_oth, r_nfsa, r_oth, dcp, fci, tot, month_name))
        except Exception as e:
            print(f"Error in consumer_subsidy for {month_name}: {e}")

    # 15. food_subsidy_fci_state
    f15 = find_file_by_keywords(month_folder, ["foodsubsidyto"]) or find_file_by_keywords(month_folder, ["table37"])
    if f15:
        try:
            df = load_dataframe(f15)
            subsidy_years = ["2026-27", "2025-26", "2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20"]
            for idx, row in df.iterrows():
                if idx < 1: continue
                cat_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
                if not cat_raw or "Total" in cat_raw: continue
                cat = clean_state(cat_raw) or cat_raw
                for i, yr in enumerate(subsidy_years, start=1):
                    if i < len(row):
                        amt = to_num(row[i])
                        cursor.execute("""
                            INSERT INTO food_subsidy_fci_state (category_or_state, year, amount_crores, data_month)
                            VALUES (?, ?, ?, ?)
                        """, (cat, yr, amt, month_name))
        except Exception as e:
            print(f"Error in food_subsidy_fci_state for {month_name}: {e}")

    # 16. procurement_incidentals
    f16 = find_file_by_keywords(month_folder, ["procurementincidentals"]) or find_file_by_keywords(month_folder, ["table26"])
    if f16:
        try:
            df = load_dataframe(f16)
            for idx, row in df.iterrows():
                if idx < 1: continue
                yr = str(row[0]).strip() if pd.notna(row[0]) else ""
                if re.match(r'^\d{4}\-\d{2}', yr):
                    rm = to_num(row[1]); wm = to_num(row[2])
                    ri = to_num(row[3]); wi = to_num(row[4])
                    rd = to_num(row[5]); wd = to_num(row[6])
                    re_cost = to_num(row[7]); we_cost = to_num(row[8])
                    cursor.execute("""
                        INSERT INTO procurement_incidentals (year, rice_msp_qtl, wheat_msp_qtl, rice_incidental_qtl, wheat_incidental_qtl, rice_distribution_qtl, wheat_distribution_qtl, rice_economic_cost_qtl, wheat_economic_cost_qtl, data_month)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (yr, rm, wm, ri, wi, rd, wd, re_cost, we_cost, month_name))
        except Exception as e:
            print(f"Error in procurement_incidentals for {month_name}: {e}")

    # 17. portability_transactions
    f17 = find_file_by_keywords(month_folder, ["portability"]) or find_file_by_keywords(month_folder, ["table39"])
    if f17:
        try:
            df = load_dataframe(f17)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1]) if len(row) > 1 else ""
                if not st: st = clean_state(row[2]) if len(row) > 2 else ""
                if not st: continue
                sl = to_num(row[0])
                inter_t = int(to_num(row[2])) if len(row)>2 else 0
                inter_d = to_num(row[3]) if len(row)>3 else 0
                intra_t = int(to_num(row[4])) if len(row)>4 else 0
                intra_d = to_num(row[5]) if len(row)>5 else 0
                tot_a = inter_t + intra_t
                ytd = int(to_num(row[6])) if len(row)>6 else tot_a
                cursor.execute("""
                    INSERT INTO portability_transactions (sl_no, state, month, interstate_txns, interstate_distrib_mt, intrastate_txns, intrastate_distrib_mt, total_aadhaar_txns, ytd_cumulative_portability_counts, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sl, st, f"{month_name} 2026", inter_t, inter_d, intra_t, intra_d, tot_a, ytd, month_name))
        except Exception as e:
            print(f"Error in portability_transactions for {month_name}: {e}")

    # 18. fair_price_shops
    f18 = find_file_by_keywords(month_folder, ["fair_price"]) or find_file_by_keywords(month_folder, ["fps"]) or find_file_by_keywords(month_folder, ["totalfps"]) or find_file_by_keywords(month_folder, ["table38"])
    if f18:
        try:
            df = load_dataframe(f18)
            for idx, row in df.iterrows():
                if idx < 1: continue
                st = clean_state(row[1]) if len(row)>1 else ""
                if not st: st = clean_state(row[0])
                if not st: continue
                sl = to_num(row[0]); fps = int(to_num(row[2])) if len(row)>2 else 0
                if fps > 0 or st:
                    cursor.execute("""
                        INSERT INTO fair_price_shops (sl_no, state, total_fps_count, data_month)
                        VALUES (?, ?, ?, ?)
                    """, (sl, st, fps, month_name))
        except Exception as e:
            print(f"Error in fair_price_shops for {month_name}: {e}")

    # 19. omss_domestic
    f19 = find_file_by_keywords(month_folder, ["omss"]) or find_file_by_keywords(month_folder, ["table23"])
    if f19:
        try:
            df = load_dataframe(f19)
            for idx, row in df.iterrows():
                if idx < 1: continue
                yr = str(row[0]).strip() if pd.notna(row[0]) else ""
                if re.match(r'^\d{4}\-\d{2}', yr):
                    w = to_num(row[1]); r = to_num(row[2])
                    cursor.execute("""
                        INSERT INTO omss_domestic (year, wheat_lmt, rice_lmt, data_month)
                        VALUES (?, ?, ?, ?)
                    """, (yr, round(w, 2), round(r, 2), month_name))
        except Exception as e:
            print(f"Error in omss_domestic for {month_name}: {e}")

    # 20. export_import
    f20 = find_file_by_keywords(month_folder, ["exportimport"]) or find_file_by_keywords(month_folder, ["table09"])
    if f20:
        try:
            df = load_dataframe(f20)
            for idx, row in df.iterrows():
                if idx < 1: continue
                yr = str(row[0]).strip() if pd.notna(row[0]) else ""
                if re.match(r'^\d{4}\-\d{2}', yr):
                    w = to_num(row[1]); r = to_num(row[2]); tot = to_num(row[3]) if len(row)>3 else (w+r)
                    cursor.execute("""
                        INSERT INTO export_import (year, wheat_lakh_tons, rice_lakh_tons, total_lakh_tons, data_month)
                        VALUES (?, ?, ?, ?, ?)
                    """, (yr, w, r, tot, month_name))
        except Exception as e:
            print(f"Error in export_import for {month_name}: {e}")

    # 21. export_prices
    f21 = find_file_by_keywords(month_folder, ["exportprices"]) or find_file_by_keywords(month_folder, ["table35"])
    if f21:
        try:
            df = load_dataframe(f21)
            months21 = ["December 2025", "January 2026", "February 2026", "March 2026", "April 2026", "May 2026", "June 2026", "July 2026"]
            for idx, row in df.iterrows():
                if idx < 3: continue
                var = str(row[0]).strip() if pd.notna(row[0]) else ""
                if not var or "-" not in var: continue
                cntry = str(row[1]).strip() if len(row)>1 and pd.notna(row[1]) else ""
                port = str(row[2]).strip() if len(row)>2 and pd.notna(row[2]) else ""
                for i, m_yr in enumerate(months21, start=3):
                    rng = str(row[i]).strip() if i < len(row) and pd.notna(row[i]) else ""
                    if rng and rng != "-":
                        parts = rng.split("-")
                        pmin = to_num(parts[0]) if len(parts) > 0 else 0.0
                        pmax = to_num(parts[1]) if len(parts) > 1 else pmin
                        cursor.execute("""
                            INSERT INTO export_prices (variety, country, port, month_year, price_range_usd, price_min_usd, price_max_usd, data_month)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (var, cntry, port, m_yr, rng, pmin, pmax, month_name))
        except Exception as e:
            print(f"Error in export_prices for {month_name}: {e}")

    # 22. sugar_production
    f22 = find_file_by_keywords(month_folder, ["sugar"]) or find_file_by_keywords(month_folder, ["table40"])
    if f22:
        try:
            df = load_dataframe(f22)
            sugar_months = ["October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August"]
            for idx, row in df.iterrows():
                if idx < 1: continue
                yr = str(row[0]).strip() if pd.notna(row[0]) else ""
                if re.match(r'^\d{4}\-\d{2}', yr):
                    for i, mth in enumerate(sugar_months, start=1):
                        if i < len(row):
                            prod = to_num(row[i])
                            cursor.execute("""
                                INSERT INTO sugar_production (year, month, production_lakh_tons, data_month)
                                VALUES (?, ?, ?, ?)
                            """, (yr, mth, prod, month_name))
        except Exception as e:
            print(f"Error in sugar_production for {month_name}: {e}")

    # 23. festivals_calamity_allocation
    f23 = find_file_by_keywords(month_folder, ["festivals"]) or find_file_by_keywords(month_folder, ["table18_page22"]) or find_file_by_keywords(month_folder, ["table19_page22"])
    if f23:
        try:
            df = load_dataframe(f23)
            curr_yr23 = "2025-26"
            for idx, row in df.iterrows():
                r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
                if "2025-26" in r0: curr_yr23 = "2025-26"
                elif "2026-27" in r0: curr_yr23 = "2026-27"
                if idx < 1: continue
                st = clean_state(r0) or clean_state(row[1] if len(row)>1 else "")
                if not st: continue
                r_kt = to_num(row[1]) if len(row)>1 else 0; w_kt = to_num(row[2]) if len(row)>2 else 0; tot_kt = to_num(row[3]) if len(row)>3 else (r_kt+w_kt)
                cip = str(row[4]).strip() if len(row)>4 and pd.notna(row[4]) else ""
                dt = str(row[5]).strip() if len(row)>5 and pd.notna(row[5]) else ""
                rem = str(row[6]).strip() if len(row)>6 and pd.notna(row[6]) else ""
                if tot_kt > 0 or st:
                    cursor.execute("""
                        INSERT INTO festivals_calamity_allocation (year, state, rice_kt, wheat_kt, total_kt, issue_price_cip, date_of_issue, remarks, data_month)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (curr_yr23, st, r_kt, w_kt, tot_kt, cip, dt, rem, month_name))
        except Exception as e:
            print(f"Error in festivals_calamity_allocation for {month_name}: {e}")

    # 24. central_issue_price
    f24 = find_file_by_keywords(month_folder, ["centralissueprice"]) or find_file_by_keywords(month_folder, ["table27"])
    if f24:
        try:
            df = load_dataframe(f24)
            curr_pd = ""
            for idx, row in df.iterrows():
                if idx < 4: continue
                p_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
                if p_raw and ("to" in p_raw or "से" in p_raw or "Onwards" in p_raw or "दिनांक" in p_raw):
                    curr_pd = p_raw
                sch = str(row[1]).strip() if len(row)>1 and pd.notna(row[1]) else ""
                if not sch: continue
                rn = to_num(row[2]) if len(row)>2 else 0; rga = to_num(row[3]) if len(row)>3 else 0; w = to_num(row[4]) if len(row)>4 else 0; nc = to_num(row[5]) if len(row)>5 else 0
                cursor.execute("""
                    INSERT INTO central_issue_price (period, scheme, rice_normal_rs_qtl, rice_grade_a_rs_qtl, wheat_rs_qtl, nutri_cereals_rs_qtl, data_month)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (curr_pd or "Current", sch, rn, rga, w, nc, month_name))
        except Exception as e:
            print(f"Error in central_issue_price for {month_name}: {e}")

    # 25. comparative_allocation_offtake
    f25 = find_file_by_keywords(month_folder, ["comparativeallocation"]) or find_file_by_keywords(month_folder, ["table13"])
    if f25:
        try:
            df = load_dataframe(f25)
            comp_years = ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]
            curr_sch = "TPDS/NFSA"
            for idx, row in df.iterrows():
                if idx < 1: continue
                sch_raw = str(row[1]).strip() if len(row)>1 and pd.notna(row[1]) else ""
                if sch_raw: curr_sch = sch_raw
                comm = str(row[2]).strip() if len(row)>2 and pd.notna(row[2]) else (str(row[0]).strip() if pd.notna(row[0]) else "")
                if not comm: continue
                for i, yr in enumerate(comp_years):
                    al_col = 3 + i * 2
                    off_col = al_col + 1
                    if off_col < len(row):
                        al = to_num(row[al_col]); off = to_num(row[off_col])
                        cursor.execute("""
                            INSERT INTO comparative_allocation_offtake (scheme, commodity, year, allocation_lakh_tons, offtake_lakh_tons, data_month)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (curr_sch, comm, yr, al, off, month_name))
        except Exception as e:
            print(f"Error in comparative_allocation_offtake for {month_name}: {e}")

    # 26. annual_allocation_summary
    f26 = find_file_by_keywords(month_folder, ["annualallocationof"]) or find_file_by_keywords(month_folder, ["table16"])
    if f26:
        try:
            df = load_dataframe(f26)
            curr_grp = "TPDS/NFSA"
            for idx, row in df.iterrows():
                if idx < 1: continue
                r0 = str(row[0]).strip() if pd.notna(row[0]) else ""
                if "TPDS" in r0 or "NFSA" in r0: curr_grp = "TPDS/NFSA"
                elif "WELFARE" in r0 or "OTHER" in r0: curr_grp = "OTHER WELFARE SCHEMES"

                s_name = str(row[1]).strip() if len(row)>1 and pd.notna(row[1]) else ""
                if not s_name: continue
                r = to_num(row[2]) if len(row)>2 else 0; w = to_num(row[3]) if len(row)>3 else 0; nc = to_num(row[4]) if len(row)>4 else 0; tot = to_num(row[5]) if len(row)>5 else (r+w+nc)
                cursor.execute("""
                    INSERT INTO annual_allocation_summary (scheme_group, scheme_name, year, rice_lakh_tons, wheat_lakh_tons, nutri_cereals_lakh_tons, total_lakh_tons, data_month)
                    VALUES (?, ?, '2026-27', ?, ?, ?, ?, ?)
                """, (curr_grp, s_name, r, w, nc, tot, month_name))
        except Exception as e:
            print(f"Error in annual_allocation_summary for {month_name}: {e}")

    # 27. salient_features
    f27 = find_file_by_keywords(month_folder, ["salientfeatures"])
    if f27:
        try:
            df = load_dataframe(f27)
            for idx, row in df.iterrows():
                if idx < 1: continue
                txt = str(row[0]).strip() if pd.notna(row[0]) else ""
                if txt and len(txt) > 20:
                    feat_num = 1 if "Procurement" in txt or "अधिप्राप्ति" in txt else (2 if "Stock" in txt or "स्टॉक" in txt else 3)
                    topic = "Procurement" if feat_num == 1 else ("Stock" if feat_num == 2 else "Offtake")
                    if re.search(r'[\u0900-\u097F]', txt):
                        cursor.execute("INSERT INTO salient_features (feature_number, topic, text_hi, data_month) VALUES (?, ?, ?, ?)", (feat_num, topic, txt, month_name))
                    else:
                        cursor.execute("INSERT INTO salient_features (feature_number, topic, text_en, data_month) VALUES (?, ?, ?, ?)", (feat_num, topic, txt, month_name))
        except Exception as e:
            print(f"Error in salient_features for {month_name}: {e}")

    conn.commit()
    print(f"Successfully processed and seeded month: '{month_name}'")

def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)

    # Initialize schema
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as sf:
            conn.executescript(sf.read())

    # Insert GeoJSON if present
    geo_path = os.path.join(BASE_DIR, "data", "india_states.geojson")
    if not os.path.exists(geo_path):
        geo_path = os.path.join(BASE_DIR, "..", "frontend", "src", "constants", "india-states.json")
    if os.path.exists(geo_path):
        with open(geo_path, "r", encoding="utf-8") as gf:
            conn.execute("INSERT OR REPLACE INTO geo_data (id, content_json) VALUES ('india-states', ?)", (gf.read(),))
            conn.commit()
            print("Loaded India GeoJSON into geo_data table.")

    # Discover all month subdirectories in source-data
    subfolders = [f.path for f in os.scandir(SOURCE_DIR) if f.is_dir()]
    if not subfolders:
        print("No month subdirectories found in source-data!")
        return

    for folder in sorted(subfolders):
        mname = os.path.basename(folder).capitalize()
        process_month_folder(conn, folder, mname)

    conn.close()
    print(f"\nCompleted ingestion for all month folders in {SOURCE_DIR} into {DB_PATH}")

if __name__ == "__main__":
    main()
