import React, { useState, useEffect } from 'react';
import { API_URL } from '@/app/Constants';
import StatsTab from './StatsTab';
import ListTab from './ListTab';
import { QuestData } from './QuestTypes';

const QuestExplorer = ({ questId = "XXXXXXXX" }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [questData, setQuestData] = useState<QuestData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestId, setCurrentQuestId] = useState<string>(questId);

  useEffect(() => {
    // Get the id parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || questId;
    setCurrentQuestId(id);

    // Make the GET request
    fetch(`${API_URL}/quest_info?id=${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log(data);
        if (data) {
          setQuestData(data);
        } else {
          throw new Error('Invalid data structure');
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setError(error.message);
        setLoading(false);
      });
  }, [questId]);

  // Tab content components (only define the tabs that aren't in separate files)
  
  const NetworkTab = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-green-800">NETWORK</h2>
      <p className="text-gray-600">Network visualization will go here</p>
      {/* You would add your network visualization here */}
    </div>
  );
  
  const MapTab = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-green-800">MAP</h2>
      <p className="text-gray-600">Map visualization will go here</p>
      {/* You would add your map visualization here */}
    </div>
  );
  
  // Render the appropriate tab content based on activeTab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats': 
        return <StatsTab questData={questData} loading={loading} error={error} />;
      case 'list': 
        return <ListTab questData={questData} questId={currentQuestId} loading={loading} error={error} />;
      case 'network': 
        return <NetworkTab />;
      case 'map': 
        return <MapTab />;
      default: 
        return <StatsTab questData={questData} loading={loading} error={error} />;
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Tabs - Scrollable container */}
      <div className="mt-4 px-6">
        <div className="overflow-x-auto">
          <div className="flex whitespace-nowrap">
            <button 
              className={`px-6 py-2 mr-1 ${activeTab === 'stats' 
                ? 'bg-green-400 text-white' 
                : 'border border-green-400 text-green-400'}`}
              onClick={() => setActiveTab('stats')}
            >
              STATS
            </button>
            <button 
              className={`px-6 py-2 mx-1 ${activeTab === 'list' 
                ? 'bg-green-400 text-white' 
                : 'border border-green-400 text-green-400'}`}
              onClick={() => setActiveTab('list')}
            >
              LIST
            </button>
            <button 
              className={`px-6 py-2 mx-1 ${activeTab === 'network' 
                ? 'bg-green-400 text-white' 
                : 'border border-green-400 text-green-400'}`}
              onClick={() => setActiveTab('network')}
            >
              NETWORK
            </button>
            <button 
              className={`px-6 py-2 ml-1 ${activeTab === 'map' 
                ? 'bg-green-400 text-white' 
                : 'border border-green-400 text-green-400'}`}
              onClick={() => setActiveTab('map')}
            >
              MAP
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab content */}
      <div className="flex-grow border-t border-green-400 mt-0">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default QuestExplorer;