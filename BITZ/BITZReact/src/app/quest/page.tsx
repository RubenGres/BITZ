'use client';

import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { MainScreen } from './MainScreen';
import { InfoView } from './InfoView';
import { API_URL } from '../Constants';
import { userId, conversationId, makeNewConversationId} from '../User';

export default function QuestPage() {  
  const [isLoading, setIsLoading] = useState(false);
  const [inQuestLoop, setInQuestLoop] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(undefined);
  const [resultDict, setResultDict] = useState(null);
  const [flavor, setFlavor] = useState(null);
  const [userLocation, setUserLocation] = useState({
    name: "unknown",
    coordinates: null
  });

  // Extract flavor from URL query parameters when component mounts
  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const flavorParam = urlParams.get('flavor');
      setFlavor(flavorParam); // Will be null if not found
    }
  }, []);

  const fetchLocationName = async (latitude, longitude) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url);
            
      if (response.ok) {
        const data = await response.json();
        const locationName = data.display_name || "Location not found";
        
        // Update state with location name
        setUserLocation(prev => ({
          ...prev,
          name: locationName
        }));
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      throw error;
    }
  };

  async function processImage(imageData) {
    try {
        // Prepare the request body with all needed parameters including flavor
        const requestBody = {
            image_data: imageData,
            user_id: userId,
            conversation_id: conversationId,
            user_location: userLocation.name,
            image_location: userLocation.coordinates,
            flavor: flavor
        };
        
        const response = await fetch(API_URL + '/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        return response.json();
        
    } catch (err) {
        console.error('Error processing image:', err);
        alert('Error processing image. Please try again.');
    }
  }

  const handleFileUpload = (event) => {
    setIsLoading(true);
  
    const file = event.target.files?.[0];
  
    console.log('File:', file);
    console.log('Flavor:', flavor); // Log flavor for debugging
  
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result;
  
        if (imageData === null) {
          console.error('Error: imageData is null');
          setIsLoading(false);
          return;
        }
  
        if (typeof imageData === 'string') {
          const base64Data = imageData.split(',')[1];
          setUploadedFile(imageData);
          
          console.log('Starting image processing...');
          console.log('User Location:', userLocation);
  
          processImage(base64Data).then((result) => {
            console.log('Result:', result);
            setResultDict(result);
  
            setIsLoading(false);
            setInQuestLoop(true);
          });
        } else {
          console.error('Error: imageData is not a string');
          setIsLoading(false);
        }
      };
  
      reader.readAsDataURL(file);
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        setIsLoading(false);
      };
    } else {
      setIsLoading(false);
    }
  };

  const handleEndQuest = () => {
    // stop this conversation
    let conversation_graph_url = API_URL + '/viz/graph/?id=' + conversationId;
    makeNewConversationId();
    window.location.href = conversation_graph_url;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#59bd8a',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >

        <input 
          type="file" 
          id="camera-input" 
          accept="image/*" 
          capture="environment" 
          style={{display: 'none'}} 
          onChange={handleFileUpload}
        />

        {isLoading ? (
          <LoadingScreen />
        ) : inQuestLoop ? (
          <InfoView uploadedImage={uploadedFile} resultDict={resultDict} onEndQuest={handleEndQuest}/>
        ) : (
          <MainScreen/>
        )}
      </div>
    </div>
  );
}