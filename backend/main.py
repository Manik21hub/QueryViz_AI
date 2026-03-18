from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, query, chart_config, dashboard

app = FastAPI(title="DashGenius API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(chart_config.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
