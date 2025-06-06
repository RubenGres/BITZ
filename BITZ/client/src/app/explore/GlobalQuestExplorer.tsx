import React, { useState, useEffect } from 'react';
import { API_URL } from '@/app/Constants';
import NetworkTab from '../components/visuals/NetworkTab';
import ListTab from '../components/visuals/ListTab';
import MapTab from '../components/visuals/MapTab';
// import { QuestData } from './QuestTypes';

const QuestExplorer = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [questDataDict, setQuestDataDict] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First, fetch the list of all quest IDs
    fetch(`${API_URL}/quest_list`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch quest list');
        }
        return response.json();
      })
      .then(data => {
        if (!data || !data.quests) {
          throw new Error('Invalid quest list data structure');
        }
       
        // Get all quest IDs from the quests object keys
        const questIds = Object.keys(data.quests);
       
        // Create an array of promises to fetch details for each quest
        const questPromises = questIds.map(id =>
          fetch(`${API_URL}/quest_info?id=${id}`)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch quest info for ${id}`);
              }
              return response.json();
            })
            .then(questData => {
              return { id, data: questData };
            })
            .catch(err => {
              console.error(`Error fetching quest ${id}:`, err);
              return { id, data: null, error: err.message };
            })
        );
       
        // Wait for all quest detail requests to complete
        return Promise.all(questPromises);
      })
      .then(questResults => {
        // Build the questDataDict from the results
        const newQuestDataDict = {};
       
        questResults.forEach(result => {
          if (result.data) {
            newQuestDataDict[result.id] = result.data;
          }
        });
       
        console.log('All quest data loaded:', newQuestDataDict);
        setQuestDataDict(newQuestDataDict);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching quests:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Render the appropriate tab content based on activeTab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 'list': 
        return <ListTab questData={questDataDict} loading={loading} error={error} />;
      case 'network': 
        return <NetworkTab questDataDict={questDataDict} loading={loading} error={error} />;
      case 'map': 
        return <MapTab questData={questDataDict} loading={loading} error={error} />;
      default: 
        return <h1> ☝🤓 </h1>
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Tabs - Scrollable container */}
      <div className="mt-4 px-6">
        <div className="overflow-x-auto">
          <div className="flex whitespace-nowrap">
            <button 
              className={`px-6 py-2 ml-1 ${activeTab === 'map' 
                ? 'bg-green-400 text-white' 
                : 'border border-green-400 text-green-400'}`}
              onClick={() => setActiveTab('map')}
            >
              MAP
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
          </div>
        </div>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 border-t border-green-400 mt-0">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default QuestExplorer;