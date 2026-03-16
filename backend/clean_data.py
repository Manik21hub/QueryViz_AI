import pandas as pd
import numpy as np
import os

def clean_data(input_file, output_file):
    print(f"Reading data from {input_file}...")
    try:
        df = pd.read_csv(input_file, encoding='utf-8', low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(input_file, encoding='latin1', low_memory=False)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        return

    original_rows = len(df)
    print(f"Original rows: {original_rows}")

    dropped_reasons = {
        "timestamp_invalid": 0,
        "sentiment_invalid": 0,
        "metrics_invalid": 0,
        "duration_invalid": 0,
        "duplicates": 0
    }

    # 1. Parse timestamp as datetime (errors='coerce')
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    
    invalid_ts_mask = df['timestamp'].isna()
    dropped_reasons['timestamp_invalid'] = invalid_ts_mask.sum()
    df = df[~invalid_ts_mask].copy()

    # Add: upload_month (str, "YYYY-MM"), upload_year (int), day_of_week (str)
    df['upload_month'] = df['timestamp'].dt.strftime('%Y-%m')
    df['upload_year'] = df['timestamp'].dt.year
    df['day_of_week'] = df['timestamp'].dt.day_name()

    # 2. Standardise text columns: category, language -> .str.strip().str.title()
    # region -> .str.strip().str.upper()
    if 'category' in df.columns:
        df['category'] = df['category'].astype(str).str.strip().str.title()
    if 'language' in df.columns:
        df['language'] = df['language'].astype(str).str.strip().str.title()
    if 'region' in df.columns:
        df['region'] = df['region'].astype(str).str.strip().str.upper()

    # 3. Add region_name column
    region_map = {
        "PK": "Pakistan", "UK": "United Kingdom", "BR": "Brazil",
        "US": "United States", "IN": "India", "DE": "Germany",
        "FR": "France", "JP": "Japan", "AU": "Australia",
        "CA": "Canada", "NG": "Nigeria", "EG": "Egypt",
        "MX": "Mexico", "ZA": "South Africa", "KR": "South Korea"
    }
    
    if 'region' in df.columns:
        # Unmapped codes -> use code itself as fallback
        df['region_name'] = df['region'].map(region_map).fillna(df['region'])

    # 4. Add duration_min = (duration_sec / 60).round(1)
    if 'duration_sec' in df.columns:
        df['duration_sec'] = pd.to_numeric(df['duration_sec'], errors='coerce')
        invalid_dur_mask = df['duration_sec'].isna() | (df['duration_sec'] <= 0)
        dropped_reasons['duration_invalid'] = invalid_dur_mask.sum()
        df = df[~invalid_dur_mask].copy()
        
        df['duration_min'] = (df['duration_sec'] / 60.0).round(1)

    # 5. Convert ads_enabled: True/true/"True" -> 1, else -> 0
    if 'ads_enabled' in df.columns:
        # handle boolean or string that might be true
        df['ads_enabled'] = df['ads_enabled'].astype(str).str.strip().str.lower().isin(['true', '1'])
        df['ads_enabled'] = df['ads_enabled'].astype(int)

    # 6. Drop rows where:
    # - timestamp could not be parsed (NaT) [Done]
    # - duration_sec: null or <= 0 [Done]
    
    # - sentiment_score is null or outside [-1.0, 1.0]
    if 'sentiment_score' in df.columns:
        df['sentiment_score'] = pd.to_numeric(df['sentiment_score'], errors='coerce')
        invalid_sen_mask = df['sentiment_score'].isna() | (df['sentiment_score'] < -1.0) | (df['sentiment_score'] > 1.0)
        dropped_reasons['sentiment_invalid'] = invalid_sen_mask.sum()
        df = df[~invalid_sen_mask].copy()
        
    # - views, likes, comments, shares: null or < 0
    metrics = ['views', 'likes', 'comments', 'shares']
    invalid_metrics_mask = pd.Series(False, index=df.index)
    for m in metrics:
        if m in df.columns:
            df[m] = pd.to_numeric(df[m], errors='coerce')
            invalid_metrics_mask = invalid_metrics_mask | df[m].isna() | (df[m] < 0)
            
    dropped_reasons['metrics_invalid'] = invalid_metrics_mask.sum()
    df = df[~invalid_metrics_mask].copy()

    # 7. Drop exact duplicate rows (keep first)
    duplicates_mask = df.duplicated()
    dropped_reasons['duplicates'] = duplicates_mask.sum()
    df = df.drop_duplicates(keep='first').copy()

    # 8. Print cleaning report
    print("\n--- Cleaning Report ---")
    print(f"Original rows: {original_rows}")
    print("\nDropped rows per reason:")
    for reason, count in dropped_reasons.items():
        print(f"  - {reason}: {count}")
        
    print(f"\nFinal rows: {len(df)}")
    
    print("\nUnique values:")
    if 'category' in df.columns:
        print(f"  - category: {df['category'].unique().tolist()}")
    if 'language' in df.columns:
        print(f"  - language: {df['language'].unique().tolist()}")
    if 'region' in df.columns:
        print(f"  - region: {df['region'].unique().tolist()}")
        
    print("\nColumn dtypes of final dataframe:")
    print(df.dtypes)
    
    # Save to backend/data/dataset_clean.csv
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df.to_csv(output_file, index=False)
    print(f"\nSaved cleaned dataset to {output_file}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_filepath = os.path.join(base_dir, "data", "dataset.csv")
    output_filepath = os.path.join(base_dir, "data", "dataset_clean.csv")
    clean_data(input_filepath, output_filepath)
