import os
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Literal, Any
from pydantic import BaseModel, Field
from app.core.database import SessionLocal
from app.models.geo import ProvenanceRecord

ClassificationType = Literal["observed", "derived", "estimated", "synthetic"]

# License validation definitions
KNOWN_LICENSES = {
    "ODbL-1.0": {
        "name": "Open Database License 1.0",
        "commercial_use": True,
        "attribution_required": True,
        "share_alike": True,
        "url": "https://opendatacommons.org/licenses/odbl/1.0/"
    },
    "OGDL-India-1.0": {
        "name": "Government Open Data License - India",
        "commercial_use": True,
        "attribution_required": True,
        "share_alike": False,
        "url": "https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf"
    },
    "NASA-Open-Data": {
        "name": "NASA Open Data Policy",
        "commercial_use": True,
        "attribution_required": True,
        "share_alike": False,
        "url": "https://www.nasa.gov/open/data.html"
    },
    "CC-BY-4.0": {
        "name": "Creative Commons Attribution 4.0 International",
        "commercial_use": True,
        "attribution_required": True,
        "share_alike": False,
        "url": "https://creativecommons.org/licenses/by/4.0/"
    },
    "CC-BY-NC-4.0": {
        "name": "Creative Commons Attribution-NonCommercial 4.0 International",
        "commercial_use": False,
        "attribution_required": True,
        "share_alike": False,
        "url": "https://creativecommons.org/licenses/by-nc/4.0/"
    },
    "PMC-Official-Report": {
        "name": "Pune Municipal Corporation Official Public Document",
        "commercial_use": False,
        "attribution_required": True,
        "share_alike": False,
        "url": "https://pmc.gov.in"
    }
}

class ProvenanceItem(BaseModel):
    dataset_id: str
    title: str
    source_organization: str
    original_url: Optional[str] = None
    retrieval_date: str # ISO format
    observation_period: str
    geographic_coverage: str
    spatial_resolution: str
    temporal_resolution: str
    units: Dict[str, str]
    license: str
    attribution: str
    data_quality_status: str # "validated", "raw_with_gaps_noted", "derived_verified"
    transformations: List[str] = []
    classification: ClassificationType

