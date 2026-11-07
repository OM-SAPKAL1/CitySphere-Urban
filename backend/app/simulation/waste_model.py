from typing import Dict, Any
from app.data_sources.municipal_waste_adapter import MunicipalWasteAdapter

class MunicipalWasteModel:
    """
    Simulates municipal solid waste (MSW) generation and collection accumulation
    across Shivajinagar-Deccan in 5-minute timesteps.
    Simulates PMC morning collection window (06:30 - 11:30 IST).
    """
    def __init__(self, resident_population: int = 62500, commercial_floor_sqm: float = 850000.0):
        adapter = MunicipalWasteAdapter()
        raw = adapter.fetch()
        self.params = adapter.normalize(raw)

        # Baseline daily totals in kg
        self.domestic_daily_kg = resident_population * self.params["domestic_per_capita_kg_day"]
        self.commercial_daily_kg = commercial_floor_sqm * self.params["commercial_per_sqm_kg_day"]
        self.floating_daily_kg = 48000 * self.params["floating_per_person_kg_day"]
        self.total_daily_waste_kg = round(self.domestic_daily_kg + self.commercial_daily_kg + self.floating_daily_kg, 1)

        # 5-minute timestep generation (288 intervals in a day)
        self.step_generation_kg = self.total_daily_waste_kg / 288.0

        # Collection parameters
        self.start_col_hr = self.params["collection"]["primary_collection_start_hour"] # 6.5 (06:30)
        self.end_col_hr = self.params["collection"]["primary_collection_end_hour"]     # 11.5 (11:30)
        self.col_duration_hrs = self.end_col_hr - self.start_col_hr
        self.col_steps = int((self.col_duration_hrs * 60) / 5) # 60 steps

        # Total collected daily target (92.5% efficiency)
        self.daily_target_collected_kg = self.total_daily_waste_kg * (self.params["collection"]["daily_collection_efficiency_pct"] / 100.0)
        self.step_collection_rate_kg = self.daily_target_collected_kg / self.col_steps if self.col_steps > 0 else 0.0

        self.cumulative_generated_kg = 0.0
        self.cumulative_collected_kg = 0.0

    def step(self, hour: float, reset_day: bool = False) -> Dict[str, Any]:
        """
        Advance one 5-minute timestep.
        """
        if reset_day:
            self.cumulative_generated_kg = 0.0
            self.cumulative_collected_kg = 0.0

        # Diurnal generation weighting: higher during daytime (07:00 - 21:00)
        hour_mod = hour % 24.0
        if 7.0 <= hour_mod <= 21.0:
            gen_mult = 1.35
        elif 21.0 < hour_mod or hour_mod < 6.0:
            gen_mult = 0.35
        else:
            gen_mult = 0.90

        gen_this_step = self.step_generation_kg * gen_mult
        self.cumulative_generated_kg += gen_this_step

        # Collection occurs strictly between 06:30 and 11:30 IST
        is_collecting = self.start_col_hr <= hour_mod <= self.end_col_hr
        col_this_step = 0.0
        if is_collecting:
            col_this_step = min(self.cumulative_generated_kg - self.cumulative_collected_kg, self.step_collection_rate_kg)
            self.cumulative_collected_kg += col_this_step

        backlog_kg = max(0.0, self.cumulative_generated_kg - self.cumulative_collected_kg)

        return {
            "hour": hour,
            "timestep_generated_kg": round(gen_this_step, 2),
            "timestep_collected_kg": round(col_this_step, 2),
            "cumulative_generated_kg": round(self.cumulative_generated_kg, 1),
            "cumulative_collected_kg": round(self.cumulative_collected_kg, 1),
            "current_uncollected_backlog_kg": round(backlog_kg, 1),
            "wet_organic_backlog_kg": round(backlog_kg * (self.params["wet_pct"] / 100.0), 1),
            "dry_recyclable_backlog_kg": round(backlog_kg * (self.params["dry_pct"] / 100.0), 1),
            "is_collection_active": is_collecting,
            "daily_total_expected_kg": self.total_daily_waste_kg,
            "daily_total_expected_metric_tons": round(self.total_daily_waste_kg / 1000.0, 2)
        }
