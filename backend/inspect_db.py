import sqlite3
import reprlib

with sqlite3.connect(r"c:\Users\Lenovo\OneDrive\Desktop\DashGenius\backend\data\uploads\e9213269-8814-4fcf-bda5-f771b20838c8.db") as db:
    cursor = db.execute("PRAGMA table_info(dataset)")
    print("Columns in DB:")
    for row in cursor.fetchall():
        col_name = row[1]
        print(f"Name: {col_name}, repr: {repr(col_name)}, len: {len(col_name)}")
        if col_name.strip() == "timestamp":
            print("Found exact 'timestamp' match by strip!")
        if "timestamp" in col_name:
            print(f"Found 'timestamp' substring within repr {repr(col_name)}")
    
    # Let's try to select timestamp!
    try:
        cursor.execute("SELECT timestamp FROM dataset LIMIT 1")
        print("Successfully queried 'timestamp'!")
    except Exception as e:
        print(f"Failed to query 'timestamp': {e}")
        try:
            cursor.execute("SELECT `timestamp` FROM dataset LIMIT 1")
            print("Successfully queried '`timestamp`'!")
        except Exception as e:
            pass
