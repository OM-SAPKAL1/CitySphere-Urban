from typing import Dict, Any, List

class RooftopSolarModel:
    """
    Simulates rooftop photovoltaic (PV) electrical generation across Shivajinagar-Deccan
    using usable roof areas extracted from OSM buildings, NASA POWER hourly solar irradiance (GHI),
    and standard Pune rooftop PV efficiency and performance ratios (PR).
    """
    def __init__(self, buildings_data: List[Dict[str, Any]]):
        self.buildings = buildings_data
        
        # Calculate aggregate usable roof area and installed PV capacity
        # Assume 25% current rooftop PV adoption penetration in study area (PMC solar mandate + institutional PV)
        self.total_usable_roof_sqm = 0.0
        self.pv_adoption_penetration = 0.25 # 25% of roofs have PV installed
        self.module_efficiency = 0.17       # 17% module efficiency (standard polycrystalline)
        self.performance_ratio = 0.75       # 75% system PR (inverter losses, soiling/dust in Pune, temperature derating)

        for b in self.buildings:
            props = b.get("properties", {})
            usable_roof = props.get("usableRoofArea", props.get("footprintArea", 100.0) * 0.70)
            self.total_usable_roof_sqm += usable_roof

        self.installed_pv_area_sqm = self.total_usable_roof_sqm * self.pv_adoption_penetration
        self.installed_capacity_kwp = round(self.installed_pv_area_sqm * 0.15, 1) # ~150 Wp / sqm

    def calculate_generation(self, ghi_w_per_sqm: float, ambient_temp_c: float = 25.0) -> Dict[str, Any]:
        """
        Calculate solar power generated (kW) given Global Horizontal Irradiance (W/m²).
        Applies temperature derating: -0.4% efficiency per °C above 25°C.
        """
        if ghi_w_per_sqm <= 0.0:
            return {
                "solar_irradiance_w_per_sqm": 0.0,
                "solar_generation_kw": 0.0,
                "solar_generation_mw": 0.0,
                "installed_capacity_kwp": self.installed_capacity_kwp,
                "capacity_utilization_pct": 0.0
            }

        # Temperature derating factor
        temp_loss = max(0.0, (ambient_temp_c - 25.0) * 0.004)
        effective_pr = self.performance_ratio * (1.0 - temp_loss)

        # Solar power = Area (m²) * Irradiance (kW/m²) * Efficiency * PR
        irr_kw_m2 = ghi_w_per_sqm / 1000.0
        power_kw = self.installed_pv_area_sqm * irr_kw_m2 * self.module_efficiency * effective_pr
        power_kw = round(max(0.0, power_kw), 1)

        cuf = round((power_kw / self.installed_capacity_kwp * 100.0) if self.installed_capacity_kwp > 0 else 0.0, 1)

        return {
            "solar_irradiance_w_per_sqm": round(ghi_w_per_sqm, 1),
            "solar_generation_kw": power_kw,
            "solar_generation_mw": round(power_kw / 1000.0, 3),
            "installed_capacity_kwp": self.installed_capacity_kwp,
            "installed_pv_area_sqm": round(self.installed_pv_area_sqm, 1),
            "capacity_utilization_pct": min(100.0, cuf)
        }
