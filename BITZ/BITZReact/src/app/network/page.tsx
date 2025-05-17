'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import NetworkTab from './NetworkTab';
import { API_URL } from '@/app/Constants';

export default function NetworkPage() {
  const [questDataDict, setQuestDataDict] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuestId, setSelectedQuestId] = useState("");

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
        const questIds = Object.keys(data.quests).splice(0, 2);
       
        // If no selectedQuestId is set, use the first one
        if (questIds.length > 0 && !selectedQuestId) {
          setSelectedQuestId(questIds[0]);
        }
       
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
       
        setQuestDataDict(newQuestDataDict);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching quests:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedQuestId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f9ec]">
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
      {/* <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" /> */}
     
      {/* Main Content - flex-grow ensures it takes available space */}
      <main className="flex-grow flex w-full">
        <div className="flex flex-col w-full mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}
         
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="flex-grow flex w-full h-full">
              <NetworkTab
                questDataDict={questDataDict}
                questId={selectedQuestId}
                loading={loading}
                error={error}
              />
            </div>
          )}
        </div>
      </main>
     
    </div>
  );
}