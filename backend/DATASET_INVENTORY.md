# CitySphere — Dataset Inventory & Provenance Registry
**Study Area:** Shivajinagar–Deccan Urban Corridor, Pune, Maharashtra (2 km × 2 km)  
**Time Zone:** Asia/Kolkata (UTC+05:30)  
**Spatial Reference Systems:** EPSG:4326 (WGS84 Storage & GeoJSON) | EPSG:32643 (UTM Zone 43N Metric)

---

## Catalog of Ingested Datasets

| Dataset ID | Title | Source & Attribution | Retrieval Date | Temporal & Spatial Scope | License & Commercial Use | Classification | Quality Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| `osm_pune_features` | OpenStreetMap Pune Geospatial Features | OpenStreetMap contributors / Overpass API | 2026-10-12 | Continuous vector snapshot (2,640 buildings, 953 roads, 1,005 junctions) | **ODbL-1.0** (Attribution & ShareAlike; Commercial allowed) | **Observed** | Validated |
| `census_ogd_population_pune` | Census 2011 & PMC Ward 14 Demographic Profile | Office of the Registrar General of India & PMC | 2026-10-12 | 2011 Baseline + 2024 Ward Projections; Ward 14 (Shivajinagar/Ghole Rd) | **OGDL-India-1.0** (Open Govt Data License; Commercial allowed) | **Derived** | Validated |
| `nasa_power_solar_weather` | NASA POWER Hourly Solar & Meteorological Data | NASA Langley Research Center POWER Project | 2026-10-12 | 2024-03-01 to 2024-03-07 hourly (Point 18.5246°N, 73.8445°E) | **NASA Open Data** (Public Domain; Commercial allowed) | **Observed** | Validated |
| `allure_india_energy_benchmarks` | AllUrE-India Building Energy Demand Benchmarks | CSTEP & Bureau of Energy Efficiency (BEE) | 2026-10-12 | Archetype EUI (kWh/m²/yr, kWh/capita/day) for Composite climate | **CC-BY-4.0** (Attribution required; Commercial allowed) | **Derived** | Derived Verified |
| `chetna_road_emissions_factors` | CHETNA-Road Transport Emission Factors | CSTEP & ARAI Pune Fleet Database | 2026-10-12 | Link emission factors (g CO2, PM2.5, NOx per km) by vehicle mode | **CC-BY-4.0** (Attribution required; Commercial allowed) | **Estimated** | Validated |
| `cpcb_openaq_air_quality` | CPCB CAAQMS Ambient Air Quality Observations | Central Pollution Control Board (CPCB) / MPCB | 2026-10-12 | Hourly continuous CAAQMS (Shivajinagar Station site_283) | **CC-BY-NC-4.0** (Non-commercial attribution) | **Observed** | Validated |
| `pune_cmp_traffic_survey` | Pune Comprehensive Mobility Plan (CMP) Traffic Counts | Pune Municipal Corporation & PMRDA | 2026-10-12 | Screenline classified counts & mode shares (JM Rd, FC Rd, Karve Rd) | **PMC-Official-Report** (Public document; attribution required) | **Observed** | Validated |
| `pmc_municipal_waste_stats` | PMC Solid Waste Management Generation Statistics | Pune Municipal Corporation SWM Department | 2026-10-12 | Daily generation (0.48 kg/capita/day) and collection schedules | **PMC-Official-Report** (Public report; attribution required) | **Derived** | Validated |

---

## Detailed Data Dictionary & Transformations

### 1. `osm_pune_features`
- **Units:** Latitude/Longitude in Decimal Degrees, heights in meters, lengths in meters.
- **Transformations:**
  - Bounding box clipped to $18.5156^\circ\text{ N}$ to $18.5336^\circ\text{ N}$, $73.8350^\circ\text{ E}$ to $73.8540^\circ\text{ E}$.
  - Estimated height computed as $\text{levels} \times 3.2\text{ m}$ or archetype fallback.
  - Footprint area computed via spherical shoelace formula.
  - Road connectivity graph processed to extract junctions and connected link IDs.

### 2. `census_ogd_population_pune`
- **Units:** Population in counts, density in $\text{persons}/\text{km}^2$.
- **Transformations:**
  - Ward 14 spatial overlap ($55.2\%$) allocated to the $4.0\text{ km}^2$ study area ($62,500$ residents).
  - Floating daytime population ($+48,000$ peak) modeled separately for higher education, commercial dining/retail, and courts/administrative offices.

### 3. `nasa_power_solar_weather`
- **Units:** Solar Irradiance in $\text{W}/\text{m}^2$, Temperature in $^\circ\text{C}$, Relative Humidity in $\%$, Wind Speed in $\text{m}/\text{s}$.
- **Transformations:**
  - UTC timestamps converted to `Asia/Kolkata` (+05:30).
  - Hourly series interpolated linearly to 5-minute timesteps preserving integrated energy.

### 4. `allure_energy_adapter`
- **Units:** Specific consumption in $\text{kWh}/\text{capita}/\text{month}$, $\text{kWh}/\text{m}^2/\text{year}$, power in $\text{kW}$.
- **Transformations:**
  - Linked to building footprints and estimated gross floor areas.
  - Cooling degree-hour temperature sensitivity ($+3.5\%/^\circ\text{C}$ above $25^\circ\text{C}$).

### 5. `chetna_emissions_adapter`
- **Units:** Grams per vehicle-kilometer traveled ($\text{g}/\text{km}$).
- **Transformations:**
  - Speed-correction penalty table applied to congested link speeds ($< 15\text{ km}/\text{h}$).

### 6. `cpcb_openaq_air_quality`
- **Units:** $\text{PM}_{2.5}, \text{PM}_{10}, \text{NO}_2$ in $\mu\text{g}/\text{m}^3$, $\text{CO}$ in $\text{mg}/\text{m}^3$, AQI dimensionless.
- **Audit:** Strictly classified as observed ambient concentration, never confused with tailpipe emissions.

### 7. `pune_cmp_traffic_survey`
- **Units:** Volume in Passenger Car Units per hour ($\text{PCU}/\text{h}$), speeds in $\text{km}/\text{h}$.
- **Transformations:**
  - Mode shares (52.4% 2W, 16.2% Car, 11.5% Auto, 8.8% Bus, 11.1% NMT) used for vehicular disaggregation.

### 8. `pmc_municipal_waste_stats`
- **Units:** $\text{kg}/\text{capita}/\text{day}$, cumulative $\text{kg}$.
- **Transformations:**
  - Diurnal generation weighting applied to create 5-minute accumulation profiles.
  - Morning collection rate applied during 06:30–11:30 IST window.
