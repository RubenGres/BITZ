import React from 'react';
import { QuestData } from './QuestTypes';

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
      <h2 className="text-2xl font-bold text-green-800">STATS</h2>
      <div className="text-orange-500">QUEST #{questData.metadata?.quest_id || 'N/A'}</div>
      
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