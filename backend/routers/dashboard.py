from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.db_service import execute_query
from services.schema_service import get_schema_description
from services.llm_service import generate_sql, generate_chart_configs
import json

router = APIRouter()

class DashboardRequest(BaseModel):
    db_id: str
    prompt: str

@router.post("/dashboard")
async def generate_dashboard(request: DashboardRequest):
    try:
        fallback_sql = "SELECT * FROM dataset LIMIT 50"

        # 1. Get the current database schema context
        schema_context = await get_schema_description(request.db_id)
        
        # 2. Ask Gemini to convert natural language to SQL
        sql_query = await generate_sql(request.prompt, schema_context)
        
        # 3. Execute the SQL against the dynamic DB
        fallback_message = None
        try:
            data, columns = await execute_query(request.db_id, sql_query)
        except Exception as e:
            fallback_message = f"The AI generated an invalid query for this dataset, so a safe fallback view was shown instead: {e}"
            sql_query = fallback_sql
            try:
                data, columns = await execute_query(request.db_id, sql_query)
            except Exception as fallback_error:
                return {
                    "sql": sql_query,
                    "data": [],
                    "charts": [],
                    "message": f"Unable to generate a dashboard for this dataset: {fallback_error}"
                }
            
        if not data:
             return {
                 "sql": sql_query,
                 "data": [],
                 "charts": [],
                 "message": "Query returned no results for your dataset."
             }
             
        # 4. Ask Gemini back for the chart configs
        charts = await generate_chart_configs(request.prompt, schema_context, data)
        
        return {
            "sql": sql_query,
            "data": data,
            "charts": charts,
            "message": fallback_message
        }
        
    except ValueError as ve:
         raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
