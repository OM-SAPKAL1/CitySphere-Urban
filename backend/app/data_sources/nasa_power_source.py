import requests
from app.core.config import settings
from datetime import datetime, timedelta

def fetch_nasa_power_hourly(start_date: str, end_date: str):
    """
    Fetch hourly historical solar irradiance and temperature from NASA POWER.
    start_date, end_date format: YYYYMMDD
    """
    url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN,T2M",
        "community": "RE",
        "longitude": settings.CITY_LONGITUDE,
        "latitude": settings.CITY_LATITUDE,
        "start": start_date,
        "end": end_date,
        "format": "JSON"
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise Exception(f"NASA POWER API error: {response.text}")
        
    return response.json()
