from typing import Dict, Any, Tuple
from app.data_sources.census_ogd_population_adapter import CensusPopulationAdapter

class PopulationActivityModel:
    """
    Simulates spatial and temporal population presence in the Shivajinagar-Deccan corridor.
    Distinguishes between resident population (domiciled) and daytime floating population
    (students, shoppers, office staff on FC Road, JM Road, and college campuses).
    """
    def __init__(self):
        adapter = CensusPopulationAdapter()
        raw = adapter.fetch()
        self.demographics = adapter.normalize(raw)
        self.resident_baseline = self.demographics["resident_population"]
        self.peak_floating = self.demographics["peak_floating_population"]
        self.diurnal = self.demographics["diurnal_factors"]

    def get_population_at_time(self, hour: float) -> Dict[str, Any]:
        """
        Returns active residential and floating population for a given decimal hour (0.0 to 24.0).
        """
        int_hour = int(hour) % 24
        
        # Determine diurnal bin
        if 0 <= int_hour < 3:
            key = "00_03"
        elif 3 <= int_hour < 6:
            key = "03_06"
        elif 6 <= int_hour < 9:
            key = "06_09"
        elif 9 <= int_hour < 12:
            key = "09_12"
        elif 12 <= int_hour < 15:
            key = "12_15"
        elif 15 <= int_hour < 18:
            key = "15_18"
        elif 18 <= int_hour < 21:
            key = "18_21"
        else:
            key = "21_24"

        factors = self.diurnal[key]
        active_residents = int(round(self.resident_baseline * factors["residential"]))
        active_floating = int(round(self.peak_floating * factors["floating"]))
        total_present = active_residents + active_floating

        return {
            "hour": hour,
            "bin": key,
            "active_residents": active_residents,
            "active_floating": active_floating,
            "total_present_population": total_present,
            "density_persons_per_sqkm": round(total_present / 4.0, 1),
            "is_peak_commercial": 10 <= int_hour <= 20
        }
