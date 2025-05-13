'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import QuestExplorer from './QuestExplorer';
import { API_URL } from '@/app/Constants';

export default function AboutPage() {
  const [questIds, setQuestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      // If there's an ID, set it as selected
      setSelectedQuestId(id);
      setLoading(false);
    } else {
      // If no ID, fetch the list of quest IDs
      fetch(`${API_URL}/quest_list`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          console.log('Quest list:', data);
          if (Array.isArray(data)) {
            setQuestIds(data);
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
    }
  }, []);

  // Function to render quest list
  const renderQuestList = () => {
    if (loading) {
      return <div className="text-center p-8">Loading quest list...</div>;
    }

    if (error) {
      return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-green-800 mb-6">Available Quests</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questIds.map(quest_id => (
            <a 
              key={quest_id}
              href={`?id=${quest_id}`}
              className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-green-300 hover:border-green-500"
            >
              <div className="font-semibold text-green-700">
                {quest_id.split('-')[0]}
              </div>
              {quest_id && (
                <div className="text-sm text-gray-600 mt-1">{quest_id}</div>
              )}
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
      
      {/* Show either QuestExplorer or the list of quests */}
      {selectedQuestId ? (
        <QuestExplorer questId={selectedQuestId} />
      ) : (
        renderQuestList()
      )}
      
      {/* Footer */}
      <Footer />
    </div>
  );
}