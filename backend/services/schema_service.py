import aiosqlite
import os
from services.db_service import UPLOAD_DIR

async def get_schema_description(db_id: str) -> str:
    """Returns a string describing the 'dataset' table schema and a sample of 3 rows."""
    db_path = os.path.join(UPLOAD_DIR, f"{db_id}.db")
    if not os.path.exists(db_path):
        raise ValueError(f"Database {db_id} not found.")
        
    async with aiosqlite.connect(db_path) as db:
        # Get table info
        async with db.execute("PRAGMA table_info(dataset)") as cursor:
            columns = await cursor.fetchall()
            col_definitions = [f"{col[1]} ({col[2]})" for col in columns]
            
        # Get sample rows
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM dataset LIMIT 3") as cursor:
            sample_rows = await cursor.fetchall()
            
    schema_str = f"Table 'dataset' columns: {', '.join(col_definitions)}\n"
    if sample_rows:
        schema_str += "Sample data from 'dataset':\n"
        for row in sample_rows:
            schema_str += f"- {dict(row)}\n"
            
    return schema_str
