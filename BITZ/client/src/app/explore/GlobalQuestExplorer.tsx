import React, { useState } from 'react';
import { useExplorerData } from '../utils/useExplorerData';
import dynamic from 'next/dynamic';
const NetworkTab = dynamic(() => import('../components/visuals/NetworkTab'));
const ListTab = dynamic(() => import('../components/visuals/ListTab'));
import MapTab from '../components/visuals/MapTab';
// import { QuestData } from './QuestTypes';

const QuestExplorer = () => {
  const [activeTab, setActiveTab] = useState('map');
  const { questDataDict, loading, error } = useExplorerData(activeTab === 'network');
  const [filters, setFilters] = useState({
    searchText: ''
  });

  // Render the appropriate tab content based on activeTab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 'list': 
        return <ListTab questData={questDataDict} loading={loading} error={error} filters={filters} />;
      case 'network': 
        return <NetworkTab questDataDict={questDataDict} loading={loading} error={error} filters={filters} />;
      case 'map': 
        return <MapTab questData={questDataDict} loading={loading} error={error} filters={filters} />;
      default: 
        return <h1> ☝🤓 </h1>
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Filters */}
      <div className="px-6 py-4 bg-green-50 border-b border-green-300">
        <h3 className="text-lg font-semibold text-green-700 mb-4">Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Text Search Filter */}
          <div className="flex gap-2">
            <input
              type="text"
              value={filters.searchText}
              onChange={(e) => setFilters({...filters, searchText: e.target.value})}
              placeholder="Search by name, species, notes..."
              className="flex-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {filters.searchText && (
              <button
                onClick={() => setFilters({searchText: ''})}
                className="px-4 py-2 text-sm bg-white border border-green-400 text-green-600 rounded-md hover:bg-green-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs - Scrollable container */}
      <div className="mt-4 px-6">
        <div className="overflow-x-auto">
          <div className="flex whitespace-nowrap">
            <button 
              className={`px-6 py-2 mx-1 ${activeTab === 'map' 
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