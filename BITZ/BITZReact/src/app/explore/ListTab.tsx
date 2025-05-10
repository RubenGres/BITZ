import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { API_URL } from '@/app/Constants';

interface SpeciesRow {
  'image_name': string;
  'taxonomic_group': string;
  'scientific_name': string;
  'common_name': string;
  'discovery_timestamp': string;
  'confidence': string;
  'notes': string;
}

interface ListTabProps {
  questData: any;
  questId: string;
  loading: boolean;
  error: string | null;
}

const ListTab: React.FC<ListTabProps> = ({ questData, questId, loading, error }) => {
  const [speciesData, setSpeciesData] = useState<SpeciesRow[]>([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

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
            setParseError(results.errors[0].message);
          } else {
            setSpeciesData(results.data as SpeciesRow[]);
          }
          setParsedLoading(false);
        },
        error: (error: Error) => {
          setParseError(error.message);
          setParsedLoading(false);
        }
      });
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

  const openFullscreen = (src: string, alt: string) => {
    setFullscreenImage({ src, alt });
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  // Handle escape key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        closeFullscreen();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreenImage]);

  if (loading || parsedLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error || parseError) {
    return <div className="p-4 text-red-500">Error: {error || parseError}</div>;
  }

  if (!questData?.species_data_csv) {
    return <div className="p-4">No species data available</div>;
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
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {row.image_name ? (
                      <div className="w-24 h-24 overflow-hidden rounded">
                        <img
                          src={`${API_URL}/explore/images/${questId}/${row.image_name}`}
                          alt={row['common_name'] || row['scientific_name'] || 'Species image'}
                          className="w-full h-full object-contain cursor-pointer transition-opacity hover:opacity-80"
                          loading="lazy"
                          onClick={() => openFullscreen(
                            `${API_URL}/explore/images/${questId}/${row.image_name}`,
                            row['common_name'] || row['scientific_name'] || 'Species image'
                          )}
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

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 transition-colors"
              aria-label="Close fullscreen"
            >
              ×
            </button>
            <img
              src={fullscreenImage.src}
              alt={fullscreenImage.alt}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="text-white text-center mt-4 text-sm">
              {fullscreenImage.alt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListTab;