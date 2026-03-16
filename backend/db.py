import sqlite3
import os
import re
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

DB_PATH = os.getenv(
    "DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "data.db")
)

# Forbidden SQL keywords (write/dangerous operations)
_FORBIDDEN_PATTERN = re.compile(
    r"\b(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|ATTACH|DETACH)\b",
    re.IGNORECASE
)

# PRAGMA write operations (allow read-only pragmas in principle, but block all for safety)
_PRAGMA_PATTERN = re.compile(r"\bPRAGMA\b", re.IGNORECASE)


def validate_sql(sql: str) -> None:
    """
    Validates that the given SQL string is a safe, read-only SELECT statement.
    Raises ValueError if any forbidden keyword or multiple semicolons are detected.
    """
    stripped = sql.strip()
    
    # Must start with SELECT
    if not re.match(r"^\s*SELECT\b", stripped, re.IGNORECASE):
        raise ValueError("Only SELECT statements are allowed.")
    
    # Disallow forbidden DML/DDL keywords
    match = _FORBIDDEN_PATTERN.search(stripped)
    if match:
        raise ValueError(f"Forbidden SQL keyword detected: {match.group().upper()}")
    
    # Disallow PRAGMA (write ops)
    if _PRAGMA_PATTERN.search(stripped):
        raise ValueError("PRAGMA statements are not allowed.")
    
    # Disallow multiple semicolons (SQL stacking attempt)
    if stripped.count(";") > 1:
        raise ValueError("Multiple statements are not allowed.")


def execute_query(sql: str, db_path: str = None, table: str = "sales_data") -> list[dict]:
    """
    Validates and executes a SQL SELECT query against the SQLite database.
    Returns up to 500 rows as a list of dicts.
    Raises HTTPException on validation failure (400) or database error (500).
    """
    resolved_path = db_path or DB_PATH
    
    # Replace table placeholder if the query uses a generic marker
    sql = sql.replace("{table}", table)
    
    # Validate first — raise 400 on failure
    try:
        validate_sql(sql)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Execute the query
    try:
        conn = sqlite3.connect(resolved_path, timeout=5)
        conn.row_factory = sqlite3.Row
        
        cursor = conn.cursor()
        cursor.execute(sql)
        
        # Never fetchall() — cap at 500 rows
        rows = cursor.fetchmany(500)
        
        # Convert sqlite3.Row to plain dicts
        result = [dict(row) for row in rows]
        
        conn.close()
        return result
    
    except sqlite3.Error:
        # Never expose raw DB errors to the client
        raise HTTPException(
            status_code=500,
            detail="A database error occurred while executing your query. Please try again."
        )


def get_table_for_request(has_user_data: bool) -> str:
    """Returns the appropriate table name based on whether the user has uploaded data."""
    return "user_data" if has_user_data else "sales_data"
