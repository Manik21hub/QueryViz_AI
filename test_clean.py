import pandas as pd
import re

df = pd.read_csv('dataset_extracted.csv', nrows=5)
print("Before cleaning:")
print(df.columns.tolist())

df.columns = [re.sub(r'<[^>]+>', '', col).strip() for col in df.columns]

import sqlite3
with sqlite3.connect("test_db.db") as db:
    df.to_sql("dataset", db, if_exists="replace", index=False)
    cursor = db.execute("PRAGMA table_info(dataset)")
    print("\nSQLite Columns:")
    for row in cursor.fetchall():
        print(row)
