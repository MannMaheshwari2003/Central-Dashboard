import sqlite3
import os

db_path = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\backend\database\food_pds.db"
seed_path = r"c:\Users\mann maheshwari\Desktop\dash-data\dash\backend\database\seed.sql"

conn = sqlite3.connect(db_path)
with open(seed_path, "w", encoding="utf-8") as f:
    for line in conn.iterdump():
        if "CREATE TABLE" in line or "CREATE INDEX" in line or "PRAGMA" in line:
            continue
        f.write(f"{line}\n")

print(f"Seed file generated at: {seed_path}")
conn.close()
