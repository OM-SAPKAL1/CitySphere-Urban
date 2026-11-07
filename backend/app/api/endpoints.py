import os
import json
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.provenance.registry import provenance_registry
from app.simulation.engine import simulation_engine
from app.validation.calibration import calibration_validator

router = APIRouter()

# In‑memory storage for scenario drafts (simple list for now)
SCENARIO_DRAFTS: List[Dict[str, Any]] = []

class StudyAreaResponse(BaseModel):
    id: str
    name: str
    city: str
    state: str
    country: str
    latitude: float
    longitude: float
    size_meters: int
    crs_geographic: str
    crs_projected: str
    timezone: str
    bbox: Dict[str, float]

def get_pune_data_cached() -> Dict[str, Any]:
    path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../data/pune_shivajinagar_city_data.json")
    )
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"city": "Pune", "buildings": [], "roads": [], "intersections": []}

@router.get("/study-area", response_model=StudyAreaResponse)
def get_study_area():
    half_m = settings.STUDY_AREA_SIZE_METERS / 2.0
    lat_offset = half_m / 111320.0
    lon_offset = half_m / (111320.0 * 0.948)
    return StudyAreaResponse(
        id=settings.STUDY_AREA_ID,
        name=settings.STUDY_AREA_NAME,
        city=settings.CITY_NAME,
        state=settings.STATE,
        country=settings.COUNTRY,
        latitude=settings.CITY_LATITUDE,
        longitude=settings.CITY_LONGITUDE,
        size_meters=settings.STUDY_AREA_SIZE_METERS,
        crs_geographic=settings.CRS_GEOGRAPHIC,
        crs_projected=settings.CRS_PROJECTED,
        timezone=settings.TIMEZONE,
        bbox={
            "south": round(settings.CITY_LATITUDE - lat_offset, 5),
            "north": round(settings.CITY_LATITUDE + lat_offset, 5),
            "west": round(settings.CITY_LONGITUDE - lon_offset, 5),
            "east": round(settings.CITY_LONGITUDE + lon_offset, 5)
        }
    )

@router.get("/city-data")
def get_city_data():
    return get_pune_data_cached()

@router.get("/buildings")
def get_buildings():
    data = get_pune_data_cached()
    return data.get("buildings", [])

@router.get("/roads")
def get_roads():
    data = get_pune_data_cached()
    return data.get("roads", [])

@router.get("/intersections")
def get_intersections():
    data = get_pune_data_cached()
    return data.get("intersections", [])

@router.get("/provenance")
def get_provenance_registry():
    return [item.model_dump() for item in provenance_registry.list_all()]

@router.get("/provenance/{dataset_id}")
def get_provenance_item(dataset_id: str):
    item = provenance_registry.get(dataset_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found in registry")
    return item.model_dump()

@router.get("/simulation/state")
def get_simulation_state():
    """
    Returns current simulation state.
    Provides backward-compatible payload for the frontend UI components
    while attaching rich multi-domain urban indicators.
    """
    if not simulation_engine.snapshots:
        snapshot = simulation_engine.step()
    else:
        snapshot = simulation_engine.snapshots[-1]

    # Combine with frontend expected schema
    return {
        "timestamp": snapshot["timestamp_ist"],
        "status": "running",
        "step_index": snapshot["step_index"],
        "hour_of_day": snapshot["hour_of_day"],
        "metrics": snapshot["frontend_metrics"],
        "weather": snapshot["weather"],
        "population": snapshot["population"],
        "energy": snapshot["energy"],
        "traffic": snapshot["traffic"],
        "waste": snapshot["waste"],
        "emissions": snapshot["emissions"],
        "ambient_air_quality": snapshot["ambient_air_quality"]
    }

@router.post("/simulation/step")
def advance_simulation_step():
    """Advance simulation by one 5-minute timestep."""
    snapshot = simulation_engine.step()
    return snapshot

@router.post("/simulation/run")
def run_simulation(steps: int = Query(288, ge=1, le=2016, description="Number of 5-minute timesteps")):
    """Run simulation horizon (default 288 = 24h)."""
    results = simulation_engine.run_horizon(steps)
    return {
        "message": f"Successfully executed {len(results)} timesteps",
        "steps_count": len(results),
        "start_time": results[0]["timestamp_ist"],
        "end_time": results[-1]["timestamp_ist"],
        "summary": {
            "peak_demand_kw": max(r["energy"]["demand_kw"] for r in results),
            "peak_solar_kw": max(r["energy"]["solar_generation_kw"] for r in results),
            "total_waste_gen_kg": results[-1]["waste"]["cumulative_generated_kg"],
            "total_waste_col_kg": results[-1]["waste"]["cumulative_collected_kg"],
            "avg_traffic_speed_kmh": round(sum(r["traffic"]["avg_speed_kmh"] for r in results) / len(results), 1),
            "total_co2_kg": round(sum(r["emissions"]["co2_kg_per_hr"] * (5/60) for r in results), 1)
        }
    }
class EventParams(BaseModel):
    population_increase_pct: float = 25.0  # percent increase
    event_factor: float = 1.25
    steps: int = Query(288, ge=1, le=2016, description="Number of 5‑minute timesteps for the event simulation")

@router.post("/simulation/run_event")
def run_event_simulation(params: EventParams):
    """Run a simulation with an event demand factor applied to traffic."""
    simulation_engine.set_event_factor(params.event_factor)
    results = simulation_engine.run_horizon(params.steps)
    simulation_engine.set_event_factor(1.0)
    return {
        "message": f"Event simulation executed {len(results)} timesteps with factor {params.event_factor}",
        "steps_count": len(results),
        "factor": params.event_factor,
        "summary": {
            "peak_demand_kw": max(r["energy"]["demand_kw"] for r in results),
            "peak_solar_kw": max(r["energy"]["solar_generation_kw"] for r in results),
            "avg_traffic_speed_kmh": round(sum(r["traffic"]["avg_speed_kmh"] for r in results) / len(results), 1),
            "total_co2_kg": round(sum(r["emissions"]["co2_kg_per_hr"] * (5/60) for r in results), 1)
        }
    }


@router.get("/simulation/trajectory")
def get_simulation_trajectory(limit: int = Query(288, ge=1, le=2016)):
    """Retrieve time-series simulation snapshots."""
    return simulation_engine.snapshots[-limit:]

@router.get("/calibration/report")
def get_calibration_report():
    """Retrieve rigorous calibration and validation evaluation report."""
    if not simulation_engine.snapshots:
        simulation_engine.run_horizon(288)
@router.get("/scenarios", response_model=List[Dict[str, Any]])
def list_scenarios():
    """Return saved scenario drafts (in‑memory)."""
    return SCENARIO_DRAFTS

@router.post("/scenarios", response_model=Dict[str, Any])
def create_scenario(draft: Dict[str, Any]):
    """Persist a scenario draft and return it with an ID."""
    SCENARIO_DRAFTS.append(draft)
    return {"status": "saved", "id": len(SCENARIO_DRAFTS) - 1, **draft}

