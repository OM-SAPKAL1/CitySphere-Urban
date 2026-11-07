from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base
from datetime import datetime, timezone

class StudyArea(Base):
    __tablename__ = "study_areas"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    
    # Store the bounding box as a polygon
    geometry = Column(Geometry('POLYGON', srid=4326))
    
    latitude = Column(Float)
    longitude = Column(Float)
    size_meters = Column(Integer)
    crs_geographic = Column(String, default="EPSG:4326")
    crs_projected = Column(String, default="EPSG:32643")
    timezone_str = Column(String, default="Asia/Kolkata")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Building(Base):
    __tablename__ = "buildings"
    
    id = Column(String, primary_key=True) # OSM ID (e.g., way/12345)
    study_area_id = Column(String, ForeignKey("study_areas.id"))
    
    name = Column(String, nullable=True)
    type = Column(String, nullable=True)
    
    # PostGIS geometry for footprint
    geometry = Column(Geometry('POLYGON', srid=4326))
    
    # Properties for energy & solar model
    height = Column(Float, nullable=True)
    levels = Column(Integer, nullable=True)
    footprint_area_sqm = Column(Float, nullable=True)
    floor_area_sqm = Column(Float, nullable=True)
    
    # Roof properties
    roof_shape = Column(String, nullable=True)
    usable_roof_area_sqm = Column(Float, nullable=True)
    solar_capacity_kwp = Column(Float, nullable=True)
    
    tags = Column(JSON, nullable=True)

class RoadSegment(Base):
    __tablename__ = "road_segments"
    
    id = Column(String, primary_key=True) # OSM ID
    study_area_id = Column(String, ForeignKey("study_areas.id"))
    
    name = Column(String, nullable=True)
    highway = Column(String, nullable=True) # classification
    
    # PostGIS LineString
    geometry = Column(Geometry('LINESTRING', srid=4326))
    
    length_meters = Column(Float)
    lanes = Column(Integer, default=1)
    max_speed_kmh = Column(Float, nullable=True)
    capacity_vehicles_per_hour = Column(Float, nullable=True)
    is_oneway = Column(Boolean, default=False)
    
    tags = Column(JSON, nullable=True)

class ProvenanceRecord(Base):
    __tablename__ = "provenance_records"
    
    id = Column(String, primary_key=True)
    dataset_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    source_organization = Column(String, nullable=False)
    original_url = Column(Text, nullable=True)
    retrieval_date = Column(DateTime, nullable=False)
    observation_period = Column(String, nullable=False)
    geographic_coverage = Column(String, nullable=False)
    spatial_resolution = Column(String, nullable=False)
    temporal_resolution = Column(String, nullable=False)
    units = Column(JSON, nullable=False)
    license = Column(String, nullable=False)
    attribution = Column(Text, nullable=False)
    data_quality_status = Column(String, nullable=False)
    transformations = Column(JSON, nullable=False)
    classification = Column(String, nullable=False) # observed, derived, estimated, synthetic
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AirQualityObservation(Base):
    __tablename__ = "air_quality_observations"
    
    id = Column(String, primary_key=True)
    station_id = Column(String, nullable=False, index=True)
    station_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp_ist = Column(DateTime, nullable=False, index=True)
    pm25 = Column(Float, nullable=True) # ug/m3
    pm10 = Column(Float, nullable=True) # ug/m3
    no2 = Column(Float, nullable=True)  # ug/m3
    co = Column(Float, nullable=True)   # mg/m3
    aqi = Column(Float, nullable=True)
    is_observed = Column(Boolean, default=True)

class WeatherSolarObservation(Base):
    __tablename__ = "weather_solar_observations"
    
    id = Column(String, primary_key=True)
    timestamp_ist = Column(DateTime, nullable=False, index=True)
    ghi_w_per_sqm = Column(Float, nullable=False) # Global Horizontal Irradiance W/m2
    temp_c = Column(Float, nullable=False)        # Temperature deg C
    humidity_pct = Column(Float, nullable=False)  # Relative Humidity %
    wind_speed_ms = Column(Float, nullable=False) # Wind speed m/s
    source = Column(String, default="NASA_POWER")

class TrafficSurveyBaseline(Base):
    __tablename__ = "traffic_survey_baselines"
    
    id = Column(String, primary_key=True)
    corridor_name = Column(String, nullable=False)
    survey_period = Column(String, nullable=False)
    peak_hour_pcu = Column(Float, nullable=False)
    offpeak_hour_pcu = Column(Float, nullable=False)
    mode_share = Column(JSON, nullable=False)

class SimulationSnapshot(Base):
    __tablename__ = "simulation_snapshots"
    
    id = Column(String, primary_key=True)
    step_index = Column(Integer, nullable=False, index=True)
    timestamp_ist = Column(DateTime, nullable=False, index=True)
    total_electricity_demand_kw = Column(Float, nullable=False)
    total_solar_generation_kw = Column(Float, nullable=False)
    net_grid_demand_kw = Column(Float, nullable=False)
    active_vehicles_count = Column(Integer, nullable=False)
    avg_traffic_speed_kmh = Column(Float, nullable=False)
    total_congestion_delay_hours = Column(Float, nullable=False)
    total_co2_kg_per_hour = Column(Float, nullable=False)
    total_pm25_g_per_hour = Column(Float, nullable=False)
    waste_accumulated_kg = Column(Float, nullable=False)
    waste_collected_kg = Column(Float, nullable=False)
    metrics_payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
