import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { QUEST_COLORS } from '@/app/Constants';
import { hashStringToIndex } from '@/app/utils/hashUtils';
import dynamic from 'next/dynamic';
import * as geolib from 'geolib'; // geolib is imported but only used indirectly via the utility file now
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
}


// --- React Component ---

const MapTab: React.FC<MapTabProps> = ({ questData, loading, error }) => {
  const [allSpeciesData, setAllSpeciesData] = useState<SpeciesRow[]>([]); // Raw parsed data
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  const [questColors, setQuestColors] = useState<Record<string, string>>({});
  
  // Get the domain key result for UI messaging
  const domainKey = useMemo(() => getActiveFilterDomainKey(), []);

  // --- CSV Parsing Logic ---
  useEffect(() => {
    if (questData && Object.keys(questData).length > 0) {
      setParsedLoading(true);
      setParseError(null);
      
      const allProcessedData: SpeciesRow[] = [];
      const colors: Record<string, string> = {};
      const questIds = Object.keys(questData);
      
      questIds.forEach((questId) => {
        colors[questId] = QUEST_COLORS[hashStringToIndex(questId, QUEST_COLORS.length)];
      });
      setQuestColors(colors);
      
      let processedQuests = 0;
      const totalQuests = questIds.length;
      
      if (totalQuests === 0) {
          setParsedLoading(false);
          return;
      }
      
      questIds.forEach((questId) => {
        const quest = questData[questId];
        
        if (quest?.species_data_csv) {
          Papa.parse(quest.species_data_csv, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.warn(`CSV parsing errors for quest ${questId}:`, results.errors);
              }
              
              const processedData = results.data.map((row: any) => {
                return {
                  'image_name': row['image_name'] || '',
                  'taxonomic_group': row['taxonomic_group'] || '',
                  'scientific_name': row['scientific_name'] || '',
                  'common_name': row['common_name'] || '',
                  'discovery_timestamp': row['discovery_timestamp'] || '',
                  'confidence': row['confidence'] || '',
                  'notes': row['notes'] || '',
                  'latitude': row['latitude'] || '',
                  'longitude': row['longitude'] || '',
                  'questId': questId
                };
              });
              
              allProcessedData.push(...(processedData as SpeciesRow[]));
              processedQuests++;
              
              if (processedQuests === totalQuests) {
                // Set raw data; filtering and centering happens in useMemo
                setAllSpeciesData(allProcessedData);
                setParsedLoading(false);
              }
            },
            error: (error: Error) => {
              console.error(`Error parsing CSV for quest ${questId}:`, error);
              setParseError(error.message);
              setParsedLoading(false);
            }
          });
        } else {
          processedQuests++;
          if (processedQuests === totalQuests) {
            setParsedLoading(false);
          }
        }
      });
    } else if (Object.keys(questData).length === 0) {
        setAllSpeciesData([]);
        setParsedLoading(false);
    }
  }, [questData]);

  // --- Filtering and Centering Logic ---
  const filteredSpeciesData = useMemo(() => {
    // 1. Apply the global filter
    const data = applyGlobalFilters(allSpeciesData);

    // 2. Recalculate center and check for valid coordinates based on the filtered data
    const validCoordinatesData = data.filter(row => 
      row.latitude && row.longitude && 
      !isNaN(Number(row.latitude)) && !isNaN(Number(row.longitude))
    );

    if (validCoordinatesData.length > 0) {
      // Use side-effects inside useMemo conditionally for dependent state, 
      // although better handled in a subsequent useEffect if dependency graph is complex.
      // Here, it's fine as it only runs when allSpeciesData changes.
      setHasValidCoordinates(true);
      
      const totalLat = validCoordinatesData.reduce((sum, row) => 
        sum + Number(row.latitude), 0);
      const totalLng = validCoordinatesData.reduce((sum, row) => 
        sum + Number(row.longitude), 0);
      
      setMapCenter([
        totalLat / validCoordinatesData.length,
        totalLng / validCoordinatesData.length
      ]);
    } else {
      setHasValidCoordinates(false);
      setMapCenter([0, 0]); 
    }

    return data;
  }, [allSpeciesData]); // Only depends on the raw data

  // --- Render Logic ---

  if (loading || parsedLoading) {
    return <div className="h-full w-full flex items-center justify-center">Loading...</div>;
  }

  if (error || parseError) {
    return <div className="h-full w-full flex items-center justify-center text-red-500">Error: {error || parseError}</div>;
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
        mapCenter={mapCenter}
      />
    </div>
  );
};

export default MapTab;