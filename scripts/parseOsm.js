import fs from 'fs';
import path from 'path';

const xml = fs.readFileSync('src/assets/bkc_osm.xml', 'utf8');

// Quick XML node and way parser
console.log('Parsing nodes...');
const nodeMap = new Map();
const nodeRegex = /<node id="(\d+)"[^>]*lat="([\d.-]+)"[^>]*lon="([\d.-]+)"/g;
let m;
while ((m = nodeRegex.exec(xml)) !== null) {
  nodeMap.set(m[1], [parseFloat(m[3]), parseFloat(m[2])]); // [lon, lat]
}
console.log(`Parsed ${nodeMap.size} nodes.`);

// Parse tags for an element
function parseTags(block) {
  const tags = {};
  const tagRegex = /<tag k="([^"]+)" v="([^"]*)"/g;
  let tm;
  while ((tm = tagRegex.exec(block)) !== null) {
    // decode basic xml entities
    const val = tm[2]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
    tags[tm[1]] = val;
  }
  return tags;
}

// Parse node POIs
console.log('Parsing node POIs...');
const pois = [];
const fullNodeRegex = /<node id="(\d+)"[^>]*lat="([\d.-]+)"[^>]*lon="([\d.-]+)"([\s\S]*?)<\/(?:node>|node\s*\/>)/g;
// Also single tag nodes like <node ...> <tag .../> </node>
const nodeBlockRegex = /<node id="(\d+)"[^>]*lat="([\d.-]+)"[^>]*lon="([\d.-]+)"[^>]*>([\s\S]*?)<\/node>/g;
while ((m = nodeBlockRegex.exec(xml)) !== null) {
  const id = m[1];
  const lat = parseFloat(m[2]);
  const lon = parseFloat(m[3]);
  const tags = parseTags(m[4]);
  if (tags.amenity || tags.tourism || tags.shop || tags.leisure || tags.office) {
    const poiType = tags.amenity || tags.tourism || tags.shop || tags.leisure || tags.office || 'poi';
    pois.push({
      id: `poi-${id}`,
      osmId: parseInt(id, 10),
      type: 'poi',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        name: tags.name,
        amenity: tags.amenity,
        shop: tags.shop,
        tourism: tags.tourism,
        leisure: tags.leisure,
        office: tags.office,
        poiType,
        tags,
      },
    });
  }
}

// Parse ways
console.log('Parsing ways...');
const wayBlockRegex = /<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
const buildings = [];
const roads = [];
const parks = [];
const waters = [];

const DEFAULT_FLOOR_HEIGHT_METERS = 3.2;
const FALLBACK_HEIGHTS = {
  apartments: 28,
  residential: 18,
  commercial: 35,
  office: 45,
  retail: 18,
  industrial: 14,
  hospital: 28,
  school: 15,
  hotel: 40,
  yes: 24,
  default: 20,
};

function computePolygonCenter(coords) {
  let sumLng = 0;
  let sumLat = 0;
  const n = coords.length - 1;
  if (n <= 0) return coords[0] || [0, 0];
  for (let i = 0; i < n; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  return [sumLng / n, sumLat / n];
}

function computePolygonArea(coords) {
  let area = 0;
  const n = coords.length - 1;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  area = Math.abs(area) / 2;
  const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
  return Math.round(area * mPerDegLat * mPerDegLng);
}

function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeLineLength(coords) {
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    length += haversineDistance(coords[i - 1], coords[i]);
  }
  return Math.round(length);
}

