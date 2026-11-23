import React, { useMemo } from 'react';
import Papa from 'papaparse';
import { QUEST_COLORS } from '@/app/Constants';
import { hashStringToIndex } from '@/app/utils/hashUtils';
import dynamic from 'next/dynamic';
import { applyGlobalFilters, getActiveFilterDomainKey } from '@/app/utils/dataFilters'; // 👈 Import the filter functions

// Dynamically import the map components with ssr disabled
const MapWithNoSSR = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading map...</div>
  }
);

interface SpeciesRow {
  'image_name': string;
  'taxonomic_group': string;
  'scientific_name': string;
  'common_name': string;
  'discovery_timestamp': string;
  'confidence': string;
  'notes': string;
  'latitude': string;
  'longitude': string;
  'questId': string;
}

interface QuestData {
  species_data_csv: string;
}

interface MapTabProps {
  questData: Record<string, QuestData>;
  loading: boolean;
  error: string | null;
  filters?: {
    searchText: string;
  };
}


// --- React Component ---

const MapTab: React.FC<MapTabProps> = ({ questData, loading, error, filters }) => {
  const searchText = filters?.searchText || '';
  const domainKey = useMemo(() => getActiveFilterDomainKey(), []);
  const { allSpeciesData, questColors } = useMemo(() => {
    const allSpeciesData: SpeciesRow[] = [];
    const questColors: Record<string, string> = {};
    for (const [questId, quest] of Object.entries(questData)) {
      questColors[questId] = QUEST_COLORS[hashStringToIndex(questId, QUEST_COLORS.length)];
      if (!quest?.species_data_csv) continue;
      const parsed = Papa.parse<SpeciesRow>(quest.species_data_csv, {
        header: true, skipEmptyLines: true,
      });
      for (const row of parsed.data) allSpeciesData.push({ ...row, questId });
    }
    return { allSpeciesData, questColors };
  }, [questData]);

  const filteredSpeciesData = useMemo(() => {
    // 1. Apply the global filter
    let data = applyGlobalFilters(allSpeciesData);
    
    // 2. Apply text search filter across all fields
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      data = data.filter(row => {
        return (
          row['common_name']?.toLowerCase().includes(searchLower) ||
          row['scientific_name']?.toLowerCase().includes(searchLower) ||
          row['taxonomic_group']?.toLowerCase().includes(searchLower) ||
          row['notes']?.toLowerCase().includes(searchLower) ||
          row['image_name']?.toLowerCase().includes(searchLower)
        );
      });
    }

    return data;
  }, [allSpeciesData, searchText]);

  const hasValidCoordinates = filteredSpeciesData.some(row =>
    row.latitude && row.longitude && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))
  );

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="h-full w-full flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  if (!questData || Object.keys(questData).length === 0) {
    return <div className="h-full w-full flex items-center justify-center">No quest data available</div>;
  }

  if (!hasValidCoordinates) {
    const isFiltered = domainKey && (allSpeciesData.length > filteredSpeciesData.length);
    const filterStatus = isFiltered ? 
        `after filtering to within 5km of a farm for **${domainKey}**` : 
        '';
        
    return <div className="h-full w-full flex items-center justify-center">
        No valid GPS coordinates found in the species data {filterStatus}.
    </div>;
  }

  return (
    <div className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>      
      <MapWithNoSSR 
        speciesData={filteredSpeciesData} // Use the filtered data
        questColors={questColors}
        mapCenter={[0, 0]}
      />
    </div>
  );
};

export default MapTab;