'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { API_URL } from '@/app/Constants';
import { getUserId } from '../User';

export default function QuestListPage() {
  const [questsData, setQuestsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user's ID
    const currentUserId = getUserId();
    setUserId(currentUserId);

    // Fetch the list of quests with metadata
    fetch(`${API_URL}/quest_list`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Quest list with metadata:', data);
        if (data && data.quests) {
          setQuestsData(data.quests);
        } else {
          throw new Error('Invalid data structure for quest list');
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching quest list:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  // Function to render a formatted date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // Format duration in minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Filter quests based on active tab
  const filteredQuests = () => {
    if (!questsData) return [];
    
    return Object.entries(questsData).filter(([_, metadata]) => {
      const questUserId = metadata.user_id || null;
      
      if (activeTab === 'my') {
        return questUserId === userId;
      } else {
        return questUserId !== userId;
      }
    });
  };

  // Function to render the tabs
  const renderTabs = () => {
    return (
      <div className="flex mb-6 border-b border-green-300">
        <button
          className={`py-2 px-6 font-semibold ${
            activeTab === 'my' 
              ? 'text-green-600 border-b-2 border-green-500 bg-green-50' 
              : 'text-gray-600 hover:text-green-600'
          }`}
          onClick={() => setActiveTab('my')}
        >
          MY QUESTS
        </button>
        <button
          className={`py-2 px-6 font-semibold ${
            activeTab === 'others' 
              ? 'text-green-600 border-b-2 border-green-500 bg-green-50' 
              : 'text-gray-600 hover:text-green-600'
          }`}
          onClick={() => setActiveTab('others')}
        >
          COMMUNITY
        </button>
        <div className="flex-grow border-b border-green-300"></div>
      </div>
    );
  };

  // Function to render quest list
  const renderQuestList = () => {
    if (loading) {
      return <div className="text-center p-8">Loading...</div>;
    }

    if (error) {
      return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    const filtered = filteredQuests();

    if (filtered.length === 0) {
      return (
        <div className="text-center p-8 text-gray-600">
          {activeTab === 'my' 
            ? "You haven't created any quests yet." 
            : "No quests from other users available."}
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(([quest_id, metadata]) => (
            <a 
              key={quest_id}
              href={`/explore?id=${quest_id}`}
              className="block p-4 bg-white shadow hover:shadow-md transition-shadow border border-green-300 hover:border-green-500"
            >
              <div className="font-semibold text-green-700 text-lg mb-1">
                QUEST #{quest_id.substring(0, 8)}
              </div>
              <div className="text-xs text-gray-500 mb-2">{metadata.user_id}</div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">{metadata.flavor || 'No flavor'}</span>
                </div>
                
                <div className="overflow-hidden">
                  <span className="text-gray-600 block truncate">{metadata.location || 'Unknown location'}</span>
                </div>
                
                <div>
                  <span className="text-gray-600">
                    {metadata.date_time ? formatDate(metadata.date_time) : 'Date unknown'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">
                    {metadata.duration ? formatDuration(metadata.duration) : 'Duration unknown'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">
                    {metadata.nb_images ? `${metadata.nb_images} images` : 'No images'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">
                    {metadata.species_count ? `${metadata.species_count} species` : 'No species'}
                  </span>
                </div>
                
                {metadata.taxonomic_groups && Object.keys(metadata.taxonomic_groups).length > 0 && (
                  <div className="col-span-2">
                    <div className="text-green-600 font-medium mb-1">Taxonomic Groups</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(metadata.taxonomic_groups).map(([group, count]) => (
                        <div key={group} className="text-sm bg-green-50 px-2 py-1 rounded-md text-green-700">
                          {group}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f9ec] flex flex-col">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Header */}
      <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />
      
      {/* Main content */}
      <div className="flex-grow container mx-auto px-4 py-6">
        {renderTabs()}
        {renderQuestList()}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}