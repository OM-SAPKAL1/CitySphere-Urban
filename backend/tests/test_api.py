import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_api_study_area(client):
    res = client.get("/api/study-area")
    assert res.status_code == 200
    data = res.json()
    assert data["city"] == "Pune"
    assert data["name"] == "Shivajinagar–Deccan Urban Corridor"
    assert data["timezone"] == "Asia/Kolkata"

def test_api_provenance(client):
    res = client.get("/api/provenance")
    assert res.status_code == 200
    assert len(res.json()) >= 8

def test_api_simulation_state(client):
    res = client.get("/api/simulation/state")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert data["metrics"]["vehiclesTracked"] > 0
    assert "ambient_air_quality" in data

def test_api_calibration_report(client):
    res = client.get("/api/calibration/report")
    assert res.status_code == 200
    data = res.json()
    assert "traffic_calibration" in data
