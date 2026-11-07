import os
import json
from typing import Dict, Any
from app.data_sources.base_adapter import BaseSourceAdapter

class AllureEnergyAdapter(BaseSourceAdapter):
    """
    Adapter for AllUrE-India (All-India Urban Residential & Commercial Energy Model)
    published by CSTEP & Bureau of Energy Efficiency (BEE).
    Provides empirical specific consumption benchmarks and archetype diurnal load curves for Pune.
    """
    def __init__(self):
        super().__init__(dataset_id="allure_india_energy_benchmarks")
        self.raw_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/allure_energy_benchmarks.json")
        )

    def fetch(self) -> Dict[str, Any]:
        """Load empirical AllUrE-India benchmark factors for Pune/Western India Composite Climate."""
        benchmarks = {
            "source": "AllUrE-India (CSTEP / BEE) Building Energy Database & Western India Urban Benchmarks",
            "climate_zone": "Composite / Warm-Humid Transition (Pune Urban Region)",
            "base_cooling_setpoint_c": 25.0,
            "cooling_sensitivity_pct_per_deg_c": 0.035, # +3.5% electrical load per °C above 25°C
            "eui_benchmarks": {
                "residential": {
                    "monthly_kwh_per_capita": 38.0,
                    "daily_kwh_per_capita": 1.267,
                    "peak_coincidence_factor": 0.65
                },
                "commercial_office": {
                    "annual_kwh_per_sqm": 135.0,
                    "monthly_kwh_per_sqm": 11.25,
                    "daily_kwh_per_sqm": 0.370
                },
                "retail_commercial": {
                    "annual_kwh_per_sqm": 165.0,
                    "monthly_kwh_per_sqm": 13.75,
                    "daily_kwh_per_sqm": 0.452
                },
                "educational_institutional": {
                    "annual_kwh_per_sqm": 55.0,
                    "monthly_kwh_per_sqm": 4.58,
                    "daily_kwh_per_sqm": 0.151
                },
                "hospital_healthcare": {
                    "annual_kwh_per_sqm": 210.0,
                    "monthly_kwh_per_sqm": 17.50,
                    "daily_kwh_per_sqm": 0.575
                },
                "mixed_default": {
                    "annual_kwh_per_sqm": 90.0,
                    "monthly_kwh_per_sqm": 7.50,
                    "daily_kwh_per_sqm": 0.247
                }
            },
            # 24-hour diurnal profile multipliers (sum to 24.0)
            "diurnal_load_curves": {
                "residential": [
                    0.65, 0.55, 0.50, 0.48, 0.52, 0.70,
                    1.10, 1.25, 1.15, 0.90, 0.85, 0.80,
                    0.85, 0.90, 0.95, 0.95, 1.05, 1.20,
                    1.45, 1.60, 1.70, 1.65, 1.30, 0.90
                ],
                "commercial": [
                    0.15, 0.12, 0.10, 0.10, 0.15, 0.25,
                    0.50, 0.95, 1.45, 1.70, 1.80, 1.75,
                    1.65, 1.70, 1.75, 1.70, 1.65, 1.40,
                    1.05, 0.80, 0.55, 0.35, 0.25, 0.18
                ]
            }
        }
        os.makedirs(os.path.dirname(self.raw_data_path), exist_ok=True)
        with open(self.raw_data_path, "w", encoding="utf-8") as f:
            json.dump(benchmarks, f, indent=2)
        return benchmarks

    def validate(self, raw_data: Any) -> bool:
        if not isinstance(raw_data, dict):
            return False
        return "eui_benchmarks" in raw_data and "diurnal_load_curves" in raw_data

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "dataset_id": self.dataset_id,
            "climate_zone": raw_data["climate_zone"],
            "eui_benchmarks": raw_data["eui_benchmarks"],
            "cooling_sensitivity": raw_data["cooling_sensitivity_pct_per_deg_c"],
            "base_temp_c": raw_data["base_cooling_setpoint_c"],
            "diurnal_load_curves": raw_data["diurnal_load_curves"]
        }
