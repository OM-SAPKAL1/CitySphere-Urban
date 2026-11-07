# CitySphere — Manual Data Acquisition Requirements

The initial simulation data foundation has been established using official open APIs, published PMC/PMRDA municipal reports, Census of India tables, NASA meteorological models, and research inventories. To transition from initial archetype calibration to high-fidelity operational simulation, the following datasets require formal manual acquisition, administrative requests, or department data sharing agreements.

---

## 1. High-Priority Datasets for Manual Acquisition

### 1.1 MSEDCL Feeder-Level & Substation Electricity Consumption
- **Responsible Entity:** Maharashtra State Electricity Distribution Company Limited (MSEDCL / Mahavitaran), Pune Urban Zone (Rasta Peth Circle / Shivajinagar Division).
- **Data Required:**
  - 15-minute interval Automated Meter Reading (AMR) / SCADA logs for 11 kV feeders serving Deccan Gymkhana, FC Road, and JM Road.
  - Substation peak load curves (MVA) and power factor logs.
- **Acquisition Procedure:** Formal request under Right to Information (RTI) or official academic/municipal collaboration agreement with MSEDCL Pune Chief Engineer.
- **Expected Format:** CSV / Excel sheets with Feeder ID, Timestamp, Active Power (kW), Reactive Power (kVAR), Voltage (kV).

### 1.2 PMC Building Permission & GIS Cadastral Property Tax Data
- **Responsible Entity:** Pune Municipal Corporation (PMC) Building Permission Department & Property Tax Department.
- **Data Required:**
  - Official GIS building footprint polygons with measured building heights, sanctioned number of floors, occupancy classification (residential / commercial / institutional), and built-up area (BUA / FSI).
  - Rooftop solar net-metering registrations list with sanctioned capacity (kWp).
- **Acquisition Procedure:** Data sharing agreement through PMC Smart City Development Corporation Limited (PSCDCL).
- **Expected Format:** GeoPackage / Shapefile / PostGIS dump.

### 1.3 Pune Smart City (PSCDCL) ITMS Real-Time Traffic Sensor Feeds
- **Responsible Entity:** Pune Smart City Development Corporation Limited (PSCDCL) & Pune City Traffic Police.
- **Data Required:**
  - Integrated Traffic Management System (ITMS) Automatic Number Plate Recognition (ANPR) and video traffic counter logs for:
    - Goodluck Chowk
    - Alka Talkies Chowk
    - Jhansi Rani Chowk
    - Sancheti Hospital Chowk
  - Adaptive Traffic Control System (ATCS / CoSiCoSys) green time allocations and signal cycle times.
- **Acquisition Procedure:** PSCDCL Smart City Command & Control Center (ICCC) API access credential requisition.
- **Expected Format:** REST API / MQTT live stream or historical CSV exports.

### 1.4 PMPML (Pune Mahanagar Parivahan Mahamandal Ltd) Transit Telemetry
- **Responsible Entity:** PMPML IT & Operations Department, Swargate Headquarters.
- **Data Required:**
  - Real-time or archived GPS automatic vehicle location (AVL) pings for bus routes traversing JM Road, FC Road, and Deccan Gymkhana (e.g. Route 1, 2, 7, 24, 174).
  - Passenger boarding/alighting counts from Electronic Ticket Machines (ETM).
- **Acquisition Procedure:** MoU with PMPML under urban transport data sharing initiatives.
- **Expected Format:** GTFS-Realtime (Protocol Buffers) or CSV logs.

### 1.5 PMC Solid Waste Management Vehicle Tracking & Weighbridge Logs
- **Responsible Entity:** PMC Solid Waste Management (SWM) Department & Swachh Cooperative.
- **Data Required:**
  - GPS tracks of daily door-to-door waste collection tippers (Ghanta Gadis) in Prabhag 14.
  - Daily weighbridge delivery receipts at the Ghole Road waste transfer station / ramp.
  - Segregation compliance percentages at source by sub-locality.
- **Acquisition Procedure:** Administrative request to PMC Additional Municipal Commissioner (Special / Solid Waste).
- **Expected Format:** Daily Excel/CSV weighbridge manifests.

---

## 2. Documented Manual Import Support in CitySphere

CitySphere is architected with documented support for manual data imports:
- **Directory Structure:** Manual files are placed in `backend/app/data/manual_imports/<dataset_id>/`
- **Schema Validation:** Import scripts validate CSV headers, numeric ranges, and date formats against Pydantic schemas before updating the database.
- **Provenance Logging:** The Provenance Registry automatically records the local filename, file hash (SHA-256), import date, and user remarks, ensuring no untracked data enters the simulation pipeline.
