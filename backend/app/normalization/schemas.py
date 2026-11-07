from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Literal
from datetime import datetime

class SpatialBoundary(BaseModel):
    south: float
    north: float
    west: float
    east: float
    crs_geographic: str = "EPSG:4326"
    crs_projected: str = "EPSG:32643"

class NormalizedPopulationContext(BaseModel):
    timestamp_ist: str
    hour_of_day: int
    resident_population_active: int
    floating_population_active: int
    total_active_population: int
    activity_profile_label: str

class NormalizedEnergyContext(BaseModel):
    timestamp_ist: str
    ambient_temp_c: float
    solar_ghi_w_per_sqm: float
    cooling_factor: float
    is_daylight: bool

class NormalizedTrafficSegment(BaseModel):
    road_id: str
    road_name: Optional[str] = None
    highway: str
    length_meters: float
    lanes: int
    capacity_pcu_per_hr: float
    free_flow_speed_kmh: float
    current_volume_pcu_per_hr: float
    volume_to_capacity: float
    current_speed_kmh: float
    delay_minutes_per_km: float

class NormalizedWasteStatus(BaseModel):
    timestamp_ist: str
    cumulative_generated_kg: float
    cumulative_collected_kg: float
    uncollected_backlog_kg: float
    is_active_collection_window: bool
