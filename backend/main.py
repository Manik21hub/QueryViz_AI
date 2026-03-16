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
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
        
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    # Load as "user_data" table
    try:
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("user_data", conn, if_exists="replace", index=False)
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
