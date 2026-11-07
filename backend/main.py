from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.models import geo

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CitySphere Digital Twin API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import router as api_router
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "CitySphere Backend API is running"}
