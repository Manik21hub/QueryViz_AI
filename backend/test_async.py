import asyncio
from services.db_service import execute_query

async def main():
    db_id = "e9213269-8814-4fcf-bda5-f771b20838c8"
    sql = "SELECT * FROM dataset WHERE timestamp >= DATE('now', '-4 months') LIMIT 500"
    try:
        data, cols = await execute_query(db_id, sql)
        print(f"Success! {len(data)} rows.")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
