import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { QUEST_COLORS } from '@/app/Constants';
import { hashStringToIndex } from '@/app/utils/hashUtils';
import { API_URL } from '@/app/Constants';
import FullscreenImageModal from "@/app/components/FullscreenImageModal";

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
  [key: string]: any; // Allow for other properties
}

interface ListTabProps {
  questData: Record<string, QuestData>; // Changed to dictionary with questId as key
  loading: boolean;
  error: string | null;
}

const ListTab: React.FC<ListTabProps> = ({ questData, loading, error }) => {
  const [speciesData, setSpeciesData] = useState<SpeciesRow[]>([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{
    src: string;
    alt: string;
    lat?: string;
    lng?: string;
    questId: string;
  } | null>(null);

  useEffect(() => {
    if (questData && Object.keys(questData).length > 0) {
      setParsedLoading(true);
      setParseError(null);

      const allSpeciesData: SpeciesRow[] = [];
      const questIds = Object.keys(questData);
      let processedQuests = 0;

      const processQuest = (questId: string, questInfo: QuestData) => {
        if (!questInfo?.species_data_csv) {
          processedQuests++;
          if (processedQuests === questIds.length) {
            // Sort all data by timestamp and set state
            const sortedData = allSpeciesData.sort((a, b) => {
              const dateA = new Date(a.discovery_timestamp || 0);
              const dateB = new Date(b.discovery_timestamp || 0);
              return dateB.getTime() - dateA.getTime(); // Most recent first
            });
            setSpeciesData(sortedData);
            setParsedLoading(false);
          }
          return;
        }

        Papa.parse(questInfo.species_data_csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn(`CSV parsing errors for quest ${questId}:`, results.errors);
            }

            // Process the data for this quest
            const processedQuestData = results.data.map((row: any) => ({
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
            })) as SpeciesRow[];

            // Add this quest's data to the overall collection
            allSpeciesData.push(...processedQuestData);
            processedQuests++;

            // If all quests have been processed, sort and set the data
            if (processedQuests === questIds.length) {
              const sortedData = allSpeciesData.sort((a, b) => {
                const dateA = new Date(a.discovery_timestamp || 0);
                const dateB = new Date(b.discovery_timestamp || 0);
                return dateB.getTime() - dateA.getTime(); // Most recent first
              });
              setSpeciesData(sortedData);
              setParsedLoading(false);
            }
          },
          error: (error: Error) => {
            console.error(`Error parsing CSV for quest ${questId}:`, error);
            setParseError(`Error parsing quest ${questId}: ${error.message}`);
            setParsedLoading(false);
          }
        });
      };

      // Process all quests
      questIds.forEach(questId => {
        processQuest(questId, questData[questId]);
      });
    } else {
      setSpeciesData([]);
      setParsedLoading(false);
    }
  }, [questData]);

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timestamp;
    }
  };

  const openFullscreen = (src: string, alt: string, questId: string, lat?: string, lng?: string) => {
    setFullscreenImage({ src, alt, questId, lat, lng });
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  if (loading || parsedLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error || parseError) {
    return <div className="p-4 text-red-500">Error: {error || parseError}</div>;
  }

  if (!questData || Object.keys(questData).length === 0) {
    return <div className="p-4">No quest data available</div>;
  }

  return (
    <div className="p-4">
      {speciesData.length === 0 ? (
        <p className="text-gray-600">No species data found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Image
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Common Name
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Scientific Name
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Taxonomic Group
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Discovery Timestamp
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Confidence
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {speciesData.map((row, index) => (
                <tr
                  key={`${row.questId}-${index}`}
                  className="hover:bg-gray-50"
                  style={{ borderLeft: '7px solid ' + QUEST_COLORS[hashStringToIndex(row.questId, QUEST_COLORS.length)] }}
                  onClick={() => { window.location.href = `/view?id=${row.questId}`; }}
                >
                  <td className="border border-gray-200 px-4 py-2">
                    {row.image_name ? (
                      <div className="w-24 h-24 overflow-hidden rounded">
                        <img
                          src={`${API_URL}/explore/images/${row.questId}/${row.image_name}?res=medium`}
                          alt={row['common_name'] || row['scientific_name'] || 'Species image'}
                          className="w-full h-full object-contain cursor-pointer transition-opacity hover:opacity-80"
                          loading="lazy"
                          onClick={(e) => {
                            openFullscreen(
                              `${API_URL}/explore/images/${row.questId}/${row.image_name}`,
                              row['common_name'] || row['scientific_name'] || 'Species image',
                              row.questId,
                              row.latitude,
                              row.longitude
                            );
                            e.stopPropagation();
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm">
                    {row['common_name'] || 'N/A'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm font-medium italic">
                    {row['scientific_name'] || 'N/A'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm">
                    {row['taxonomic_group'] || 'N/A'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm">
                    {formatTimestamp(row['discovery_timestamp'])}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm">
                    {row.confidence || 'N/A'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm">
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FullscreenImageModal
        src={fullscreenImage?.src || ''}
        alt={fullscreenImage?.alt || ''}
        isOpen={!!fullscreenImage}
        onClose={closeFullscreen}
      />
    </div>
  );
};

export default ListTab;