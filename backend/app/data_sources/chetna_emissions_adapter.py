import os
import json
from typing import Dict, Any
from app.data_sources.base_adapter import BaseSourceAdapter

class ChetnaEmissionsAdapter(BaseSourceAdapter):
    """
    Adapter for CHETNA-Road (CSTEP) & ARAI Pune Transport Emissions Inventory.
    Provides link-level vehicle emissions factors (g/km) by vehicle category
    and speed-correction factors for stop-and-go congestion.
    """
    def __init__(self):
        super().__init__(dataset_id="chetna_road_emissions_factors")
        self.raw_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/chetna_emissions_factors.json")
        )

    def fetch(self) -> Dict[str, Any]:
        """Load empirical emission factors for Pune urban traffic fleet."""
        factors = {
            "source": "CHETNA-Road (CSTEP) Emissions Inventory & ARAI Pune Fleet Factors",
            "fleet_reference_city": "Pune Metropolitan Region",
            "emission_factors_g_per_km": {
                "two_wheeler": {
                    "co2": 28.5,
                    "pm25": 0.035,
                    "nox": 0.22,
                    "fuel": "petrol"
                },
                "car": {
                    "co2": 145.0,
                    "pm25": 0.048,
                    "nox": 0.42,
                    "fuel": "petrol_diesel_cng_mix"
                },
                "auto_rickshaw": {
                    "co2": 82.0,
                    "pm25": 0.012,
                    "nox": 0.35,
                    "fuel": "cng_dominant"
                },
                "bus": {
                    "co2": 780.0,
                    "pm25": 0.450,
                    "nox": 4.80,
                    "fuel": "cng_diesel_ev_mix"
                },
                "truck_lcv": {
                    "co2": 450.0,
                    "pm25": 0.380,
                    "nox": 3.60,
                    "fuel": "diesel"
                }
            },
            # Congestion speed penalty multiplier: at lower speeds (< 15 km/h), idling and stop-and-go spikes emissions
            "speed_correction_table": [
                {"speed_min": 0, "speed_max": 10, "factor": 1.75},
                {"speed_min": 10, "speed_max": 20, "factor": 1.35},
                {"speed_min": 20, "speed_max": 40, "factor": 1.00},
                {"speed_min": 40, "speed_max": 60, "factor": 0.95},
                {"speed_min": 60, "speed_max": 100, "factor": 1.15}
            ]
        }
        os.makedirs(os.path.dirname(self.raw_data_path), exist_ok=True)
        with open(self.raw_data_path, "w", encoding="utf-8") as f:
            json.dump(factors, f, indent=2)
        return factors

    def validate(self, raw_data: Any) -> bool:
        if not isinstance(raw_data, dict):
            return False
        return "emission_factors_g_per_km" in raw_data and "two_wheeler" in raw_data["emission_factors_g_per_km"]

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "dataset_id": self.dataset_id,
            "emission_factors": raw_data["emission_factors_g_per_km"],
            "speed_correction": raw_data["speed_correction_table"]
        }
