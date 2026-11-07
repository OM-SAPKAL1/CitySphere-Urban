from typing import Dict, Any, List
from app.data_sources.allure_energy_adapter import AllureEnergyAdapter

class BuildingEnergyModel:
    """
    Computes building electricity demand across the Shivajinagar-Deccan study area
    using AllUrE-India empirical benchmarks, floor areas, building typologies,
    and ambient temperature from NASA POWER.
    """
    def __init__(self, buildings_data: List[Dict[str, Any]]):
        self.buildings = buildings_data
        adapter = AllureEnergyAdapter()
        raw = adapter.fetch()
        self.benchmarks = adapter.normalize(raw)
        self.eui = self.benchmarks["eui_benchmarks"]
        self.load_curves = self.benchmarks["diurnal_load_curves"]
        self.base_temp_c = self.benchmarks["base_temp_c"]
        self.cooling_sens = self.benchmarks["cooling_sensitivity"]

        # Precalculate aggregate floor areas by archetype
        self.total_floor_area_sqm = 0.0
        self.residential_floor_sqm = 0.0
        self.commercial_floor_sqm = 0.0
        self.institutional_floor_sqm = 0.0

        for b in self.buildings:
            props = b.get("properties", {})
            fa = props.get("floorArea", props.get("footprintArea", 100.0) * 3)
            self.total_floor_area_sqm += fa
            b_type = (props.get("building") or "residential").lower()

            if any(k in b_type for k in ["commercial", "office", "retail", "hotel", "bank"]):
                self.commercial_floor_sqm += fa
            elif any(k in b_type for k in ["school", "university", "college", "hospital", "civic"]):
                self.institutional_floor_sqm += fa
            else:
                self.residential_floor_sqm += fa

    def calculate_demand(self, hour: float, ambient_temp_c: float) -> Dict[str, Any]:
        """
        Calculate total electrical demand (kW) at a given hour and temperature.
        """
        int_hour = int(hour) % 24
        res_curve_mult = self.load_curves["residential"][int_hour]
        com_curve_mult = self.load_curves["commercial"][int_hour]

        # Cooling degree multiplier for AC load
        temp_delta = max(0.0, ambient_temp_c - self.base_temp_c)
        cooling_mult = 1.0 + (temp_delta * self.cooling_sens)

        # Baseline average daily power densities in kW/sqm (from AllUrE EUI / 24h)
        # Commercial baseline: 0.370 kWh/sqm/day -> 0.0154 kW/sqm average
        # Institutional: 0.151 kWh/sqm/day -> 0.0063 kW/sqm average
        # Residential: 1.267 kWh/capita/day -> approx 0.010 kW/sqm average
        res_kw = self.residential_floor_sqm * 0.010 * res_curve_mult * (1.0 + (temp_delta * 0.02))
        com_kw = self.commercial_floor_sqm * 0.0154 * com_curve_mult * cooling_mult
        inst_kw = self.institutional_floor_sqm * 0.0063 * com_curve_mult * cooling_mult

        total_demand_kw = round(res_kw + com_kw + inst_kw, 1)

        return {
            "hour": hour,
            "ambient_temp_c": ambient_temp_c,
            "cooling_load_multiplier": round(cooling_mult, 3),
            "residential_demand_kw": round(res_kw, 1),
            "commercial_demand_kw": round(com_kw, 1),
            "institutional_demand_kw": round(inst_kw, 1),
            "total_demand_kw": total_demand_kw,
            "demand_mw": round(total_demand_kw / 1000.0, 2),
            "total_floor_area_sqm": round(self.total_floor_area_sqm, 1)
        }
