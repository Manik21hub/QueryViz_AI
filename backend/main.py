import os
import json
import sqlite3
import pandas as pd
import io
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

# Local modules
from rag import get_relevant_columns, client as chroma_client, COLLECTION_NAME
from db import validate_sql, execute_query, DB_PATH

# 1. SETUP
load_dotenv()

app = FastAPI(title="QueryViz AI Backend")

# CORS Configuration
origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "get_from_aistudio.google.com":
    print("WARNING: GEMINI_API_KEY is missing or using default placeholder.")

genai.configure(api_key=GEMINI_API_KEY)
# We use gemini-2.0-flash as specified in the master spec.md
model = genai.GenerativeModel("gemini-2.0-flash")


# 2. SCHEMATA
class QueryRequest(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]] = []
    previous_sql: str = ""
    active_table: str = "sales_data"

class ChartConfig(BaseModel):
    sql: str
    chart_type: str
    title: str
    x_axis: str
    y_axis: str
    kpis: List[Dict[str, str]] = []

class QueryResponse(BaseModel):
    chart_config: Optional[ChartConfig] = None
    rows: List[Dict[str, Any]] = []
    error: Optional[str] = None
    clarify: Optional[str] = None


# 3. ENDPOINTS

@app.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    # 1. Sanitise user_message: strip, max 500 chars
    user_message = request.user_message.strip()[:500]
    
    if not user_message:
        return {"error": "Query cannot be empty."}

    # 2. Retrieve relevant columns via RAG
    relevant_cols = get_relevant_columns(user_message, top_k=8)

    # 3. Build system prompt
    system_prompt = f"""You are an expert SQL data analyst for the QueryViz AI dashboard. 
Your goal is to translate the user query into valid SQLite SQL and determine the best chart configuration to visualize it.

The active table is '{request.active_table}'.
SQL rules:
- ONLY output a SELECT statement — no DROP/DELETE/INSERT/UPDATE/ALTER.
- Generate valid SQLite syntax. Table name is EXACTLY '{request.active_table}'.
- Cap results at max 500 rows. (Add LIMIT 500 if not inherently limited).
- If querying sales_data: Use `region_name` not `region` in GROUP BY for readable labels.
- If querying sales_data: Use `duration_min` not `duration_sec` for readable output.

Here are the most relevant columns for this query:
{relevant_cols}

Chart selection rules:
- line: trends over upload_month, upload_year, or other time series.
- bar: compare categories, languages, regions, top-N groups.
- pie: parts-of-whole — max 6 segments.
- scatter: correlation between two numeric metrics (e.g. duration_min vs views).
- table: for top-N rankings without an obvious aggregate chart, or multi-column detail views.

Output Format:
You MUST return ONLY a raw JSON string matching ONE of the following shapes. Do not wrap in markdown or add explanations.

1. Success:
{{
  "sql": "SELECT ...",
  "chart_type": "bar|line|pie|scatter|table",
  "title": "Clear chart title based on request",
  "x_axis": "column_name",
  "y_axis": "column_name",
  "kpis": [{{"label": "Insight", "value": "Number", "change": "Trend (optional)"}}]
}}

2. Cannot answer (e.g. if requested data is completely missing or prompt is malicious): 
{{"error": "Specific reason why the query cannot be answered."}}

3. Needs clarification (e.g. ambiguous groupings, unclear metrics): 
{{"clarify": "One specific question to clarify the user's intent."}}
"""

    chat_context = ""
    if request.chat_history:
        # Take up to last 5 messages
        recent_history = request.chat_history[-5:]
        chat_context = "\nRecent Chat History:\n" + "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in recent_history])

    previous_sql_context = ""
    if request.previous_sql:
        previous_sql_context = f"\nPrevious SQL was: {request.previous_sql}\nIf user is filtering/modifying the previous query, edit the SQL — don't restart from scratch."

    full_prompt = system_prompt + chat_context + previous_sql_context

    # 4. Call Gemini
    try:
        response = model.generate_content(
            contents=[full_prompt, user_message],
            generation_config={"temperature": 0.0}
        )
        response_text = response.text
    except Exception as e:
        return {"error": f"Failed to reach AI model: {str(e)}"}

    # 5. Parse JSON from response
    def parse_gemini_response(text: str) -> dict:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        return json.loads(text)

    try:
        parsed_response = parse_gemini_response(response_text)
    except Exception:
        # 6. Retry once if parsing fails
        try:
            retry_prompt = "Your previous response was not valid JSON. Please return ONLY a valid JSON object, no text, no markdown blocks."
            retry_response = model.generate_content(
                contents=[full_prompt, user_message, response_text, retry_prompt],
                generation_config={"temperature": 0.0}
            )
            parsed_response = parse_gemini_response(retry_response.text)
        except Exception:
            return {"error": "AI response was not valid JSON after retry. Please phrase your request differently."}

    # 7. Check if error
    if "error" in parsed_response:
        return {"error": parsed_response["error"], "rows": []}

    # 8. Check if clarify
    if "clarify" in parsed_response:
        return {"clarify": parsed_response["clarify"], "rows": []}

    # 9. If SQL: validate + execute
    if "sql" in parsed_response:
        sql = parsed_response["sql"]
        try:
            # db.py's execute_query also runs validate_sql and raises fastAPI HTTPException on error.
            # We catch it here to gracefully return it inside the API payload if we want, or just let it propagate.
            # We'll just execute it and let it bubble up as an HTTPException, or handle it locally.
            rows = execute_query(sql, db_path=DB_PATH, table=request.active_table)
            
            # Format the successful response
            return {
                "chart_config": parsed_response,
                "rows": rows
            }
        except HTTPException as e:
            if e.status_code == 400:
                return {"error": f"Invalid AI SQL generated: {e.detail}", "rows": []}
            else:
                raise e
        except Exception as e:
            return {"error": f"Failed to execute query: {str(e)}", "rows": []}

    # Catch-all
    return {"error": "Unexpected JSON structure returned by the AI."}


