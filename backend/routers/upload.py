from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from services.db_service import create_db_from_csv, UPLOAD_DIR
from services.schema_service import get_schema_description

router = APIRouter()

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
        
    # Save the uploaded file temporarily
    temp_csv_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(temp_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Create dynamic database
        db_id = await create_db_from_csv(temp_csv_path)
        
        # Get schema to return to frontend
        schema_desc = await get_schema_description(db_id)
        
        return {
            "message": "Upload successful",
            "db_id": db_id,
            "schema_preview": schema_desc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp CSV
        if os.path.exists(temp_csv_path):
             os.remove(temp_csv_path)
