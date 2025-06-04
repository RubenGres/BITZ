import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { QUEST_COLORS } from '@/app/Constants';
import { hashStringToIndex } from '@/app/utils/hashUtils';
import dynamic from 'next/dynamic';

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
  'questId': string; // Added to track which quest this species belongs to
}

interface QuestData {
  species_data_csv: string;
  // Add other quest properties as needed
}

interface MapTabProps {
  questData: Record<string, QuestData>; // Changed to dict with questId as key
  loading: boolean;
  error: string | null;
}

const MapTab: React.FC<MapTabProps> = ({ questData, loading, error }) => {
  const [allSpeciesData, setAllSpeciesData] = useState<SpeciesRow[]>([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  const [questColors, setQuestColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (questData && Object.keys(questData).length > 0) {
      setParsedLoading(true);
      setParseError(null);
      
      const allProcessedData: SpeciesRow[] = [];
      const colors: Record<string, string> = {};
      const questIds = Object.keys(questData);
      
      // Assign colors to each quest
      questIds.forEach((questId, index) => {
        colors[questId] = QUEST_COLORS[hashStringToIndex(questId, QUEST_COLORS.length)];
      });
      setQuestColors(colors);
      
      let processedQuests = 0;
      const totalQuests = questIds.length;
      
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
                // Try to continue despite errors
              }
              
              // Process the data to ensure all required fields exist
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
              
              // Check if all quests have been processed
              if (processedQuests === totalQuests) {
                setAllSpeciesData(allProcessedData);
                setParsedLoading(false);
                
                // Calculate map center based on valid coordinates from all quests
                const validCoordinatesData = allProcessedData.filter(row => 
                  row.latitude && row.longitude && 
                  !isNaN(Number(row.latitude)) && !isNaN(Number(row.longitude))
                );
                
                if (validCoordinatesData.length > 0) {
                  setHasValidCoordinates(true);
                  
                  // Calculate the average of all coordinates to center the map
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
                }
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
    }
  }, [questData]);

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
    return <div className="h-full w-full flex items-center justify-center">No valid GPS coordinates found in the species data</div>;
  }

  return (
    <div className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>      
      <MapWithNoSSR 
        speciesData={allSpeciesData}
        questColors={questColors}
        mapCenter={mapCenter}
      />
    </div>
  );
};

export default MapTab;