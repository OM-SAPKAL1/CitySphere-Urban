import math
from typing import Dict, Any, List
from app.data_sources.pune_traffic_cmp_adapter import PuneTrafficCmpAdapter

class TrafficCongestionModel:
    """
    Simulates link-level traffic demand, volume-to-capacity (V/C) ratios,
    and congested speeds on road segments using Pune CMP baselines
    and the standard Bureau of Public Roads (BPR) delay formulation.
    """
    def __init__(self, roads_data: List[Dict[str, Any]]):
        self.roads = roads_data
        adapter = PuneTrafficCmpAdapter()
        raw = adapter.fetch()
        self.cmp_data = adapter.normalize(raw)
        self.diurnal_factors = self.cmp_data["diurnal_traffic_factors"]
        self.mode_share = self.cmp_data["mode_share"]
        self.bpr_alpha = 0.15 # BPR standard congestion parameter
        self.bpr_beta = 4.0   # BPR exponent parameter
        # Event factor for scaling demand during a defined event period
        self.event_factor: float = 1.0

    def set_event_factor(self, factor: float) -> None:
        """Set a multiplicative factor to scale traffic demand during event periods."""
        self.event_factor = factor

    def update_traffic(self, hour: float) -> Dict[str, Any]:
        """
        Calculates traffic flow, congested speeds, and delays across all segments.
        """
        int_hour = int(hour) % 24
        hourly_demand_mult = self.diurnal_factors[int_hour] * self.event_factor

        total_vehicles_active = 0
        total_vkt = 0.0 # Vehicle-Kilometers Traveled
        total_delay_hours = 0.0
        congested_segments = 0
        speed_sum = 0.0

        segment_results = []

        for r in self.roads:
            props = r.get("properties", {})
            length_km = props.get("lengthMeters", 100.0) / 1000.0
            capacity = props.get("capacity", 1000.0)
            free_speed = props.get("maxspeed", 40.0)
            name = (props.get("name") or "").lower()

            # Arterial multiplier based on corridor prominence (FC Rd, JM Rd, Karve Rd)
            if "jangali maharaj" in name or "jm road" in name:
                base_flow = capacity * 0.70
            elif "fergusson" in name or "fc road" in name or "gopal krushna" in name:
                base_flow = capacity * 0.65
            elif "karve" in name:
                base_flow = capacity * 0.75
            else:
                base_flow = capacity * 0.35

            # Current volume assigned
            current_volume = min(capacity * 1.5, base_flow * hourly_demand_mult)
            vc_ratio = current_volume / capacity if capacity > 0 else 0.5

            # BPR congestion speed reduction
            # Travel time t = t0 * [1 + alpha * (V/C)^beta]
            # Speed v = v0 / [1 + alpha * (V/C)^beta]
            congestion_factor = 1.0 + self.bpr_alpha * (vc_ratio ** self.bpr_beta)
            actual_speed = max(6.0, free_speed / congestion_factor) # Minimum crawl speed 6 km/h

            free_time_hrs = length_km / free_speed if free_speed > 0 else 0.0
            actual_time_hrs = length_km / actual_speed if actual_speed > 0 else 0.0
            delay_hrs = max(0.0, actual_time_hrs - free_time_hrs) * current_volume

            total_delay_hours += delay_hrs
            vkt = current_volume * length_km
            total_vkt += vkt
            speed_sum += actual_speed

            # Active vehicles on link = Density (veh/km) * length (km)
            # Density = Volume / Speed
            vehicles_on_link = int(round((current_volume / actual_speed) * length_km))
            total_vehicles_active += vehicles_on_link

            if vc_ratio >= 0.85:
                congested_segments += 1

        avg_speed = round(speed_sum / len(self.roads), 1) if self.roads else 30.0

        return {
            "hour": hour,
            "demand_multiplier": round(hourly_demand_mult, 2),
            "total_active_vehicles": max(120, total_vehicles_active),
            "total_vkt_km_per_hr": round(total_vkt, 1),
            "avg_speed_kmh": avg_speed,
            "total_delay_hours_per_hr": round(total_delay_hours, 1),
            "congested_segments_count": congested_segments,
            "total_segments": len(self.roads),
            "congestion_level": (
                "congested" if avg_speed < 16.0
                else "heavy" if avg_speed < 24.0
                else "moderate" if avg_speed < 32.0
                else "free-flow"
            ),
            "mode_share": self.mode_share
        }
