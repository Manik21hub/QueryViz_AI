import os
import json
import re
from dotenv import load_dotenv
from groq import AsyncGroq

# Always load backend/.env regardless of current working directory.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
API_KEY = os.getenv("GROQ_API_KEY")

# Using the recommended fast and capable model from Groq
MODEL_NAME = "llama-3.3-70b-versatile"
client = AsyncGroq(api_key=API_KEY) if API_KEY else None


def _sanitize_sql_query(raw_sql: str) -> str:
    """Normalize model output into a single executable SQLite SELECT/CTE statement."""
    sql = raw_sql.strip()
    sql = re.sub(r"^```sql\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"^```\s*", "", sql)
    sql = re.sub(r"\s*```$", "", sql)
    sql = sql.strip()

    # Find the first actual SQL statement start and discard preamble/explanations.
    match = re.search(r"\b(SELECT|WITH)\b", sql, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return "SELECT * FROM dataset LIMIT 50"
    sql = sql[match.start():].strip()

    # Execute only the first statement. Anything after the first semicolon is discarded.
    if ";" in sql:
        sql = sql.split(";", 1)[0].strip()

    # Remove common inline SQL comments the model may append.
    sql = re.sub(r"--.*$", "", sql, flags=re.MULTILINE).strip()

    if not re.match(r"^(SELECT|WITH)\b", sql, flags=re.IGNORECASE):
        return "SELECT * FROM dataset LIMIT 50"

    return sql


def _fallback_chart_configs(data_sample: list[dict]) -> list[dict]:
    """Heuristic chart defaults when the LLM is unavailable or fails."""
    if not data_sample:
        return []

    first_row = data_sample[0]
    keys = list(first_row.keys())
    if not keys:
        return []

    numeric_keys: list[str] = []
    categorical_keys: list[str] = []

    for key in keys:
        val = first_row.get(key)
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            numeric_keys.append(key)
        elif isinstance(val, str):
            categorical_keys.append(key)

    if not numeric_keys:
        return []

    charts: list[dict] = []
    primary_metric = numeric_keys[0]

    charts.append(
        {
            "chart_type": "kpi",
            "title": f"Total {primary_metric}",
            "x_key": categorical_keys[0] if categorical_keys else primary_metric,
            "y_key": primary_metric,
        }
    )

    x_key = categorical_keys[0] if categorical_keys else keys[0]
    is_time_like = any(token in x_key.lower() for token in ["date", "time", "month", "year"])
    charts.append(
        {
            "chart_type": "line" if is_time_like else "bar",
            "title": f"{primary_metric} by {x_key}",
            "x_key": x_key,
            "y_key": primary_metric,
        }
    )

    if len(numeric_keys) > 1 and len(categorical_keys) > 0:
        charts.append(
            {
                "chart_type": "bar",
                "title": f"{numeric_keys[1]} by {categorical_keys[0]}",
                "x_key": categorical_keys[0],
                "y_key": numeric_keys[1],
            }
        )

    return charts

async def generate_sql(prompt: str, schema_context: str) -> str:
    """Generates a SQL query based on the user's natural language prompt and schema."""
    if not client:
         return "SELECT * FROM dataset LIMIT 50" # Fallback
         
    system_instruction = f"""
You are an expert SQL data analyst.
The database schema and sample data are provided below.
{schema_context}

Rules:
1. Return ONLY a valid SQLite SQL query. Do not wrap it in markdown code blocks like ```sql ... ```. No explanations.
2. ONLY use the exact column names provided in the schema above. DO NOT invent or assume any columns exist (like 'timestamp', 'date', or 'time') unless they are explicitly listed in the schema.
3. The user's query may refer to columns. Map their natural language to the closest matching column name strictly from the schema.
4. ALWAYS query from the table named 'dataset'.
5. If they ask for totals, use SUM(). If they ask for averages, use AVG().
6. If they ask for 'by' something, use GROUP BY.
7. Always add a reasonable LIMIT (e.g., LIMIT 500) if not grouping to prevent massive dumps.
"""
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"User request: {prompt}"}
            ],
            temperature=0.1,
        )
        
        sql = response.choices[0].message.content.strip()
        return _sanitize_sql_query(sql)
    except Exception as e:
        print(f"Error generating SQL with Groq: {e}")
        return "SELECT * FROM dataset LIMIT 50"

async def generate_chart_configs(prompt: str, schema_context: str, data_sample: list[dict]) -> list[dict]:
    """Generates chart configurations based on the prompt and the returned data."""
    if not client:
         return _fallback_chart_configs(data_sample)
         
    system_instruction = f"""
You are a data visualization expert building dynamic dashboards in React with Recharts.
The user asked: "{prompt}"

They have executed a query and the backend returned the following columns and a small sample of the data:
{schema_context}
Data Sample (first 3 rows):
{json.dumps(data_sample[:3], indent=2)}

You must return a JSON object with a single key 'charts' containing an array of 1 or more chart configurations to best visualize this specific data.
Each chart config should be an object with:
- "chart_type": one of "bar", "line", "pie", "area", "scatter", or "kpi"
- "title": A descriptive title for the chart.
- "x_key": The name of the column to use for the X-axis (usually a categorical or time dimension). For KPI, this can represent the label.
- "y_key": The name of the column to use for the Y-axis (usually a numerical metric). For KPI, this is the metric column.
- "color_key": (optional) If the data should be grouped by a third column (e.g. grouped bar chart), specify the column name here.

Return ONLY a valid JSON object. Make sure the 'x_key' and 'y_key' EXACTLY match the column names in the data provided.
"""
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": "Generate the JSON config object now."}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        return data.get("charts", [])
    except Exception as e:
        print(f"Error parsing chart configs from Groq: {e}")
        return _fallback_chart_configs(data_sample)