class ProvenanceRegistry:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or os.path.join(
            os.path.dirname(__file__), "../data/provenance_registry.json"
        )
        self.records: Dict[str, ProvenanceItem] = {}
        self.load()

    def validate_license(self, license_code: str) -> Dict[str, Any]:
        """Validate if a license is recognized and check its terms."""
        if license_code in KNOWN_LICENSES:
            return {
                "valid": True,
                "details": KNOWN_LICENSES[license_code]
            }
        return {
            "valid": False,
            "warning": f"Unrecognized license code '{license_code}'. Manual verification required."
        }

    def register(self, item: ProvenanceItem) -> None:
        """Register a dataset provenance entry after validating its license."""
        lic_val = self.validate_license(item.license)
        if not lic_val["valid"]:
            print(f"[Provenance Warning] {lic_val['warning']}")
        self.records[item.dataset_id] = item
        self.save()
        self.sync_to_db(item)

    def get(self, dataset_id: str) -> Optional[ProvenanceItem]:
        return self.records.get(dataset_id)

    def list_all(self) -> List[ProvenanceItem]:
        return list(self.records.values())

    def save(self) -> None:
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        serialized = {k: v.model_dump() for k, v in self.records.items()}
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(serialized, f, indent=2, ensure_ascii=False)

    def load(self) -> None:
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self.records[k] = ProvenanceItem(**v)
            except Exception as e:
                print(f"[Provenance] Could not load registry file: {e}")
                self._load_defaults()
        else:
            self._load_defaults()
            self.save()

    def sync_to_db(self, item: ProvenanceItem) -> None:
        """Sync record to PostgreSQL database."""
        try:
            db = SessionLocal()
            existing = db.query(ProvenanceRecord).filter_by(id=f"prov_{item.dataset_id}").first()
            if not existing:
                existing = ProvenanceRecord(id=f"prov_{item.dataset_id}")
                db.add(existing)

            existing.dataset_id = item.dataset_id
            existing.title = item.title
            existing.source_organization = item.source_organization
            existing.original_url = item.original_url
            try:
                ret_dt = datetime.fromisoformat(item.retrieval_date.replace("Z", "+00:00"))
            except:
                ret_dt = datetime.now(timezone.utc)
            existing.retrieval_date = ret_dt
            existing.observation_period = item.observation_period
            existing.geographic_coverage = item.geographic_coverage
            existing.spatial_resolution = item.spatial_resolution
            existing.temporal_resolution = item.temporal_resolution
            existing.units = item.units
            existing.license = item.license
            existing.attribution = item.attribution
            existing.data_quality_status = item.data_quality_status
            existing.transformations = item.transformations
            existing.classification = item.classification
            db.commit()
            db.close()
        except Exception as e:
            print(f"[Provenance DB Sync Error]: {e}")

    def _load_defaults(self) -> None:
        """Load default authenticated provenance records for Pune Shivajinagar-Deccan."""
        defaults = [
            ProvenanceItem(
                dataset_id="osm_pune_features",
                title="OpenStreetMap Pune Shivajinagar–Deccan Geospatial Features",
                source_organization="OpenStreetMap Contributors / Overpass API",
                original_url="https://overpass-api.de/api/interpreter",
                retrieval_date="2026-10-12T13:57:00Z",
                observation_period="Continuous updates (accessed Oct 2026)",
                geographic_coverage="Pune, Shivajinagar–Deccan (18.5156N-18.5336N, 73.8350E-73.8540E)",
                spatial_resolution="Vector features (meter-level vertex precision)",
                temporal_resolution="Static snapshot / live vector",
                units={"coordinates": "degrees_WGS84", "height": "meters", "length": "meters"},
                license="ODbL-1.0",
                attribution="© OpenStreetMap contributors, licensed under ODbL 1.0",
                data_quality_status="validated",
                transformations=[
                    "BBox clipping to 2km x 2km extent",
                    "Building height estimation from building:levels (3.2m/level)",
                    "Road hierarchy classification and lane approximation",
                    "Junction node topology extraction"
                ],
                classification="observed"
            ),
            ProvenanceItem(
                dataset_id="census_ogd_population_pune",
                title="Census of India 2011 & PMC Ward 14 (Shivajinagar/Ghole Rd) Demographic Profile",
                source_organization="Office of Registrar General & Census Commissioner, India / PMC",
                original_url="https://censusindia.gov.in / https://pmc.gov.in",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="2011 Census baseline + 2021-2024 PMC Electoral/Ward updates",
                geographic_coverage="PMC Ward 14 (Ghole Road / Shivajinagar / Deccan Gymkhana)",
                spatial_resolution="Ward level (sub-allocated to 2km x 2km grid)",
                temporal_resolution="Decennial baseline with projected annual updates",
                units={"population": "persons", "density": "persons_per_sq_km"},
                license="OGDL-India-1.0",
                attribution="Census of India 2011, Ministry of Home Affairs; Pune Municipal Corporation",
                data_quality_status="validated",
                transformations=[
                    "Spatial intersection of Ward 14 boundary with 2km x 2km study area (area fraction ~0.55)",
                    "Residential vs commercial floating population separation using land use tags",
                    "Diurnal occupancy curve weighting"
                ],
                classification="derived"
            ),
            ProvenanceItem(
                dataset_id="nasa_power_solar_weather",
                title="NASA POWER Hourly Solar Irradiance and Surface Meteorology (Pune)",
                source_organization="NASA Langley Research Center POWER Project",
                original_url="https://power.larc.nasa.gov/api/temporal/hourly/point",
                retrieval_date="2026-10-12T13:58:00Z",
                observation_period="2024-03-01 to 2024-03-07 (Baseline historical dry season week)",
                geographic_coverage="Point 18.5246N, 73.8445E (Pune Deccan)",
                spatial_resolution="0.5 x 0.5 degree grid assimilated to coordinates",
                temporal_resolution="Hourly",
                units={
                    "ALLSKY_SFC_SW_DWN": "W/m^2",
                    "T2M": "degrees_Celsius",
                    "RH2M": "percent",
                    "WS10M": "m/s"
                },
                license="NASA-Open-Data",
                attribution="NASA Prediction Of Worldwide Energy Resources (POWER) Project",
                data_quality_status="validated",
                transformations=[
                    "Extracted hourly GHI, 2-meter air temperature, relative humidity, and 10-meter wind speed",
                    "Interpolated linearly to 5-minute simulation intervals preserving hourly integrals"
                ],
                classification="observed"
            ),
            ProvenanceItem(
                dataset_id="allure_india_energy_benchmarks",
                title="AllUrE-India Urban Residential & Commercial Energy Consumption Benchmarks",
                source_organization="Bureau of Energy Efficiency (BEE) / CSTEP AllUrE-India Model",
                original_url="https://cstep.in/publications-details.php?id=allure-india",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="2018-2023 empirical surveys & building energy database",
                geographic_coverage="Western India Composite/Warm-Humid urban centers (Pune cluster)",
                spatial_resolution="Archetype building & per-capita benchmarks",
                temporal_resolution="Hourly typical load profiles",
                units={
                    "specific_consumption_residential": "kWh/capita/month",
                    "eui_commercial": "kWh/sqm/year",
                    "power_demand": "kW"
                },
                license="CC-BY-4.0",
                attribution="AllUrE-India Urban Energy Model, CSTEP & Bureau of Energy Efficiency",
                data_quality_status="derived_verified",
                transformations=[
                    "Mapped building OSM footprint and levels to AllUrE archetype load profiles",
                    "Temperature-dependent cooling degree hours sensitivity scaling applied"
                ],
                classification="derived"
            ),
            ProvenanceItem(
                dataset_id="chetna_road_emissions_factors",
                title="CHETNA-Road Transport Emission Factors for Pune Urban Area",
                source_organization="Center for Study of Science, Technology and Policy (CSTEP) & ARAI Pune",
                original_url="https://cstep.in / https://www.araiindia.com",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="2019-2023 fleet composition and emissions factors",
                geographic_coverage="Pune Metropolitan Region",
                spatial_resolution="Link-level vehicle emission factors",
                temporal_resolution="Per vehicle kilometer traveled (VKT)",
                units={
                    "co2": "g/km",
                    "pm25": "g/km",
                    "nox": "g/km"
                },
                license="CC-BY-4.0",
                attribution="CSTEP CHETNA Emissions Inventory & ARAI emission database for Pune",
                data_quality_status="validated",
                transformations=[
                    "Fleet weighted averaging based on Pune CMP mode shares (52% 2W, 16% Car, 11% Auto, 9% Bus)",
                    "Speed-correction factor applied using link speed vs free-flow speed"
                ],
                classification="estimated"
            ),
            ProvenanceItem(
                dataset_id="cpcb_openaq_air_quality",
                title="CPCB CAAQMS Station Historical Air Quality Observations (Shivajinagar, Pune)",
                source_organization="Central Pollution Control Board (CPCB) / Maharashtra PCB / OpenAQ",
                original_url="https://app.cpcbccr.com / https://openaq.org",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="2024-03-01 to 2024-03-07 hourly continuous CAAQMS",
                geographic_coverage="Shivajinagar Monitoring Station (site_283), Pune",
                spatial_resolution="Single continuous ambient monitoring point within study area",
                temporal_resolution="Hourly continuous",
                units={
                    "pm25": "ug/m^3",
                    "pm10": "ug/m^3",
                    "no2": "ug/m^3",
                    "co": "mg/m^3",
                    "aqi": "dimensionless"
                },
                license="CC-BY-NC-4.0",
                attribution="Central Pollution Control Board (CPCB), Government of India",
                data_quality_status="validated",
                transformations=[
                    "Quality filtered for negative or erroneous sensor spikes (>1000 ug/m3)",
                    "Distinctly categorized as ambient concentration benchmark, NOT tailpipe emissions"
                ],
                classification="observed"
            ),
            ProvenanceItem(
                dataset_id="pune_cmp_traffic_survey",
                title="Pune Comprehensive Mobility Plan (CMP) Traffic Surveys & Classified Counts",
                source_organization="Pune Municipal Corporation & Pune Metropolitan Region Development Authority",
                original_url="https://pmc.gov.in/en/comprehensive-mobility-plan",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="CMP Baseline Survey (Key corridors: JM Rd, FC Rd, Karve Rd, Deccan Gymkhana)",
                geographic_coverage="Shivajinagar–Deccan corridor arterial screenlines",
                spatial_resolution="Screenline and mid-block survey points",
                temporal_resolution="Peak hour (09:00-11:00, 18:00-20:00) and 16-hour classified volume",
                units={
                    "volume": "PCU/hour",
                    "speed": "km/h",
                    "mode_share": "percentage"
                },
                license="PMC-Official-Report",
                attribution="Pune Comprehensive Mobility Plan (CMP), PMC & PMRDA",
                data_quality_status="validated",
                transformations=[
                    "Extracted directional PCU volumes for JM Road (one-way northbound) and FC Road (one-way southbound)",
                    "Calibrated BPR capacity parameters: alpha=0.15, beta=4.0 for Indian urban mixed flow"
                ],
                classification="observed"
            ),
            ProvenanceItem(
                dataset_id="pmc_municipal_waste_stats",
                title="PMC Solid Waste Management Department Municipal Waste Generation Statistics",
                source_organization="Pune Municipal Corporation (PMC) SWM Department & Swachh Pune",
                original_url="https://pmc.gov.in/en/solid-waste-management",
                retrieval_date="2026-10-12T14:00:00Z",
                observation_period="2023-2024 annual municipal waste reporting",
                geographic_coverage="Ghole Road Ward / Shivajinagar Prabhag",
                spatial_resolution="Ward administrative area",
                temporal_resolution="Daily generation and morning collection tonnage",
                units={
                    "per_capita_waste": "kg/person/day",
                    "total_ward_waste": "metric_tons/day",
                    "wet_waste_fraction": "percent",
                    "dry_waste_fraction": "percent"
                },
                license="PMC-Official-Report",
                attribution="Solid Waste Management Department, Pune Municipal Corporation",
                data_quality_status="validated",
                transformations=[
                    "Normalized to 0.48 kg/capita/day domestic generation",
                    "Added commercial generator factor (0.15 kg/m2/month) for retail/educational premises",
                    "Simulated morning collection window between 06:30 and 11:30 IST"
                ],
                classification="derived"
            )
        ]
        for d in defaults:
            self.records[d.dataset_id] = d

provenance_registry = ProvenanceRegistry()
