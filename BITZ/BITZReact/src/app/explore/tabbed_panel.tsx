import React, { useState } from 'react';

const QuestExplorer = ({ questId = "XXXXXXXX" }) => {
  const [activeTab, setActiveTab] = useState('stats');
  
  // Mock data - you would replace this with your actual data
  const questData = {
    questId: questId,
    dateTime: "XXXXX",
    speciesCount: "XXXXX",
    speciesTypes: ["XXXXX", "XXXXX", "XXXXX"],
    questLength: "XXXXX"
  };
  
  // Tab content components
  const StatsTab = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-green-800">STATS</h2>
      <div className="text-orange-500">QUEST #{questData.questId}</div>
      
      <div className="mt-6">
        <div className="mb-4">
          <div className="text-green-800 font-medium">DATE / TIME</div>
          <div>{questData.dateTime}</div>
        </div>
        
        <div className="mb-4">
          <div className="text-green-800 font-medium">SPECIES COUNT</div>
          <div>{questData.speciesCount}</div>
        </div>
        
        <div className="mb-4">
          <div className="text-green-800 font-medium">SPECIES TYPES</div>
          {questData.speciesTypes.map((type, index) => (
            <div key={index}>{type}</div>
          ))}
        </div>
        
        <div className="mb-4">
          <div className="text-green-800 font-medium">LENGTH OF QUEST</div>
          <div>{questData.questLength}</div>
        </div>
      </div>
    </div>
  );
  
  const ListTab = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-green-800">LIST</h2>
      <p className="text-gray-600">Species list view will go here</p>
      {/* You would add your list view implementation here */}
    </div>
  );
  
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
      case 'stats': return <StatsTab />;
      case 'list': return <ListTab />;
      case 'network': return <NetworkTab />;
      case 'map': return <MapTab />;
      default: return <StatsTab />;
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-green-800">
          Explore your quest through visualizations and datasets.
        </h1>
        <div className="text-orange-500 mt-2">
          YOUR UNIQUE QUEST NUMBER: {questData.questId}
        </div>
      </div>
      
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