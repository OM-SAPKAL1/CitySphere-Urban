import pytest
from datetime import datetime, timezone, timedelta
from app.normalization.aligner import data_aligner

def test_spatial_bounds_validation():
    # Center of Pune Deccan
    assert data_aligner.validate_spatial_bounds(18.5246, 73.8445) is True
    # Outside point (e.g. Mumbai)
    assert data_aligner.validate_spatial_bounds(19.0760, 72.8777) is False

def test_to_utm43n_projection():
    easting, northing = data_aligner.to_utm43n(18.5246, 73.8445)
    # Pune UTM 43N approximate coordinates: Easting ~377,000m, Northing ~2,048,000m
    assert 350000.0 < easting < 400000.0
    assert 2000000.0 < northing < 2100000.0

def test_standardize_timestamp_ist():
    dt_utc = datetime(2024, 3, 1, 6, 0, tzinfo=timezone.utc)
    ist_str = data_aligner.standardize_timestamp_ist(dt_utc)
    assert "+05:30" in ist_str
    assert "11:30:00" in ist_str

def test_temporal_disaggregation_logging():
    record = data_aligner.record_temporal_disaggregation(
        variable_name="waste_accumulation",
        original_resolution="daily",
        target_resolution="5_minutes",
        method="diurnal_weighted_linear"
    )
    assert record["classification"] == "derived_temporal_disaggregation"
    assert record["is_measured"] is False
