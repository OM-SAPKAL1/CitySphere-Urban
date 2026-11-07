import os
import json
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.geo import SimulationSnapshot
from app.data_sources.nasa_power_adapter import NasaPowerAdapter
from app.simulation.population_model import PopulationActivityModel
from app.simulation.building_energy_model import BuildingEnergyModel
from app.simulation.solar_generation_model import RooftopSolarModel
from app.simulation.traffic_congestion_model import TrafficCongestionModel
from app.simulation.waste_model import MunicipalWasteModel
from app.simulation.emissions_model import EmissionsModel

class SimulationEngine:
    """
    Reproducible, data-driven 5-minute timestep urban simulation engine
    for the Shivajinagar-Deccan corridor, Pune, Maharashtra.
    """
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)
        self.ist_tz = timezone(timedelta(hours=5, minutes=30))
        self.timestep_seconds = settings.SIMULATION_TIMESTEP_SECONDS # 300s (5 min)

        # 1. Load normalized city spatial assets
        city_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/pune_shivajinagar_city_data.json")
        )
        if not os.path.exists(city_data_path):
            raise FileNotFoundError(f"Normalized city data not found at {city_data_path}. Run PuneOsmAdapter first.")

        with open(city_data_path, "r", encoding="utf-8") as f:
            self.city_data = json.load(f)

        self.buildings = self.city_data.get("buildings", [])
        self.roads = self.city_data.get("roads", [])
        self.intersections = self.city_data.get("intersections", [])

        # 2. Instantiate domain models
        self.pop_model = PopulationActivityModel()
        self.energy_model = BuildingEnergyModel(self.buildings)
        self.solar_model = RooftopSolarModel(self.buildings)
        self.traffic_model = TrafficCongestionModel(self.roads)
        self.waste_model = MunicipalWasteModel()
        self.emissions_model = EmissionsModel()

        # 3. Load meteorological series from NASA POWER
        nasa_adapter = NasaPowerAdapter()
        raw_nasa = nasa_adapter.fetch(use_cache=True)
        self.weather_series = nasa_adapter.normalize(raw_nasa)
        # Map by hour of day (0 to 23)
        self.weather_by_hour = {}
        for row in self.weather_series:
            h = row["timestamp_hour"]
            if h not in self.weather_by_hour:
                self.weather_by_hour[h] = row

        # 4. State clock
        base_dt = datetime.strptime(settings.HISTORICAL_START_DATE, "%Y-%m-%d")
        self.start_time = base_dt.replace(tzinfo=self.ist_tz)
        self.current_time = self.start_time
        self.current_step = 0
        self.total_steps_in_day = int((24 * 3600) / self.timestep_seconds) # 288 steps

        self.snapshots: List[Dict[str, Any]] = []

    def set_event_factor(self, factor: float) -> None:
        """Set a multiplicative factor for traffic demand during event periods."""
        self.traffic_model.set_event_factor(factor)

        # 1. Load normalized city spatial assets
        city_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/pune_shivajinagar_city_data.json")
        )
        if not os.path.exists(city_data_path):
            raise FileNotFoundError(f"Normalized city data not found at {city_data_path}. Run PuneOsmAdapter first.")

        with open(city_data_path, "r", encoding="utf-8") as f:
            self.city_data = json.load(f)

        self.buildings = self.city_data.get("buildings", [])
        self.roads = self.city_data.get("roads", [])
        self.intersections = self.city_data.get("intersections", [])

        # 2. Instantiate domain models
        self.pop_model = PopulationActivityModel()
        self.energy_model = BuildingEnergyModel(self.buildings)
        self.solar_model = RooftopSolarModel(self.buildings)
        self.traffic_model = TrafficCongestionModel(self.roads)
        self.waste_model = MunicipalWasteModel()
        self.emissions_model = EmissionsModel()

        # 3. Load meteorological series from NASA POWER
        nasa_adapter = NasaPowerAdapter()
        raw_nasa = nasa_adapter.fetch(use_cache=True)
        self.weather_series = nasa_adapter.normalize(raw_nasa)
        # Map by hour of day (0 to 23)
        self.weather_by_hour = {}
        for row in self.weather_series:
            h = row["timestamp_hour"]
            if h not in self.weather_by_hour:
                self.weather_by_hour[h] = row

        # 4. State clock
        base_dt = datetime.strptime(settings.HISTORICAL_START_DATE, "%Y-%m-%d")
        self.start_time = base_dt.replace(tzinfo=self.ist_tz)
        self.current_time = self.start_time
        self.current_step = 0
        self.total_steps_in_day = int((24 * 3600) / self.timestep_seconds) # 288 steps

        self.snapshots: List[Dict[str, Any]] = []

    def reset(self, start_date_str: Optional[str] = None) -> None:
        """Reset simulation state to deterministic t=0."""
        self.rng = random.Random(self.seed)
        if start_date_str:
            base_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        else:
            base_dt = datetime.strptime(settings.HISTORICAL_START_DATE, "%Y-%m-%d")
        self.start_time = base_dt.replace(tzinfo=self.ist_tz)
        self.current_time = self.start_time
        self.current_step = 0
        self.snapshots.clear()
        self.waste_model.cumulative_generated_kg = 0.0
        self.waste_model.cumulative_collected_kg = 0.0

    def step(self) -> Dict[str, Any]:
        """
        Execute one 5-minute timestep.
        1. Advance simulation clock.
        2. Load temporal context (solar, temp).
        3. Calculate building demand and solar generation.
        4. Update traffic and congestion.
        5. Update waste accumulation and collection.
        6. Calculate tailpipe emissions and ambient AQ.
        7. Validate constraints.
        8. Store snapshot.
        9. Return frontend state.
        """
        # Step decimal hour in current day
        elapsed_seconds = self.current_step * self.timestep_seconds
        step_dt = self.start_time + timedelta(seconds=elapsed_seconds)
        self.current_time = step_dt

        hour_of_day = step_dt.hour + (step_dt.minute / 60.0)
        int_hour = step_dt.hour

        # 2. Temporal context
        weather = self.weather_by_hour.get(int_hour, {
            "ghi_w_per_sqm": 0.0, "temp_c": 28.0, "humidity_pct": 45.0, "wind_speed_ms": 2.5
        })
        ghi = weather["ghi_w_per_sqm"]
        temp = weather["temp_c"]

        # Interpolate solar irradiance across 5-min intervals within the hour
        if ghi > 0:
            minute_frac = step_dt.minute / 60.0
            solar_curve = 1.0 - 0.2 * abs(minute_frac - 0.5)
            interpolated_ghi = max(0.0, ghi * solar_curve)
        else:
            interpolated_ghi = 0.0

        # 3. Population & Energy
        pop_res = self.pop_model.get_population_at_time(hour_of_day)
        energy_res = self.energy_model.calculate_demand(hour_of_day, temp)
        solar_res = self.solar_model.calculate_generation(interpolated_ghi, temp)
        net_demand_kw = max(0.0, energy_res["total_demand_kw"] - solar_res["solar_generation_kw"])

        # 4. Traffic & Congestion
        traffic_res = self.traffic_model.update_traffic(hour_of_day)

        # 5. Waste
        waste_res = self.waste_model.step(hour_of_day, reset_day=(self.current_step % self.total_steps_in_day == 0 and self.current_step > 0))

        # 6. Emissions & Ambient Air Quality
        emissions_res = self.emissions_model.calculate_emissions(traffic_res, hour_of_day)

        # 7. Validate physical state constraints
        assert energy_res["total_demand_kw"] >= 0, "Energy demand cannot be negative"
        assert solar_res["solar_generation_kw"] >= 0, "Solar generation cannot be negative"
        assert traffic_res["avg_speed_kmh"] > 0, "Average speed must be positive"
        assert waste_res["current_uncollected_backlog_kg"] >= 0, "Waste backlog cannot be negative"

        # 8. Assemble snapshot
        snapshot = {
            "step_index": self.current_step,
            "timestamp_ist": step_dt.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "hour_of_day": round(hour_of_day, 2),
            "study_area": settings.STUDY_AREA_NAME,
            "weather": {
                "ambient_temp_c": temp,
                "solar_ghi_w_per_sqm": round(interpolated_ghi, 1),
                "source": "NASA_POWER"
            },
            "population": {
                "active_residents": pop_res["active_residents"],
                "active_floating": pop_res["active_floating"],
                "total_present": pop_res["total_present_population"]
            },
            "energy": {
                "demand_kw": energy_res["total_demand_kw"],
                "solar_generation_kw": solar_res["solar_generation_kw"],
                "net_grid_kw": round(net_demand_kw, 1),
                "solar_share_pct": round((solar_res["solar_generation_kw"] / energy_res["total_demand_kw"] * 100.0) if energy_res["total_demand_kw"] > 0 else 0.0, 1)
            },
            "traffic": {
                "active_vehicles": traffic_res["total_active_vehicles"],
                "avg_speed_kmh": traffic_res["avg_speed_kmh"],
                "congestion_level": traffic_res["congestion_level"],
                "delay_hours_per_hr": traffic_res["total_delay_hours_per_hr"]
            },
            "waste": {
                "timestep_generated_kg": waste_res["timestep_generated_kg"],
                "timestep_collected_kg": waste_res["timestep_collected_kg"],
                "cumulative_generated_kg": waste_res["cumulative_generated_kg"],
                "cumulative_collected_kg": waste_res["cumulative_collected_kg"],
                "uncollected_backlog_kg": waste_res["current_uncollected_backlog_kg"],
                "collection_active": waste_res["is_collection_active"]
            },
            "emissions": emissions_res["calculated_tailpipe_emissions"],
            "ambient_air_quality": emissions_res["observed_ambient_air_quality"],
            # Frontend compatible format:
            "frontend_metrics": {
                "vehiclesTracked": traffic_res["total_active_vehicles"],
                "vehiclesPerHourAtJunctions": int(traffic_res["total_vkt_km_per_hr"] / 2.0),
                "co2PerHour": emissions_res["calculated_tailpipe_emissions"]["co2_kg_per_hr"],
                "congestionCostPerHour": int(round(traffic_res["total_delay_hours_per_hr"] * 180.0)), # 180 INR/hr standard value of time (VoT) in Pune CMP
                "isSimulated": False,
                "sourceLabel": "Calibrated Multi-Source Model (Pune Shivajinagar–Deccan)"
            }
        }

        self.snapshots.append(snapshot)
        self.current_step += 1
        return snapshot

    def run_horizon(self, num_steps: Optional[int] = None) -> List[Dict[str, Any]]:
        """Run simulation for a complete daily horizon (default 288 steps = 24h)."""
        steps = num_steps or self.total_steps_in_day
        print(f"[SimulationEngine] Running {steps} steps (5-minute intervals)...")
        results = []
        for _ in range(steps):
            results.append(self.step())
        print(f"[SimulationEngine] Completed {len(results)} steps successfully.")
        return results

    def save_trajectory(self, output_path: Optional[str] = None) -> str:
        path = output_path or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/pune_simulation_trajectory.json")
        )
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "study_area": settings.STUDY_AREA_NAME,
                "timestep_seconds": self.timestep_seconds,
                "steps_count": len(self.snapshots),
                "trajectory": self.snapshots
            }, f, indent=2)
        print(f"[SimulationEngine] Trajectory written to {path}")
        return path

simulation_engine = SimulationEngine(seed=settings.RANDOM_SEED)