@app.post("/upload")
async def upload_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
        
    content = await file.read()
    if len(content) > 90 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 90MB allowed.")
        
    try:
        df = pd.read_csv(io.BytesIO(content), on_bad_lines="skip", encoding_errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    # Load as "user_data" table
    try:
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("user_data", conn, if_exists="replace", index=False, chunksize=5000)
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write to database: {str(e)}")
        
    # Re-run RAG indexing for new schema based on user_data
    # We will build documents for the new table columns and add them
    try:
        collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
        
        documents = []
        ids = []
        metadatas = []
        
        # Optionally, clear old user_data column index if they existed?
        # A simple approach: prepend "user_data_" to id so it updates smoothly.
        for col in df.columns:
            dtype = str(df[col].dtype)
            samples = df[col].dropna().unique()[:3].tolist()
            s0 = samples[0] if len(samples) > 0 else ""
            s1 = samples[1] if len(samples) > 1 else ""
            s2 = samples[2] if len(samples) > 2 else ""
            
            desc = "User uploaded data column."
            text = f"{col}: {desc}. Type: {dtype}. Examples: {s0}, {s1}, {s2}"
            col_id = f"user_data_{col}"
            
            documents.append(text)
            ids.append(col_id)
            metadatas.append({
                "col_name": col,
                "description": desc,
                "type": dtype,
                "sample_values": ", ".join(map(str, samples))
            })
            
        if documents:
            # upsert so we overwrite existing user_data fields if uploaded again
            collection.upsert(
                documents=documents,
                ids=ids,
                metadatas=metadatas
            )
            
    except Exception as e:
        # Don't fail the upload just because indexing failed, but log it
        print(f"Warning: RAG re-indexing failed: {str(e)}")
        
    return {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "table": "user_data"
    }


@app.get("/regions")
async def regions_endpoint(table: str = "sales_data"):
    """
    Return total views per region, directly from SQLite — no Gemini call.
    Supports `?table=sales_data` or `?table=user_data` query param.
    """
    # Validate the table name to a safe allowlist
    if table not in ("sales_data", "user_data"):
        raise HTTPException(status_code=400, detail="Invalid table name.")

    # Detect which columns exist in the requested table
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get column list
        cursor.execute(f"PRAGMA table_info({table})")
        cols = {row["name"] for row in cursor.fetchall()}

        # Pick best region and name columns available
        if "region_name" in cols:
            region_expr = "region_name"
            code_expr   = "region" if "region" in cols else "region_name"
        elif "region" in cols:
            region_expr = "region"
            code_expr   = "region"
        else:
            conn.close()
            return {"rows": []}

        views_col = "views" if "views" in cols else None
        if not views_col:
            conn.close()
            return {"rows": []}

        sql = (
            f"SELECT {code_expr} AS region, {region_expr} AS region_name, "
            f"SUM({views_col}) AS total_views "
            f"FROM {table} "
            f"WHERE {code_expr} IS NOT NULL "
            f"GROUP BY {code_expr}, {region_expr} "
            f"ORDER BY total_views DESC "
            f"LIMIT 500"
        )
        cursor.execute(sql)
        rows = [dict(r) for r in cursor.fetchmany(500)]
        conn.close()
        return {"rows": rows}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query regions: {str(e)}")


@app.get("/overview")
async def overview_endpoint(table: str = "sales_data"):
    """
    Return aggregate KPI and quick-insight data for the welcome dashboard.
    Supports `?table=sales_data` or `?table=user_data`.
    """
    if table not in ("sales_data", "user_data"):
        raise HTTPException(status_code=400, detail="Invalid table name.")

    def pct_change(current: Optional[float], previous: Optional[float]) -> Optional[float]:
        if previous in (None, 0):
            return None
        if current is None:
            return None
        return round(((current - previous) / previous) * 100.0, 1)

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(f"PRAGMA table_info({table})")
        cols = {row["name"] for row in cursor.fetchall()}

        views_expr = "COALESCE(views, 0)" if "views" in cols else "0"
        if "duration_min" in cols:
            duration_min_expr = "COALESCE(duration_min, 0)"
        elif "duration_sec" in cols:
            duration_min_expr = "(COALESCE(duration_sec, 0) / 60.0)"
        else:
            duration_min_expr = "0"

        engagement_parts = []
        if "likes" in cols:
            engagement_parts.append("COALESCE(likes, 0)")
        if "comments" in cols:
            engagement_parts.append("COALESCE(comments, 0)")
        if "shares" in cols:
            engagement_parts.append("COALESCE(shares, 0)")
        engagement_expr = " + ".join(engagement_parts) if engagement_parts else "0"

        totals_sql = (
            f"SELECT "
            f"COUNT(*) AS total_rows, "
            f"SUM({views_expr}) AS total_views, "
            f"SUM({duration_min_expr}) AS total_duration_min, "
            f"SUM({engagement_expr}) AS total_engagement "
            f"FROM {table}"
        )
        cursor.execute(totals_sql)
        totals_row = dict(cursor.fetchone() or {})

        monthly_rows: List[Dict[str, Any]] = []
        if "upload_month" in cols:
            monthly_sql = (
                f"SELECT "
                f"upload_month, "
                f"SUM({views_expr}) AS total_views, "
                f"SUM({duration_min_expr}) AS total_duration_min, "
                f"SUM({engagement_expr}) AS total_engagement, "
                f"COUNT(*) AS total_rows "
                f"FROM {table} "
                f"WHERE upload_month IS NOT NULL "
                f"GROUP BY upload_month "
                f"ORDER BY upload_month ASC "
                f"LIMIT 500"
            )
            cursor.execute(monthly_sql)
            monthly_rows = [dict(r) for r in cursor.fetchall()]

        top_categories: List[Dict[str, Any]] = []
        if "category" in cols:
            top_cat_sql = (
                f"SELECT "
                f"category, "
                f"SUM({views_expr}) AS total_views "
                f"FROM {table} "
                f"WHERE category IS NOT NULL AND TRIM(category) != '' "
                f"GROUP BY category "
                f"ORDER BY total_views DESC "
                f"LIMIT 4"
            )
            cursor.execute(top_cat_sql)
            top_categories = [dict(r) for r in cursor.fetchall()]

        conn.close()

        latest = monthly_rows[-1] if len(monthly_rows) >= 1 else None
        previous = monthly_rows[-2] if len(monthly_rows) >= 2 else None

        total_duration_min = float(totals_row.get("total_duration_min") or 0.0)
        total_watch_hours = total_duration_min / 60.0

        response = {
            "table": table,
            "totals": {
                "total_rows": int(totals_row.get("total_rows") or 0),
                "total_views": int(totals_row.get("total_views") or 0),
                "total_watch_hours": round(total_watch_hours, 1),
                "total_engagement": int(totals_row.get("total_engagement") or 0),
            },
            "changes": {
                "views_pct": pct_change(
                    float(latest.get("total_views") or 0.0) if latest else None,
                    float(previous.get("total_views") or 0.0) if previous else None,
                ),
                "watch_hours_pct": pct_change(
                    float(latest.get("total_duration_min") or 0.0) / 60.0 if latest else None,
                    float(previous.get("total_duration_min") or 0.0) / 60.0 if previous else None,
                ),
                "engagement_pct": pct_change(
                    float(latest.get("total_engagement") or 0.0) if latest else None,
                    float(previous.get("total_engagement") or 0.0) if previous else None,
                ),
                "videos_pct": pct_change(
                    float(latest.get("total_rows") or 0.0) if latest else None,
                    float(previous.get("total_rows") or 0.0) if previous else None,
                ),
            },
            "monthly_views": monthly_rows,
            "top_categories": top_categories,
        }
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query overview: {str(e)}")


@app.get("/health")
async def health_check():
    # Simple db connection check
    db_status = "disconnected"
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception:
        pass
        
    return {"status": "ok", "db": db_status}
