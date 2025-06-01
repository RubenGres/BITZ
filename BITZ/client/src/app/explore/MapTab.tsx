import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { API_URL } from '@/app/Constants';
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
}

interface MapTabProps {
  questData: any;
  questId: string;
  loading: boolean;
  error: string | null;
}

const MapTab: React.FC<MapTabProps> = ({ questData, questId, loading, error }) => {
  const [speciesData, setSpeciesData] = useState<SpeciesRow[]>([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);

  useEffect(() => {
    if (questData?.species_data_csv) {
      setParsedLoading(true);
      setParseError(null);
      
      Papa.parse(questData.species_data_csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV parsing errors:", results.errors);
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
              'longitude': row['longitude'] || ''
            };
          });
          
          setSpeciesData(processedData as SpeciesRow[]);
          setParsedLoading(false);
          
          // Calculate map center based on valid coordinates
          const validCoordinatesData = processedData.filter(row => 
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
        },
        error: (error: Error) => {
          setParseError(error.message);
          setParsedLoading(false);
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

  if (!questData?.species_data_csv) {
    return <div className="h-full w-full flex items-center justify-center">No species data available</div>;
  }

  if (!hasValidCoordinates) {
    return <div className="h-full w-full flex items-center justify-center">No valid GPS coordinates found in the species data</div>;
  }

  return (
    <div className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
      <MapWithNoSSR 
        speciesData={speciesData}
        questId={questId}
        mapCenter={mapCenter}
      />
    </div>
  );
};

export default MapTab;