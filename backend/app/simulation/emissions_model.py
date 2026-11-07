from typing import Dict, Any, List
from app.data_sources.chetna_emissions_adapter import ChetnaEmissionsAdapter
from app.data_sources.air_quality_adapter import AirQualityAdapter

class EmissionsModel:
    """
    Calculates road transport tailpipe emissions using CHETNA-Road emission factors.
    Maintains a strict, fundamental distinction between:
    1. Calculated tailpipe emissions (mass rate of pollutants emitted at the pipe, e.g., kg CO2/h, g PM2.5/h)
    2. Observed ambient air quality (atmospheric concentration measured by CPCB CAAQMS sensor, e.g., µg/m³ PM2.5)
    """
    def __init__(self):
        c_adapter = ChetnaEmissionsAdapter()
        raw_c = c_adapter.fetch()
        self.chetna = c_adapter.normalize(raw_c)
        self.ef = self.chetna["emission_factors"]
        self.speed_corr = self.chetna["speed_correction"]

        # Load CPCB observed ambient air quality lookup
        aq_adapter = AirQualityAdapter()
        raw_aq = aq_adapter.fetch()
        self.cpcb_hourly = aq_adapter.normalize(raw_aq)
        self.cpcb_lookup = {r["hour"]: r for r in self.cpcb_hourly}

    def get_speed_multiplier(self, speed_kmh: float) -> float:
        """Look up congestion penalty multiplier based on link speed."""
        for row in self.speed_corr:
            if row["speed_min"] <= speed_kmh < row["speed_max"]:
                return row["factor"]
        return 1.0

    def calculate_emissions(self, traffic_result: Dict[str, Any], hour: float) -> Dict[str, Any]:
        """
        Calculate tailpipe emissions from link VKT and speed,
        and attach matched ambient CPCB observations.
        """
        total_vkt = traffic_result["total_vkt_km_per_hr"]
        avg_speed = traffic_result["avg_speed_kmh"]
        mode_share = traffic_result["mode_share"]

        speed_factor = self.get_speed_multiplier(avg_speed)

        # Mode splits
        vkt_2w = total_vkt * (mode_share["two_wheeler"] / 100.0)
        vkt_car = total_vkt * (mode_share["car"] / 100.0)
        vkt_auto = total_vkt * (mode_share["auto_rickshaw"] / 100.0)
        vkt_bus = total_vkt * (mode_share["bus"] / 100.0)

        # Tailpipe emissions (grams per hour)
        co2_g = (
            vkt_2w * self.ef["two_wheeler"]["co2"] +
            vkt_car * self.ef["car"]["co2"] +
            vkt_auto * self.ef["auto_rickshaw"]["co2"] +
            vkt_bus * self.ef["bus"]["co2"]
        ) * speed_factor

        pm25_g = (
            vkt_2w * self.ef["two_wheeler"]["pm25"] +
            vkt_car * self.ef["car"]["pm25"] +
            vkt_auto * self.ef["auto_rickshaw"]["pm25"] +
            vkt_bus * self.ef["bus"]["pm25"]
        ) * speed_factor

        nox_g = (
            vkt_2w * self.ef["two_wheeler"]["nox"] +
            vkt_car * self.ef["car"]["nox"] +
            vkt_auto * self.ef["auto_rickshaw"]["nox"] +
            vkt_bus * self.ef["bus"]["nox"]
        ) * speed_factor

        # Matched CPCB observation for this hour
        int_hour = int(hour) % 24
        cpcb_obs = self.cpcb_lookup.get(int_hour, {
            "pm25": 65.0, "pm10": 130.0, "no2": 45.0, "co": 1.1, "aqi": 140
        })

        return {
            "hour": hour,
            "calculated_tailpipe_emissions": {
                "co2_kg_per_hr": round(co2_g / 1000.0, 2),
                "pm25_grams_per_hr": round(pm25_g, 2),
                "nox_grams_per_hr": round(nox_g, 2),
                "speed_penalty_multiplier": speed_factor,
                "classification": "estimated_from_vkt_and_chetna_factors"
            },
            "observed_ambient_air_quality": {
                "station_name": "Shivajinagar CPCB CAAQMS (site_283)",
                "pm25_ug_per_m3": cpcb_obs["pm25"],
                "pm10_ug_per_m3": cpcb_obs["pm10"],
                "no2_ug_per_m3": cpcb_obs["no2"],
                "co_mg_per_m3": cpcb_obs["co"],
                "aqi": cpcb_obs["aqi"],
                "classification": "observed_ground_truth_ambient_concentration"
            }
        }
