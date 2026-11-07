import pytest
from app.simulation.engine import simulation_engine

def test_simulation_step_execution():
    simulation_engine.reset()
    snapshot = simulation_engine.step()
    
    assert snapshot["step_index"] == 0
    assert "2024-03-01T00:00:00+05:30" in snapshot["timestamp_ist"]
    assert snapshot["energy"]["demand_kw"] > 0
    assert snapshot["traffic"]["active_vehicles"] > 0
    assert snapshot["waste"]["timestep_generated_kg"] > 0
    assert snapshot["emissions"]["co2_kg_per_hr"] > 0
    assert "ambient_air_quality" in snapshot

def test_physical_constraints():
    # Execute 12 steps (1 hour)
    for _ in range(12):
        s = simulation_engine.step()
        assert s["energy"]["demand_kw"] >= 0
        assert s["energy"]["solar_generation_kw"] >= 0
        assert s["traffic"]["avg_speed_kmh"] > 0
        assert s["waste"]["uncollected_backlog_kg"] >= 0

def test_deterministic_reproducibility():
    simulation_engine.reset()
    snap1 = simulation_engine.step()
    val1 = snap1["energy"]["demand_kw"]
    
    simulation_engine.reset()
    snap2 = simulation_engine.step()
    val2 = snap2["energy"]["demand_kw"]
    
    assert val1 == val2
