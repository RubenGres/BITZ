import { NextResponse } from 'next/server';
import { API_URL, FARM_LOCATIONS } from '@/app/Constants';
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

// In-memory cache: keyed by group, stores result + the date it was computed
const cache = new Map<string, { date: string; data: Record<string, object[]> }>();

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function parseCSV(csv: string, questId: string): SpeciesRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    row.questId = questId;
    return row as unknown as SpeciesRow;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ group: string }> }
) {
  const { group } = await params;
  const url = new URL(request.url);
  const n = Math.min(Math.max(parseInt(url.searchParams.get('n') || '5', 10) || 5, 1), 10);

  const today = getTodayDate();
  const cacheKey = `${group}:${n}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.date === today) {
    return NextResponse.json(cached.data);
  }

  const farms = FARM_LOCATIONS[group];
  if (!farms || farms.length === 0) {
    return NextResponse.json({ error: `Unknown group: ${group}` }, { status: 404 });
  }

  const farmCoords = farms.map(farm => {
    const [latitude, longitude] = farm.coordinates.split(',').map(c => Number(c.trim()));
    return { name: farm.name, latitude, longitude };
  });

  // Fetch quest list from backend
  const listRes = await fetch(`${API_URL}/quest_list`);
  if (!listRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch quest list' }, { status: 502 });
  }
  const listData = await listRes.json();
  const questIds: string[] = Object.keys(listData.quests || {});

  // Fetch quest info in parallel
  const questResults = await Promise.allSettled(
    questIds.map(id =>
      fetch(`${API_URL}/quest_info?id=${id}`).then(r => r.ok ? r.json() : null)
    )
  );

  // Parse CSV data from each quest
  const allRows: SpeciesRow[] = [];
  for (let i = 0; i < questIds.length; i++) {
    const result = questResults[i];
    if (result.status !== 'fulfilled' || !result.value) continue;
    const csvString: string = result.value.species_data_csv || '';
    if (csvString) {
      allRows.push(...parseCSV(csvString, questIds[i]));
    }
  }

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

  return NextResponse.json(result);
}