while ((m = wayBlockRegex.exec(xml)) !== null) {
  const id = m[1];
  const block = m[2];
  const tags = parseTags(block);

  // Extract node references
  const ndRegex = /<nd ref="(\d+)"/g;
  const coords = [];
  let ndM;
  while ((ndM = ndRegex.exec(block)) !== null) {
    const pt = nodeMap.get(ndM[1]);
    if (pt) coords.push(pt);
  }

  if (coords.length < 2) continue;

  // 1. Buildings
  if (tags.building) {
    if (coords.length >= 3) {
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push([...coords[0]]);
      }
      const osmHeight = tags.height ? parseFloat(tags.height) : undefined;
      const osmLevels = tags['building:levels'] ? parseInt(tags['building:levels'], 10) : undefined;
      let estimatedHeight = 22;
      let heightSource = 'estimated';

      if (osmHeight && !isNaN(osmHeight) && osmHeight > 0) {
        estimatedHeight = osmHeight;
        heightSource = 'osm_height';
      } else if (osmLevels && !isNaN(osmLevels) && osmLevels > 0) {
        estimatedHeight = osmLevels * DEFAULT_FLOOR_HEIGHT_METERS;
        heightSource = 'osm_levels';
      } else {
        const buildingType = tags.building || 'default';
        estimatedHeight = FALLBACK_HEIGHTS[buildingType] || FALLBACK_HEIGHTS.default;
        // In BKC, commercial & highrises are prominent: if name has Tower, Plaza, Centre, etc., boost
        const nameLower = (tags.name || '').toLowerCase();
        if (nameLower.includes('tower') || nameLower.includes('centre') || nameLower.includes('center') || nameLower.includes('bkc')) {
          estimatedHeight = Math.max(estimatedHeight, 48);
        }
      }

      buildings.push({
        id: `building-${id}`,
        osmId: parseInt(id, 10),
        type: 'building',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          building: tags.building,
          name: tags.name,
          height: osmHeight,
          levels: osmLevels,
          estimatedHeight,
          heightSource,
          amenity: tags.amenity,
          office: tags.office,
          shop: tags.shop,
          tourism: tags.tourism,
          addrStreet: tags['addr:street'],
          addrHouseNumber: tags['addr:housenumber'],
          tags,
        },
        center: computePolygonCenter(coords),
        footprintArea: computePolygonArea(coords),
      });
    }
  }

  // 2. Roads
  else if (tags.highway) {
    const highway = tags.highway;
    const allowed = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'service', 'pedestrian', 'living_street', 'unclassified', 'busway'];
    if (allowed.includes(highway)) {
      roads.push({
        id: `road-${id}`,
        osmId: parseInt(id, 10),
        type: 'road',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        properties: {
          highway,
          name: tags.name || (highway === 'primary' || highway === 'trunk' ? 'BKC Avenue' : undefined),
          lanes: tags.lanes ? parseInt(tags.lanes, 10) : undefined,
          maxspeed: tags.maxspeed ? parseInt(tags.maxspeed, 10) : undefined,
          oneway: tags.oneway === 'yes',
          surface: tags.surface,
          tags,
        },
        length: computeLineLength(coords),
      });
    }
  }

  // 3. Parks
  else if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.landuse === 'grass' || tags.landuse === 'recreation_ground') {
    if (coords.length >= 3) {
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push([...coords[0]]);
      }
      parks.push({
        id: `park-${id}`,
        osmId: parseInt(id, 10),
        type: 'park',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          name: tags.name,
          leisure: tags.leisure,
          landuse: tags.landuse,
          tags,
        },
        center: computePolygonCenter(coords),
        area: computePolygonArea(coords),
      });
    }
  }

  // 4. Water
  else if (tags.natural === 'water' || tags.water || tags.waterway) {
    if (coords.length >= 3) {
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push([...coords[0]]);
      }
      waters.push({
        id: `water-${id}`,
        osmId: parseInt(id, 10),
        type: 'water',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          name: tags.name || 'Mithi River Basin',
          natural: tags.natural,
          water: tags.water,
          tags,
        },
      });
    }
  }
}

// 5. Intersections
console.log('Deriving intersections...');
const nodeRoadsMap = new Map();
for (const road of roads) {
  for (const coord of road.geometry.coordinates) {
    const key = `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
    if (!nodeRoadsMap.has(key)) {
      nodeRoadsMap.set(key, { position: coord, roads: new Set(), names: [] });
    }
    const item = nodeRoadsMap.get(key);
    item.roads.add(road.id);
    if (road.properties.name && !item.names.includes(road.properties.name)) {
      item.names.push(road.properties.name);
    }
  }
}

const intersections = [];
let junctionCount = 1;
for (const [, item] of nodeRoadsMap) {
  if (item.roads.size >= 2) {
    const name =
      item.names.length >= 2
        ? `${item.names[0]} & ${item.names[1]}`
        : item.names.length === 1
        ? `${item.names[0]} Crossing`
        : undefined;

    intersections.push({
      id: `intersection-${junctionCount}`,
      type: 'intersection',
      position: item.position,
      connectedRoads: Array.from(item.roads),
      name,
      generatedName: name || `BKC Junction J-${String(junctionCount).padStart(3, '0')}`,
    });
    junctionCount++;
  }
}

const result = {
  city: 'Mumbai',
  studyArea: 'Bandra Kurla Complex',
  center: [72.8656, 19.0665],
  stats: {
    buildingsCount: buildings.length,
    roadsCount: roads.length,
    intersectionsCount: intersections.length,
    poisCount: pois.length,
    parksCount: parks.length,
    watersCount: waters.length,
  },
  buildings,
  roads,
  intersections,
  pois,
  parks,
  waters,
};

console.log('Result stats:', result.stats);
fs.writeFileSync('src/assets/bkc_city_data.json', JSON.stringify(result, null, 2));
console.log('Successfully wrote src/assets/bkc_city_data.json!');
