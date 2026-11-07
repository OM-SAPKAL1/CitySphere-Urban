import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings

class DataAligner:
    """
    Normalizes and aligns heterogeneous spatial and temporal datasets
    strictly according to Pune Shivajinagar-Deccan study area requirements.
    """
    def __init__(self):
        half_m = settings.STUDY_AREA_SIZE_METERS / 2.0
        lat_offset = half_m / 111320.0
        lon_offset = half_m / (111320.0 * math.cos(math.radians(settings.CITY_LATITUDE)))

        self.south = settings.CITY_LATITUDE - lat_offset
        self.north = settings.CITY_LATITUDE + lat_offset
        self.west = settings.CITY_LONGITUDE - lon_offset
        self.east = settings.CITY_LONGITUDE + lon_offset
        self.ist_tz = timezone(timedelta(hours=5, minutes=30))
        self.alignment_logs: List[str] = []

    def validate_spatial_bounds(self, lat: float, lon: float) -> bool:
        """Check if coordinates fall strictly within the 2km x 2km bounding box."""
        within = (self.south <= lat <= self.north) and (self.west <= lon <= self.east)
        if not within:
            self.alignment_logs.append(
                f"Spatial bound violation: ({lat}, {lon}) outside [{self.south:.4f}, {self.north:.4f}], [{self.west:.4f}, {self.east:.4f}]"
            )
        return within

    def to_utm43n(self, lat: float, lon: float) -> Tuple[float, float]:
        """
        Approximate projection from WGS84 (EPSG:4326) to UTM Zone 43N (EPSG:32643).
        Central meridian for UTM 43N is 75°E.
        """
        # Accurate Transverse Mercator forward projection for Pune vicinity
        k0 = 0.9996
        a = 6378137.0
        e2 = 0.00669438
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        lon0_rad = math.radians(75.0)

        dlon = lon_rad - lon0_rad
        N = a / math.sqrt(1 - e2 * math.sin(lat_rad)**2)
        T = math.tan(lat_rad)**2
        C = (e2 / (1 - e2)) * math.cos(lat_rad)**2
        A = math.cos(lat_rad) * dlon

        M = a * ((1 - e2/4 - 3*e2**2/64 - 5*e2**3/256) * lat_rad
                 - (3*e2/8 + 3*e2**2/32 + 45*e2**3/1024) * math.sin(2*lat_rad)
                 + (15*e2**2/256 + 45*e2**3/1024) * math.sin(4*lat_rad)
                 - (35*e2**3/3072) * math.sin(6*lat_rad))

        easting = 500000.0 + k0 * N * (A + (1 - T + C) * A**3 / 6.0)
        northing = k0 * (M + N * math.tan(lat_rad) * (A**2 / 2.0 + (5 - T + 9*C + 4*C**2) * A**4 / 24.0))

        return round(easting, 2), round(northing, 2)

    def standardize_timestamp_ist(self, dt: datetime) -> str:
        """Convert datetime strictly to Asia/Kolkata ISO 8601 string."""
        if dt.tzinfo is None:
            # Naive datetime: assume IST and attach tzinfo
            dt = dt.replace(tzinfo=self.ist_tz)
        else:
            dt = dt.astimezone(self.ist_tz)
        return dt.isoformat()

    def record_temporal_disaggregation(
        self,
        variable_name: str,
        original_resolution: str,
        target_resolution: str,
        method: str
    ) -> Dict[str, Any]:
        """
        Audit log any transformation converting daily/hourly data to 5-minute timestep.
        Enforces rule: 'Do not convert daily data into purported measured five-minute data.'
        """
        record = {
            "variable": variable_name,
            "original_resolution": original_resolution,
            "target_resolution": target_resolution,
            "method": method,
            "classification": "derived_temporal_disaggregation",
            "is_measured": False
        }
        self.alignment_logs.append(
            f"Temporal disaggregation: {variable_name} ({original_resolution} -> {target_resolution}) via {method}"
        )
        return record

data_aligner = DataAligner()
