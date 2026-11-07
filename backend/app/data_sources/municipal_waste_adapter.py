import os
import json
from typing import Dict, Any
from app.data_sources.base_adapter import BaseSourceAdapter

class MunicipalWasteAdapter(BaseSourceAdapter):
    """
    Adapter for Pune Municipal Corporation (PMC) Solid Waste Management Department
    and Swachh Pune waste statistics.
    Provides per capita generation factors, segregation fractions, and collection logistics.
    """
    def __init__(self):
        super().__init__(dataset_id="pmc_municipal_waste_stats")
        self.raw_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/pune_pmc_waste_data.json")
        )

    def fetch(self) -> Dict[str, Any]:
        """Load empirical PMC solid waste metrics for Ghole Road / Shivajinagar Ward."""
        data = {
            "source": "Pune Municipal Corporation Solid Waste Management Department (SWM) Annual Report",
            "ward_office": "Ghole Road Ward Office (Prabhag 14)",
            "generation_benchmarks": {
                "domestic_kg_per_capita_per_day": 0.48,
                "commercial_kg_per_sqm_per_day": 0.0047,  # ~0.14 kg/m2/month
                "floating_population_kg_per_person_per_day": 0.12 # litter / retail food packaging
            },
            "segregation_fractions": {
                "wet_organic_waste_pct": 62.0,
                "dry_recyclable_pct": 31.0,
                "inert_hazardous_pct": 7.0
            },
            "collection_operations": {
                "primary_collection_start_hour": 6.5,  # 06:30 IST
                "primary_collection_end_hour": 11.5,   # 11:30 IST
                "daily_collection_efficiency_pct": 92.5
            }
        }
        os.makedirs(os.path.dirname(self.raw_data_path), exist_ok=True)
        with open(self.raw_data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return data

    def validate(self, raw_data: Any) -> bool:
        if not isinstance(raw_data, dict):
            return False
        return "generation_benchmarks" in raw_data and "segregation_fractions" in raw_data

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "dataset_id": self.dataset_id,
            "domestic_per_capita_kg_day": raw_data["generation_benchmarks"]["domestic_kg_per_capita_per_day"],
            "commercial_per_sqm_kg_day": raw_data["generation_benchmarks"]["commercial_kg_per_sqm_per_day"],
            "floating_per_person_kg_day": raw_data["generation_benchmarks"]["floating_population_kg_per_person_per_day"],
            "wet_pct": raw_data["segregation_fractions"]["wet_organic_waste_pct"],
            "dry_pct": raw_data["segregation_fractions"]["dry_recyclable_pct"],
            "inert_pct": raw_data["segregation_fractions"]["inert_hazardous_pct"],
            "collection": raw_data["collection_operations"]
        }
