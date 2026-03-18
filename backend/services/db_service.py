import aiosqlite
import sqlite3
import pandas as pd
import os
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def create_db_from_csv(csv_path: str) -> str:
    """Reads a CSV and creates a dynamic SQLite DB, returning the DB path or ID."""
    df = pd.read_csv(csv_path)
    
    # Sanitize column names (remove hidden HTML tags and weird chars if user uploaded a corrupted CSV from a browser)
    import re
    df.columns = [re.sub(r'<[^>]+>', '', col).strip() for col in df.columns]
    
    # Generate unique ID for this session/upload
    db_id = str(uuid.uuid4())
    db_path = os.path.join(UPLOAD_DIR, f"{db_id}.db")
    
    # Write to SQLite synchronously
    with sqlite3.connect(db_path) as db:
        df.to_sql("dataset", db, if_exists="replace", index=False)
        
    return db_id

async def execute_query(db_id: str, sql_query: str) -> tuple[list[dict], list[str]]:
    """Executes a SQL query on the given database and returns the data and column names."""
    db_path = os.path.join(UPLOAD_DIR, f"{db_id}.db")
    if not os.path.exists(db_path):
        raise ValueError(f"Database {db_id} not found.")

    sql_query = sql_query.strip().rstrip(";").strip()
    if not sql_query:
        raise ValueError("Generated SQL was empty.")
    if not sql_query.upper().startswith(("SELECT", "WITH")):
        raise ValueError("Only SELECT queries are allowed.")
        
    async with aiosqlite.connect(db_path) as db:
        # Prevent completely destructive operations, though it's isolated anyway
        if any(kw in sql_query.upper() for kw in ["DROP", "DELETE", "INSERT", "UPDATE"]):
             raise ValueError("Only SELECT queries are allowed.")
             
        db.row_factory = aiosqlite.Row
        async with db.execute(sql_query) as cursor:
            columns = [description[0] for description in cursor.description]
            rows = await cursor.fetchall()
            # Convert rows to dicts
            result = [dict(row) for row in rows]
            return result, columns
