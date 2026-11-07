from pydantic_settings import BaseSettings
from typing import Tuple

class Settings(BaseSettings):
    DATABASE_URL: str
    
    # Study Area Configuration
    CITY_NAME: str = "Pune"
    STATE: str = "Maharashtra"
    COUNTRY: str = "India"
    STUDY_AREA_ID: str = "pune_shivajinagar_deccan"
    STUDY_AREA_NAME: str = "Shivajinagar–Deccan Urban Corridor"
    
    # Geographic extent (2 km x 2 km)
    CITY_LATITUDE: float = 18.5246
    CITY_LONGITUDE: float = 73.8445
    STUDY_AREA_SIZE_METERS: int = 2000
    
    # Spatial reference systems
    CRS_GEOGRAPHIC: str = "EPSG:4326"
    CRS_PROJECTED: str = "EPSG:32643"  # WGS 84 / UTM Zone 43N (appropriate for Pune)
    TIMEZONE: str = "Asia/Kolkata"
    
    # Simulation configuration
    SIMULATION_TIMESTEP_SECONDS: int = 300  # 5 simulated minutes
    HISTORICAL_START_DATE: str = "2024-03-01"
    HISTORICAL_END_DATE: str = "2024-03-07"
    RANDOM_SEED: int = 42
    
    class Config:
        env_file = ".env"

settings = Settings()
