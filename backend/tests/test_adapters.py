import pytest
from app.data_sources.census_ogd_population_adapter import CensusPopulationAdapter
from app.data_sources.nasa_power_adapter import NasaPowerAdapter
from app.data_sources.allure_energy_adapter import AllureEnergyAdapter
from app.data_sources.chetna_emissions_adapter import ChetnaEmissionsAdapter
from app.data_sources.air_quality_adapter import AirQualityAdapter
from app.data_sources.pune_traffic_cmp_adapter import PuneTrafficCmpAdapter
from app.data_sources.municipal_waste_adapter import MunicipalWasteAdapter
from app.data_sources.osm_pune_adapter import PuneOsmAdapter

def test_census_adapter():
    adapter = CensusPopulationAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert norm["resident_population"] == 62500
    assert norm["density_per_sq_km"] > 10000
    assert "diurnal_factors" in norm

def test_nasa_power_adapter():
    adapter = NasaPowerAdapter()
    raw = adapter.fetch(use_cache=True)
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert len(norm) > 0
    first = norm[0]
    assert "timestamp_ist" in first
    assert first["temp_c"] > 0
    assert first["ghi_w_per_sqm"] >= 0

def test_allure_energy_adapter():
    adapter = AllureEnergyAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert "eui_benchmarks" in norm
    assert "residential" in norm["eui_benchmarks"]

def test_chetna_emissions_adapter():
    adapter = ChetnaEmissionsAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert "emission_factors" in norm
    assert norm["emission_factors"]["two_wheeler"]["co2"] == 28.5

def test_air_quality_adapter():
    adapter = AirQualityAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert len(norm) == 24
    assert norm[0]["station_name"].startswith("Shivajinagar")
    assert norm[0]["is_observed"] is True

def test_pune_traffic_cmp_adapter():
    adapter = PuneTrafficCmpAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert len(norm["corridors"]) >= 4
    assert norm["mode_share"]["two_wheeler"] > 50

def test_municipal_waste_adapter():
    adapter = MunicipalWasteAdapter()
    raw = adapter.fetch()
    assert adapter.validate(raw) is True
    norm = adapter.normalize(raw)
    assert norm["domestic_per_capita_kg_day"] == 0.48
    assert norm["wet_pct"] == 62.0

def test_osm_adapter_bbox():
    adapter = PuneOsmAdapter()
    bbox = adapter.get_bbox()
    parts = [float(p) for p in bbox.split(",")]
    assert len(parts) == 4
    # Check that South < North and West < East
    assert parts[0] < parts[2]
    assert parts[1] < parts[3]
