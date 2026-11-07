import os
import json
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.data_sources.base_adapter import BaseSourceAdapter
from app.core.database import SessionLocal
from app.models.geo import WeatherSolarObservation

class NasaPowerAdapter(BaseSourceAdapter):
    """
    Adapter for NASA POWER Hourly Solar Irradiance and Meteorological Data.
    Provides GHI (ALLSKY_SFC_SW_DWN in W/m²), 2m Temperature (T2M in °C),
    Relative Humidity (RH2M in %), and Wind Speed (WS10M in m/s).
    """
    def __init__(self):
        super().__init__(dataset_id="nasa_power_solar_weather")
        self.raw_cache_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/pune_nasa_power_raw.json")
        )
        self.normalized_cache_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/pune_nasa_power_hourly.json")
        )

    def fetch(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Fetch hourly solar and weather data for Pune from NASA POWER API."""
        start = (start_date or settings.HISTORICAL_START_DATE).replace("-", "")
        end = (end_date or settings.HISTORICAL_END_DATE).replace("-", "")

        if use_cache and os.path.exists(self.raw_cache_path):
            try:
                with open(self.raw_cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "properties" in data and "parameter" in data["properties"]:
                        print(f"[NasaPowerAdapter] Loaded NASA POWER from cache {self.raw_cache_path}")
                        return data
            except Exception as e:
                print(f"[NasaPowerAdapter] Cache read error: {e}")

        url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
        params = {
            "parameters": "ALLSKY_SFC_SW_DWN,T2M,RH2M,WS10M",
            "community": "RE",
            "longitude": settings.CITY_LONGITUDE,
            "latitude": settings.CITY_LATITUDE,
            "start": start,
            "end": end,
            "format": "JSON"
        }

        try:
            print(f"[NasaPowerAdapter] Querying NASA POWER API for {start} to {end} at ({settings.CITY_LATITUDE}, {settings.CITY_LONGITUDE})...")
            r = requests.get(url, params=params, timeout=25)
            if r.status_code == 200:
                data = r.json()
                os.makedirs(os.path.dirname(self.raw_cache_path), exist_ok=True)
                with open(self.raw_cache_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print(f"[NasaPowerAdapter] Successfully fetched and cached NASA POWER data.")
                return data
            else:
                raise Exception(f"NASA POWER API returned HTTP {r.status_code}: {r.text}")
        except Exception as e:
            print(f"[NasaPowerAdapter] Fetch failed: {e}")
            if os.path.exists(self.raw_cache_path):
                with open(self.raw_cache_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            raise

    def validate(self, raw_data: Any) -> bool:
        if not isinstance(raw_data, dict):
            return False
        params = raw_data.get("properties", {}).get("parameter", {})
        required = ["ALLSKY_SFC_SW_DWN", "T2M", "RH2M", "WS10M"]
        return all(k in params and len(params[k]) > 0 for k in required)

    def normalize(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Normalize NASA POWER hourly records into chronological list with ISO Asia/Kolkata timestamps."""
        params = raw_data["properties"]["parameter"]
        sw_dwn = params["ALLSKY_SFC_SW_DWN"]
        t2m = params["T2M"]
        rh2m = params["RH2M"]
        ws10m = params["WS10M"]

        records = []
        # Keys are in format YYYYMMDDHH (UTC)
        sorted_keys = sorted(sw_dwn.keys())
        
        # NASA POWER hourly points are in UTC; convert to Asia/Kolkata (+05:30)
        ist_offset = timedelta(hours=5, minutes=30)

        for k in sorted_keys:
            dt_utc = datetime.strptime(k, "%Y%m%d%H").replace(tzinfo=timezone.utc)
            dt_ist = dt_utc + ist_offset

            ghi = float(sw_dwn.get(k, 0.0))
            if ghi < 0: ghi = 0.0 # Nighttime clamp
            temp = float(t2m.get(k, 25.0))
            rh = float(rh2m.get(k, 50.0))
            ws = float(ws10m.get(k, 2.0))

            records.append({
                "timestamp_ist": dt_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
                "timestamp_hour": dt_ist.hour,
                "date": dt_ist.strftime("%Y-%m-%d"),
                "ghi_w_per_sqm": ghi,
                "temp_c": temp,
                "humidity_pct": rh,
                "wind_speed_ms": ws,
                "source": "NASA_POWER"
            })

        os.makedirs(os.path.dirname(self.normalized_cache_path), exist_ok=True)
        with open(self.normalized_cache_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
        print(f"[NasaPowerAdapter] Normalized {len(records)} hourly weather/solar records.")

        return records

    def sync_to_database(self, records: List[Dict[str, Any]]) -> None:
        """Sync weather and solar observations to database."""
        db = SessionLocal()
        try:
            added = 0
            for r in records:
                dt = datetime.fromisoformat(r["timestamp_ist"])
                obs_id = f"nasa_{dt.strftime('%Y%m%d%H%M')}"
                existing = db.query(WeatherSolarObservation).filter_by(id=obs_id).first()
                if not existing:
                    existing = WeatherSolarObservation(id=obs_id)
                    db.add(existing)

                existing.timestamp_ist = dt
                existing.ghi_w_per_sqm = r["ghi_w_per_sqm"]
                existing.temp_c = r["temp_c"]
                existing.humidity_pct = r["humidity_pct"]
                existing.wind_speed_ms = r["wind_speed_ms"]
                existing.source = "NASA_POWER"
                added += 1
            db.commit()
            print(f"[NasaPowerAdapter] Synced {added} weather/solar observations to DB.")
        except Exception as e:
            db.rollback()
            print(f"[NasaPowerAdapter] DB sync error: {e}")
        finally:
            db.close()
