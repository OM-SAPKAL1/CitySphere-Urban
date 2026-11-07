import pytest
from app.validation.calibration import calibration_validator
from app.simulation.engine import simulation_engine

def test_geh_statistic_calculation():
    # If modeled and observed are identical, GEH should be 0
    geh_zero = calibration_validator.calculate_geh(4000.0, 4000.0)
    assert geh_zero == 0.0

    # Test small discrepancy (e.g. 4200 vs 4000)
    geh_small = calibration_validator.calculate_geh(4200.0, 4000.0)
    assert geh_small < 5.0 # Well within good calibration threshold

def test_calibration_report_structure():
    simulation_engine.reset()
    trajectory = [simulation_engine.step() for _ in range(24)]
    report = calibration_validator.evaluate(trajectory)
    
    assert "traffic_calibration" in report
    assert "energy_calibration" in report
    assert "solar_pv_calibration" in report
    assert "municipal_waste_calibration" in report
    assert "data_gaps_and_limitations" in report
    assert len(report["data_gaps_and_limitations"]) >= 3
