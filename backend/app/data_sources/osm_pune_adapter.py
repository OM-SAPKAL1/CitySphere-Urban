import os
import json
import math
import requests
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.geo import StudyArea, Building, RoadSegment
from app.data_sources.base_adapter import BaseSourceAdapter

class PuneOsmAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(dataset_id="osm_pune_features")
        self.raw_cache_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/pune_osm_raw.json")
        )
        self.normalized_output_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/pune_shivajinagar_city_data.json")
        )

    def get_bbox(self) -> str:
        """Calculate BBox for 2km x 2km extent centered at Pune Shivajinagar-Deccan."""
        half_m = settings.STUDY_AREA_SIZE_METERS / 2.0
        lat_offset = half_m / 111320.0
        lon_offset = half_m / (111320.0 * math.cos(math.radians(settings.CITY_LATITUDE)))
        
        s = round(settings.CITY_LATITUDE - lat_offset, 5)
        n = round(settings.CITY_LATITUDE + lat_offset, 5)
        w = round(settings.CITY_LONGITUDE - lon_offset, 5)
        e = round(settings.CITY_LONGITUDE + lon_offset, 5)
        return f"{s},{w},{n},{e}"

    def fetch(self, use_cache_if_available: bool = True) -> Dict[str, Any]:
        """Fetch real OpenStreetMap vector data via Overpass API."""
        if use_cache_if_available and os.path.exists(self.raw_cache_path):
            try:
                with open(self.raw_cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    if cached.get("elements"):
                        print(f"[PuneOsmAdapter] Loaded {len(cached['elements'])} elements from local cache.")
                        return cached
            except Exception as e:
                print(f"[PuneOsmAdapter] Cache read error: {e}")

        bbox = self.get_bbox()
        query = f"""
        [out:json][timeout:35];
        (
          way["building"]({bbox});
          relation["building"]({bbox});
          way["highway"]({bbox});
          way["leisure"]({bbox});
          way["natural"]({bbox});
          way["waterway"]({bbox});
          node["amenity"]({bbox});
          node["shop"]({bbox});
          node["tourism"]({bbox});
        );
        out body geom;
        """
        
        headers = {'User-Agent': 'CitySphere-Urban/1.0 (Pune-Digital-Twin; data-adapter)'}
        endpoints = [
            'https://lz4.overpass-api.de/api/interpreter',
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter'
        ]
        
        for ep in endpoints:
            try:
                print(f"[PuneOsmAdapter] Querying Overpass endpoint: {ep}")
                r = requests.get(ep, params={'data': query}, headers=headers, timeout=30)
                if r.status_code == 200:
                    data = r.json()
                    if data.get("elements"):
                        os.makedirs(os.path.dirname(self.raw_cache_path), exist_ok=True)
                        with open(self.raw_cache_path, "w", encoding="utf-8") as f:
                            json.dump(data, f)
                        print(f"[PuneOsmAdapter] Fetched {len(data['elements'])} elements from {ep}")
                        return data
            except Exception as e:
                print(f"[PuneOsmAdapter] Failed {ep}: {e}")
                continue

        # If live fetch fails, check if we have any fallback raw data
        if os.path.exists(self.raw_cache_path):
            with open(self.raw_cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"elements": []}

    def validate(self, raw_data: Any) -> bool:
        if not isinstance(raw_data, dict):
            return False
        elements = raw_data.get("elements")
        return isinstance(elements, list) and len(elements) > 0

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize raw Overpass elements into typed features."""
        elements = raw_data.get("elements", [])
        
        buildings = []
        roads = []
        parks = []
        waters = []
        pois = []
        node_roads_map = {}
        
        fallbacks_heights = {
            'apartments': 24.0,
            'residential': 15.0,
            'commercial': 28.0,
            'office': 32.0,
            'retail': 14.0,
            'hospital': 24.0,
            'school': 12.0,
            'university': 18.0,
            'hotel': 28.0,
            'yes': 14.0,
            'default': 14.0
        }

        for el in elements:
            el_type = el.get("type")
            el_id = el.get("id")
            tags = el.get("tags", {})
            geom = el.get("geometry", [])

            # POIs
            if el_type == "node" and any(k in tags for k in ["amenity", "shop", "tourism", "leisure", "office"]):
                lat = el.get("lat")
                lon = el.get("lon")
                if lat and lon:
                    poi_type = tags.get("amenity") or tags.get("tourism") or tags.get("shop") or "poi"
                    pois.append({
                        "id": f"poi-{el_id}",
                        "osmId": el_id,
                        "type": "poi",
                        "geometry": {"type": "Point", "coordinates": [lon, lat]},
                        "properties": {
                            "name": tags.get("name"),
                            "poiType": poi_type,
                            "tags": tags
                        }
                    })

            # Buildings
            elif el_type == "way" and "building" in tags:
                if len(geom) >= 3:
                    coords = [[p["lon"], p["lat"]] for p in geom]
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    
                    levels = None
                    if "building:levels" in tags:
                        try:
                            levels = int(tags["building:levels"])
                        except:
                            pass
                            
                    height = None
                    if "height" in tags:
                        try:
                            height = float(str(tags["height"]).replace("m", "").strip())
                        except:
                            pass
                    if not height:
                        if levels:
                            height = levels * 3.2
                        else:
                            b_type = tags.get("building", "default")
                            height = fallbacks_heights.get(b_type, fallbacks_heights["default"])
                            # Institutional / high-profile buildings on FC/JM Rd
                            name_lower = (tags.get("name") or "").lower()
                            if any(k in name_lower for k in ["college", "hospital", "mall", "tower", "complex"]):
                                height = max(height, 24.0)

                    # Compute footprint area (shoelace in planar approx)
                    area = 0.0
                    n = len(coords) - 1
                    for i in range(n):
                        j = (i + 1) % n
                        area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1]
                    area = abs(area) / 2.0
                    avg_lat = sum(c[1] for c in coords) / len(coords)
                    m_lat = 111320.0
                    m_lon = 111320.0 * math.cos(math.radians(avg_lat))
                    footprint_sqm = round(area * m_lat * m_lon, 1)
                    if footprint_sqm < 15:
                        footprint_sqm = 45.0  # realistic minimum building footprint

                    num_floors = levels if levels else max(1, int(round(height / 3.2)))
                    floor_area_sqm = round(footprint_sqm * num_floors, 1)
                    usable_roof_area_sqm = round(footprint_sqm * 0.70, 1) # 70% typical solar accessible area
                    solar_capacity_kwp = round(usable_roof_area_sqm * 0.15, 2) # ~150 Wp / sqm

                    buildings.append({
                        "id": f"building-{el_id}",
                        "osmId": el_id,
                        "type": "building",
                        "geometry": {"type": "Polygon", "coordinates": [coords]},
                        "properties": {
                            "name": tags.get("name"),
                            "building": tags.get("building"),
                            "height": height,
                            "levels": num_floors,
                            "estimatedHeight": height,
                            "footprintArea": footprint_sqm,
                            "floorArea": floor_area_sqm,
                            "usableRoofArea": usable_roof_area_sqm,
                            "solarCapacityKwp": solar_capacity_kwp,
                            "tags": tags
                        }
                    })

            # Roads
            elif el_type == "way" and "highway" in tags:
                hw = tags["highway"]
                allowed_hw = [
                    "motorway", "trunk", "primary", "secondary", "tertiary", 
                    "residential", "service", "pedestrian", "unclassified", "living_street"
                ]
                if hw in allowed_hw and len(geom) >= 2:
                    coords = [[p["lon"], p["lat"]] for p in geom]
                    
                    # Compute road length in meters
                    length_m = 0.0
                    for i in range(1, len(coords)):
                        c1, c2 = coords[i-1], coords[i]
                        dlat = math.radians(c2[1] - c1[1])
                        dlon = math.radians(c2[0] - c1[0])
                        a = math.sin(dlat/2)**2 + math.cos(math.radians(c1[1])) * math.cos(math.radians(c2[1])) * math.sin(dlon/2)**2
                        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                        length_m += 6371000 * c
                    length_m = round(max(length_m, 10.0), 1)

                    # Lanes and capacity
                    lanes = 1
                    if "lanes" in tags:
                        try:
                            lanes = int(tags["lanes"])
                        except:
                            pass
                    else:
                        if hw in ["primary", "trunk"]:
                            lanes = 3
                        elif hw == "secondary":
                            lanes = 2
                        else:
                            lanes = 1

                    # Speed and capacity
                    maxspeed = 40.0
                    if hw in ["primary", "trunk"]:
                        maxspeed = 50.0
                        cap_per_lane = 1200
                    elif hw == "secondary":
                        maxspeed = 40.0
                        cap_per_lane = 900
                    elif hw == "tertiary":
                        maxspeed = 35.0
                        cap_per_lane = 700
                    else:
                        maxspeed = 30.0
                        cap_per_lane = 500

                    total_capacity = cap_per_lane * lanes
                    road_id = f"road-{el_id}"

                    roads.append({
                        "id": road_id,
                        "osmId": el_id,
                        "type": "road",
                        "geometry": {"type": "LineString", "coordinates": coords},
                        "properties": {
                            "name": tags.get("name"),
                            "highway": hw,
                            "lanes": lanes,
                            "lengthMeters": length_m,
                            "maxspeed": maxspeed,
                            "capacity": total_capacity,
                            "oneway": tags.get("oneway") == "yes",
                            "tags": tags
                        }
                    })

                    # Map coordinates for intersection derivation
                    for coord in coords:
                        key = f"{coord[0]:.5f},{coord[1]:.5f}"
                        if key not in node_roads_map:
                            node_roads_map[key] = {"pos": coord, "roads": set(), "names": []}
                        node_roads_map[key]["roads"].add(road_id)
                        rname = tags.get("name")
                        if rname and rname not in node_roads_map[key]["names"]:
                            node_roads_map[key]["names"].append(rname)

            # Parks / Gardens
            elif el_type == "way" and (tags.get("leisure") in ["park", "garden"] or tags.get("landuse") in ["grass", "recreation_ground"]):
                if len(geom) >= 3:
                    coords = [[p["lon"], p["lat"]] for p in geom]
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    parks.append({
                        "id": f"park-{el_id}",
                        "osmId": el_id,
                        "type": "park",
                        "geometry": {"type": "Polygon", "coordinates": [coords]},
                        "properties": {
                            "name": tags.get("name") or "Urban Green Space",
                            "leisure": tags.get("leisure"),
                            "tags": tags
                        }
                    })

            # Water (Mutha River corridor in Shivajinagar-Deccan)
            elif el_type == "way" and (tags.get("natural") == "water" or "waterway" in tags or tags.get("water")):
                if len(geom) >= 3:
                    coords = [[p["lon"], p["lat"]] for p in geom]
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    waters.append({
                        "id": f"water-{el_id}",
                        "osmId": el_id,
                        "type": "water",
                        "geometry": {"type": "Polygon", "coordinates": [coords]},
                        "properties": {
                            "name": tags.get("name") or "Mutha River",
                            "natural": tags.get("natural"),
                            "tags": tags
                        }
                    })

        # Intersections
        intersections = []
        junc_idx = 1
        for k, v in node_roads_map.items():
            if len(v["roads"]) >= 2:
                name = None
                if len(v["names"]) >= 2:
                    name = f"{v['names'][0]} & {v['names'][1]}"
                elif len(v["names"]) == 1:
                    name = f"{v['names'][0]} Junction"
                else:
                    name = f"Shivajinagar Junction J-{junc_idx:03d}"
                
                intersections.append({
                    "id": f"intersection-{junc_idx}",
                    "type": "intersection",
                    "position": v["pos"],
                    "connectedRoads": list(v["roads"]),
                    "name": name,
                    "generatedName": name
                })
                junc_idx += 1

        result = {
            "city": "Pune",
            "studyArea": "Shivajinagar–Deccan Urban Corridor",
            "center": [settings.CITY_LONGITUDE, settings.CITY_LATITUDE],
            "bbox": self.get_bbox(),
            "crs": {
                "geographic": settings.CRS_GEOGRAPHIC,
                "projected": settings.CRS_PROJECTED
            },
            "stats": {
                "buildingsCount": len(buildings),
                "roadsCount": len(roads),
                "intersectionsCount": len(intersections),
                "poisCount": len(pois),
                "parksCount": len(parks),
                "watersCount": len(waters)
            },
            "buildings": buildings,
            "roads": roads,
            "intersections": intersections,
            "pois": pois,
            "parks": parks,
            "waters": waters
        }
        
        # Save normalized city data bundle
        os.makedirs(os.path.dirname(self.normalized_output_path), exist_ok=True)
        with open(self.normalized_output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"[PuneOsmAdapter] Successfully written {self.normalized_output_path} with {result['stats']}")
        
        return result

    def sync_to_database(self, normalized_data: Dict[str, Any]) -> None:
        """Upsert study area, buildings, and roads to PostGIS database."""
        db = SessionLocal()
        try:
            # 1. Upsert StudyArea
            study_area = db.query(StudyArea).filter_by(id=settings.STUDY_AREA_ID).first()
            if not study_area:
                study_area = StudyArea(id=settings.STUDY_AREA_ID)
                db.add(study_area)

            study_area.name = settings.STUDY_AREA_NAME
            study_area.city = settings.CITY_NAME
            study_area.state = settings.STATE
            study_area.country = settings.COUNTRY
            study_area.latitude = settings.CITY_LATITUDE
            study_area.longitude = settings.CITY_LONGITUDE
            study_area.size_meters = settings.STUDY_AREA_SIZE_METERS
            study_area.crs_geographic = settings.CRS_GEOGRAPHIC
            study_area.crs_projected = settings.CRS_PROJECTED
            study_area.timezone_str = settings.TIMEZONE
            
            # BBox polygon
            bbox_parts = [float(x) for x in self.get_bbox().split(",")]
            s, w, n, e = bbox_parts[0], bbox_parts[1], bbox_parts[2], bbox_parts[3]
            poly_wkt = f"SRID=4326;POLYGON(({w} {s}, {e} {s}, {e} {n}, {w} {n}, {w} {s}))"
            study_area.geometry = poly_wkt
            db.commit()

            # 2. Upsert Buildings
            b_count = 0
            for b_item in normalized_data.get("buildings", []):
                osm_id = f"way/{b_item['osmId']}"
                props = b_item["properties"]
                coords = b_item["geometry"]["coordinates"][0]
                coords_str = ", ".join([f"{c[0]} {c[1]}" for c in coords])
                poly = f"SRID=4326;POLYGON(({coords_str}))"

                b = db.query(Building).filter_by(id=osm_id).first()
                if not b:
                    b = Building(id=osm_id)
                    db.add(b)

                b.study_area_id = study_area.id
                b.name = props.get("name")
                b.type = props.get("building")
                b.height = props.get("height")
                b.levels = props.get("levels")
                b.footprint_area_sqm = props.get("footprintArea")
                b.floor_area_sqm = props.get("floorArea")
                b.usable_roof_area_sqm = props.get("usableRoofArea")
                b.solar_capacity_kwp = props.get("solarCapacityKwp")
                b.geometry = poly
                b.tags = props.get("tags")
                b_count += 1
                if b_count % 200 == 0:
                    db.commit()
            db.commit()
            print(f"[PuneOsmAdapter] Synced {b_count} buildings to PostGIS.")

            # 3. Upsert Roads
            r_count = 0
            for r_item in normalized_data.get("roads", []):
                osm_id = f"way/{r_item['osmId']}"
                props = r_item["properties"]
                coords = r_item["geometry"]["coordinates"]
                coords_str = ", ".join([f"{c[0]} {c[1]}" for c in coords])
                line = f"SRID=4326;LINESTRING({coords_str})"

                r = db.query(RoadSegment).filter_by(id=osm_id).first()
                if not r:
                    r = RoadSegment(id=osm_id)
                    db.add(r)

                r.study_area_id = study_area.id
                r.name = props.get("name")
                r.highway = props.get("highway")
                r.lanes = props.get("lanes", 1)
                r.length_meters = props.get("lengthMeters", 50.0)
                r.max_speed_kmh = props.get("maxspeed", 40.0)
                r.capacity_vehicles_per_hour = props.get("capacity", 1000.0)
                r.is_oneway = props.get("oneway", False)
                r.geometry = line
                r.tags = props.get("tags")
                r_count += 1
                if r_count % 200 == 0:
                    db.commit()
            db.commit()
            print(f"[PuneOsmAdapter] Synced {r_count} road segments to PostGIS.")

        except Exception as e:
            db.rollback()
            print(f"[PuneOsmAdapter] DB sync error: {e}")
        finally:
            db.close()
