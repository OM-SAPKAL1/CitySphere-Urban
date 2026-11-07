import os
import requests
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.geo import StudyArea, Building, RoadSegment
import json

def get_osm_bbox():
    """Return bbox in Overpass format: South,West,North,East"""
    lat_offset = (settings.STUDY_AREA_SIZE_METERS / 2) / 111000
    lon_offset = (settings.STUDY_AREA_SIZE_METERS / 2) / 111000
    
    s = settings.CITY_LATITUDE - lat_offset
    n = settings.CITY_LATITUDE + lat_offset
    w = settings.CITY_LONGITUDE - lon_offset
    e = settings.CITY_LONGITUDE + lon_offset
    return f"{s},{w},{n},{e}"

def fetch_overpass_query(query: str):
    headers = {'User-Agent': 'CitySphere-Urban/1.0 (urban-digital-twin; contact@citysphere.local)'}
    endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ]
    for ep in endpoints:
        try:
            r = requests.get(ep, params={'data': query}, headers=headers, timeout=25)
            if r.status_code == 200:
                return r.json()
        except Exception:
            continue
    return {'elements': []}

def import_osm_data():
    db = SessionLocal()
    
    # 1. Upsert StudyArea
    study_area = db.query(StudyArea).filter_by(id='mit_aurangabad').first()
    if not study_area:
        study_area = StudyArea(
            id='mit_aurangabad',
            name=settings.STUDY_AREA_NAME,
            city=settings.CITY_NAME,
            state=settings.STATE,
            country=settings.COUNTRY,
            latitude=settings.CITY_LATITUDE,
            longitude=settings.CITY_LONGITUDE,
            size_meters=settings.STUDY_AREA_SIZE_METERS
        )
        db.add(study_area)
        db.commit()
    
    # Check if local pre-fetched raw osm data exists
    local_raw_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../src/assets/raw_mit_osm.json"))
    raw_data = None
    if os.path.exists(local_raw_path):
        try:
            with open(local_raw_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
        except Exception:
            raw_data = None

    bbox = get_osm_bbox()

    # 2. Extract or Fetch Buildings
    if raw_data and raw_data.get('elements'):
        elements = raw_data['elements']
    else:
        query = f"""
        [out:json][timeout:25];
        (
          way["building"]({bbox});
        );
        out geom;
        """
        data = fetch_overpass_query(query)
        elements = data.get('elements', [])
    
    building_count = 0
    for element in elements:
        tags = element.get('tags', {})
        if element.get('type') == 'way' and 'building' in tags:
            osm_id = f"way/{element['id']}"
            
            height = None
            if 'height' in tags:
                try:
                    height = float(str(tags['height']).replace('m', '').strip())
                except:
                    pass
            
            levels = None
            if 'building:levels' in tags:
                try:
                    levels = int(tags['building:levels'])
                    if not height:
                        height = levels * 3.5
                except:
                    pass
                    
            if not height:
                height = 12.0
                
            geom_points = element.get('geometry', [])
            if len(geom_points) > 2:
                if geom_points[0] != geom_points[-1]:
                    geom_points.append(geom_points[0])
                
                coords = ", ".join([f"{p['lon']} {p['lat']}" for p in geom_points])
                polygon = f"SRID=4326;POLYGON(({coords}))"
                
                b = db.query(Building).filter_by(id=osm_id).first()
                if not b:
                    b = Building(id=osm_id)
                    db.add(b)
                
                b.study_area_id = study_area.id
                b.name = tags.get('name')
                b.type = tags.get('building')
                b.height = height
                b.levels = levels
                b.tags = tags
                b.geometry = polygon
                building_count += 1
                
    db.commit()
    print(f"Imported {building_count} buildings into database.")
    
    # 3. Extract or Fetch Roads
    road_count = 0
    for element in elements:
        tags = element.get('tags', {})
        if element.get('type') == 'way' and 'highway' in tags:
            osm_id = f"way/{element['id']}"
            geom_points = element.get('geometry', [])
            if len(geom_points) >= 2:
                coords = ", ".join([f"{p['lon']} {p['lat']}" for p in geom_points])
                linestring = f"SRID=4326;LINESTRING({coords})"
                
                r = db.query(RoadSegment).filter_by(id=osm_id).first()
                if not r:
                    r = RoadSegment(id=osm_id)
                    db.add(r)
                
                r.study_area_id = study_area.id
                r.name = tags.get('name')
                r.highway = tags.get('highway')
                r.tags = tags
                r.geometry = linestring
                r.length_meters = 100.0
                road_count += 1
                
    db.commit()
    print(f"Imported {road_count} roads into database.")
    db.close()
