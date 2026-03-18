import sqlite3

try:
    with sqlite3.connect("test_db.db") as db:
        sql = "SELECT * FROM dataset WHERE timestamp >= DATE('now', '-4 months') LIMIT 500"
        print(f"Executing: {sql}")
        cursor = db.execute(sql)
        rows = cursor.fetchall()
        print(f"Success! {len(rows)} rows returned.")
except Exception as e:
    print(f"SQLite Error: {e}")
