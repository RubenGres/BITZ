import React from 'react';
import { QuestData } from '../../view/QuestTypes';
import { API_URL } from '@/app/Constants';

interface StatsTabProps {
  questData: QuestData | null;
  loading: boolean;
  error: string | null;
}

const StatsTab: React.FC<StatsTabProps> = ({ questData, loading, error }) => {
  // Helper function to format location
  const formatLocation = (location: any): string => {
    if (!location) return 'N/A';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      // If location is an empty object, return 'N/A'
      if (Object.keys(location).length === 0) return 'N/A';
      // Otherwise, try to format it as JSON or extract relevant fields
      return JSON.stringify(location);
    }
    return 'N/A';
  };

  // Helper function to format duration
  const formatDuration = (duration: string | number | undefined): string => {
    if (!duration) return 'N/A';
    if (typeof duration === 'number') {
      // Convert seconds to a readable format
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    return duration.toString();
  };

  // Helper function to format date and time
  const formatDateTime = (dateTime: string | undefined): { date: string; time: string } => {
    if (!dateTime) return { date: 'N/A', time: 'N/A' };
    
    try {
      const dt = new Date(dateTime);
      const date = dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const time = dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return { date, time };
    } catch (error) {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  // Handle download
  const handleDownload = () => {
    const questId = questData.metadata?.quest_id;
    if (questId) {
      window.location.href = `${API_URL}/download/${questId}`;
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!questData) {
    return <div className="p-4">No quest data available</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">STATS</h2>
          <div className="text-orange-500">QUEST #{questData.metadata?.quest_id || 'N/A'}</div>
        </div>
        
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md transition-colors duration-200 flex items-center gap-2"
          disabled={!questData.metadata?.quest_id}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
            />
          </svg>
          Download Quest
        </button>
      </div>
      
      <div className="mt-6">
        <div className="mb-4">
          <div className="text-green-800 font-medium">FLAVOR</div>
          <div>{questData.metadata?.flavor || 'N/A'}</div>
        </div>

        <div className="mb-4">
          <div className="text-green-800 font-medium">LOCATION</div>
          <div>{formatLocation(questData.metadata?.location)}</div>
        </div>

        <div className="mb-4">
          <div className="text-green-800 font-medium">DATE</div>
          <span>{formatDateTime(questData.metadata?.date_time).date} </span>
          at
          <span> {formatDateTime(questData.metadata?.date_time).time}</span>
        </div>

        <div className="mb-4">
          <div className="text-green-800 font-medium">DURATION</div>
          <div>{formatDuration(questData.metadata?.duration)}</div>
        </div>

        <div className="mb-4">
          <div className="text-green-800 font-medium">IMAGE NUMBER</div>
          <div>{questData.metadata?.nb_images || 'N/A'}</div>
        </div>
        
        <div className="mb-4">
          <div className="text-green-800 font-medium">SPECIES COUNT</div>
          <div>{questData.metadata?.species_count || 'N/A'}</div>
        </div>
        
        {/* Display taxonomic groups if available */}
        {questData.metadata?.taxonomic_groups && Object.keys(questData.metadata?.taxonomic_groups).length > 0 && (
          <div className="mb-4">
            <div className="text-green-800 font-medium">TAXONOMIC GROUPS</div>
            <div>
              {Object.entries(questData.metadata?.taxonomic_groups).map(([group, count]) => (
                <div key={group} className="ml-2">
                  {group}: {count}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsTab;