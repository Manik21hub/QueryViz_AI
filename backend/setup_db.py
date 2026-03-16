import pandas as pd
import sqlite3
import os
import json
from dotenv import load_dotenv

def setup_db():
    # 1. Load .env
    load_dotenv()
    db_path = os.getenv("DB_PATH", "./data/data.db")
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # 2. Read dataset_clean.csv
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(base_dir, "data", "dataset_clean.csv")
    
    print(f"Reading cleaned data from {input_file}...")
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found. Run clean_data.py first.")
        return
        
    df = pd.read_csv(input_file)
    total_rows = len(df)
    
    # 3. Load into SQLite
    print(f"Loading {total_rows} rows into SQLite at {db_path}...")
    conn = sqlite3.connect(db_path)
    df.to_sql("sales_data", conn, if_exists="replace", index=False)
    
    # 4. Create indexes
    print("Creating indexes...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_category ON sales_data(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_region ON sales_data(region)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_upload_month ON sales_data(upload_month)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_language ON sales_data(language)")
    conn.commit()
    
    # 5. Generate schema_context.json
    print("Generating schema_context.json...")
    
    column_descriptions = {
        "timestamp": "Precise date and time of the video upload.",
        "upload_month": "Year and month of upload in YYYY-MM format, useful for monthly trends.",
        "upload_year": "The calendar year the video was uploaded.",
        "day_of_week": "The full name of the day the video was uploaded (e.g., Monday).",
        "video_id": "Unique identifier for each YouTube video.",
        "category": "Broad content category such as Music, Gaming, or Education.",
        "language": "Primary language of the video content.",
        "region": "Two-letter country code representing the target region.",
        "region_name": "Full name of the country or region for better readability.",
        "duration_sec": "Total length of the video in seconds.",
        "duration_min": "Total length of the video in minutes, rounded to one decimal place.",
        "views": "Total number of views received by the video.",
        "likes": "Total number of likes on the video.",
        "comments": "Total number of comments on the video.",
        "shares": "Total number of times the video was shared.",
        "sentiment_score": "Average audience sentiment ranging from -1.0 (unhappy) to 1.0 (very happy).",
        "ads_enabled": "Binary flag indicating if ads are enabled (1) or not (0)."
    }
    
    schema_context = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        # Convert numpy types to python native for JSON serialization
        sample_values = df[col].dropna().unique()[:3].tolist()
        
        schema_context[col] = {
            "type": dtype,
            "sample_values": sample_values,
            "description": column_descriptions.get(col, "Generic data column.")
        }
    
    schema_path = os.path.join(base_dir, "data", "schema_context.json")
    with open(schema_path, "w") as f:
        json.dump(schema_context, f, indent=2)
    
    # 6. Print summary
    print("\n--- Database Setup Report ---")
    print(f"Total rows loaded: {total_rows}")
    print("\nColumns and Types:")
    for col, info in schema_context.items():
        print(f"  - {col}: {info['type']}")
    
    print(f"\nSchema context saved to {schema_path}")
    conn.close()

if __name__ == "__main__":
    setup_db()
