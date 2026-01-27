import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { QUEST_COLORS, API_URL, FARM_LOCATIONS } from '@/app/Constants';
import { hashStringToIndex } from '@/app/utils/hashUtils';
import FullscreenImageModal from "@/app/components/FullscreenImageModal";
// Assuming dataFilters.ts contains the necessary functions (like applyGlobalFilters, getDomainKey, etc.)
// Note: You must ensure applyGlobalFilters and getActiveFilterDomainKey are exported from dataFilters.ts
import { applyGlobalFilters, getActiveFilterDomainKey } from '@/app/utils/dataFilters'; 

// --- INTERFACES ---

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
  timestamp?: string;
  [key: string]: any; // Allow for other properties
}

interface ListTabProps {
  questData: Record<string, QuestData>;
  loading: boolean;
  error: string | null;
  filters?: {
    searchText: string;
  };
}

// --- REACT COMPONENT ---

const ListTab: React.FC<ListTabProps> = ({ questData, loading, error, filters }) => {
  // rawData holds the data immediately after parsing, before filtering/sorting.
  const [rawData, setRawData] = useState<SpeciesRow[]>([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Provide default values for filters if not passed
  const activeFilters = filters || {
    searchText: ''
  };
  const [fullscreenImage, setFullscreenImage] = useState<{
    src: string;
    alt: string;
    lat?: string;
    lng?: string;
    questId: string;
  } | null>(null);
  const [displayedRows, setDisplayedRows] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Memoized data: Applies the global filter and then sorts it.
  const speciesData = useMemo(() => {
    // 1. Apply the geographic filter using the external utility
    let filtered = applyGlobalFilters(rawData);
    
    // 2. Apply text search filter across all fields
    if (activeFilters.searchText) {
      const searchLower = activeFilters.searchText.toLowerCase();
      filtered = filtered.filter(row => {
        return (
          row['common_name']?.toLowerCase().includes(searchLower) ||
          row['scientific_name']?.toLowerCase().includes(searchLower) ||
          row['taxonomic_group']?.toLowerCase().includes(searchLower) ||
          row['notes']?.toLowerCase().includes(searchLower) ||
          row['image_name']?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // 3. Sort the filtered data by timestamp (most recent first)
    const sortedData = filtered.sort((a, b) => {
      const dateA = new Date(a.discovery_timestamp || 0);
      const dateB = new Date(b.discovery_timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedData;
  }, [rawData, activeFilters]); // Recalculate whenever new raw data is available

  useEffect(() => {
    if (questData && Object.keys(questData).length > 0) {
      setParsedLoading(true);
      setParseError(null);
      setDisplayedRows(20); // Reset pagination when data changes

      const allSpeciesData: SpeciesRow[] = [];
      const questIds = Object.keys(questData);
      let processedQuests = 0;

      const processQuest = (questId: string, questInfo: QuestData) => {
        if (!questInfo?.species_data_csv) {
          processedQuests++;
          if (processedQuests === questIds.length) {
            // Set the raw data, allowing useMemo to handle filtering/sorting
            setRawData(allSpeciesData);
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

            // Use the quest-level timestamp (convert from Unix timestamp to ISO string)
            const questTimestamp = questInfo.timestamp 
              ? new Date(parseInt(questInfo.timestamp) * 1000).toISOString()
              : '';
            
            const processedQuestData = results.data.map((row: any) => ({
              'image_name': row['image_name'] || '',
              'taxonomic_group': row['taxonomic_group'] || '',
              'scientific_name': row['scientific_name'] || '',
              'common_name': row['common_name'] || '',
              'discovery_timestamp': questTimestamp, // Use the quest-level timestamp
              'confidence': row['confidence'] || '',
              'notes': row['notes'] || '',
              'latitude': row['latitude'] || '',
              'longitude': row['longitude'] || '',
              'questId': questId
            })) as SpeciesRow[];

            allSpeciesData.push(...processedQuestData);
            processedQuests++;

            // If all quests have been processed, set the raw data
            if (processedQuests === questIds.length) {
              setRawData(allSpeciesData);
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
      setRawData([]);
      setParsedLoading(false);
    }
  }, [questData]);

  // Infinite scroll handler
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    // Check against the length of the FILTERED data (speciesData)
    if (target.isIntersecting && !isLoadingMore && displayedRows < speciesData.length) {
      setIsLoadingMore(true);
      // Simulate loading delay for smooth UX
      setTimeout(() => {
        setDisplayedRows(prev => Math.min(prev + 20, speciesData.length));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [isLoadingMore, displayedRows, speciesData.length]);

  // Set up intersection observer
  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px', // Start loading a bit before reaching the bottom
      threshold: 0.1
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  const formatDate = (timestamp: string): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  };

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
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

  // Get only the rows to display from the filtered and sorted data
  const visibleData = speciesData.slice(0, displayedRows);
  const domainKey = getActiveFilterDomainKey();
  const isFiltered = domainKey && (rawData.length > speciesData.length);

  return (
    <div className="p-4">
      {speciesData.length === 0 ? (
        <p className="text-gray-600">
          No species data found {isFiltered ? `after applying domain filter for ${domainKey}.` : ''}
        </p>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {visibleData.length} of {speciesData.length} species.
            {isFiltered && (
              <span className="ml-2 text-yellow-700 font-medium">
                (Filtered from {rawData.length} total by 5km radius around {domainKey} farms)
              </span>
            )}
          </div>
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
                    Discovery Date
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Discovery Time
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
                {visibleData.map((row, index) => (
                  <tr
                    key={`${row.questId}-${index}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    style={{ borderLeft: '7px solid ' + QUEST_COLORS[hashStringToIndex(row.questId, QUEST_COLORS.length)] }}
                    onClick={() => { window.location.href = `/view?id=${row.questId}`; }}
                  >
                    <td className="border border-gray-200 px-4 py-2">
                      {row.image_name ? (
                        <div className="w-24 h-24 overflow-hidden rounded">
                          <img
                            src={`${API_URL}/explore/images/${row.questId}/${row.image_name}?res=thumb`}
                            alt={row['common_name'] || row['scientific_name'] || 'Species image'}
                            className="w-full h-full object-contain cursor-pointer transition-opacity hover:opacity-80"
                            loading="lazy"
                            onClick={(e) => {
                              openFullscreen(
                                `${API_URL}/explore/images/${row.questId}/${row.image_name}?res=medium`,
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
                      {formatDate(row['discovery_timestamp'])}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-sm">
                      {formatTime(row['discovery_timestamp'])}
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

          {/* Intersection observer target and loading indicator */}
          {displayedRows < speciesData.length && (
            <div ref={observerTarget} className="py-4 text-center">
              {isLoadingMore && (
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
          )}

          {displayedRows >= speciesData.length && speciesData.length > 20 && (
            <div className="py-4 text-center text-sm text-gray-500">
              All {speciesData.length} species loaded
            </div>
          )}
        </>
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