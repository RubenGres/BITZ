import { NextResponse } from 'next/server';
import { API_URL, FARM_LOCATIONS } from '@/app/Constants';
import Papa from 'papaparse';
import { getDistance } from 'geolib';

interface SpeciesRow {
  image_name: string;
  common_name: string;
  scientific_name: string;
  discovery_timestamp: string;
  confidence: string;
  latitude: string;
  longitude: string;
  questId: string;
}

const MAX_DISTANCE_METERS = 5000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// In-memory cache: keyed by group, stores result + the date it was computed
const cache = new Map<string, { date: string; data: Record<string, object[]> }>();

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function parseCSV(csv: string, questId: string): SpeciesRow[] {
  return Papa.parse<SpeciesRow>(csv, { header: true, skipEmptyLines: true }).data
    .map(row => ({ ...row, questId }));

}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ group: string }> }
) {
  const { group } = await params;
  const url = new URL(request.url);
  const n = Math.min(Math.max(parseInt(url.searchParams.get('n') || '5', 10) || 5, 1), 100000);

  const today = getTodayDate();
  const cacheKey = `${group}:${n}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.date === today) {
    return NextResponse.json(cached.data, { headers: corsHeaders });
  }

  const farms = FARM_LOCATIONS[group];
  if (!farms || farms.length === 0) {
    return NextResponse.json({ error: `Unknown group: ${group}` }, { status: 404, headers: corsHeaders });
  }

  const farmCoords = farms.map(farm => {
    const [latitude, longitude] = farm.coordinates.split(',').map(c => Number(c.trim()));
    return { name: farm.name, latitude, longitude };
  });

  const response = await fetch(API_URL + '/explorer_data');
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch explorer data' }, { status: 502, headers: corsHeaders });
  }
  const quests: Record<string, { species_data_csv: string }> = await response.json();
  const allRows = Object.entries(quests).flatMap(([id, quest]) => parseCSV(quest.species_data_csv, id));

  // Bucket observations by nearest farm within 5km
  const perFarm: Record<string, SpeciesRow[]> = {};
  for (const farm of farmCoords) {
    perFarm[farm.name] = [];
  }

  for (const row of allRows) {
    const obsLat = Number(row.latitude);
    const obsLng = Number(row.longitude);
    if (isNaN(obsLat) || isNaN(obsLng)) continue;

    const observation = { latitude: obsLat, longitude: obsLng };

    for (const farm of farmCoords) {
      const dist = getDistance(observation, { latitude: farm.latitude, longitude: farm.longitude });
      if (dist <= MAX_DISTANCE_METERS) {
        perFarm[farm.name].push(row);
        break; // assign to first matching farm
      }
    }
  }

  // Sort by timestamp descending, take top n
  const result: Record<string, object[]> = {};
  for (const [farmName, rows] of Object.entries(perFarm)) {
    rows.sort((a, b) => (b.discovery_timestamp || '').localeCompare(a.discovery_timestamp || ''));
    result[farmName] = rows.slice(0, n).map(r => ({
      image_url: `${API_URL}/explore/images/${r.questId}/${r.image_name}`,
      quest_id: r.questId,
      species_id: r.image_name[0],
      common_name: r.common_name,
      scientific_name: r.scientific_name,
      discovery_timestamp: r.discovery_timestamp,
      confidence: r.confidence,
    }));
  }

  cache.set(cacheKey, { date: today, data: result });

  return NextResponse.json(result, { headers: corsHeaders });
}
